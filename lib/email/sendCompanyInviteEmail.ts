import { Invitation, Company } from '@prisma/client';
import { sendEmail } from './sendEmail';
import { CompanyInviteEmail } from '@/components/emailTemplates';
import { render } from '@react-email/components';
import env from '../env';
import app from '../app';

export const sendCompanyInviteEmail = async (
  company: Company,
  invitation: Invitation
) => {
  if (!invitation.email) {
    return;
  }

  const subject = `You've been invited to join ${company.name} on ${app.name}`;
  const invitationLink = `${env.appUrl}/invitations/${invitation.token}`;

  const html = await render(CompanyInviteEmail({ invitationLink, company, subject }));

  await sendEmail({
    to: invitation.email,
    subject,
    html,
  });
};
