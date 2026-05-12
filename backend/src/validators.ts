import { z } from 'zod';

// Health check response
export const HealthCheckSchema = z.object({
  status: z.literal('ok'),
  timestamp: z.string(),
});

export type HealthCheck = z.infer<typeof HealthCheckSchema>;
