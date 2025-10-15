import { PencilIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useTranslation } from 'next-i18next';
import { useState } from 'react';
import type { Company, Customer } from '@prisma/client';
import ContactDetails from "./profile/ContactDetails";
import CreateCustomer from "../CreateCustomer";

interface ProfileProps {
  customer: Customer;
  company: Company;
  onSaveSuccess: () => void;
}

const Profile = ({ customer, company, onSaveSuccess }: ProfileProps) => {
  const { t } = useTranslation('common');
  const [isEditing, setIsEditing] = useState(false);

  const handleSaveSuccess = () => {
    onSaveSuccess();
    setIsEditing(false);
  };

  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <>
      {!isEditing ? (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t('contact-details')}</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Edit contact details"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
          </div>
          <ContactDetails customer={customer} />
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">{t('edit-customer')}</h2>
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Cancel edit"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          <CreateCustomer 
            company={company} 
            customer={customer} 
            onSaveSuccess={handleSaveSuccess}
            onCancel={handleCancel}
          />
        </div>
      )}
    </>
  );
};

export default Profile;
