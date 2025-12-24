import { Loading, Error as ErrorComponent, InputWithLabel } from '@/components/shared';
import { CompanyTab } from '@/components/company';
import env from '@/lib/env';
import useCompany from 'hooks/useCompany';
import type { GetServerSidePropsContext } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import type { CompanyFeature } from 'types';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import fetcher from '@/lib/fetcher';
import { defaultHeaders } from '@/lib/common';
import { Button, Modal, Table, Select, Badge } from 'react-daisyui';
import { PlusIcon, PencilIcon, TrashIcon, CheckIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import type { ApiResponse } from 'types';

const ReadingsDosages = ({ companyFeatures }: { companyFeatures: CompanyFeature }) => {
  const { t } = useTranslation('common');
  const { isLoading, isError, company } = useCompany();

  if (isLoading) {
    return <Loading />;
  }

  if (isError) {
    return <ErrorComponent message={isError.message} />;
  }

  if (!company) {
    return <ErrorComponent message={t('company-not-found')} />;
  }

  return (
    <>
      <CompanyTab activeTab="readings-dosages" company={company} companyFeatures={companyFeatures} />
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ReadingsList slug={company.slug} />
          <DosagesList slug={company.slug} />
        </div>
      </div>
    </>
  );
};

// --- Values List Builder Component ---

const ValuesListBuilder = ({ 
  values, 
  defaultValue, 
  onChange, 
  unit 
}: { 
  values: string[], 
  defaultValue: string | null, 
  onChange: (values: string[], defaultValue: string | null) => void,
  unit?: string 
}) => {
  const [newValue, setNewValue] = useState('');

  const handleAdd = () => {
    if (!newValue.trim()) return;
    // Don't add duplicates
    if (values.includes(newValue.trim())) {
        toast.error('Value already exists');
        return;
    }
    
    const updatedValues = [...values, newValue.trim()].sort((a, b) => {
        // Try to sort numerically if possible
        const numA = parseFloat(a);
        const numB = parseFloat(b);
        if (!isNaN(numA) && !isNaN(numB)) {
            return numA - numB;
        }
        return a.localeCompare(b);
    });
    
    // Set default if it's the first value
    const newDefault = values.length === 0 ? newValue.trim() : defaultValue;
    
    onChange(updatedValues, newDefault);
    setNewValue('');
  };

  const handleRemove = (valToRemove: string) => {
    const updatedValues = values.filter(v => v !== valToRemove);
    let newDefault = defaultValue;
    if (defaultValue === valToRemove) {
        newDefault = updatedValues.length > 0 ? updatedValues[0] : null;
    }
    onChange(updatedValues, newDefault);
  };

  const handleSetDefault = (val: string) => {
      onChange(values, val);
  };

  return (
    <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
        <label className="label">
            <span className="label-text font-semibold">Values</span>
        </label>
        <div className="flex gap-2 mb-4">
            <input 
                type="text" 
                className="input input-bordered w-full" 
                placeholder={unit ? `Enter value (e.g. 7.4)` : "Enter value"}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAdd();
                    }
                }}
            />
            <Button type="button" color="primary" onClick={handleAdd}>Add</Button>
        </div>
        
        {values.length === 0 ? (
             <div className="text-gray-500 text-sm italic">No values defined. Technicians will not be able to select a value.</div>
        ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {values.map((val) => (
                    <div key={val} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                        <span className="font-medium">{val} {unit}</span>
                        <div className="flex gap-2">
                             {defaultValue === val ? (
                                <Badge color="success" size="sm" className="gap-1">
                                    <CheckIcon className="w-3 h-3"/> Default
                                </Badge>
                             ) : (
                                <Button size="xs" color="ghost" onClick={() => handleSetDefault(val)}>
                                    Make Default
                                </Button>
                             )}
                            <Button size="xs" color="error" variant="outline" shape="square" onClick={() => handleRemove(val)}>
                                <TrashIcon className="w-4 h-4"/>
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        )}
        <div className="mt-2 text-xs text-gray-500">
            Technicians will select from these values. The default value will be pre-selected.
        </div>
    </div>
  );
};


// --- Readings Components ---

const ReadingsList = ({ slug }: { slug: string }) => {
  const { data, isLoading } = useSWR(`/api/companies/${slug}/readings`, fetcher);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);

  const readings = data?.data || [];

  const handleEdit = (item: any) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading definition?')) return;
    try {
      const response = await fetch(`/api/companies/${slug}/readings/${id}`, {
        method: 'DELETE',
        headers: defaultHeaders,
      });

      const json = (await response.json()) as ApiResponse<any>;

      if (!response.ok) {
        throw new Error(json.error?.message || 'Failed to delete reading');
      }

      mutate(`/api/companies/${slug}/readings`);
      toast.success('Reading definition deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  
  return (
    <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Readings</h3>
        <Button size="sm" color="primary" startIcon={<PlusIcon className="h-4 w-4"/>} onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
          Add Reading
        </Button>
      </div>

      {isLoading ? (
        <Loading />
      ) : readings.length === 0 ? (
        <div className="text-gray-500 text-sm">No readings defined.</div>
      ) : (
        <div className="overflow-x-auto">
        <Table className="w-full">
          <Table.Head>
            <span>Name</span>
            <span>Unit</span>
            <span>Actions</span>
          </Table.Head>
          <Table.Body>
            {readings.map((reading: any) => (
              <Table.Row key={reading.id}>
                <span>{reading.name}</span>
                <span>{reading.unit || '-'}</span>
                <div className="flex space-x-2">
                    <Button size="xs" shape="square" color="ghost" onClick={() => handleEdit(reading)}>
                        <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button size="xs" shape="square" color="error" variant="outline" onClick={() => handleDelete(reading.id)}>
                        <TrashIcon className="h-4 w-4" />
                    </Button>
                </div>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
        </div>
      )}

      {isModalOpen && (
        <ReadingModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          slug={slug}
          initialData={editingItem}
        />
      )}
    </div>
  );
};

const ReadingModal = ({ open, onClose, slug, initialData }: { open: boolean; onClose: () => void; slug: string; initialData?: any }) => {
  const isEditing = !!initialData;
  const formik = useFormik({
    initialValues: {
      name: initialData?.name || '',
      unit: initialData?.unit || '',
      values: initialData?.values || [],
      defaultValue: initialData?.defaultValue || null,
      orderIndex: initialData?.orderIndex || 0,
    },
    validationSchema: Yup.object({
      name: Yup.string().required('Name is required'),
      unit: Yup.string(),
      values: Yup.array().of(Yup.string()),
      defaultValue: Yup.string().nullable(),
    }),
    onSubmit: async (values) => {
      try {
        const url = isEditing 
          ? `/api/companies/${slug}/readings/${initialData.id}`
          : `/api/companies/${slug}/readings`;
        
        const response = await fetch(url, {
          method: isEditing ? 'PUT' : 'POST',
          headers: defaultHeaders,
          body: JSON.stringify(values),
        });

        const json = (await response.json()) as ApiResponse<any>;

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to save reading');
        }

        toast.success(isEditing ? 'Reading updated' : 'Reading created');
        mutate(`/api/companies/${slug}/readings`);
        onClose();
      } catch (e: any) {
        toast.error(e.message);
      }
    },
  });

  return (
    <Modal open={open} className="w-11/12 max-w-4xl">
      <Modal.Header className="font-bold">{isEditing ? 'Edit Reading' : 'Add Reading'}</Modal.Header>
      <Modal.Body>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                 <h4 className="font-medium border-b pb-2">Reading Details</h4>
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                  <InputWithLabel
                    label="Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name ? formik.errors.name : undefined}
                    description="e.g. Total Alkalinity"
                  />
                  <InputWithLabel
                    label="Unit (optional)"
                    name="unit"
                    value={formik.values.unit}
                    onChange={formik.handleChange}
                    description="e.g. ppm"
                  />
                </form>
            </div>
            
            <div className="space-y-4">
                 <h4 className="font-medium border-b pb-2">Allowed Values</h4>
                 <ValuesListBuilder 
                    values={formik.values.values}
                    defaultValue={formik.values.defaultValue}
                    unit={formik.values.unit}
                    onChange={(newValues, newDefault) => {
                        formik.setFieldValue('values', newValues);
                        formik.setFieldValue('defaultValue', newDefault);
                    }}
                 />
            </div>
        </div>
      </Modal.Body>
      <Modal.Actions>
        <Button onClick={onClose}>Cancel</Button>
        <Button color="primary" onClick={() => formik.handleSubmit()} loading={formik.isSubmitting}>
          Save
        </Button>
      </Modal.Actions>
    </Modal>
  );
};


// --- Dosages Components ---

const DosagesList = ({ slug }: { slug: string }) => {
    const { data, isLoading } = useSWR(`/api/companies/${slug}/dosages`, fetcher);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
  
    const dosages = data?.data || [];
  
    const handleEdit = (item: any) => {
      setEditingItem(item);
      setIsModalOpen(true);
    };
  
    const handleDelete = async (id: string) => {
      if (!confirm('Are you sure you want to delete this dosage definition?')) return;
      try {
        const response = await fetch(`/api/companies/${slug}/dosages/${id}`, {
          method: 'DELETE',
          headers: defaultHeaders,
        });

        const json = (await response.json()) as ApiResponse<any>;

        if (!response.ok) {
          throw new Error(json.error?.message || 'Failed to delete dosage');
        }

        mutate(`/api/companies/${slug}/dosages`);
        toast.success('Dosage definition deleted');
      } catch (e: any) {
        toast.error(e.message);
      }
    };
  
    return (
      <div className="rounded-md border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Dosages</h3>
          <Button size="sm" color="primary" startIcon={<PlusIcon className="h-4 w-4"/>} onClick={() => { setEditingItem(null); setIsModalOpen(true); }}>
            Add Dosage
          </Button>
        </div>
  
        {isLoading ? (
          <Loading />
        ) : dosages.length === 0 ? (
          <div className="text-gray-500 text-sm">No dosages defined.</div>
        ) : (
          <div className="overflow-x-auto">
          <Table className="w-full">
            <Table.Head>
              <span>Name</span>
              <span>Dosage Type</span>
              <span>Actions</span>
            </Table.Head>
            <Table.Body>
              {dosages.map((dosage: any) => (
                <Table.Row key={dosage.id}>
                  <span>{dosage.name}</span>
                  <span>{dosage.dosageType || '-'}</span>
                  <div className="flex space-x-2">
                      <Button size="xs" shape="square" color="ghost" onClick={() => handleEdit(dosage)}>
                          <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button size="xs" shape="square" color="error" variant="outline" onClick={() => handleDelete(dosage.id)}>
                          <TrashIcon className="h-4 w-4" />
                      </Button>
                  </div>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          </div>
        )}
  
        {isModalOpen && (
          <DosageModal
            open={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            slug={slug}
            initialData={editingItem}
          />
        )}
      </div>
    );
  };
  
  const DosageModal = ({ open, onClose, slug, initialData }: { open: boolean; onClose: () => void; slug: string; initialData?: any }) => {
    const isEditing = !!initialData;
    const formik = useFormik({
      initialValues: {
        name: initialData?.name || '',
        unit: initialData?.unit || '',
        dosageType: initialData?.dosageType || null,
        cost: initialData?.cost || '',
        values: initialData?.values || [],
        defaultValue: initialData?.defaultValue || null,
        orderIndex: initialData?.orderIndex || 0,
      },
      validationSchema: Yup.object({
        name: Yup.string().required('Name is required'),
        unit: Yup.string(),
        dosageType: Yup.string().nullable(),
        cost: Yup.number().nullable(),
        values: Yup.array().of(Yup.string()),
        defaultValue: Yup.string().nullable(),
      }),
      onSubmit: async (values) => {
        try {
          const payload = {
              ...values,
              cost: values.cost === '' ? null : Number(values.cost),
          };
  
          const url = isEditing 
            ? `/api/companies/${slug}/dosages/${initialData.id}`
            : `/api/companies/${slug}/dosages`;
          
          const response = await fetch(url, {
            method: isEditing ? 'PUT' : 'POST',
            headers: defaultHeaders,
            body: JSON.stringify(payload),
          });

          const json = (await response.json()) as ApiResponse<any>;

          if (!response.ok) {
            throw new Error(json.error?.message || 'Failed to save dosage');
          }

          toast.success(isEditing ? 'Dosage updated' : 'Dosage created');
          mutate(`/api/companies/${slug}/dosages`);
          onClose();
        } catch (e: any) {
          toast.error(e.message);
        }
      },
    });
  
    const dosageTypeOptions = [
        { value: '', label: 'None' },
        { value: 'Tabs', label: 'Tabs' },
        { value: 'Liquid Chlorine', label: 'Liquid Chlorine' },
        { value: 'Shock', label: 'Shock' },
        { value: 'pH ↑', label: 'pH ↑ (pH up)' },
        { value: 'pH ↓', label: 'pH ↓ (pH down)' },
        { value: 'Alkalinity ↑', label: 'Alkalinity ↑ (Alkalinity up)' },
        { value: 'Alkalinity ↓', label: 'Alkalinity ↓ (Alkalinity down)' },
        { value: 'Cyanuric Acid', label: 'Cyanuric Acid' },
        { value: 'Phosphates ↓', label: 'Phosphates ↓ (Phosphates down)' },
        { value: 'Chlorine ↓', label: 'Chlorine ↓ (Chlorine down)' },
    ];

    return (
      <Modal open={open} className="w-11/12 max-w-4xl">
        <Modal.Header className="font-bold">{isEditing ? 'Edit Dosage' : 'Add Dosage'}</Modal.Header>
        <Modal.Body>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
                 <h4 className="font-medium border-b pb-2">Dosage Details</h4>
                <form onSubmit={formik.handleSubmit} className="space-y-4">
                    <InputWithLabel
                    label="Name"
                    name="name"
                    value={formik.values.name}
                    onChange={formik.handleChange}
                    error={formik.touched.name ? formik.errors.name : undefined}
                    description="e.g. Liquid Chlorine"
                    />
                    
                    <div className="form-control w-full">
                        <label className="label">
                            <span className="label-text">Dosage Type</span>
                        </label>
                        <Select
                            name="dosageType"
                            value={formik.values.dosageType || ''}
                            onChange={formik.handleChange}
                            className="w-full"
                        >
                            {dosageTypeOptions.map((opt) => (
                                <Select.Option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </Select.Option>
                            ))}
                        </Select>
                    </div>

                    <InputWithLabel
                        label="Unit (optional)"
                        name="unit"
                        value={formik.values.unit}
                        onChange={formik.handleChange}
                        description="e.g. fl oz, gal, oz"
                    />

                    <InputWithLabel
                        label="Cost (optional)"
                        name="cost"
                        type="number"
                        value={formik.values.cost}
                        onChange={formik.handleChange}
                        description="Cost per unit"
                    />
                </form>
            </div>
             <div className="space-y-4">
                 <h4 className="font-medium border-b pb-2">Allowed Amounts</h4>
                 <ValuesListBuilder 
                    values={formik.values.values}
                    defaultValue={formik.values.defaultValue}
                    unit={formik.values.unit}
                    onChange={(newValues, newDefault) => {
                        formik.setFieldValue('values', newValues);
                        formik.setFieldValue('defaultValue', newDefault);
                    }}
                 />
            </div>
          </div>
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={onClose}>Cancel</Button>
          <Button color="primary" onClick={() => formik.handleSubmit()} loading={formik.isSubmitting}>
            Save
          </Button>
        </Modal.Actions>
      </Modal>
    );
  };


export async function getServerSideProps({
  locale,
}: GetServerSidePropsContext) {
  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      companyFeatures: env.companyFeatures,
    },
  };
}

export default ReadingsDosages;
