# Architecture Overview

## Tech Stack

- **Next.js** (App Router) -- fullstack React framework
- **Neon** -- serverless PostgreSQL database
- **Drizzle ORM** -- type-safe ORM with Neon serverless driver
- **Tailwind CSS** -- utility-first styling
- **Zod** -- runtime validation for API requests

## System Context

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    AI Image Generator Admin (Next.js)                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────────────────┐ │
│  │              │     │   Next.js    │     │   Neon PostgreSQL        │ │
│  │   Web UI     │────▶│   API Routes │────▶│   (Serverless)           │ │
│  │   (React)    │     │   (Drizzle)  │     │                          │ │
│  │              │     │              │     │   - prompt_version       │ │
│  └──────────────┘     └──────┬───────┘     │   - generation           │ │
│                              │             │   - generation_image_*   │ │
│                              │             │                          │ │
│                              ▼             └──────────────────────────┘ │
│                       ┌──────────────┐                                  │
│                       │              │                                  │
│                       │   Cloud      │                                  │
│                       │   Storage    │                                  │
│                       │   (S3)       │                                  │
│                       │              │                                  │
│                       └──────────────┘                                  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ API Calls
                                    ▼
                        ┌──────────────────────┐
                        │                      │
                        │   AI Image Service   │
                        │   (External)         │
                        │                      │
                        └──────────────────────┘
```

---

## Data Flow

### 1. Prompt Creation Flow

```
Admin User ──▶ Create Prompt Form ──▶ API POST /prompt-versions ──▶ Database
                                                                         │
                                                                         ▼
                                                              prompt_version table
```

### 2. Generation Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  1. Select Prompt     2. Upload Inputs    3. Call AI Service   4. Store     │
│     Version              (optional)                              Results    │
│                                                                              │
│  ┌─────────────┐      ┌─────────────┐     ┌─────────────┐    ┌───────────┐  │
│  │  prompt_    │      │   Input     │     │     AI      │    │ Database  │  │
│  │  version    │─────▶│   Images    │────▶│   Service   │───▶│           │  │
│  │             │      │             │     │             │    │ generation│  │
│  └─────────────┘      └─────────────┘     └──────┬──────┘    │ *_image_* │  │
│                                                  │           └───────────┘  │
│                                                  │                          │
│                                                  ▼                          │
│                                           ┌─────────────┐                   │
│                                           │   Output    │                   │
│                                           │   Images    │                   │
│                                           └─────────────┘                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3. Evaluation Flow

```
Evaluator ──▶ Review Queue ──▶ View Generation ──▶ Assign Rating ──▶ Database
                    │               │                    │
                    │               │                    │
                    ▼               ▼                    ▼
              Unrated         Input/Output        result_rating
              Generations      Images              field updated
```

---

## Component Details

### Database Layer

| Table                     | Purpose                                     | Key Relationships      |
| ------------------------- | ------------------------------------------- | ---------------------- |
| `prompt_version`          | Store versioned prompts with model settings | Parent of generations  |
| `generation`              | Track generation runs                       | Links prompt to images |
| `generation_image_input`  | Reference images                            | Belongs to generation  |
| `generation_image_output` | Generated results                           | Belongs to generation  |

### Key Design Decisions

1. **Soft Deletes for Prompts**
   - Preserves historical data integrity
   - Allows auditing of past experiments
   - Prevents orphaned generation records

2. **Nullable Ratings**
   - Generations can exist without immediate evaluation
   - Supports async review workflows
   - Enables tracking of unrated backlog

3. **Separate Input/Output Tables**
   - Supports multiple images per generation
   - Flexible for different generation modes (1-to-1, 1-to-many)
   - Easy to extend with additional metadata

4. **URL-Based Image Storage**
   - Decouples storage from application
   - Supports multiple storage backends
   - Enables CDN distribution

---

## Deployment Architecture

### Development

```
┌─────────────────────────────────────────────────────┐
│  Developer Machine                                   │
│                                                      │
│  ┌─────────────────────┐     ┌──────────────────┐   │
│  │  Next.js Dev Server │     │  Neon PostgreSQL  │   │
│  │  (SSR + API Routes) │────▶│  (Cloud)          │   │
│  │  :3000              │     │                   │   │
│  └─────────────────────┘     └──────────────────┘   │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Production (Vercel + Neon)

