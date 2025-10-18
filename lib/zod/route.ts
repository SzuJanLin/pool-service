import { z } from 'zod';
import { dayOfWeek, poolId } from './primitives';

export const createRouteSchema = z.object({
  poolId: poolId,
  techId: z.string().nullable().optional(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']),
  startOn: z.string().transform((val) => new Date(val)),
  stopAfter: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  skipWeeks: z.number().min(0, 'Skip weeks must be 0 or greater'),
  anchorDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  weekOffset: z.number().min(0, 'Week offset must be 0 or greater'),
  skipWeekNumbers: z.array(z.number()).default([]),
  active: z.boolean(),
});

export const updateRouteSchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
  techId: z.string().nullable().optional(),
  dayOfWeek: z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY']).optional(),
  frequency: z.enum(['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'CUSTOM']).optional(),
  startOn: z.string().transform((val) => new Date(val)).optional(),
  stopAfter: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  skipWeeks: z.number().min(0, 'Skip weeks must be 0 or greater').optional(),
  anchorDate: z.string().nullable().optional().transform((val) => val ? new Date(val) : null),
  weekOffset: z.number().min(0, 'Week offset must be 0 or greater').optional(),
  skipWeekNumbers: z.array(z.number()).optional(),
  active: z.boolean().optional(),
});

export const deleteRouteSchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
});