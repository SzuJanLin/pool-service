import {
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  KeyIcon,
  PaperAirplaneIcon,
  ShieldExclamationIcon,
  UserPlusIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import type { Company } from '@prisma/client';
import classNames from 'classnames';
import useCanAccess from 'hooks/useCanAccess';
import Link from 'next/link';
import { CompanyFeature } from 'types';

interface CompanyTabProps {
  activeTab: string;
  company: Company;
  heading?: string;
  companyFeatures: CompanyFeature;
}

const CompanyTab = ({ activeTab, company, heading, companyFeatures }: CompanyTabProps) => {
  const { canAccess } = useCanAccess();

  const navigations: {
    name: string;
    href: string;
    active: boolean;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  }[] = [];

  if (canAccess('company', ['update', 'read'])) {
    navigations.push(    {
      name: 'Settings',
      href: `/companies/${company.slug}/settings`,
      active: activeTab === 'settings',
      icon: Cog6ToothIcon,
    },);
  }

  if (canAccess('company_member', ['create', 'update', 'read', 'delete'])) {
    navigations.push({
      name: 'Members',
      href: `/companies/${company.slug}/members`,
      active: activeTab === 'members',
      icon: UserPlusIcon,
    });
  }

  if (
    companyFeatures.sso &&
    canAccess('company_sso', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'Single Sign-On',
      href: `/companies/${company.slug}/sso`,
      active: activeTab === 'sso',
      icon: ShieldExclamationIcon,
    });
  }

  if (
    companyFeatures.dsync &&
    canAccess('company_dsync', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'Directory Sync',
      href: `/companies/${company.slug}/directory-sync`,
      active: activeTab === 'directory-sync',
      icon: UserPlusIcon,
    });
  }

  if (
    companyFeatures.auditLog &&
    canAccess('company_audit_log', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'Audit Logs',
      href: `/companies/${company.slug}/audit-logs`,
      active: activeTab === 'audit-logs',
      icon: DocumentMagnifyingGlassIcon,
    });
  }

  if (
    companyFeatures.payments &&
    canAccess('company_payments', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'Billing',
      href: `/companies/${company.slug}/billing`,
      active: activeTab === 'payments',
      icon: BanknotesIcon,
    });
  }

  if (
    companyFeatures.webhook &&
    canAccess('company_webhook', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'Webhooks',
      href: `/companies/${company.slug}/webhooks`,
      active: activeTab === 'webhooks',
      icon: PaperAirplaneIcon,
    });
  }

  if (
    companyFeatures.apiKey &&
    canAccess('company_api_key', ['create', 'update', 'read', 'delete'])
  ) {
    navigations.push({
      name: 'API Keys',
      href: `/companies/${company.slug}/api-keys`,
      active: activeTab === 'api-keys',
      icon: KeyIcon,
    });
  }

  return (
    <div className="flex flex-col pb-6">
      <h2 className="text-xl font-semibold mb-2">
        {heading ? heading : company.name}
      </h2>
      <nav
        className=" flex flex-wrap border-b border-gray-300"
        aria-label="Tabs"
      >
        {navigations.map((menu) => {
          return (
            <Link
              href={menu.href}
              key={menu.href}
              className={classNames(
                'inline-flex items-center border-b-2 py-2 md-py-4 mr-5 text-sm font-medium',
                menu.active
                  ? 'border-gray-900 text-gray-700 dark:text-gray-100'
                  : 'border-transparent text-gray-500 hover:border-gray-300  hover:text-gray-700 hover:dark:text-gray-100'
              )}
            >
              {menu.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
};

export default CompanyTab;
