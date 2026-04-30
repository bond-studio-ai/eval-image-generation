'use client';

import { BaselineExpectedBadge, formatDateTime } from '@/components/catalog-confidence/badges';
import type { JudgeBaselineEntry, JudgeBaselineExpected } from '@/lib/catalog-feed-client';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';

interface Props {
  scope: string;
  initial: JudgeBaselineEntry[];
}

interface DraftEntry {
  productId: string;
  expected: JudgeBaselineExpected;
  failureReason: string;
}

const EMPTY_DRAFT: DraftEntry = { productId: '', expected: 'pass', failureReason: '' };

/**
 * JudgeBaselineEditor is the per-scope CRUD surface for
 * `judge_baseline_entries`. It drives four endpoints:
 *
 *   GET    /admin/judge-baselines/{scope}                      (server-rendered)
 *   PUT    /admin/judge-baselines/{scope}                      (single upsert)
 *   DELETE /admin/judge-baselines/{scope}?productId=...        (single delete)
 *   POST   /admin/judge-baselines/{scope}/bulk                 (paste-and-go)
 *
 * Validation mirrors the upstream service: `failureReason` is only
 * accepted when `expected = 'fail'`. The form blocks the submit
 * client-side so reviewers don't waste a round-trip on an obviously
 * invalid payload, but the server still enforces the invariant
 * authoritatively.
 */
