import { z } from 'zod';

// Service History Schemas
export const createServiceHistorySchema = z.object({
  routeId: z.string().min(1, 'Route ID is required'),
  serviceDate: z.string().transform((val) => new Date(val)),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']),
  technicianId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  readings: z.object({
    freeChlorine: z.string().optional().nullable().transform(val => val && val !== '' ? parseFloat(val) : null),
    totalChlorine: z.string().optional().nullable().transform(val => val && val !== '' ? parseFloat(val) : null),
    pH: z.string().optional().nullable().transform(val => val && val !== '' ? parseFloat(val) : null),
    totalAlkalinity: z.string().optional().nullable().transform(val => val && val !== '' ? parseInt(val) : null),
    calciumHardness: z.string().optional().nullable().transform(val => val && val !== '' ? parseInt(val) : null),
    cyanuricAcid: z.string().optional().nullable().transform(val => val && val !== '' ? parseInt(val) : null),
    salt: z.string().optional().nullable().transform(val => val && val !== '' ? parseInt(val) : null),
    temperatureC: z.string().optional().nullable().transform(val => val && val !== '' ? parseFloat(val) : null),
    method: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  }).optional(),
  doses: z.array(z.object({
    chemical: z.enum([
      'LIQUID_CHLORINE',
      'MURIATIC_ACID',
      'CHLORINE_TABLETS',
      'DICHLOR',
      'CAL_HYPO',
      'SODA_ASH',
      'BAKING_SODA',
      'STABILIZER',
      'CALCIUM_CHLORIDE',
      'ALGAECIDE',
      'CLARIFIER',
      'OTHER',
    ]),
    amount: z.string().min(1, 'Amount is required').transform(val => parseFloat(val)),
    unit: z.enum(['FL_OZ', 'GAL', 'ML', 'L', 'OZ', 'LB', 'G']),
    productName: z.string().optional().nullable(),
    costCents: z.string().optional().nullable().transform(val => val && val !== '' ? Math.round(parseFloat(val) * 100) : null),
    notes: z.string().optional().nullable(),
  })).optional(),
});

export const updateServiceHistorySchema = z.object({
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(), 
  technicianId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Service Readings Schemas
export const createReadingsSchema = z.object({
  freeChlorine: z.number().min(0).max(20).optional(),
  totalChlorine: z.number().min(0).max(20).optional(),
  pH: z.number().min(0).max(14).optional(),
  totalAlkalinity: z.number().min(0).max(300).optional(),
  calciumHardness: z.number().min(0).max(1000).optional(),
  cyanuricAcid: z.number().min(0).max(200).optional(),
  salt: z.number().min(0).max(5000).optional(),
  temperatureC: z.number().min(-50).max(50).optional(),
  tds: z.number().min(0).optional(),
  orp: z.number().min(-1000).max(1000).optional(),
  method: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const updateReadingsSchema = createReadingsSchema.partial();

// Chemical Dose Schemas
export const createChemicalDoseSchema = z.object({
  chemical: z.enum([
    'LIQUID_CHLORINE',
    'MURIATIC_ACID',
    'CHLORINE_TABLETS',
    'DICHLOR',
    'CAL_HYPO',
    'SODA_ASH',
    'BAKING_SODA',
    'STABILIZER',
    'CALCIUM_CHLORIDE',
    'ALGAECIDE',
    'CLARIFIER',
    'OTHER',
  ]),
  amount: z.number().min(0.001, 'Amount must be greater than 0'),
  unit: z.enum(['FL_OZ', 'GAL', 'ML', 'L', 'OZ', 'LB', 'G']),
  productName: z.string().optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Query parameter schemas
export const serviceHistoryQuerySchema = z.object({
  routeId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.enum(['PENDING', 'COMPLETED', 'CANCELLED']).optional(),
  dateFrom: z.string().optional().transform(val => val ? new Date(val) : undefined),
  dateTo: z.string().optional().transform(val => val ? new Date(val) : undefined),
  technicianId: z.string().optional(),
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  pageSize: z.string().optional().transform(val => val ? parseInt(val) : 50),
});
