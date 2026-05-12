import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { jobRuns, jobRunSteps } from '../schema';
import { JobRunStatusUpdateSchema } from '../validators';

export async function runRoutes(app: FastifyInstance) {
  // GET /runs - List all job runs
  app.get('/runs', {
    schema: {
      description: 'Get all job runs',
      tags: ['Job Runs'],
      response: {
        200: {
          description: 'List of job runs',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              pipelineId: { type: 'string', format: 'uuid' },
              pipelineVersion: { type: 'integer' },
              status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
              startedAt: { type: 'string', format: 'date-time' },
              finishedAt: { type: 'string', format: 'date-time', nullable: true },
              recordsProcessed: { type: 'integer' },
              errorMessage: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      try {
        const allRuns = await db.select().from(jobRuns);
        return allRuns;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch job runs' });
      }
    },
  });

  // GET /runs/:id - Get job run by ID with steps
  app.get('/runs/:id', {
    schema: {
      description: 'Get a job run by ID with its steps',
      tags: ['Job Runs'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Job run found with steps',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            pipelineVersion: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time', nullable: true },
            recordsProcessed: { type: 'integer' },
            errorMessage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  runId: { type: 'string', format: 'uuid' },
                  name: { type: 'string' },
                  status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
                  startedAt: { type: 'string', format: 'date-time' },
                  finishedAt: { type: 'string', format: 'date-time', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
        404: {
          description: 'Job run not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };

        const run = await db.select().from(jobRuns).where(eq(jobRuns.id, id)).limit(1);

        if (run.length === 0) {
          return reply.status(404).send({ error: 'Job run not found' });
        }

        const steps = await db
          .select()
          .from(jobRunSteps)
          .where(eq(jobRunSteps.runId, id));

        return {
          ...run[0],
          steps,
        };
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch job run' });
      }
    },
  });

  // PATCH /runs/:id - Update job run status
  app.patch('/runs/:id', {
    schema: {
      description: 'Update job run status and metadata',
      tags: ['Job Runs'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      body: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
          finishedAt: { type: 'string', format: 'date-time' },
          recordsProcessed: { type: 'integer' },
          errorMessage: { type: 'string' },
        },
        required: ['status'],
      },
      response: {
        200: {
          description: 'Job run updated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            pipelineVersion: { type: 'integer' },
            status: { type: 'string', enum: ['pending', 'running', 'success', 'failed'] },
            startedAt: { type: 'string', format: 'date-time' },
            finishedAt: { type: 'string', format: 'date-time', nullable: true },
            recordsProcessed: { type: 'integer' },
            errorMessage: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          description: 'Invalid input',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Job run not found',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
      },
    },
    async handler(request, reply) {
      try {
        const { id } = request.params as { id: string };
        const updates = JobRunStatusUpdateSchema.parse(request.body);

        const existing = await db
          .select()
          .from(jobRuns)
          .where(eq(jobRuns.id, id))
          .limit(1);

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Job run not found' });
        }

        const updateData: Record<string, any> = {
          status: updates.status,
        };

        if (updates.finishedAt !== undefined) {
          updateData.finishedAt = updates.finishedAt;
        }
        if (updates.recordsProcessed !== undefined) {
          updateData.recordsProcessed = updates.recordsProcessed;
        }
        if (updates.errorMessage !== undefined) {
          updateData.errorMessage = updates.errorMessage;
        }

        const updated = await db
          .update(jobRuns)
          .set(updateData)
          .where(eq(jobRuns.id, id))
          .returning();

        return updated[0];
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to update job run' });
      }
    },
  });
}
