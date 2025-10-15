import { Customer } from '@prisma/client';
import { PhoneIcon, EnvelopeIcon, MapPinIcon } from '@heroicons/react/24/outline';

const ContactDetails = ({ customer }: { customer: Customer }) => {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <PhoneIcon className="w-5 h-5" />
        <span className="font-medium">{customer.phone}</span>
      </div>
      <div className="flex items-center gap-2">
        <EnvelopeIcon className="w-5 h-5" />
        <span className="font-medium">{customer.email}</span>
      </div>
      <div className="flex items-center gap-2">
        <MapPinIcon className="w-5 h-5" />
        <div className="flex flex-col">
          <span className="font-medium">
            {[
              customer.addressStreet,
              [customer.addressCity, customer.addressState].filter(Boolean).join(', '),
              customer.addressZip
            ].filter(Boolean).join(' ')}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ContactDetails;
