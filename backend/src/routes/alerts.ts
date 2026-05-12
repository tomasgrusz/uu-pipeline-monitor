import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { alertRules, alertEvents, pipelines } from '../schema';
import { AlertRuleCreateSchema } from '../validators';

export async function alertRoutes(app: FastifyInstance) {
  // Alert Rules endpoints

  // GET /alert-rules - List all alert rules
  app.get('/alert-rules', {
    schema: {
      description: 'Get all alert rules',
      tags: ['Alert Rules'],
      response: {
        200: {
          description: 'List of alert rules',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              pipelineId: { type: 'string', format: 'uuid' },
              name: { type: 'string' },
              condition: { type: 'string' },
              enabled: { type: 'boolean' },
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
        const allRules = await db.select().from(alertRules);
        return allRules;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch alert rules' });
      }
    },
  });

  // GET /alert-rules/:id - Get alert rule by ID
  app.get('/alert-rules/:id', {
    schema: {
      description: 'Get an alert rule by ID',
      tags: ['Alert Rules'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Alert rule found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            condition: { type: 'string' },
            enabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Alert rule not found',
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
        const rule = await db
          .select()
          .from(alertRules)
          .where(eq(alertRules.id, id))
          .limit(1);

        if (rule.length === 0) {
          return reply.status(404).send({ error: 'Alert rule not found' });
        }

        return rule[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch alert rule' });
      }
    },
  });

  // POST /alert-rules - Create alert rule
  app.post('/alert-rules', {
    schema: {
      description: 'Create a new alert rule',
      tags: ['Alert Rules'],
      body: {
        type: 'object',
        properties: {
          pipelineId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          condition: { type: 'string' },
          enabled: { type: 'boolean' },
        },
        required: ['pipelineId', 'name', 'condition'],
      },
      response: {
        201: {
          description: 'Alert rule created',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            condition: { type: 'string' },
            enabled: { type: 'boolean' },
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
        const validated = AlertRuleCreateSchema.parse(request.body);

        // Verify pipeline exists
        const pipeline = await db
          .select()
          .from(pipelines)
          .where(eq(pipelines.id, validated.pipelineId))
          .limit(1);

        if (pipeline.length === 0) {
          return reply.status(404).send({ error: 'Pipeline not found' });
        }

        const newRule = await db.insert(alertRules).values(validated).returning();

        reply.status(201);
        return newRule[0];
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to create alert rule' });
      }
    },
  });

  // PUT /alert-rules/:id - Update alert rule
  app.put('/alert-rules/:id', {
    schema: {
      description: 'Update an alert rule',
      tags: ['Alert Rules'],
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
          condition: { type: 'string' },
          enabled: { type: 'boolean' },
        },
      },
      response: {
        200: {
          description: 'Alert rule updated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            pipelineId: { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            condition: { type: 'string' },
            enabled: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Alert rule not found',
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
          .from(alertRules)
          .where(eq(alertRules.id, id))
          .limit(1);

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Alert rule not found' });
        }

        const updateData: Record<string, any> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.condition !== undefined) updateData.condition = updates.condition;
        if (updates.enabled !== undefined) updateData.enabled = updates.enabled;

        if (Object.keys(updateData).length === 0) {
          return existing[0];
        }

        const updated = await db
          .update(alertRules)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(alertRules.id, id))
          .returning();

        return updated[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to update alert rule' });
      }
    },
  });

  // DELETE /alert-rules/:id - Delete alert rule
  app.delete('/alert-rules/:id', {
    schema: {
      description: 'Delete an alert rule',
      tags: ['Alert Rules'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'Alert rule deleted',
        },
        404: {
          description: 'Alert rule not found',
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
          .from(alertRules)
          .where(eq(alertRules.id, id))
          .limit(1);

        if (existing.length === 0) {
          return reply.status(404).send({ error: 'Alert rule not found' });
        }

        await db.delete(alertRules).where(eq(alertRules.id, id));

        reply.status(204);
        return null;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to delete alert rule' });
      }
    },
  });

  // Alert Events endpoints (read-only)

  // GET /alert-events - List all alert events
  app.get('/alert-events', {
    schema: {
      description: 'Get all alert events',
      tags: ['Alert Events'],
      response: {
        200: {
          description: 'List of alert events',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              ruleId: { type: 'string', format: 'uuid' },
              runId: { type: 'string', format: 'uuid' },
              message: { type: 'string' },
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
        const allEvents = await db.select().from(alertEvents);
        return allEvents;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch alert events' });
      }
    },
  });

  // GET /alert-events/:id - Get alert event by ID
  app.get('/alert-events/:id', {
    schema: {
      description: 'Get an alert event by ID',
      tags: ['Alert Events'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'Alert event found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            ruleId: { type: 'string', format: 'uuid' },
            runId: { type: 'string', format: 'uuid' },
            message: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'Alert event not found',
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
        const event = await db
          .select()
          .from(alertEvents)
          .where(eq(alertEvents.id, id))
          .limit(1);

        if (event.length === 0) {
          return reply.status(404).send({ error: 'Alert event not found' });
        }

        return event[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch alert event' });
      }
    },
  });
}
