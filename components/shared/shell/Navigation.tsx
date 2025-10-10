import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import CompanyNavigation from './CompanyNavigation';

const Navigation = () => {
  const { asPath, isReady, query } = useRouter();
  const [activePathname, setActivePathname] = useState<null | string>(null);

  const { slug } = query as { slug: string };

  useEffect(() => {
    if (isReady && asPath) {
      const activePathname = new URL(asPath, location.href).pathname;
      setActivePathname(activePathname);
    }
  }, [asPath, isReady]);

  const Navigation = () => {

    return <CompanyNavigation activePathname={activePathname} slug={slug} />;
 
  };

  return (
    <nav className="flex flex-1 flex-col">
      <Navigation />
    </nav>
  );
};

export default Navigation;
