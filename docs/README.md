# AI Image Generator Admin

A quality assurance and testing platform for evaluating AI image generation results based on input images and prompts.

## Overview

This application enables teams to:

- **Version and track prompts** - Maintain different versions of system and user prompts used for image generation
- **Run generation experiments** - Execute image generations with specific prompt versions and input images
- **Rate and evaluate results** - Assess the quality of generated outputs
- **Analyze performance** - Compare prompt effectiveness across multiple generations

## Use Cases

### 1. Prompt Engineering & Iteration

Test different prompt formulations to find the most effective wording for specific image generation tasks.

### 2. Quality Assurance

Systematically evaluate image generation quality before deploying prompts to production.

### 3. A/B Testing

Compare results between different prompt versions using the same input images.

### 4. Regression Testing

Ensure that prompt changes don't degrade generation quality for known good inputs.

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────────┐
│   prompt_version    │
├─────────────────────┤
│ id (PK)             │
│ system_prompt       │
│ user_prompt         │
│ created_at          │
│ deleted_at          │
└─────────┬───────────┘
          │
          │ 1:N
          ▼
┌─────────────────────┐
│     generation      │
├─────────────────────┤
│ id (PK)             │
│ prompt_version_id   │──────┐
│ result_rating       │      │
│ created_at          │      │
└─────────┬───────────┘      │
          │                  │
    ┌─────┴─────┐            │
    │           │            │
    │ 1:N       │ 1:N        │
    ▼           ▼            │
┌───────────────────┐  ┌───────────────────┐
│generation_image   │  │generation_image   │
│     _output       │  │     _input        │
├───────────────────┤  ├───────────────────┤
│ id (PK)           │  │ id (PK)           │
│ generation_id(FK) │  │ generation_id(FK) │
│ url               │  │ url               │
└───────────────────┘  └───────────────────┘
```

---

## Table Definitions

### `prompt_version`

Stores versioned prompts used for image generation. Supports soft deletion to preserve historical data.

| Column          | Type      | Constraints             | Description                                             |
| --------------- | --------- | ----------------------- | ------------------------------------------------------- |
| `id`            | UUID      | PRIMARY KEY             | Unique identifier                                       |
| `system_prompt` | TEXT      | NOT NULL                | The system prompt that sets context/behavior for the AI |
| `user_prompt`   | TEXT      | NOT NULL                | The user-facing prompt template for generation requests |
| `created_at`    | TIMESTAMP | NOT NULL, DEFAULT NOW() | When this version was created                           |
| `deleted_at`    | TIMESTAMP | NULL                    | Soft delete timestamp (NULL = active)                   |

**Notes:**

- System prompts typically define the AI's role, constraints, and output format
- User prompts often contain placeholders for dynamic content (e.g., `{style}`, `{subject}`)
- Soft deletion preserves referential integrity with existing generations

---

### `generation`

Records each image generation run, linking inputs to outputs with quality ratings.

| Column              | Type         | Constraints                                | Description                             |
| ------------------- | ------------ | ------------------------------------------ | --------------------------------------- |
| `id`                | UUID         | PRIMARY KEY                                | Unique identifier                       |
| `prompt_version_id` | UUID         | FOREIGN KEY → prompt_version(id), NOT NULL | The prompt version used                 |
| `result_rating`     | INTEGER/ENUM | NULL                                       | Quality rating of the generation output |
| `created_at`        | TIMESTAMP    | NOT NULL, DEFAULT NOW()                    | When the generation was executed        |

**Rating Scale Options:**

Option A - Numeric (1-5):

- 1 = Poor quality, unusable
- 2 = Below expectations
- 3 = Acceptable
- 4 = Good quality
- 5 = Excellent, production-ready

Option B - Enum:

- `FAILED` - Generation failed or errored
- `POOR` - Low quality, major issues
- `ACCEPTABLE` - Meets minimum requirements
- `GOOD` - High quality output
- `EXCELLENT` - Exceptional quality

---

### `generation_image_output`

Stores URLs to generated output images from a generation run.

| Column          | Type | Constraints                            | Description                     |
| --------------- | ---- | -------------------------------------- | ------------------------------- |
| `id`            | UUID | PRIMARY KEY                            | Unique identifier               |
| `generation_id` | UUID | FOREIGN KEY → generation(id), NOT NULL | Parent generation               |
| `url`           | TEXT | NOT NULL                               | URL/path to the generated image |

**Notes:**

- Multiple outputs per generation support batch generation scenarios
- URLs may point to cloud storage (S3, GCS) or local file system

---

### `generation_image_input`

Stores URLs to input/reference images used for a generation.

| Column          | Type | Constraints                            | Description                 |
| --------------- | ---- | -------------------------------------- | --------------------------- |
| `id`            | UUID | PRIMARY KEY                            | Unique identifier           |
| `generation_id` | UUID | FOREIGN KEY → generation(id), NOT NULL | Parent generation           |
| `url`           | TEXT | NOT NULL                               | URL/path to the input image |

**Notes:**

- Input images serve as references for style transfer, image-to-image generation, etc.
- A generation may have zero inputs (text-to-image) or multiple (multi-reference)

---

## SQL Schema

```sql
-- Enable UUID extension (PostgreSQL)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Rating enum type
CREATE TYPE generation_rating AS ENUM (
    'FAILED',
    'POOR',
    'ACCEPTABLE',
    'GOOD',
    'EXCELLENT'
);

