import { Role } from '@prisma/client';

type RoleType = (typeof Role)[keyof typeof Role];
export type Action = 'create' | 'update' | 'read' | 'delete' | 'leave';
export type Resource =
  | 'company'
  | 'company_member'
  | 'company_invitation'
  | 'company_sso'
  | 'company_dsync'
  | 'company_audit_log'
  | 'company_webhook'
  | 'company_payments'
  | 'company_api_key';

type RolePermissions = {
  [role in RoleType]: Permission[];
};

export type Permission = {
  resource: Resource;
  actions: Action[] | '*';
};

export const availableRoles = [
  {
    id: Role.TECH,
    name: 'Tech',
  },
  {
    id: Role.ADMIN,
    name: 'Admin',
  },
  {
    id: Role.OWNER,
    name: 'Owner',
  },
];

export const permissions: RolePermissions = {
  OWNER: [
    {
      resource: 'company',
      actions: '*',
    },
    {
      resource: 'company_member',
      actions: '*',
    },
    {
      resource: 'company_invitation',
      actions: '*',
    },
    {
      resource: 'company_sso',
      actions: '*',
    },
    {
      resource: 'company_dsync',
      actions: '*',
    },
    {
      resource: 'company_audit_log',
      actions: '*',
    },
    {
      resource: 'company_payments',
      actions: '*',
    },
    {
      resource: 'company_webhook',
      actions: '*',
    },
    {
      resource: 'company_api_key',
      actions: '*',
    },
  ],
  ADMIN: [
    {
      resource: 'company',
      actions: '*',
    },
    {
      resource: 'company_member',
      actions: '*',
    },
    {
      resource: 'company_invitation',
      actions: '*',
    },
    {
      resource: 'company_sso',
      actions: '*',
    },
    {
      resource: 'company_dsync',
      actions: '*',
    },
    {
      resource: 'company_audit_log',
      actions: '*',
    },
    {
      resource: 'company_webhook',
      actions: '*',
    },
    {
      resource: 'company_api_key',
      actions: '*',
    },
  ],
  TECH: [
    {
      resource: 'company',
      actions: ['read', 'leave'],
    },
  ],
};
