import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { datasets } from '../schema';
import { DatasetCreateSchema } from '../validators';

export async function datasetRoutes(app: FastifyInstance) {
  // GET /datasets - List all datasets
  app.get('/datasets', {
    schema: {
      description: 'Get all datasets',
      tags: ['Datasets'],
      response: {
        200: {
          description: 'List of datasets',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              description: { type: 'string', nullable: true },
              owner: { type: 'string' },
              schemaVersion: { type: 'integer' },
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
        const allDatasets = await db.select().from(datasets);
        return allDatasets;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch datasets' });
      }
    },
  });

  // GET /datasets/:id - Get dataset by ID
  app.get('/datasets/:id', {
    schema: {
      description: 'Get a dataset by ID',
      tags: ['Datasets'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Dataset found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            owner: { type: 'string' },
            schemaVersion: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Dataset not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Dataset not found' },
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
        const dataset = await db
          .select()
          .from(datasets)
          .where(eq(datasets.id, id))
          .limit(1);

        if (dataset.length === 0) {
          return reply.status(404).send({ error: 'Dataset not found' });
        }

        return dataset[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch dataset' });
      }
    },
  });

  // POST /datasets - Create dataset
  app.post('/datasets', {
    schema: {
      description: 'Create a new dataset',
      tags: ['Datasets'],
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          owner: { type: 'string' },
          schemaVersion: { type: 'integer' },
        },
        required: ['name', 'owner'],
      },
      response: {
        201: {
          description: 'Dataset created',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            owner: { type: 'string' },
            schemaVersion: { type: 'integer' },
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
        409: {
          description: 'Dataset name already exists',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Dataset name already exists' },
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
        const validated = DatasetCreateSchema.parse(request.body);

        const newDataset = await db.insert(datasets).values(validated).returning();

        reply.status(201);
        return newDataset[0];
      } catch (error: any) {
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'Dataset name already exists' });
        }
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to create dataset' });
      }
    },
  });

  // PUT /datasets/:id - Update dataset
  app.put('/datasets/:id', {
    schema: {
      description: 'Update a dataset',
      tags: ['Datasets'],
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
          name: { type: 'string' },
          description: { type: 'string' },
          owner: { type: 'string' },
          schemaVersion: { type: 'integer' },
        },
      },
      response: {
        200: {
          description: 'Dataset updated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            description: { type: 'string', nullable: true },
            owner: { type: 'string' },
            schemaVersion: { type: 'integer' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Dataset not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Dataset not found' },
          },
        },
        409: {
          description: 'Dataset name already exists',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Dataset name already exists' },
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
          .from(datasets)
          .where(eq(datasets.id, id))
          .limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Dataset not found' });
        }

        const updateData: Record<string, any> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.owner !== undefined) updateData.owner = updates.owner;
        if (updates.schemaVersion !== undefined) updateData.schemaVersion = updates.schemaVersion;

        if (Object.keys(updateData).length === 0) {
          return existing[0];
        }

        const updated = await db
          .update(datasets)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(datasets.id, id))
          .returning();

        return updated[0];
      } catch (error: any) {
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'Dataset name already exists' });
        }
        reply.status(500).send({ error: 'Failed to update dataset' });
      }
    },
  });

  // DELETE /datasets/:id - Delete dataset
  app.delete('/datasets/:id', {
    schema: {
      description: 'Delete a dataset',
      tags: ['Datasets'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Dataset deleted',
        },
        404: {
          description: 'Dataset not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Dataset not found' },
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
          .from(datasets)
          .where(eq(datasets.id, id))
          .limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Dataset not found' });
        }

        await db.delete(datasets).where(eq(datasets.id, id));

        reply.status(204);
        return null;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to delete dataset' });
      }
    },
  });
}
