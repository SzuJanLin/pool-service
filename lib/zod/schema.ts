import { z } from 'zod';
import { slugify } from '../server-common';
import {
  companyName,
  apiKeyId,
  slug,
  domain,
  email,
  password,
  token,
  role,
  sentViaEmail,
  domains,
  expiredToken,
  sessionId,
  recaptchaToken,
  priceId,
  quantity,
  memberId,
  inviteToken,
  url,
  endpointId,
  sentViaEmailString,
  invitationId,
  name,
  image,
  eventTypes,
  customerId,
  firstName,
  lastName,
  phoneNumber,
  addressField,
  notes,
  poolId,
  poolName,
  gallons,
  baselinePressure,
} from './primitives';
import { CustomerStatus, ChemicalType } from '@prisma/client';

export const createApiKeySchema = z.object({
  name: name(50),
});

export const deleteApiKeySchema = z.object({
  apiKeyId,
});

export const companySlugSchema = z.object({
  slug,
});

export const updateCompanySchema = z.object({
  name: companyName,
  slug: slug.transform((slug) => slugify(slug)),
  domain,
});

export const createCompanySchema = z.object({
  name: companyName,
});

export const updateAccountSchema = z.union([
  z.object({
    email,
  }),
  z.object({
    name: name(),
  }),
  z.object({
    image,
  }),
]);

export const updatePasswordSchema = z.object({
  currentPassword: password,
  newPassword: password,
});

export const userJoinSchema = z.union([
  z.object({
    company: companyName,
    slug,
  }),
  z.object({
    name: name(),
    email,
    password,
  }),
]);

export const resetPasswordSchema = z.object({
  password,
  token,
});

export const inviteViaEmailSchema = z.union([
  z.object({
    email,
    role,
    sentViaEmail,
  }),
  z.object({
    role,
    sentViaEmail,
    domains,
  }),
]);

export const resendLinkRequestSchema = z.object({
  email,
  expiredToken,
});

export const deleteSessionSchema = z.object({
  id: sessionId,
});

export const forgotPasswordSchema = z.object({
  email,
  recaptchaToken: recaptchaToken.optional(),
});

export const resendEmailToken = z.object({
  email,
});

export const checkoutSessionSchema = z.object({
  price: priceId,
  quantity: quantity.optional(),
});

export const updateMemberSchema = z.object({
  role,
  memberId,
});

export const acceptInvitationSchema = z.object({
  inviteToken,
});

export const getInvitationSchema = z.object({
  token: inviteToken,
});

export const webhookEndpointSchema = z.object({
  name: name(),
  url,
  eventTypes,
});

export const updateWebhookEndpointSchema = webhookEndpointSchema.extend({
  endpointId,
});

export const getInvitationsSchema = z.object({
  sentViaEmail: sentViaEmailString,
});

export const deleteInvitationSchema = z.object({
  id: invitationId,
});

export const getWebhookSchema = z.object({
  endpointId,
});

export const deleteWebhookSchema = z.object({
  webhookId: endpointId,
});

export const deleteMemberSchema = z.object({
  memberId,
});

// email or slug
export const ssoVerifySchema = z
  .object({
    email: email.optional().or(z.literal('')),
    slug: slug.optional().or(z.literal('')),
  })
  .refine((data) => data.email || data.slug, {
    message: 'At least one of email or slug is required',
  });

export const createCustomerSchema = z.object({
  firstName,
  lastName,
  email: email.optional().or(z.literal('')),
  phone: phoneNumber,
  addressStreet: addressField,
  addressCity: addressField,
  addressState: addressField,
  addressZip: addressField,
  notes,
  status: z.nativeEnum(CustomerStatus).default(CustomerStatus.LEAD),
});

export const updateCustomerSchema = z.object({
  customerId,
  firstName: firstName.optional(),
  lastName: lastName.optional(),
  email: email.optional().or(z.literal('')),
  phone: phoneNumber,
  addressStreet: addressField,
  addressCity: addressField,
  addressState: addressField,
  addressZip: addressField,
  notes,
  status: z.nativeEnum(CustomerStatus).optional(),
});

export const deleteCustomerSchema = z.object({
  customerId,
});

export const createPoolSchema = z.object({
  name: poolName,
  gallons,
  chemicalType: z.nativeEnum(ChemicalType).optional().nullable(),
  baselinePressure,
  notes,
});

export const updatePoolSchema = z.object({
  poolId,
  name: poolName.optional(),
  gallons,
  chemicalType: z.nativeEnum(ChemicalType).optional().nullable(),
  baselinePressure,
  notes,
});

export const deletePoolSchema = z.object({
  poolId,
});
