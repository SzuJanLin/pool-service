import { z } from 'zod';

export const serviceEmailSettingsSchema = z.object({
  // Contact Information
  fromName: z.string().optional().nullable(),
  fromEmail: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  bcc: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  email: z.string().email('Invalid email address').optional().nullable().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  logoUrl: z.string().optional().nullable(),

  // Configuration
  enabled: z.boolean().default(false),
  subject: z.string().optional().nullable(),
  header: z.string().optional().nullable(),
  message: z.string().optional().nullable(),
  footer: z.string().optional().nullable(),

  // Toggles
  includeReadings: z.boolean().default(true),
  includeDosages: z.boolean().default(true),
  includeChecklist: z.boolean().default(true),
  includeTechName: z.boolean().default(false),
  requirePhoto: z.boolean().default(false),
});