```
┌────────────────────────────────────────────────────────────┐
│                                                             │
│  ┌────────────────────┐       ┌─────────────────────────┐  │
│  │  Vercel Edge       │       │  Neon                    │  │
│  │  Network / CDN     │       │  Serverless PostgreSQL   │  │
│  │                    │       │                          │  │
│  │  ┌──────────────┐  │       │  - Auto-scaling          │  │
│  │  │  Next.js     │  │──────▶│  - Connection pooling    │  │
│  │  │  (Serverless) │  │       │  - Branching             │  │
│  │  │              │  │       │                          │  │
│  │  └──────────────┘  │       └─────────────────────────┘  │
│  │                    │                                     │
│  └────────────────────┘                                     │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

---

## Security Considerations

### Authentication & Authorization

```
┌─────────────────────────────────────────────────────────┐
│  Recommended: Role-Based Access Control (RBAC)          │
│                                                          │
│  Roles:                                                  │
│  ├── Admin                                               │
│  │   ├── Create/Delete prompt versions                   │
│  │   ├── Delete generations                              │
│  │   └── Manage users                                    │
│  │                                                       │
│  ├── Evaluator                                           │
│  │   ├── View generations                                │
│  │   ├── Assign ratings                                  │
│  │   └── Add notes                                       │
│  │                                                       │
│  └── Viewer (Read-only)                                  │
│      ├── View prompt versions                            │
│      ├── View generations                                │
│      └── View analytics                                  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

### Data Protection

- **Image URLs:** Use signed URLs with expiration for cloud storage
- **Database:** Encrypt at rest and in transit
- **API:** HTTPS only, rate limiting enabled
- **Secrets:** Use environment variables or secret manager

---

## Scalability Patterns

### Horizontal Scaling

| Component     | Strategy                              |
| ------------- | ------------------------------------- |
| API Server    | Stateless, scale behind load balancer |
| Database      | Read replicas for analytics queries   |
| Image Storage | Cloud object storage with CDN         |

### Performance Optimizations

1. **Database Indexes** (already included in schema)
   - Prompt version active lookups
   - Generation filtering by rating/date
   - Image lookups by generation

2. **Caching Layer** (optional)
   - Cache prompt version stats
   - Cache analytics aggregations
   - Redis/Memcached recommended

3. **Pagination**
   - All list endpoints paginated
   - Cursor-based pagination for large datasets

---

## Integration Points

### AI Service Integration

```typescript
interface AIServiceAdapter {
  // Generate images from prompt
  generate(options: {
    systemPrompt: string;
    userPrompt: string;
    inputImages?: string[];
    parameters?: Record<string, unknown>;
  }): Promise<{
    outputUrls: string[];
    metadata: Record<string, unknown>;
  }>;
}
```

### Storage Integration

```typescript
interface StorageAdapter {
  upload(file: Buffer, path: string): Promise<string>;
  getSignedUrl(path: string, expiresIn: number): Promise<string>;
  delete(path: string): Promise<void>;
}
```

---

## Monitoring & Observability

### Recommended Metrics

| Metric                        | Type      | Purpose                    |
| ----------------------------- | --------- | -------------------------- |
| `generations_total`           | Counter   | Track generation volume    |
| `generation_duration_seconds` | Histogram | Monitor AI service latency |
| `rating_distribution`         | Gauge     | Track quality over time    |
| `unrated_generations`         | Gauge     | Monitor evaluation backlog |
| `api_request_duration`        | Histogram | API performance            |

### Logging Strategy

```
Level: INFO
- API requests (method, path, status, duration)
- Generation events (created, rated)

Level: WARN
- Slow queries (> 1s)
- High unrated backlog (> 100)

Level: ERROR
- AI service failures
- Database connection issues
- Image storage errors
```

---

## Future Considerations

### Potential Enhancements

1. **Multi-tenancy** - Support multiple teams/projects
2. **A/B Testing Framework** - Statistical significance testing
3. **Auto-rating** - ML-based quality assessment
4. **Prompt Templates** - Reusable prompt components
5. **Batch Processing** - Queue-based bulk generation
6. **Export/Import** - Data portability features
