import { z } from 'zod';

// Service History Schemas
export const createServiceHistorySchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
  serviceDate: z.string().transform((val) => new Date(val)),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  technicianId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateServiceHistorySchema = createServiceHistorySchema.partial();

// Query parameter schemas
export const serviceHistoryQuerySchema = z.object({
  start: z.string().optional(),
  end: z.string().optional(),
  techId: z.string().optional(),
});
