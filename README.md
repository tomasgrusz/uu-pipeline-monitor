# UU Pipeline Monitor

A modern full-stack application for pipeline monitoring with Fastify backend and PostgreSQL database.

## Quick Start

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **Docker** and **Docker Desktop** ([download](https://www.docker.com/products/docker-desktop))

### 1. Start PostgreSQL with Docker

We provide a convenient script to manage the PostgreSQL container:

```bash
# Start PostgreSQL
./postgres.sh start

# Verify it's running
./postgres.sh status
```

**Connection Details:**

- Host: `localhost`
- Port: `5432`
- Username: `postgres`
- Password: `postgres`
- Database: `uu_pipeline_monitor`

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
{ "status": "ok", "timestamp": "2026-05-12T09:20:00.000Z" }
```

---

## PostgreSQL Docker Management

We've included a helper script for common PostgreSQL operations:

```bash
./postgres.sh start      # Start the container
./postgres.sh stop       # Stop the container
./postgres.sh restart    # Restart the container
./postgres.sh status     # Check if it's running
./postgres.sh logs       # View container logs
./postgres.sh shell      # Open psql shell
```
