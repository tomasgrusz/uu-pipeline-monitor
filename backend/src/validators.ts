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

// Pipeline schemas
export const PipelineCreateSchema = z.object({
  datasetId: z.string().uuid('Dataset ID must be a valid UUID'),
  name: z.string().min(1, 'Pipeline name is required'),
  description: z.string().optional(),
  schedule: z.string().optional(),
  active: z.boolean().default(true),
});

export type PipelineCreate = z.infer<typeof PipelineCreateSchema>;

export const PipelineSchema = z.object({
  id: z.string().uuid(),
  datasetId: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  schedule: z.string().nullable(),
  active: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Pipeline = z.infer<typeof PipelineSchema>;

// Pipeline Version schemas
export const PipelineVersionConfigSchema = z.record(z.any());

export const PipelineVersionCreateSchema = z.object({
  pipelineId: z.string().uuid('Pipeline ID must be a valid UUID'),
  version: z.number().int().positive('Version must be a positive integer'),
  config: PipelineVersionConfigSchema,
});

export type PipelineVersionCreate = z.infer<typeof PipelineVersionCreateSchema>;

export const PipelineVersionSchema = z.object({
  id: z.string().uuid(),
  pipelineId: z.string().uuid(),
  version: z.number(),
  config: PipelineVersionConfigSchema,
  createdAt: z.date(),
});

export type PipelineVersion = z.infer<typeof PipelineVersionSchema>;

// Job Run Status enum
export const JobRunStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);
export type JobRunStatus = z.infer<typeof JobRunStatusSchema>;

// Job Run Step Status enum
export const JobRunStepStatusSchema = z.enum(['pending', 'running', 'success', 'failed']);
export type JobRunStepStatus = z.infer<typeof JobRunStepStatusSchema>;

// Job Run Step schema
export const JobRunStepSchema = z.object({
  id: z.string().uuid(),
  runId: z.string().uuid(),
  name: z.string(),
  status: JobRunStepStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  createdAt: z.date(),
});

export type JobRunStep = z.infer<typeof JobRunStepSchema>;

// Job Run schemas
export const JobRunSchema = z.object({
  id: z.string().uuid(),
  pipelineId: z.string().uuid(),
  pipelineVersion: z.number(),
  status: JobRunStatusSchema,
  startedAt: z.date(),
  finishedAt: z.date().nullable(),
  recordsProcessed: z.number(),
  errorMessage: z.string().nullable(),
  createdAt: z.date(),
});

export type JobRun = z.infer<typeof JobRunSchema>;

// Job Run with steps
export const JobRunWithStepsSchema = JobRunSchema.extend({
  steps: z.array(JobRunStepSchema),
});

export type JobRunWithSteps = z.infer<typeof JobRunWithStepsSchema>;

// Job Run status update
export const JobRunStatusUpdateSchema = z.object({
  status: JobRunStatusSchema,
  finishedAt: z.date().optional(),
  recordsProcessed: z.number().optional(),
  errorMessage: z.string().optional(),
});

export type JobRunStatusUpdate = z.infer<typeof JobRunStatusUpdateSchema>;

