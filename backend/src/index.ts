import Fastify from 'fastify';
import { sql } from 'drizzle-orm';
import { db } from './db';
import { HealthCheckSchema } from './validators';

const app = Fastify({
  logger: true,
});

// Health check route
app.get('/health', async (request, reply) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    
    const response = HealthCheckSchema.parse({
      status: 'ok',
      timestamp: new Date().toISOString(),
    });
    
    return response;
  } catch (error) {
    reply.status(503).send({ error: 'Database connection failed' });
  }
});

// Start server
const start = async () => {
  try {
    await app.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server running at http://localhost:3000');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
