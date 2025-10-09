import { Role } from '@prisma/client';
import { ApiError } from './errors';
import { getCompanyMember } from 'models/company';

export async function validateMembershipOperation(
  memberId: string,
  companyMember,
  operationMeta?: {
    role?: Role;
  }
) {
  const updatingMember = await getCompanyMember(memberId, companyMember.company.slug);
  // Member and Admin can't update the role of Owner
  if (
    (companyMember.role === Role.MEMBER || companyMember.role === Role.ADMIN) &&
    updatingMember.role === Role.OWNER
  ) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member.'
    );
  }
  // Member can't update the role of Admin & Owner
  if (
    companyMember.role === Role.MEMBER &&
    (updatingMember.role === Role.ADMIN || updatingMember.role === Role.OWNER)
  ) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member.'
    );
  }

  // Admin can't make anyone an Owner
  if (companyMember.role === Role.ADMIN && operationMeta?.role === Role.OWNER) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member to Owner.'
    );
  }

  // Member can't make anyone an Admin or Owner
  if (
    companyMember.role === Role.MEMBER &&
    (operationMeta?.role === Role.ADMIN || operationMeta?.role === Role.OWNER)
  ) {
    throw new ApiError(
      403,
      'You do not have permission to update the role of this member to Admin.'
    );
  }
}
