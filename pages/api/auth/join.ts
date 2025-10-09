import { hashPassword } from '@/lib/auth';
import { slugify } from '@/lib/server-common';
import { sendVerificationEmail } from '@/lib/email/sendVerificationEmail';
import { isEmailAllowed } from '@/lib/email/utils';
import env from '@/lib/env';
import { ApiError } from '@/lib/errors';
import { createCompany, getCompany, isCompanyExists } from 'models/company';
import { createUser, getUser } from 'models/user';
import type { NextApiRequest, NextApiResponse } from 'next';
import { recordMetric } from '@/lib/metrics';
import { getInvitation, isInvitationExpired } from 'models/invitation';
import { validateRecaptcha } from '@/lib/recaptcha';
import { slackNotify } from '@/lib/slack';
import { Company } from '@prisma/client';
import { createVerificationToken } from 'models/verificationToken';
import { userJoinSchema, validateWithSchema } from '@/lib/zod';

// TODO:
// Add zod schema validation

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      default:
        res.setHeader('Allow', 'POST');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;

    res.status(status).json({ error: { message } });
  }
}

// Signup the user
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { name, password, company, inviteToken, recaptchaToken } = req.body;

  await validateRecaptcha(recaptchaToken);

  const invitation = inviteToken
    ? await getInvitation({ token: inviteToken })
    : null;

  let email: string = req.body.email;

  // When join via invitation
  if (invitation) {
    if (await isInvitationExpired(invitation.expires)) {
      throw new ApiError(400, 'Invitation expired. Please request a new one.');
    }

    if (invitation.sentViaEmail) {
      email = invitation.email!;
    }
  }

  validateWithSchema(userJoinSchema, {
    name,
    email,
    password,
  });

  if (!isEmailAllowed(email)) {
    throw new ApiError(
      400,
      `We currently only accept work email addresses for sign-up. Please use your work email to create an account. If you don't have a work email, feel free to contact our support company for assistance.`
    );
  }

  if (await getUser({ email })) {
    throw new ApiError(400, 'An user with this email already exists.');
  }

  // Check if company name is available
  if (!invitation) {
    if (!company) {
      throw new ApiError(400, 'A company name is required.');
    }

    const slug = slugify(company);

    validateWithSchema(userJoinSchema, { company, slug });

    const slugCollisions = await isCompanyExists(slug);

    if (slugCollisions > 0) {
      throw new ApiError(400, 'A company with this slug already exists.');
    }
  }

  const user = await createUser({
    name,
    email,
    password: await hashPassword(password),
    emailVerified: invitation ? new Date() : null,
  });

  let userCompany: Company | null = null;

  // Create company if user is not invited
  // So we can create the company with the user as the owner
  if (!invitation) {
    userCompany = await createCompany({
      userId: user.id,
      name: company,
      slug: slugify(company),
    });
  } else {
    userCompany = await getCompany({ slug: invitation.company.slug });
  }

  // Send account verification email
  if (env.confirmEmail && !user.emailVerified) {
    const verificationToken = await createVerificationToken({
      identifier: user.email,
      expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    await sendVerificationEmail({ user, verificationToken });
  }

  recordMetric('user.signup');

  slackNotify()?.alert({
    text: invitation
      ? 'New user signed up via invitation'
      : 'New user signed up',
    fields: {
      Name: user.name,
      Email: user.email,
      Company: userCompany?.name,
    },
  });

  res.status(201).json({
    data: {
      confirmEmail: env.confirmEmail && !user.emailVerified,
    },
  });
};
