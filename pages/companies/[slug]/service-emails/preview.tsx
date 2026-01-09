import React from 'react';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { prisma } from '@/lib/prisma';
import ServiceEmail, { EmailServiceData } from '@/components/emailTemplates/ServiceEmail';
import { Company, ServiceEmailSettings, ReadingDefinition, DosageDefinition, ChecklistTemplate, ChecklistItemTemplate } from '@prisma/client';
import { Error } from '@/components/shared';

interface ServiceEmailPreviewProps {
  company: Company | null;
  settings: ServiceEmailSettings | null;
  readingDefinitions: ReadingDefinition[];
  dosageDefinitions: DosageDefinition[];
  checklistTemplate: (ChecklistTemplate & { items: ChecklistItemTemplate[] }) | null;
  error?: string;
}

const defaultMockServiceData: EmailServiceData = {
  serviceDate: new Date().toISOString(),
  techName: 'John Doe',
  readings: [
    { name: 'pH', value: '7.4', unit: '' },
    { name: 'Chlorine', value: '3.0', unit: 'ppm' },
    { name: 'Alkalinity', value: '100', unit: 'ppm' },
  ],
  dosages: [
    { name: 'Liquid Chlorine', value: '1', unit: 'gal' },
    { name: 'Muriatic Acid', value: '0.5', unit: 'gal' },
  ],
  checklist: [
    { description: 'Skimmed surface', completed: true },
    { description: 'Brushed walls', completed: true },
    { description: 'Emptied baskets', completed: true },
    { description: 'Vacuumed pool', completed: false },
  ],
  photoUrl: 'https://placehold.co/600x400/25c2a0/ffffff?text=Pool+Service+Photo',
  photoCaption: 'Pool looking great after service!',
};

const ServiceEmailPreview = ({ 
  company, 
  settings, 
  readingDefinitions,
  dosageDefinitions,
  checklistTemplate,
  error 
}: ServiceEmailPreviewProps) => {
  if (error || !company) {
    return <Error message={error || 'Company not found'} />;
  }

  // If settings are not yet created, use a default/empty object or handle gracefully
  const emailSettings = settings || {
    companyId: company.id,
    enabled: false,
    includeReadings: true,
    includeDosages: true,
    includeChecklist: true,
    includeTechName: true,
    requirePhoto: false,
    subject: 'Pool Service Report',
    header: 'We just serviced your pool:',
    message: 'Thanks for choosing us for your pool care! You can see the breakdown of your chemical readings, what we added, and pictures of your pool.',
    footer: 'Have a great day!',
  } as ServiceEmailSettings;

  // Generate dynamic mock data based on company definitions
  const serviceData: EmailServiceData = {
    ...defaultMockServiceData,
    readings: readingDefinitions.length > 0 
      ? readingDefinitions.map(def => ({
          name: def.name,
          value: def.defaultValue || '7.4', // Use default or fallback
          unit: def.unit || undefined,
        }))
      : defaultMockServiceData.readings,
    dosages: dosageDefinitions.length > 0
      ? dosageDefinitions.slice(0, 3).map(def => ({ // Take first 3 to show variety but not overwhelm
          name: def.name,
          value: '1.0', // Mock value
          unit: def.unit || undefined,
        }))
      : defaultMockServiceData.dosages,
    checklist: checklistTemplate && checklistTemplate.items.length > 0
      ? checklistTemplate.items.map(item => ({
          description: item.description,
          completed: Math.random() > 0.2, // Randomly complete most items
        }))
      : defaultMockServiceData.checklist,
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8 flex justify-center items-start">
        <ServiceEmail
          settings={emailSettings}
          company={company}
          serviceData={serviceData}
        />
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  const { slug } = context.query;
  const locale = context.locale || 'en';

  if (!slug || typeof slug !== 'string') {
    return {
      notFound: true,
    };
  }

  const company = await prisma.company.findUnique({
    where: { slug },
  });

  if (!company) {
    return {
      notFound: true,
    };
  }

  const [settings, readingDefinitions, dosageDefinitions, checklistTemplate] = await Promise.all([
    prisma.serviceEmailSettings.findUnique({
      where: { companyId: company.id },
    }),
    prisma.readingDefinition.findMany({
      where: { companyId: company.id },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.dosageDefinition.findMany({
      where: { companyId: company.id },
      orderBy: { orderIndex: 'asc' },
    }),
    prisma.checklistTemplate.findFirst({
      where: { companyId: company.id, isActive: true },
      include: {
        items: {
          orderBy: { orderIndex: 'asc' },
        },
      },
    }),
  ]);

  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      company: JSON.parse(JSON.stringify(company)),
      settings: settings ? JSON.parse(JSON.stringify(settings)) : null,
      readingDefinitions: JSON.parse(JSON.stringify(readingDefinitions)),
      dosageDefinitions: JSON.parse(JSON.stringify(dosageDefinitions)),
      checklistTemplate: checklistTemplate ? JSON.parse(JSON.stringify(checklistTemplate)) : null,
    },
  };
};

export default ServiceEmailPreview;