export function JudgeBaselineEditor({ scope, initial }: Props) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftEntry>(EMPTY_DRAFT);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);
  const [bulkOk, setBulkOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    let pass = 0;
    let fail = 0;
    for (const e of initial) {
      if (e.expected === 'pass') pass++;
      else fail++;
    }
    return { pass, fail, total: initial.length };
  }, [initial]);

  const draftError = useMemo<string | null>(() => {
    if (!draft.productId.trim()) return 'productId is required';
    if (draft.expected === 'pass' && draft.failureReason.trim()) {
      return 'failureReason is only allowed when expected = fail';
    }
    return null;
  }, [draft]);

  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);

  const upsert = useCallback(
    async (entry: DraftEntry) => {
      setSavingId(entry.productId);
      setError(null);
      try {
        const body: Record<string, unknown> = {
          productId: entry.productId.trim(),
          expected: entry.expected,
        };
        if (entry.expected === 'fail' && entry.failureReason.trim()) {
          body.failureReason = entry.failureReason.trim();
        }
        const res = await fetch(
          `/api/v1/catalog-feed/admin/judge-baselines/${encodeURIComponent(scope)}`,
          {
            method: 'PUT',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          },
        );
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text.slice(0, 300)}`);
        }
        setDraft(EMPTY_DRAFT);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingId(null);
      }
    },
    [scope, refresh],
  );

  const remove = useCallback(
    async (productId: string) => {
      if (!confirm(`Remove baseline entry for ${productId}?`)) return;
      setSavingId(productId);
      setError(null);
      try {
        const qs = new URLSearchParams({ productId });
        const res = await fetch(
          `/api/v1/catalog-feed/admin/judge-baselines/${encodeURIComponent(scope)}?${qs}`,
          { method: 'DELETE' },
        );
        if (!res.ok && res.status !== 204) {
          const text = await res.text();
          throw new Error(`${res.status}: ${text.slice(0, 300)}`);
        }
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSavingId(null);
      }
    },
    [scope, refresh],
  );

  const submitBulk = useCallback(async () => {
    setBulkBusy(true);
    setBulkError(null);
    setBulkOk(null);
    try {
      const entries = parseBulkInput(bulkText);
      if (entries.length === 0) {
        throw new Error('No valid rows parsed. Use one per line: productId,pass|fail[,reason].');
      }
      const res = await fetch(
        `/api/v1/catalog-feed/admin/judge-baselines/${encodeURIComponent(scope)}/bulk`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ entries }),
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text.slice(0, 300)}`);
      }
      setBulkText('');
      setBulkOk(`Upserted ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}.`);
      refresh();
    } catch (e) {
      setBulkError(e instanceof Error ? e.message : String(e));
    } finally {
      setBulkBusy(false);
    }
  }, [bulkText, scope, refresh]);

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
              Labeled set ({counts.total})
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {counts.pass} should pass · {counts.fail} should fail. The Promoter requires both
              rates ≥ 90% before approving a proposed judge prompt for this scope.
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-4 overflow-clip rounded-md border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <Th>Product ID</Th>
                <Th>Expected</Th>
                <Th>Failure reason</Th>
                <Th>Updated</Th>
                <Th>By</Th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {initial.length === 0 ? (
                <tr>
                  <td className="px-3 py-6 text-center text-sm text-gray-500" colSpan={6}>
                    No baseline entries yet for <code>{scope}</code>. Add one below or paste a CSV
                    block in the bulk panel.
                  </td>
                </tr>
              ) : (
                initial.map((entry) => (
                  <tr key={entry.id}>
                    <td className="px-3 py-2 align-top">
                      <code className="font-mono text-xs text-gray-800">{entry.productId}</code>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <BaselineExpectedBadge expected={entry.expected} />
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700">
                      {entry.failureReason ? (
                        <span className="block max-w-md whitespace-pre-wrap">
                          {entry.failureReason}
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700">
                      {formatDateTime(entry.updatedAt)}
                    </td>
                    <td className="px-3 py-2 align-top text-xs text-gray-700">
                      {entry.createdBy || '—'}
                    </td>
                    <td className="px-3 py-2 text-right align-top">
                      <button
                        type="button"
                        onClick={() => remove(entry.productId)}
                        disabled={savingId === entry.productId}
                        className="inline-flex items-center rounded-md border border-red-200 bg-white px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        {savingId === entry.productId ? 'Removing…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Add or update a single entry
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          Upsert by <code>productId</code>: the row replaces any existing label for the same
          product. Set <em>failure reason</em> only when expected = fail.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-12">
          <label className="block text-xs font-medium text-gray-700 md:col-span-4">
            Product ID
            <input
              type="text"
              value={draft.productId}
              onChange={(e) => setDraft({ ...draft, productId: e.target.value })}
              className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 font-mono text-sm shadow-xs"
              placeholder="external catalog id"
            />
          </label>
          <label className="block text-xs font-medium text-gray-700 md:col-span-2">
            Expected
            <select
              value={draft.expected}
              onChange={(e) =>
                setDraft({ ...draft, expected: e.target.value as JudgeBaselineExpected })
              }
              className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm shadow-xs"
            >
              <option value="pass">pass</option>
              <option value="fail">fail</option>
            </select>
          </label>
          <label className="block text-xs font-medium text-gray-700 md:col-span-6">
            Failure reason {draft.expected === 'pass' && '(disabled — only used when fail)'}
            <input
              type="text"
              value={draft.failureReason}
              disabled={draft.expected === 'pass'}
              onChange={(e) => setDraft({ ...draft, failureReason: e.target.value })}
              className="focus:border-primary-500 focus:ring-primary-500 mt-1 block w-full rounded-md border-gray-300 px-2 py-1.5 text-sm shadow-xs disabled:bg-gray-50 disabled:text-gray-400"
              placeholder="e.g. judge marked side-view skewed"
            />
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => upsert(draft)}
            disabled={!!draftError || savingId === draft.productId}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs"
          >
            {savingId === draft.productId ? 'Saving…' : 'Save entry'}
          </button>
          {draftError && <span className="text-xs text-red-700">{draftError}</span>}
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-semibold tracking-wide text-gray-600 uppercase">
          Bulk upsert (paste CSV)
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          One row per line. Format: <code>productId,pass|fail[,reason]</code>. Existing entries for
          the same productId are overwritten.
        </p>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          rows={6}
          spellCheck={false}
          className="focus:border-primary-500 focus:ring-primary-500 mt-3 block w-full rounded-md border-gray-300 p-2 font-mono text-xs shadow-xs"
          placeholder={`prod-1,pass\nprod-2,fail,judge marked side-view skewed`}
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={submitBulk}
            disabled={bulkBusy || bulkText.trim().length === 0}
            className="bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium text-white shadow-xs"
          >
            {bulkBusy ? 'Uploading…' : 'Apply bulk upsert'}
          </button>
          {bulkError && <span className="text-xs text-red-700">{bulkError}</span>}
          {bulkOk && <span className="text-xs text-green-700">{bulkOk}</span>}
        </div>
      </section>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-3 py-2 text-left text-[10px] font-semibold tracking-wider text-gray-600 uppercase">
      {children}
    </th>
  );
}

/**
 * parseBulkInput converts pasted CSV text into the bulk upsert
 * payload. Forgiving on whitespace and trailing commas; strict on
 * the expected enum so a typo blows up before the request leaves the
 * browser.
 */
function parseBulkInput(text: string): Array<{
  productId: string;
  expected: JudgeBaselineExpected;
  failureReason?: string;
}> {
  const out: Array<{
    productId: string;
    expected: JudgeBaselineExpected;
    failureReason?: string;
  }> = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const [pid, exp, ...rest] = line.split(',').map((s) => s.trim());
    if (!pid || !exp) continue;
    if (exp !== 'pass' && exp !== 'fail') {
      throw new Error(`Invalid expected "${exp}" on line "${line}". Use pass or fail.`);
    }
    const reason = rest.join(',').trim();
    if (exp === 'pass' && reason) {
      throw new Error(`failureReason on a "pass" row is not allowed (line "${line}").`);
    }
    out.push({
      productId: pid,
      expected: exp,
      ...(exp === 'fail' && reason ? { failureReason: reason } : {}),
    });
  }
  return out;
}
