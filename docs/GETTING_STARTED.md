# Getting Started

## Prerequisites

- Node.js 18+
- [Yarn](https://yarnpkg.com/) package manager
- A [Neon](https://neon.tech/) account (free tier available)

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

### 3. Set Up Neon Database

1. Create a free account at [neon.tech](https://neon.tech/)
2. Create a new project
3. Copy the connection string from the dashboard

### 4. Configure Environment Variables

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Update the `DATABASE_URL` with your Neon connection string:

```bash
DATABASE_URL=postgresql://user:password@ep-example-123456.us-east-2.aws.neon.tech/ai_gen_admin?sslmode=require
```

### 5. Push Database Schema

```bash
yarn db:push
```

This uses Drizzle Kit to push the schema defined in `src/db/schema.ts` directly to your Neon database.

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
│   │   └── index.ts               # Database client (Neon + Drizzle)
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

- Verify your `DATABASE_URL` in `.env.local` includes `?sslmode=require`
- Ensure your Neon project is active (free tier projects may pause after inactivity)
- Check the Neon dashboard for connection limits

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
