import { FastifyInstance } from 'fastify';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';
import { UserCreateSchema } from '../validators';

export async function userRoutes(app: FastifyInstance) {
  // GET /users - List all users
  app.get('/users', {
    schema: {
      description: 'Get all users',
      tags: ['Users'],
      response: {
        200: {
          description: 'List of users',
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              email: { type: 'string', format: 'email' },
              role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
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
        const allUsers = await db.select().from(users);
        return allUsers;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch users' });
      }
    },
  });

  // GET /users/:id - Get user by ID
  app.get('/users/:id', {
    schema: {
      description: 'Get a user by ID',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        200: {
          description: 'User found',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'User not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'User not found' },
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
        const user = await db.select().from(users).where(eq(users.id, id)).limit(1);

        if (user.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }

        return user[0];
      } catch (error) {
        reply.status(500).send({ error: 'Failed to fetch user' });
      }
    },
  });

  // POST /users - Create user
  app.post('/users', {
    schema: {
      description: 'Create a new user',
      tags: ['Users'],
      body: {
        type: 'object',
        properties: {
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
        },
        required: ['email'],
      },
      response: {
        201: {
          description: 'User created',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
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
          description: 'Email already exists',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Email already exists' },
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
        const validated = UserCreateSchema.parse(request.body);

        const newUser = await db.insert(users).values(validated).returning();

        reply.status(201);
        return newUser[0];
      } catch (error: any) {
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'Email already exists' });
        }
        if (error.name === 'ZodError') {
          return reply.status(400).send({ error: error.errors[0].message });
        }
        reply.status(500).send({ error: 'Failed to create user' });
      }
    },
  });

  // PUT /users/:id - Update user
  app.put('/users/:id', {
    schema: {
      description: 'Update a user',
      tags: ['Users'],
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
          email: { type: 'string', format: 'email' },
          role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
        },
      },
      response: {
        200: {
          description: 'User updated',
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['admin', 'operator', 'viewer'] },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        404: {
          description: 'User not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'User not found' },
          },
        },
        409: {
          description: 'Email already exists',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Email already exists' },
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

        const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }

        const updateData: Record<string, any> = {};
        if (updates.email) updateData.email = updates.email;
        if (updates.role) updateData.role = updates.role;

        if (Object.keys(updateData).length === 0) {
          return existing[0];
        }

        const updated = await db
          .update(users)
          .set({ ...updateData, updatedAt: new Date() })
          .where(eq(users.id, id))
          .returning();

        return updated[0];
      } catch (error: any) {
        if (error.code === '23505') {
          return reply.status(409).send({ error: 'Email already exists' });
        }
        reply.status(500).send({ error: 'Failed to update user' });
      }
    },
  });

  // DELETE /users/:id - Delete user
  app.delete('/users/:id', {
    schema: {
      description: 'Delete a user',
      tags: ['Users'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
        },
        required: ['id'],
      },
      response: {
        204: {
          description: 'User deleted',
        },
        404: {
          description: 'User not found',
          type: 'object',
          properties: {
            error: { type: 'string', example: 'User not found' },
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

        const existing = await db.select().from(users).where(eq(users.id, id)).limit(1);
        if (existing.length === 0) {
          return reply.status(404).send({ error: 'User not found' });
        }

        await db.delete(users).where(eq(users.id, id));

        reply.status(204);
        return null;
      } catch (error) {
        reply.status(500).send({ error: 'Failed to delete user' });
      }
    },
  });
}
