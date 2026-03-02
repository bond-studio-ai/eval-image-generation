# Getting Started

## Prerequisites

- Node.js 18+
- [Yarn](https://yarnpkg.com/) package manager
- A PostgreSQL database (e.g. [Amazon RDS](https://aws.amazon.com/rds/))

---

## Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ai-image-generator-admin
```

### 2. Install Dependencies

```bash
yarn
```

### 3. Set Up Database

Configure your PostgreSQL database (e.g. Amazon RDS). Ensure it accepts connections on port 5432 and supports SSL.

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Set the PG* environment variables from your database connection details:

```bash
PGHOST=your-db-host.rds.amazonaws.com
PGPORT=5432
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=eval_image_generation
PGSSLMODE=require
```

Using separate PG* vars supports password rotation—the app reads credentials on each connection.

### 5. Push Database Schema

```bash
yarn db:push
```

This uses Drizzle Kit to push the schema defined in `src/db/schema.ts` directly to your database.

### 6. Start Development Server

```bash
yarn dev
```

The application will start at [http://localhost:3000](http://localhost:3000).

---

## Project Structure

```
ai-image-generator-admin/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── layout.tsx              # Root layout with sidebar
│   │   ├── page.tsx                # Dashboard
│   │   ├── globals.css             # Global styles + Tailwind
│   │   ├── api/v1/                 # API route handlers
│   │   │   ├── prompt-versions/    # CRUD for prompt versions
│   │   │   ├── generations/        # CRUD for generations + rating
│   │   │   ├── images/             # Image deletion
│   │   │   └── analytics/          # Rating distribution, trends
│   │   ├── analytics/              # Analytics dashboard page
│   │   ├── generations/            # Generation list + detail pages
│   │   └── prompt-versions/        # Prompt version list + CRUD pages
│   ├── components/                 # Shared UI components
│   │   ├── sidebar.tsx             # Navigation sidebar
│   │   ├── rating-badge.tsx        # Color-coded rating display
│   │   ├── pagination.tsx          # Pagination controls
│   │   ├── empty-state.tsx         # Empty state placeholder
│   │   └── loading-state.tsx       # Loading spinner
│   ├── db/                         # Database layer
│   │   ├── schema.ts              # Drizzle ORM schema definitions
│   │   └── index.ts               # Database client (PostgreSQL + Drizzle)
│   └── lib/                        # Shared utilities
│       ├── api-response.ts         # Consistent API response helpers
│       └── validation.ts           # Zod validation schemas
├── database/
│   └── schema.sql                  # Reference SQL schema
├── docs/                           # Documentation
├── drizzle.config.ts               # Drizzle Kit configuration
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

---

## Database Management

### Push Schema Changes

When you modify `src/db/schema.ts`, push changes to the database:

```bash
yarn db:push
```

### Generate Migrations

For production environments, generate migration files:

```bash
yarn db:generate
yarn db:migrate
```

### Inspect Database

Use Drizzle Studio to browse your data:

```bash
yarn db:studio
```

---

## Development Workflow

### Creating a Prompt Version

1. Navigate to **Prompt Versions** in the sidebar
2. Click **New Prompt Version**
3. Fill in the system prompt, user prompt, and model settings
4. Click **Create**

### Recording a Generation

Use the API to record generation results:

```bash
curl -X POST http://localhost:3000/api/v1/generations \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_version_id": "<uuid>",
    "output_images": [
      {"url": "https://example.com/output.jpg"}
    ]
  }'
```

### Rating a Generation

1. Navigate to **Generations** in the sidebar
2. Click on a generation to view details
3. Use the rating buttons to assign a quality rating

---

## Code Quality

### Linting

```bash
yarn lint
```

### Formatting

```bash
yarn format        # Fix formatting
yarn format:check  # Check formatting
```

---

## Troubleshooting

### Database Connection Issues

- Verify PGHOST, PGUSER, PGPASSWORD, PGDATABASE are set and PGSSLMODE=require
- Ensure the database is running and accepting connections
- Check security groups / firewall allow connections from your IP

### Build Errors

```bash
# Clear Next.js cache and rebuild
rm -rf .next
yarn build
```

---

## Next Steps

1. Read the [API specification](API.md) for all available endpoints
2. Review the [Architecture](ARCHITECTURE.md) for system design details
3. Check the [Database Schema](README.md) for table definitions
