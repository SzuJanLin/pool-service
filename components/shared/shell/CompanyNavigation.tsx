import { Cog6ToothIcon, HomeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'next-i18next';
import NavigationItems from './NavigationItems';
import { NavigationProps, MenuItem } from './NavigationItems';
import { UserCircleIcon, ShieldCheckIcon, UsersIcon } from '@heroicons/react/20/solid';

interface NavigationItemsProps extends NavigationProps {
  slug: string;
}

const CompanyNavigation = ({ slug, activePathname }: NavigationItemsProps) => {
  const { t } = useTranslation('common');

  const menus: MenuItem[] = [
    {
      name: t('dashboard'),
      href: `/companies/${slug}/dashboard`,
      icon: HomeIcon,
      active: activePathname === `/companies/${slug}/dashboard`,
    },
    {
      name: t('customers'),
      href: `/companies/${slug}/customers`,
      icon: UsersIcon,
      active: activePathname === `/companies/${slug}/customers`,
    },
    {
      name: t('settings'),
      href: `/companies/${slug}/members`,
      icon: Cog6ToothIcon,
      active: activePathname === `/companies/${slug}/members` || activePathname === `/companies/${slug}/settings`,
    },
    {
      name: t('account'),
      href: `/companies/${slug}/account`,
      icon: UserCircleIcon,
      active: activePathname === `/companies/${slug}/account`,
    },
  ];

  return <NavigationItems menus={menus} />;
};

export default CompanyNavigation;
