# UU Pipeline Monitor

A modern full-stack application for asynchronous pipeline monitoring with Fastify backend, PostgreSQL database, and RabbitMQ message queue.

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Docker** and **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop))

### 1. Start Services (PostgreSQL + RabbitMQ)

We provide a convenient script to manage both services:

```bash
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
cd backend

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

---

## Docker Services Management

We've included a helper script for common operations:

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

The system uses RabbitMQ for asynchronous pipeline execution:

```
API Request          RabbitMQ Queue        Worker Process
┌──────────────┐     ┌─────────────────┐   ┌──────────────┐
│ POST /trigger│ ──> │ pipeline.runs   │ ──> │ Process Job │
└──────────────┘     │ (Durable Queue) │   └──────────────┘
                     └─────────────────┘
```

- **Trigger Endpoint**: `POST /pipelines/{id}/trigger` publishes to queue
- **Worker**: Consumes messages and executes pipelines
- **Database**: Tracks pipeline runs and alert events
- **Alerts**: Evaluated after each run completes

## API Documentation

Interactive API documentation available at:
```
http://localhost:3000/docs
```

### Key Endpoints

**Pipeline Execution:**
- `POST /pipelines/:id/trigger` - Queue a pipeline run
- `GET /runs` - List all job runs
- `GET /runs/:id` - View run details (includes steps)
- `PATCH /runs/:id` - Update run status

**Configuration:**
- `GET/POST /pipelines` - Manage pipelines
- `GET/POST /pipeline-versions` - Manage versions
- `GET/POST /alert-rules` - Manage alert rules

## Type Safety

- **TypeScript** - Full type safety across the application
- **Zod** - Runtime validation for request/response schemas
- **Drizzle ORM** - Type-safe database queries
- **amqplib** - Type-safe RabbitMQ integration

All API endpoints are automatically documented and type-checked.

## Documentation

- **[RabbitMQ Setup Guide](./RABBITMQ_SETUP.md)** - Detailed RabbitMQ architecture and examples
- **[Infrastructure Guide](./INFRASTRUCTURE.md)** - System components and workflows
