import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { HealthCheckSchema } from './validators';
import { userRoutes } from './routes/users';
import { datasetRoutes } from './routes/datasets';
import { pipelineRoutes } from './routes/pipelines';
import { runRoutes } from './routes/runs';
import { alertRoutes } from './routes/alerts';
import { connectRabbitMQ, consumePipelineRuns, disconnectRabbitMQ } from './services/rabbitmq';
import { handlePipelineRun } from './services/pipelineWorker';
import { startCronScheduler, stopCronScheduler } from './services/cronScheduler';

const app = Fastify({
  logger: true,
});

await app.register(fastifyCors, {
  origin: ['http://localhost:3001', 'http://127.0.0.1:3001'],
});

// Register Swagger
await app.register(fastifySwagger, {
  swagger: {
    info: {
      title: 'UU Pipeline Monitor API',
      description: 'API documentation for UU Pipeline Monitor',
      version: '1.0.0',
    },
    host: 'localhost:3000',
    schemes: ['http'],
    consumes: ['application/json'],
    produces: ['application/json'],
  },
});

// Register Swagger UI
await app.register(fastifySwaggerUi, {
  routePrefix: '/docs',
});

// Health check route
app.get('/health', {
  schema: {
    description: 'Health check endpoint - verifies server and database connection',
    tags: ['Health'],
    response: {
      200: {
        description: 'Server is healthy',
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
          timestamp: { type: 'string', example: '2026-05-12T09:40:00.000Z' },
        },
      },
      503: {
        description: 'Database connection failed',
        type: 'object',
        properties: {
          error: { type: 'string', example: 'Database connection failed' },
        },
      },
    },
  },
  async handler(request, reply) {
    try {
      await db.execute(sql`SELECT 1`);

      const response = HealthCheckSchema.parse({
        status: 'ok',
        timestamp: new Date().toISOString(),
      });

      return response;
    } catch (error) {
      reply.status(503).send({ error: 'Database connection failed' });
    }
  },
});

// Register routes
await userRoutes(app);
await datasetRoutes(app);
await pipelineRoutes(app);
await runRoutes(app);
await alertRoutes(app);

// Start server
const start = async () => {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Start consuming pipeline run messages
    await consumePipelineRuns(handlePipelineRun);

    // Start cron scheduler for scheduled pipelines
    await startCronScheduler();

    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('✅ Server running at http://localhost:3000');
    console.log('📚 Swagger UI available at http://localhost:3000/docs');
  } catch (err) {
    app.log.error(err);
    stopCronScheduler();
    await disconnectRabbitMQ();
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received, shutting down gracefully...');
  stopCronScheduler();
  await disconnectRabbitMQ();
  await app.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully...');
  stopCronScheduler();
  await disconnectRabbitMQ();
  await app.close();
  process.exit(0);
});

start();
