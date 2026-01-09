import { prisma } from '@/lib/prisma';
import { sendEmail } from './sendEmail';
import { render } from '@react-email/components';
import ServiceEmail, { EmailServiceData } from '@/components/emailTemplates/ServiceEmail';

export const sendServiceEmail = async (serviceHistoryId: string, companyId: string) => {
  try {
    // Fetch full service history with all relations
    const serviceHistory = await prisma.serviceHistory.findFirst({
      where: {
        id: serviceHistoryId,
        companyId,
      },
      include: {
        route: {
          include: {
            pool: {
              include: {
                customer: true,
              },
            },
          },
        },
        technician: true,
        company: {
          include: {
            serviceEmailSettings: true,
          },
        },
        readings: {
          include: {
            readingDefinition: true,
          },
        },
        dosages: {
          include: {
            dosageDefinition: true,
          },
        },
        checklist: {
          include: {
            templateItem: true,
          },
        },
        photos: true,
      },
    });

    if (!serviceHistory || !serviceHistory.company || !serviceHistory.company.serviceEmailSettings) {
      return;
    }

    const settings = serviceHistory.company.serviceEmailSettings;
    const customer = serviceHistory.route.pool.customer;

    // Check if email sending is enabled
    if (!settings.enabled) {
      return;
    }

    // Check if customer has email
    if (!customer.email) {
      return;
    }

    // Check status (double check, though caller should verify)
    if (serviceHistory.status !== 'COMPLETED') {
      return;
    }

    // Get photo URL
    let photoUrl: string | undefined = undefined;
    const firstPhoto = serviceHistory.photos.length > 0 ? serviceHistory.photos[0] : null;

    if (firstPhoto) {
      // Use the stored publicUrl. 
      // Assuming R2 bucket is public or publicUrl points to a publicly accessible endpoint (e.g. image proxy or custom domain)
      photoUrl = firstPhoto.publicUrl || undefined;
    }

    // Prepare data for template
    const serviceData: EmailServiceData = {
      serviceDate: serviceHistory.serviceDate.toISOString(),
      techName: serviceHistory.technician?.name || 'Your Technician',
      readings: serviceHistory.readings.map((r) => ({
        name: r.readingDefinition.name,
        value: r.value,
        unit: r.readingDefinition.unit || undefined,
      })),
      dosages: serviceHistory.dosages.map((d) => ({
        name: d.dosageDefinition.name,
        value: d.value,
        unit: d.dosageDefinition.unit || undefined,
      })),
      checklist: serviceHistory.checklist.map((item) => ({
        description: item.description,
        completed: item.completed === true,
      })),
      photoUrl: photoUrl,
      photoCaption: firstPhoto?.caption || undefined,
    };

    // Render email HTML
    const html = await render(
      ServiceEmail({
        settings,
        company: serviceHistory.company,
        serviceData,
      })
    );

    // Prepare recipients
    const to = customer.email;
    const bcc = settings.bcc ? settings.bcc.split(',').map((e) => e.trim()) : undefined;

    // Replace date placeholder in subject if exists
    let subject = settings.subject || 'Pool Service Report';
    if (subject.includes('{{date}}')) {
      subject = subject.replace('{{date}}', new Date(serviceHistory.serviceDate).toLocaleDateString());
    }

    // Send email
    await sendEmail({
      to,
      subject,
      html,
      bcc,
    } as any); 

  } catch (error) {
    console.error('Failed to send service email:', error);
  }
};
