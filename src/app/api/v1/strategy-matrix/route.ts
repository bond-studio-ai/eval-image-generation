import { db } from '@/db';
import { inputPreset, strategy } from '@/db/schema';
import { errorResponse, successResponse } from '@/lib/api-response';
import { isNull, sql } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const sort = searchParams.get('sort') ?? 'globalPercentage';
    const order = searchParams.get('order') === 'asc' ? 'ASC' : 'DESC';

    const minCoverageParam = searchParams.get('minCoverage');
    const minImagesParam = searchParams.get('minImages');

    const sceneWeight = Number(searchParams.get('sceneWeight') ?? 0.5);
    const productWeight = Number(searchParams.get('productWeight') ?? 0.5);

    const minTemperatureParam = searchParams.get('minTemperature');
    const maxTemperatureParam = searchParams.get('maxTemperature');
    const modelParam = searchParams.get('model');

    const minCoverage = minCoverageParam !== null ? Number(minCoverageParam) : null;
    const minImages = minImagesParam !== null ? Number(minImagesParam) : null;

    const minTemperature = minTemperatureParam !== null ? Number(minTemperatureParam) : null;
    const maxTemperature = maxTemperatureParam !== null ? Number(maxTemperatureParam) : null;

    const modelList = modelParam
      ? modelParam
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      : [];

    const presets = await db.query.inputPreset.findMany({
      where: isNull(inputPreset.deletedAt),
    });

    const strategies = await db.query.strategy.findMany({
      where: isNull(strategy.deletedAt),
    });

    const totalPresets = presets.length;

    // MODEL FILTER
    const modelFilter =
      modelList.length > 0
        ? sql`AND ss.model IN (${sql.join(
            modelList.map((m) => sql`${m}`),
            sql`, `,
          )})`
        : sql``;

    // TEMPERATURE FILTER LOGIC
    let temperatureFilter = sql``;

    if (minTemperature !== null && maxTemperature === null) {
      temperatureFilter = sql`AND ss.temperature = ${minTemperature}`;
    } else if (minTemperature !== null && maxTemperature !== null) {
      temperatureFilter = sql`
        AND ss.temperature >= ${minTemperature}
        AND ss.temperature <= ${maxTemperature}
      `;
    }

    const matrixAgg = await db.execute(sql`
      WITH latest_runs AS (
        SELECT DISTINCT ON (sr.strategy_id, srip.input_preset_id)
          sr.id AS run_id,
          sr.strategy_id,
          sr.status,
          srip.input_preset_id
        FROM strategy_run sr
        JOIN strategy_run_input_preset srip
          ON srip.strategy_run_id = sr.id
        ORDER BY sr.strategy_id, srip.input_preset_id, sr.created_at DESC
      )
      SELECT
        lr.strategy_id,
        lr.input_preset_id,
        lr.run_id,
        lr.status,
        COUNT(gr.id) AS total_images,
        COUNT(gr.id) FILTER (
          WHERE g.scene_accuracy_rating = 'GOOD'
             OR g.product_accuracy_rating = 'GOOD'
        ) AS good_images,
        COUNT(gr.id) FILTER (
          WHERE g.scene_accuracy_rating IS NOT NULL
             OR g.product_accuracy_rating IS NOT NULL
        ) AS evaluated_images,
        MAX(ssr.output_url) AS output_url,
        ARRAY_AGG(DISTINCT ss.model) AS models,
        COALESCE(
          JSON_AGG(DISTINCT ss.temperature)
          FILTER (WHERE ss.temperature IS NOT NULL),
          '[]'
        ) AS temperatures
      FROM latest_runs lr
      LEFT JOIN strategy_step_result ssr
        ON ssr.strategy_run_id = lr.run_id
      LEFT JOIN strategy_step ss
        ON ss.id = ssr.strategy_step_id
      LEFT JOIN generation g
        ON g.id = ssr.generation_id
      LEFT JOIN generation_result gr
        ON gr.generation_id = g.id
      WHERE 1=1
        ${modelFilter}
        ${temperatureFilter}
      GROUP BY
        lr.strategy_id,
        lr.input_preset_id,
        lr.run_id,
        lr.status
    `);

    const matrixLookup = new Map<string, any>();

    for (const r of matrixAgg.rows as any[]) {
      const key = `${r.input_preset_id}_${r.strategy_id}`;
      const totalImages = Number(r.total_images);
      const goodImages = Number(r.good_images);
      const evaluatedImages = Number(r.evaluated_images);

      matrixLookup.set(key, {
        strategyId: r.strategy_id,
        runId: r.run_id,
        status: r.status?.toUpperCase() ?? 'UNKNOWN',
        totalImages,
        goodImages,
        percentage: evaluatedImages === 0 ? null : Math.round((goodImages / evaluatedImages) * 100),
        needsEval: evaluatedImages === 0,
        outputUrl: r.output_url ?? null,
        models: r.models ?? [],
        temperatures: r.temperatures ?? [],
      });
    }

    const matrix = presets.map((preset) => ({
      inputPresetId: preset.id,
      name: preset.name,
      cells: strategies.map((strat) => {
        const key = `${preset.id}_${strat.id}`;
        return (
          matrixLookup.get(key) ?? {
            strategyId: strat.id,
            runId: null,
            status: 'NO_RUN',
            totalImages: 0,
            goodImages: 0,
            percentage: null,
            needsEval: false,
            outputUrl: null,
            models: [],
            temperatures: [],
          }
        );
      }),
    }));

    const summaryAgg = await db.execute(sql`
      WITH preset_scores AS (
        SELECT
          s.id AS strategy_id,
          srip.input_preset_id,
          COUNT(gr.id) AS total_images,
          SUM(CASE WHEN g.scene_accuracy_rating = 'GOOD' THEN 1 ELSE 0 END)::float
            / NULLIF(COUNT(gr.id),0) AS scene_ratio,
          SUM(CASE WHEN g.product_accuracy_rating = 'GOOD' THEN 1 ELSE 0 END)::float
            / NULLIF(COUNT(gr.id),0) AS product_ratio,
          AVG(g.execution_time) AS avg_execution_time
        FROM strategy s
        LEFT JOIN strategy_run sr ON sr.strategy_id = s.id
        LEFT JOIN strategy_run_input_preset srip ON srip.strategy_run_id = sr.id
        LEFT JOIN strategy_step_result ssr ON ssr.strategy_run_id = sr.id
        LEFT JOIN strategy_step ss
          ON ss.id = ssr.strategy_step_id
          ${modelFilter}
          ${temperatureFilter}
        LEFT JOIN generation g ON g.id = ssr.generation_id
        LEFT JOIN generation_result gr ON gr.generation_id = g.id
        WHERE s.deleted_at IS NULL
        GROUP BY s.id, srip.input_preset_id
      )
      SELECT
        strategy_id,
        SUM(total_images) AS total_images,
        COUNT(DISTINCT input_preset_id) AS presets_covered,
        SUM(total_images * (
          (${sceneWeight}) * COALESCE(scene_ratio,0)
          +
          (${productWeight}) * COALESCE(product_ratio,0)
        )) / NULLIF(SUM(total_images),0) AS weighted_score,
        VARIANCE(
          (${sceneWeight}) * COALESCE(scene_ratio,0)
          +
          (${productWeight}) * COALESCE(product_ratio,0)
        ) AS stability_variance,
        AVG(avg_execution_time) AS avg_execution_time
      FROM preset_scores
      GROUP BY strategy_id
    `);

    let strategySummary = summaryAgg.rows.map((r: any) => {
      const totalImages = Number(r.total_images);
      const presetsCovered = Number(r.presets_covered);

      return {
        strategyId: r.strategy_id,
        totalImages,
        presetsCovered,
        totalPresets,
        coverageRatio: totalPresets === 0 ? 0 : presetsCovered / totalPresets,
        globalPercentage:
          r.weighted_score !== null ? Math.round(Number(r.weighted_score) * 100) : null,
        stabilityVariance: r.stability_variance !== null ? Number(r.stability_variance) : null,
        avgExecutionTimeMs:
          r.avg_execution_time !== null ? Math.round(Number(r.avg_execution_time)) : null,
        costPerImageMs:
          totalImages > 0 && r.avg_execution_time !== null
            ? Math.round(Number(r.avg_execution_time) / totalImages)
            : null,
      };
    });

    // MIN FILTERS — exact match when only min sent
    if (minCoverage !== null) {
      strategySummary = strategySummary.filter((s) => s.coverageRatio === minCoverage);
    }

    if (minImages !== null) {
      strategySummary = strategySummary.filter((s) => s.totalImages === minImages);
    }

    strategySummary.sort((a: any, b: any) => {
      const valA = a[sort];
      const valB = b[sort];

      if (valA === null) return 1;
      if (valB === null) return -1;

      return order === 'ASC' ? valA - valB : valB - valA;
    });

    return successResponse({
      rows: presets.map((p) => ({
        id: p.id,
        name: p.name,
      })),
      columns: strategies.map((s) => ({
        id: s.id,
        name: s.name,
      })),
      matrix,
      strategySummary,
    });
  } catch (err) {
    console.error(err);
    return errorResponse('INTERNAL_ERROR', 'Failed to build strategy dashboard');
  }
}
