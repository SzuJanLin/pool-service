import { NextApiRequest, NextApiResponse } from 'next';

import { getSession } from '@/lib/session';
import { throwIfNoCompanyAccess } from 'models/company';
import { stripe, getStripeCustomerId } from '@/lib/stripe';
import env from '@/lib/env';
import { checkoutSessionSchema, validateWithSchema } from '@/lib/zod';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    switch (req.method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({
          error: { message: `Method ${req.method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { price, quantity } = validateWithSchema(
    checkoutSessionSchema,
    req.body
  );

  const companyMember = await throwIfNoCompanyAccess(req, res);
  const session = await getSession(req, res);
  const customer = await getStripeCustomerId(companyMember, session);

  const checkoutSession = await stripe.checkout.sessions.create({
    customer,
    mode: 'subscription',
    line_items: [
      {
        price,
        quantity,
      },
    ],

    // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
    // the actual Session ID is returned in the query parameter when your customer
    // is redirected to the success page.

    success_url: `${env.appUrl}/companies/${companyMember.company.slug}/billing`,
    cancel_url: `${env.appUrl}/companies/${companyMember.company.slug}/billing`,
  });

  res.json({ data: checkoutSession });
};