-- Prompt versions table
CREATE TABLE prompt_version (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    system_prompt TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP WITH TIME ZONE NULL
);

-- Index for active prompts lookup
CREATE INDEX idx_prompt_version_active ON prompt_version(created_at)
    WHERE deleted_at IS NULL;

-- Generation runs table
CREATE TABLE generation (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    prompt_version_id UUID NOT NULL REFERENCES prompt_version(id),
    result_rating generation_rating NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX idx_generation_prompt_version ON generation(prompt_version_id);
CREATE INDEX idx_generation_rating ON generation(result_rating) WHERE result_rating IS NOT NULL;
CREATE INDEX idx_generation_created_at ON generation(created_at);

-- Output images table
CREATE TABLE generation_image_output (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generation(id) ON DELETE CASCADE,
    url TEXT NOT NULL
);

CREATE INDEX idx_output_generation ON generation_image_output(generation_id);

-- Input images table
CREATE TABLE generation_image_input (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_id UUID NOT NULL REFERENCES generation(id) ON DELETE CASCADE,
    url TEXT NOT NULL
);

CREATE INDEX idx_input_generation ON generation_image_input(generation_id);
```

---

## Common Queries

### Get all generations for a prompt version with ratings

```sql
SELECT
    g.id,
    g.result_rating,
    g.created_at,
    COUNT(DISTINCT gi.id) AS input_count,
    COUNT(DISTINCT go.id) AS output_count
FROM generation g
LEFT JOIN generation_image_input gi ON gi.generation_id = g.id
LEFT JOIN generation_image_output go ON go.generation_id = g.id
WHERE g.prompt_version_id = :prompt_version_id
GROUP BY g.id
ORDER BY g.created_at DESC;
```

### Calculate average rating per prompt version

```sql
SELECT
    pv.id,
    LEFT(pv.user_prompt, 100) AS prompt_preview,
    COUNT(g.id) AS generation_count,
    AVG(CASE g.result_rating
        WHEN 'FAILED' THEN 0
        WHEN 'POOR' THEN 1
        WHEN 'ACCEPTABLE' THEN 2
        WHEN 'GOOD' THEN 3
        WHEN 'EXCELLENT' THEN 4
    END) AS avg_rating_score,
    COUNT(g.id) FILTER (WHERE g.result_rating = 'EXCELLENT') AS excellent_count,
    COUNT(g.id) FILTER (WHERE g.result_rating IN ('FAILED', 'POOR')) AS poor_count
FROM prompt_version pv
LEFT JOIN generation g ON g.prompt_version_id = pv.id
WHERE pv.deleted_at IS NULL
GROUP BY pv.id
ORDER BY avg_rating_score DESC NULLS LAST;
```

### Get generation with all associated images

```sql
SELECT
    g.id,
    g.result_rating,
    g.created_at,
    pv.system_prompt,
    pv.user_prompt,
    json_agg(DISTINCT jsonb_build_object('id', gi.id, 'url', gi.url))
        FILTER (WHERE gi.id IS NOT NULL) AS input_images,
    json_agg(DISTINCT jsonb_build_object('id', go.id, 'url', go.url))
        FILTER (WHERE go.id IS NOT NULL) AS output_images
FROM generation g
JOIN prompt_version pv ON pv.id = g.prompt_version_id
LEFT JOIN generation_image_input gi ON gi.generation_id = g.id
LEFT JOIN generation_image_output go ON go.generation_id = g.id
WHERE g.id = :generation_id
GROUP BY g.id, pv.id;
```

### Find unrated generations

```sql
SELECT
    g.id,
    g.created_at,
    LEFT(pv.user_prompt, 50) AS prompt_preview,
    COUNT(go.id) AS output_count
FROM generation g
JOIN prompt_version pv ON pv.id = g.prompt_version_id
LEFT JOIN generation_image_output go ON go.generation_id = g.id
WHERE g.result_rating IS NULL
GROUP BY g.id, pv.user_prompt
ORDER BY g.created_at ASC;
```

---

## Suggested Schema Enhancements

Consider adding these fields based on your specific needs:

### `prompt_version` additions

```sql
ALTER TABLE prompt_version ADD COLUMN name VARCHAR(255);          -- Human-friendly identifier
ALTER TABLE prompt_version ADD COLUMN description TEXT;           -- Notes about this version
ALTER TABLE prompt_version ADD COLUMN model_name VARCHAR(100);    -- Target AI model (e.g., 'DALL-E 3', 'Midjourney')
ALTER TABLE prompt_version ADD COLUMN parameters JSONB;           -- Model parameters (temperature, etc.)
ALTER TABLE prompt_version ADD COLUMN created_by UUID;            -- User who created this version
ALTER TABLE prompt_version ADD COLUMN parent_version_id UUID;     -- Track prompt evolution/lineage
```

### `generation` additions

```sql
ALTER TABLE generation ADD COLUMN model_used VARCHAR(100);        -- Actual model used
ALTER TABLE generation ADD COLUMN inference_time_ms INTEGER;      -- Performance tracking
ALTER TABLE generation ADD COLUMN error_message TEXT;             -- Error details if failed
ALTER TABLE generation ADD COLUMN metadata JSONB;                 -- Additional context (seed, etc.)
ALTER TABLE generation ADD COLUMN rated_at TIMESTAMP;             -- When rating was assigned
ALTER TABLE generation ADD COLUMN rated_by UUID;                  -- Who assigned the rating
ALTER TABLE generation ADD COLUMN notes TEXT;                     -- Reviewer comments
```

### `generation_image_*` additions

```sql
-- For both input and output tables
ALTER TABLE generation_image_output ADD COLUMN order_index INTEGER DEFAULT 0;  -- Ordering
ALTER TABLE generation_image_output ADD COLUMN width INTEGER;                   -- Image dimensions
ALTER TABLE generation_image_output ADD COLUMN height INTEGER;
ALTER TABLE generation_image_output ADD COLUMN file_size_bytes BIGINT;
ALTER TABLE generation_image_output ADD COLUMN mime_type VARCHAR(50);
ALTER TABLE generation_image_output ADD COLUMN thumbnail_url TEXT;              -- Preview image
```

### New supporting tables

```sql
-- Track individual image ratings (not just generation-level)
CREATE TABLE generation_image_rating (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    generation_image_output_id UUID NOT NULL REFERENCES generation_image_output(id),
    rating generation_rating NOT NULL,
    criteria VARCHAR(50),  -- e.g., 'composition', 'color', 'accuracy'
    notes TEXT,
    rated_by UUID,
    rated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Tag system for organizing prompts
CREATE TABLE prompt_tag (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(50) NOT NULL UNIQUE,
    color VARCHAR(7)  -- Hex color for UI
);

CREATE TABLE prompt_version_tag (
    prompt_version_id UUID NOT NULL REFERENCES prompt_version(id),
    tag_id UUID NOT NULL REFERENCES prompt_tag(id),
    PRIMARY KEY (prompt_version_id, tag_id)
);
```

---

## API Design Suggestions

### REST Endpoints

```
# Prompt Versions
GET    /api/prompt-versions              # List all active versions
POST   /api/prompt-versions              # Create new version
GET    /api/prompt-versions/:id          # Get specific version
PUT    /api/prompt-versions/:id          # Update version
DELETE /api/prompt-versions/:id          # Soft delete version

# Generations
GET    /api/generations                  # List generations (with filters)
POST   /api/generations                  # Create new generation
GET    /api/generations/:id              # Get generation with images
PATCH  /api/generations/:id/rating       # Update rating

# Images
POST   /api/generations/:id/inputs       # Add input image
POST   /api/generations/:id/outputs      # Add output image
DELETE /api/images/:id                   # Remove image

# Analytics
GET    /api/analytics/ratings            # Rating distribution
GET    /api/analytics/prompt-performance # Prompt comparison
```

### Query Parameters

```
# Filtering generations
GET /api/generations?prompt_version_id=xxx
GET /api/generations?rating=EXCELLENT
GET /api/generations?unrated=true
GET /api/generations?from=2024-01-01&to=2024-12-31

# Pagination
GET /api/generations?page=1&limit=20

# Sorting
GET /api/generations?sort=created_at&order=desc
```

---

## Workflow Example

```
1. Create Prompt Version
   ├── Define system prompt (AI behavior)
   └── Define user prompt (generation template)

2. Run Generation
   ├── Select prompt version
   ├── Upload input images (optional)
   ├── Execute generation
   └── Store output images

3. Evaluate Results
   ├── Review output images
   ├── Assign rating
   └── Add notes (optional)

4. Analyze & Iterate
   ├── Compare prompt performance
   ├── Identify best-performing versions
   └── Create improved prompt versions
```

---

## License

[Specify your license here]
