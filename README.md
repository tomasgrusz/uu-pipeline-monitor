# UU Pipeline Monitor

A modern full-stack application for asynchronous pipeline monitoring with Fastify backend, PostgreSQL database, and RabbitMQ message queue.

## Quick Start

### Prerequisites

- **Node.js** 18+
- **Docker** and **Docker Desktop**

### 1. Start Services (PostgreSQL + RabbitMQ)

Use a convenient script to manage both services:

```bash
# Navigate to backend folder
cd backend

# Start PostgreSQL and RabbitMQ
./docker.sh start

# Verify they're running
./docker.sh status
```

**Connection Details:**

**PostgreSQL:**

- Host: `localhost:5432`
- Username: `postgres`
- Password: `postgres`
- Database: `uu_pipeline_monitor`

**RabbitMQ:**

- AMQP: `amqp://guest:guest@localhost:5672`
- Management UI: `http://localhost:15672`

### 2. Start the Backend

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The server runs at `http://localhost:3000`

### 3. Test the Connection

```bash
curl http://localhost:3000/health
```

You should see:

```json
{ "status": "ok", "timestamp": "2026-05-12T11:37:24.495Z" }
```

Swagger UI should be accessible at `http://localhost:3000/docs`.
RabbitMQ UI should be accessible at `http://localhost:15672/`.

### 4. Start the Frontend

The project includes a Next.js frontend in the `frontend/` folder. By default the frontend will also try to use port 3000, so run it on a different port (e.g. `3001`) while the backend is running.

```bash
# Install frontend deps
cd frontend
npm install

# Start development server on port 3001
npm run dev -- -p 3001
```

Open the UI at `http://localhost:3001`.

Frontend environment variables:

```bash
# Point the frontend at the backend API (default: http://localhost:3000)
NEXT_PUBLIC_API_URL=http://localhost:3000
```

Build and start the production frontend:

```bash
cd frontend
npm run build
npm run start -- -p 3001
```

---

## Docker Services Management

Included is a helper script for common operations:

```bash
./docker.sh start        # Start PostgreSQL and RabbitMQ
./docker.sh stop         # Stop both services
./docker.sh restart      # Restart both services
./docker.sh status       # Check service status
./docker.sh logs         # View PostgreSQL logs
./docker.sh logs rabbitmq # View RabbitMQ logs
./docker.sh shell        # Open PostgreSQL shell
./docker.sh rabbitmq     # Open RabbitMQ management UI
```

## Architecture

The system uses RabbitMQ for asynchronous pipeline execution and node-cron for scheduled execution:

```
Manual Trigger          RabbitMQ Queue        Worker Process
┌──────────────┐        ┌─────────────────┐   ┌──────────────┐
│ POST /trigger│ ────> │ pipeline.runs   │ ──> │ Process Job │
└──────────────┘        │ (Durable Queue) │   └──────────────┘
                        └─────────────────┘
                              ^
                              │
                        Cron Scheduler
                     (Based on schedule)
```

- **Trigger Endpoint**: `POST /pipelines/{id}/trigger` publishes to queue (manual execution)
- **Cron Scheduler**: Automatically triggers pipelines based on their cron schedule (e.g., `0 2 * * *` for 2 AM daily)
- **Worker**: Consumes messages and executes pipelines
- **Database**: Tracks pipeline runs and alert events
- **Alerts**: Evaluated after each run completes

Interactive API documentation available at:

```
http://localhost:3000/docs
```

## Type Safety

- **TypeScript** - Full type safety across the application
- **Zod** - Runtime validation for request/response schemas
- **Drizzle ORM** - Type-safe database queries
- **amqplib** - Type-safe RabbitMQ integration

All API endpoints are automatically documented and type-checked.

## Scheduling

Pipelines can be scheduled to run automatically using cron expressions:

### How It Works

1. Each pipeline has an optional `schedule` field (cron expression format)
2. The cron scheduler starts when the backend server starts
3. At the scheduled time, the scheduler automatically publishes a message to RabbitMQ
4. The worker processes the message and executes the pipeline just like a manual trigger

### Cron Expression Format

- `0 2 * * *` - Every day at 2:00 AM
- `0 * * * *` - Every hour at minute 0
- `30 1 * * *` - Every day at 1:30 AM
- `0 0 * * MON` - Every Monday at midnight
- `*/5 * * * *` - Every 5 minutes

See [crontab.guru](https://crontab.guru/) for more examples.

### Updating Schedules

When you update a pipeline's schedule via the API, the scheduler automatically reschedules the job:

```bash
# Update a pipeline's schedule
curl -X PUT http://localhost:3000/pipelines/{id} \
  -H "Content-Type: application/json" \
  -d '{ "schedule": "0 3 * * *" }'
```

Invalid cron expressions will be rejected with a 400 error.

## Mock Data Seeding

This directory contains scripts to seed the database with test data for development and testing.

### mockData.ts

Seeds the database with realistic test data:

- **3 Users** - admin, operator, viewer roles
- **3 Datasets** - customer-transactions, product-inventory, user-analytics
- **9 Pipelines** - 3 pipelines per dataset
- **18 Pipeline Versions** - 2 versions per pipeline
- **6 Alert Rules** - Alert rules for selected pipelines

**Usage:**

```bash
npm run db:seed
```

### runPipelines.ts

Triggers all pipelines to create sample job runs and track their execution:

- Connects to RabbitMQ
- Gets all active pipelines from database
- Publishes a trigger message for each pipeline
- Creates job runs that can be monitored in real-time

**Usage:**

```bash
npm run db:run-pipelines
```

**Note:** Run `db:seed` before `db:run-pipelines`

## Environment Variables

```bash
# RabbitMQ connection
RABBITMQ_URL=amqp://[username]:[password]@[host]:[port]

# Database
DATABASE_URL=postgresql://[user]:[password]@[host]/[database]

# Server
PORT=3000
NODE_ENV=development
DEBUG_SCHEDULER=true  # Optional logging
```
