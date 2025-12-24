import { z } from 'zod';

export const createReadingDefinitionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().optional(),
  values: z.array(z.string()).default([]),
  defaultValue: z.string().optional().nullable(),
  orderIndex: z.number().default(0),
});

export const updateReadingDefinitionSchema = createReadingDefinitionSchema.partial();

export const createDosageDefinitionSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  unit: z.string().optional(),
  dosageType: z.string().optional().nullable(),
  cost: z.number().nullable().optional(),
  values: z.array(z.string()).default([]),
  defaultValue: z.string().optional().nullable(),
  orderIndex: z.number().default(0),
});

export const updateDosageDefinitionSchema = createDosageDefinitionSchema.partial();
