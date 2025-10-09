import Stripe from 'stripe';
import env from '@/lib/env';
import { updateCompany } from 'models/company';

export const stripe = new Stripe(env.stripe.secretKey ?? '');

export async function getStripeCustomerId(companyMember, session?: any) {
  let customerId = '';
  if (!companyMember.company.billingId) {
    const customerData: {
      metadata: { companyId: string };
      email?: string;
    } = {
      metadata: {
        companyId: companyMember.companyId,
      },
    };
    if (session?.user?.email) {
      customerData.email = session?.user?.email;
    }
    const customer = await stripe.customers.create({
      ...customerData,
      name: session?.user?.name as string,
    });
    await updateCompany(companyMember.company.slug, {
      billingId: customer.id,
      billingProvider: 'stripe',
    });
    customerId = customer.id;
  } else {
    customerId = companyMember.company.billingId;
  }
  return customerId;
}
