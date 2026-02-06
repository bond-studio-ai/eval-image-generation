# AI Image Generator Admin

A quality assurance and testing platform for evaluating AI image generation results based on input images and prompts.

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, TypeScript)
- **Database**: [Neon](https://neon.tech/) (Serverless PostgreSQL)
- **ORM**: [Drizzle](https://orm.drizzle.team/) with Neon Serverless Driver
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Validation**: [Zod](https://zod.dev/)

## Quick Start

```bash
# Install dependencies
yarn

# Copy environment file and add your Neon connection string
cp .env.example .env.local

# Push schema to database
yarn db:push

# Start development server
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the admin dashboard.

## Scripts

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `yarn dev`           | Start development server        |
| `yarn build`         | Build for production            |
| `yarn start`         | Start production server         |
| `yarn lint`          | Run ESLint                      |
| `yarn format`        | Format code with Prettier       |
| `yarn db:push`       | Push schema changes to database |
| `yarn db:generate`   | Generate migration files        |
| `yarn db:migrate`    | Run migrations                  |
| `yarn db:studio`     | Open Drizzle Studio             |

## Documentation

- [Getting Started](docs/GETTING_STARTED.md) - Setup and development guide
- [API Specification](docs/API.md) - REST API endpoints
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Database Schema](docs/README.md) - Schema documentation

## Project Structure

```
ai-image-generator-admin/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/v1/             # API route handlers
│   │   ├── analytics/          # Analytics page
│   │   ├── generations/        # Generations pages
│   │   └── prompt-versions/    # Prompt version pages
│   ├── components/             # Shared UI components
│   ├── db/                     # Drizzle schema and client
│   └── lib/                    # Utilities and validation
├── database/                   # Reference SQL schema
├── docs/                       # Project documentation
├── drizzle/                    # Generated migrations
└── drizzle.config.ts           # Drizzle Kit configuration
```
