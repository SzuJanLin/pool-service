import { z } from 'zod';

// Device information schema for mobile login tracking
const deviceInfoSchema = z.object({
  deviceId: z.string().optional().nullable(),
  deviceName: z.string().optional().nullable(),
  platform: z.enum(['ios', 'android', 'web']).optional().nullable(),
  appVersion: z.string().optional().nullable(),
  osVersion: z.string().optional().nullable(),
}).optional().nullable();

// Mobile login request schema
export const mobileLoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  recaptchaToken: z.string().optional().nullable(),
  deviceInfo: deviceInfoSchema,
});

// Mobile token refresh schema
export const mobileRefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
  deviceInfo: deviceInfoSchema,
});

// Mobile logout schema
export const mobileLogoutSchema = z.object({
  deviceInfo: deviceInfoSchema,
});

// Validation helper function
export function validateWithSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): T {
  const result = schema.safeParse(data);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
    }));
    
    throw new Error(`Validation failed: ${JSON.stringify(errors)}`);
  }
  
  return result.data;
}
