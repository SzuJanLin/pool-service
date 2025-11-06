import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { NextPageWithLayout } from 'types';
import { useMapbox } from 'hooks/useMapbox';

const Routes: NextPageWithLayout = () => {
  const { mapContainer } = useMapbox({
    center: [-74.0242, 40.6941],
    zoom: 10.12,
  });

  return (
    <div style={{ height: '600px', width: '100%', position: 'relative' }}>
      <div 
        id="map-container" 
        ref={mapContainer} 
        style={{ 
          height: '100%', 
          width: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }} 
      />
    </div>
  );
};

export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
    },
  };
}

export default Routes;

