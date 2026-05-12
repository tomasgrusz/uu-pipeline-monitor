# UU Pipeline Monitor Backend

Fastify backend with Drizzle ORM, PostgreSQL, TypeScript, and Zod validation.

## Setup

### Prerequisites

- Node.js 18+
- PostgreSQL running locally

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure your database connection:

```bash
cp .env.example .env
```

### Database Setup

1. Create the PostgreSQL database:

```bash
createdb uu_pipeline_monitor
```

2. Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

## Development

Start the development server:

```bash
npm run dev
```

The server will run at `http://localhost:3000`

### API Endpoints

- `GET /health` - Health check endpoint (tests database connection)

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production build
- `npm run db:generate` - Generate migrations from schema changes
- `npm run db:migrate` - Run pending migrations
- `npm run db:push` - Push schema changes to database (development only)
- `npm run db:studio` - Open Drizzle Studio for database inspection

## Project Structure

```
src/
├── index.ts      - Main application entry point
├── db.ts         - Database connection setup
├── schema.ts     - Drizzle ORM table definitions
└── validators.ts - Zod validation schemas
drizzle/         - Auto-generated migrations
```
