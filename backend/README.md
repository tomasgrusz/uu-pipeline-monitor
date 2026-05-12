# UU Pipeline Monitor Backend

Fastify backend with Drizzle ORM, PostgreSQL, TypeScript, and Zod validation.

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL running (via Docker or locally)

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and configure your database connection:

```bash
cp .env.example .env
```

## Development

Start the development server:

```bash
npm run dev
```

The server will run at `http://localhost:3000`

### API Documentation

**Swagger UI** provides interactive API documentation and testing:

```
http://localhost:3000/docs
```

Browse all endpoints, see request/response schemas, and test API calls directly from the browser.

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
├── index.ts      - Main application entry point with Fastify setup
├── db.ts         - Database connection setup
├── schema.ts     - Drizzle ORM table definitions
└── validators.ts - Zod validation schemas
drizzle/         - Auto-generated migrations
```

## Creating API Routes

Example route with Swagger documentation:

```typescript
app.get('/users/:id', {
  schema: {
    description: 'Get a user by ID',
    tags: ['Users'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' }
      }
    },
    response: {
      200: {
        description: 'User found',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' }
        }
      }
    }
  },
  async handler(request, reply) {
    const { id } = request.params as { id: string };
    // Your logic here
    return { id, name: 'John' };
  }
});
```

All routes with schema definitions will automatically appear in the Swagger UI at `/docs`.

## Database Setup

1. Create the PostgreSQL database:

```bash
createdb uu_pipeline_monitor
```

2. Define tables in `src/schema.ts` using Drizzle ORM

3. Generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

Or push schema directly (development only):

```bash
npm run db:push
```

## Type Safety

- **TypeScript** - Full type safety across the application
- **Zod** - Runtime validation for request/response schemas
- **Drizzle ORM** - Type-safe database queries

All API endpoints are automatically documented and type-checked.
