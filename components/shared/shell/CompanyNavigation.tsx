import { Cog6ToothIcon, CodeBracketIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'next-i18next';
import NavigationItems from './NavigationItems';
import { NavigationProps, MenuItem } from './NavigationItems';
import { UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/20/solid';

interface NavigationItemsProps extends NavigationProps {
  slug: string;
}

const CompanyNavigation = ({ slug, activePathname }: NavigationItemsProps) => {
  const { t } = useTranslation('common');

  const menus: MenuItem[] = [
    {
      name: t('all-products'),
      href: `/companies/${slug}/products`,
      icon: CodeBracketIcon,
      active: activePathname === `/companies/${slug}/products`,
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
