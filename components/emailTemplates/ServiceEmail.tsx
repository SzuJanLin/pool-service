import {
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
  Column,
  Row,
  Link,
} from '@react-email/components';
import EmailLayout from './EmailLayout';
import { Company, ServiceEmailSettings } from '@prisma/client';
import React from 'react';

// Mock interfaces for the preview data
export interface EmailServiceReading {
  name: string;
  value: string;
  unit?: string;
}

export interface EmailServiceDosage {
  name: string;
  value: string;
  unit?: string;
  cost?: number;
}

export interface EmailChecklistItem {
  description: string;
  completed: boolean;
}

export interface EmailServiceData {
  serviceDate: string;
  techName: string;
  readings: EmailServiceReading[];
  dosages: EmailServiceDosage[];
  checklist: EmailChecklistItem[];
  photoUrl?: string;
  photoCaption?: string;
}

interface ServiceEmailProps {
  settings: ServiceEmailSettings;
  company: Company;
  serviceData: EmailServiceData;
}

export const ServiceEmail = ({
  settings,
  company,
  serviceData,
}: ServiceEmailProps) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const companyLogo = settings.logoUrl || company.logoUrl; // Fallback to company logo if settings logo not set? Or just settings.
  // The schema says settings.logoUrl. Let's assume settings.logoUrl is the one to use for email.

  return (
    <Html>
      <Head />
      <Preview>{settings.subject || 'Pool Service Report'}</Preview>
      <EmailLayout>
        {/* Header Section */}
        <Section className="text-center">
          {settings.logoUrl && (
            <Img
              src={settings.logoUrl}
              width="150"
              alt={settings.companyName || company.name}
              className="mx-auto mb-4"
            />
          )}
          <Heading className="text-2xl font-bold text-gray-800 my-0">
            {settings.header || 'Pool Service Report'}
          </Heading>
          <Text className="text-gray-500 mt-2">
            {new Date(serviceData.serviceDate).toLocaleDateString()}
          </Text>
        </Section>

        {/* Message Body */}
        <Section className="my-6">
          <Text className="text-gray-700 whitespace-pre-wrap">
            {settings.message || 'Here is your pool service report.'}
          </Text>
        </Section>

        {/* Chemical Readings */}
        {settings.includeReadings && serviceData.readings.length > 0 && (
          <Section className="my-6">
            <Heading as="h3" className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              Chemical Readings
            </Heading>
            <Section className="bg-gray-50 rounded-lg p-4">
              {serviceData.readings.map((reading, index) => (
                <Row key={index} className="mb-2 last:mb-0">
                  <Column className="text-gray-600 w-1/2">{reading.name}</Column>
                  <Column className="text-gray-900 font-medium text-right w-1/2">
                    {reading.value} {reading.unit}
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>
        )}

        {/* Chemical Dosages */}
        {settings.includeDosages && serviceData.dosages.length > 0 && (
          <Section className="my-6">
            <Heading as="h3" className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              Chemicals Added
            </Heading>
            <Section className="bg-gray-50 rounded-lg p-4">
              {serviceData.dosages.map((dosage, index) => (
                <Row key={index} className="mb-2 last:mb-0">
                  <Column className="text-gray-600 w-1/2">{dosage.name}</Column>
                  <Column className="text-gray-900 font-medium text-right w-1/2">
                    {dosage.value} {dosage.unit}
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>
        )}

        {/* Checklist */}
        {settings.includeChecklist && serviceData.checklist.length > 0 && (
          <Section className="my-6">
            <Heading as="h3" className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              Services Performed
            </Heading>
            <Section className="bg-gray-50 rounded-lg p-4">
              {serviceData.checklist.map((item, index) => (
                <Row key={index} className="mb-2 last:mb-0">
                  <Column className="w-6 pr-2">
                    {item.completed ? '✅' : '⬜'}
                  </Column>
                  <Column className="text-gray-700">
                    {item.description}
                  </Column>
                </Row>
              ))}
            </Section>
          </Section>
        )}

        {/* Photo */}
        {/* Note: In real app, photo would be an attachment or link, but embedding for preview if url exists */}
        {serviceData.photoUrl && (
          <Section className="my-6">
            <Heading as="h3" className="text-lg font-semibold text-gray-800 mb-3 border-b pb-2">
              Service Photo
            </Heading>
            <Img
              src={serviceData.photoUrl}
              width="600"
              height="400"
              className="rounded-lg border border-gray-200 w-full object-cover"
              alt="Pool Service Photo"
            />
            {serviceData.photoCaption && (
              <Text className="text-center text-gray-500 text-sm mt-2 italic">
                {serviceData.photoCaption}
              </Text>
            )}
          </Section>
        )}

        {/* Technician Name */}
        {settings.includeTechName && (
          <Section className="mt-8 border-t pt-4">
            <Text className="text-gray-600">
              Service performed by: <span className="font-semibold text-gray-900">{serviceData.techName}</span>
            </Text>
          </Section>
        )}

        {/* Footer */}
        {settings.footer && (
          <Section className="mt-8 text-center">
            <Text className="text-gray-500 text-sm">
              {settings.footer}
            </Text>
          </Section>
        )}

        {/* Company Contact Info Footer */}
        <Section className="mt-8 pt-8 border-t border-gray-100 text-center text-xs text-gray-400">
          <Text className="mb-1 font-semibold text-gray-500">
            {settings.companyName || company.name}
          </Text>
          {settings.address && <Text className="m-0">{settings.address}</Text>}
          <Text className="m-0">
            {[settings.city, settings.state, settings.zip].filter(Boolean).join(', ')}
          </Text>
          <div className="mt-2 space-x-2">
            {settings.phone && (
              <Link href={`tel:${settings.phone}`} className="text-gray-400 underline">
                {settings.phone}
              </Link>
            )}
            {settings.phone && settings.email && <span>|</span>}
            {settings.email && (
              <Link href={`mailto:${settings.email}`} className="text-gray-400 underline">
                {settings.email}
              </Link>
            )}
            {(settings.phone || settings.email) && settings.website && <span>|</span>}
            {settings.website && (
              <Link href={settings.website} className="text-gray-400 underline">
                {settings.website}
              </Link>
            )}
          </div>
        </Section>
      </EmailLayout>
    </Html>
  );
};

export default ServiceEmail;
