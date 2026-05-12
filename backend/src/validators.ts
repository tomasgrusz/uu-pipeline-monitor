import { z } from 'zod';

// Health check response
export const HealthCheckSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;

// User role enum
export const UserRoleSchema = z.enum(['admin', 'operator', 'viewer']);
export type UserRole = z.infer<typeof UserRoleSchema>;

// User schemas
export const UserCreateSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: UserRoleSchema.default('viewer'),
});

export type UserCreate = z.infer<typeof UserCreateSchema>;

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: UserRoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

// Dataset schemas
export const DatasetCreateSchema = z.object({
  name: z.string().min(1, 'Dataset name is required'),
  description: z.string().optional(),
  owner: z.string().min(1, 'Owner is required'),
  schemaVersion: z.number().int().positive().default(1),
});

export type DatasetCreate = z.infer<typeof DatasetCreateSchema>;

export const DatasetSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  owner: z.string(),
  schemaVersion: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Dataset = z.infer<typeof DatasetSchema>;

