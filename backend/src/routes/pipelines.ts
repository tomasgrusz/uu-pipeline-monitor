import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { pipelines, pipelineVersions, datasets } from '../schema';
import { PipelineCreateSchema, PipelineVersionCreateSchema } from '../validators';
import { publishPipelineRun } from '../services/rabbitmq';
import { reschedulePipeline, isValidCronExpression } from '../services/cronScheduler';

export async function pipelineRoutes(app: FastifyInstance) {
  // Pipelines endpoints

  // GET /pipelines - List all pipelines
  app.get('/pipelines', {
    schema: {
      description: 'Get all pipelines',
      tags: ['Pipelines'],
      response: {
        200: {
          description: 'List of pipelines',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              datasetId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              schedule: { type: 'string', nullable: true },
              active: { type: 'boolean' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
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
        const allPipelines = await db.select().from(pipelines);
        return allPipelines;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch pipelines' });
      }
    },
  });

  // GET /pipelines/:id - Get pipeline by ID
  app.get('/pipelines/:id', {
    schema: {
      description: 'Get a pipeline by ID',
      tags: ['Pipelines'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Pipeline found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            datasetId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            schedule: { type: 'string', nullable: true },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Pipeline not found',
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
        const pipeline = await db
          .select()
          .from(pipelines)
          .where(eq(pipelines.id, id))
          .limit(1);

        if (pipeline.length === 0) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        return pipeline[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch pipeline' });
      }
    },
  });

  // POST /pipelines - Create pipeline
  app.post('/pipelines', {
    schema: {
      description: 'Create a new pipeline',
      tags: ['Pipelines'],
      body: {
        type: 'object',
        properties: {
          datasetId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          schedule: { type: 'string' },
          active: { type: 'boolean' },
        },
        required: ['datasetId', 'name'],
      },
      response: {
        201: {
          description: 'Pipeline created',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            datasetId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            schedule: { type: 'string', nullable: true },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
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
          description: 'Dataset not found',
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
        const validated = PipelineCreateSchema.parse(request.body);

        // Verify dataset exists
        const dataset = await db
          .select()
          .from(datasets)
          .where(eq(datasets.id, validated.datasetId))
          .limit(1);

        if (dataset.length === 0) {
          return reply.status(404).send({ error: 'Dataset not found' });
        }

        const newPipeline = await db.insert(pipelines).values(validated).returning();

        reply.status(201);
        return newPipeline[0];
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to create pipeline' });
      }
    },
  });

  // PUT /pipelines/:id - Update pipeline
  app.put('/pipelines/:id', {
    schema: {
      description: 'Update a pipeline',
      tags: ['Pipelines'],
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
          datasetId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string' },
          schedule: { type: 'string' },
          active: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Pipeline updated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            datasetId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            schedule: { type: 'string', nullable: true },
            active: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        400: {
          description: 'Invalid cron expression',
          type: 'object',
          properties: {
            error: { type: 'string' },
          },
        },
        404: {
          description: 'Pipeline or Dataset not found',
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
        const updates = request.body as Record<string, any>;

        const existing = await db
          .select()
          .from(pipelines)
          .where(eq(pipelines.id, id))
          .limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        // If updating datasetId, verify new dataset exists
        if (updates.datasetId) {
          const dataset = await db
            .select()
            .from(datasets)
            .where(eq(datasets.id, updates.datasetId))
            .limit(1);
          if (dataset.length === 0) {
            return reply.status(404).send({ error: 'Dataset not found' });
          }
        }

        const updateData: Record<string, any> = {};
        if (updates.datasetId !== undefined) updateData.datasetId = updates.datasetId;
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.schedule !== undefined) {
          // Validate cron expression if schedule is being updated
          if (updates.schedule && !isValidCronExpression(updates.schedule)) {
            return reply
              .status(400)
              .send({ error: 'Invalid cron expression format' });
          }
          updateData.schedule = updates.schedule;
        }
        if (updates.active !== undefined) updateData.active = updates.active;

        if (Object.keys(updateData).length === 0) {
          return existing[0];
        }

        const updated = await db
          .update(pipelines)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(pipelines.id, id))
          .returning();

        // Reschedule if schedule was updated
        if (updates.schedule !== undefined) {
          await reschedulePipeline(id);
        }

        return updated[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to update pipeline' });
      }
    },
  });

  // DELETE /pipelines/:id - Delete pipeline
  app.delete('/pipelines/:id', {
    schema: {
      description: 'Delete a pipeline',
      tags: ['Pipelines'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Pipeline deleted',
        },
        404: {
          description: 'Pipeline not found',
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

        const existing = await db
          .select()
          .from(pipelines)
          .where(eq(pipelines.id, id))
          .limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        await db.delete(pipelines).where(eq(pipelines.id, id));

        reply.status(204);
        return null;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to delete pipeline' });
      }
    },
  });

  // Pipeline Versions endpoints

  // GET /pipeline-versions - List all pipeline versions
  app.get('/pipeline-versions', {
    schema: {
      description: 'Get all pipeline versions',
      tags: ['Pipeline Versions'],
      response: {
        200: {
          description: 'List of pipeline versions',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              pipelineId: { type: 'string', format: 'uuid' },
              version: { type: 'integer' },
              config: { type: 'object' },
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
        const allVersions = await db.select().from(pipelineVersions);
        return allVersions;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch pipeline versions' });
      }
    },
  });

  // GET /pipeline-versions/:id - Get pipeline version by ID
  app.get('/pipeline-versions/:id', {
    schema: {
      description: 'Get a pipeline version by ID',
      tags: ['Pipeline Versions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Pipeline version found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            config: { type: 'object' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Pipeline version not found',
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
        const version = await db
          .select()
          .from(pipelineVersions)
          .where(eq(pipelineVersions.id, id))
          .limit(1);

        if (version.length === 0) {
          return reply.status(404).send({ error: 'Pipeline version not found' });
        }

        return version[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch pipeline version' });
      }
    },
  });

  // POST /pipeline-versions - Create pipeline version
  app.post('/pipeline-versions', {
    schema: {
      description: 'Create a new pipeline version',
      tags: ['Pipeline Versions'],
      body: {
        type: 'object',
        properties: {
          pipelineId: { type: 'string', format: 'uuid' },
          version: { type: 'integer' },
          config: { type: 'object' },
        },
        required: ['pipelineId', 'version', 'config'],
      },
      response: {
        201: {
          description: 'Pipeline version created',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            version: { type: 'integer' },
            config: { type: 'object' },
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
          description: 'Pipeline not found',
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
        const validated = PipelineVersionCreateSchema.parse(request.body);

        // Verify pipeline exists
        const pipeline = await db
          .select()
          .from(pipelines)
          .where(eq(pipelines.id, validated.pipelineId))
          .limit(1);

        if (pipeline.length === 0) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        const newVersion = await db
          .insert(pipelineVersions)
          .values(validated)
          .returning();

        reply.status(201);
        return newVersion[0];
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to create pipeline version' });
      }
    },
  });

  // DELETE /pipeline-versions/:id - Delete pipeline version
  app.delete('/pipeline-versions/:id', {
    schema: {
      description: 'Delete a pipeline version',
      tags: ['Pipeline Versions'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Pipeline version deleted',
        },
        404: {
          description: 'Pipeline version not found',
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

        const existing = await db
          .select()
          .from(pipelineVersions)
          .where(eq(pipelineVersions.id, id))
          .limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Pipeline version not found' });
        }

        await db.delete(pipelineVersions).where(eq(pipelineVersions.id, id));

        reply.status(204);
        return null;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to delete pipeline version' });
      }
    },
  });

   // POST /pipelines/:id/trigger - Trigger a pipeline run
   app.post('/pipelines/:id/trigger', {
     schema: {
       description: 'Manually trigger a pipeline run',
       tags: ['Pipelines'],
       params: {
         type: 'object',
         properties: {
           id: { type: 'string', format: 'uuid' },
         },
         required: ['id'],
       },
       response: {
         201: {
           description: 'Job run created',
           type: 'object',
           properties: {
             runId: { type: 'string', format: 'uuid' },
             pipelineId: { type: 'string', format: 'uuid' },
             status: { type: 'string' },
             message: { type: 'string' },
           },
         },
         404: {
           description: 'Pipeline or version not found',
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

          // Verify pipeline exists and has a version
          const pipeline = await db
            .select()
            .from(pipelines)
            .where(eq(pipelines.id, id))
            .limit(1);

          if (pipeline.length === 0) {
            return reply.status(404).send({ error: 'Pipeline not found' });
          }

          // Verify pipeline has at least one version
          const pipelineVersion = await db
            .select()
            .from(pipelineVersions)
            .where(eq(pipelineVersions.pipelineId, id))
            .limit(1);

          if (pipelineVersion.length === 0) {
            return reply.status(404).send({ error: 'No pipeline versions found' });
          }

          // Publish to RabbitMQ queue
          await publishPipelineRun(id, pipelineVersion[0].version);

          reply.code(201);
          return {
            pipelineId: id,
            status: 'queued',
            message: 'Pipeline run queued for execution',
          };
        } catch (error: any) {
          if (error.message.includes('No pipeline versions')) {
            return reply.status(404).send({ error: error.message });
          }
          reply.status(500).send({ error: 'Failed to queue pipeline run' });
        }
      },
    });
}
