import {
  ChevronUpDownIcon,
  FolderIcon,
  FolderPlusIcon,
  RectangleStackIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import useCompanies from 'hooks/useCompanies';
import { useSession } from 'next-auth/react';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';
import { maxLengthPolicies } from '@/lib/common';

const CompanyDropdown = () => {
  const router = useRouter();
  const { companies } = useCompanies();
  const { data } = useSession();
  const { t } = useTranslation('common');

  const currentCompany = (companies || []).find(
    (company) => company.slug === router.query.slug
  );

  const menus = [
    {
      id: 2,
      name: t('companies'),
      items: (companies || []).map((company) => ({
        id: company.id,
        name: company.name,
        href: `/companies/${company.slug}/settings`,
        icon: FolderIcon,
      })),
    },
    {
      id: 1,
      name: t('profile'),
      items: [
        {
          id: data?.user.id,
          name: data?.user?.name,
          href: '/settings/account',
          icon: UserCircleIcon,
        },
      ],
    },
    {
      id: 3,
      name: '',
      items: [
        {
          id: 'all-companies',
          name: t('all-companies'),
          href: '/companies',
          icon: RectangleStackIcon,
        },
        {
          id: 'new-company',
          name: t('new-company'),
          href: '/companies?newCompany=true',
          icon: FolderPlusIcon,
        },
      ],
    },
  ];

  return (
    <div className="dropdown w-full">
      <div
        tabIndex={0}
        className="border border-gray-300 dark:border-gray-600 flex h-10 items-center px-4 justify-between cursor-pointer rounded text-sm font-bold"
      >
        {currentCompany?.name ||
          data?.user?.name?.substring(
            0,
            maxLengthPolicies.nameShortDisplay
          )}{' '}
        <ChevronUpDownIcon className="w-5 h-5" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content dark:border-gray-600 p-2 shadow-md bg-base-100 w-full rounded border px-2"
      >
        {menus.map(({ id, name, items }) => {
          return (
            <React.Fragment key={id}>
              {name && (
                <li
                  className="text-xs text-gray-500 py-1 px-2"
                  key={`${id}-name`}
                >
                  {name}
                </li>
              )}
              {items.map((item) => (
                <li
                  key={`${id}-${item.id}`}
                  onClick={() => {
                    if (document.activeElement) {
                      (document.activeElement as HTMLElement).blur();
                    }
                  }}
                >
                  <Link href={item.href}>
                    <div className="flex hover:bg-gray-100 hover:dark:text-black focus:bg-gray-100 focus:outline-none py-2 px-2 rounded text-sm font-medium gap-2 items-center">
                      <item.icon className="w-5 h-5" /> {item.name}
                    </div>
                  </Link>
                </li>
              ))}
              {name && <li className="divider m-0" key={`${id}-divider`} />}
            </React.Fragment>
          );
        })}
      </ul>
    </div>
  );
};

export default CompanyDropdown;
