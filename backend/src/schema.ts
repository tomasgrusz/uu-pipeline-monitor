import { pgTable, uuid, varchar, text, integer, boolean, jsonb, timestamp, foreignKey } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  role: varchar('role', { length: 50 }).notNull().default('viewer'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const datasets = pgTable('datasets', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  description: text('description'),
  owner: varchar('owner', { length: 255 }).notNull(),
  schemaVersion: integer('schema_version').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    datasetId: uuid('dataset_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    schedule: varchar('schedule', { length: 100 }),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    datasetFk: foreignKey({
      columns: [table.datasetId],
      foreignColumns: [datasets.id],
    }).onDelete('cascade'),
  })
);

export const pipelineVersions = pgTable(
  'pipeline_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipelineId: uuid('pipeline_id').notNull(),
    version: integer('version').notNull(),
    config: jsonb('config').notNull(),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pipelineFk: foreignKey({
      columns: [table.pipelineId],
      foreignColumns: [pipelines.id],
    }).onDelete('cascade'),
  })
);

export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipelineId: uuid('pipeline_id').notNull(),
    pipelineVersion: integer('pipeline_version').notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    finishedAt: timestamp('finished_at'),
    recordsProcessed: integer('records_processed').notNull().default(0),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    pipelineFk: foreignKey({
      columns: [table.pipelineId],
      foreignColumns: [pipelines.id],
    }).onDelete('cascade'),
  })
);

export const jobRunSteps = pgTable(
  'job_run_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    runId: uuid('run_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    startedAt: timestamp('started_at').notNull().defaultNow(),
    finishedAt: timestamp('finished_at'),
    createdAt: timestamp('created_at').defaultNow(),
  },
  (table) => ({
    runFk: foreignKey({
      columns: [table.runId],
      foreignColumns: [jobRuns.id],
    }).onDelete('cascade'),
  })
);

