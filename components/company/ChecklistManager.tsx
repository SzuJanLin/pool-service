import { useState, useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { useTranslation } from 'next-i18next';
import toast from 'react-hot-toast';
import { Button, Card, Modal } from 'react-daisyui';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import type { Company } from '@prisma/client';
import fetcher from '@/lib/fetcher';
import { Loading, Error, InputWithLabel } from '@/components/shared';
import type { ApiResponse } from 'types';

interface ChecklistItem {
  id: string;
  description: string;
  descriptionWhenCompleted?: string;
  orderIndex: number;
}

interface ChecklistTemplate {
  id: string;
  companyId: string;
  items: ChecklistItem[];
}

const ChecklistManager = ({ company }: { company: Company }) => {
  const { t } = useTranslation('common');
  const { mutate } = useSWRConfig();
  const { data, error, isLoading } = useSWR<ApiResponse<ChecklistTemplate>>(
    `/api/companies/${company.slug}/checklist`,
    fetcher
  );

  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState<ChecklistItem | null>(null);
  
  // Form state
  const [formDesc, setFormDesc] = useState('');
  const [formDescCompleted, setFormDescCompleted] = useState('');

  const resetForm = () => {
    setFormDesc('');
    setFormDescCompleted('');
    setEditingItem(null);
    setIsAdding(false);
  };

  const handleSaveItem = async () => {
    if (!formDesc) {
      toast.error('Description is required');
      return;
    }

    const body = {
      description: formDesc,
      descriptionWhenCompleted: formDescCompleted,
    };

    try {
      if (editingItem) {
        // Update
        const response = await fetch(
          `/api/companies/${company.slug}/checklist/items/${editingItem.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) throw new Error('Failed to update item');
        toast.success('Item updated');
      } else {
        // Create
        const response = await fetch(
          `/api/companies/${company.slug}/checklist/items`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          }
        );
        if (!response.ok) throw new Error('Failed to add item');
        toast.success('Item added');
      }
      mutate(`/api/companies/${company.slug}/checklist`);
      resetForm();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm(t('are-you-sure'))) return;

    try {
      const response = await fetch(
        `/api/companies/${company.slug}/checklist/items/${itemId}`,
        {
          method: 'DELETE',
        }
      );
      if (!response.ok) throw new Error('Failed to delete item');
      mutate(`/api/companies/${company.slug}/checklist`);
      toast.success('Item deleted');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const startEdit = (item: ChecklistItem) => {
    setEditingItem(item);
    setFormDesc(item.description || '');
    setFormDescCompleted(item.descriptionWhenCompleted || '');
    setIsAdding(true);
  };

  // Auto-create checklist if it doesn't exist is handled by the API GET/POST logic now or
  // we can ensure it exists by calling POST on mount if data is empty.
  // Actually, the GET endpoint should just return a default structure or we create it on first item add.
  // My update to GET endpoint creates it if missing, so data?.data should exist.

  if (isLoading) return <Loading />;
  if (error) return <Error message={error.message} />;

  const checklist = data?.data;

  // If for some reason checklist is null (API failure or manual delete), show empty state but still allow adding
  const items = checklist?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Checklist Items</h2>
        <Button
          color="primary"
          size="sm"
          startIcon={<PlusIcon className="h-4 w-4" />}
          onClick={() => {
            resetForm();
            setIsAdding(true);
          }}
        >
          Add Item
        </Button>
      </div>

      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="bg-base-100 shadow-sm border border-gray-200">
            <Card.Body className="p-4 flex-row justify-between items-center">
              <div>
                <h3 className="font-medium">{item.description}</h3>
                {item.descriptionWhenCompleted && (
                  <p className="text-sm text-gray-500 italic">
                    On complete: {item.descriptionWhenCompleted}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" color="ghost" shape="square" onClick={() => startEdit(item)}>
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button size="sm" color="ghost" shape="square" className="text-error" onClick={() => handleDeleteItem(item.id)}>
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </Card.Body>
          </Card>
        ))}
        {items.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No items yet. Add one to get started.
          </div>
        )}
      </div>

      <Modal open={isAdding} className="w-11/12 max-w-lg">
        <Modal.Header className="font-bold">
          {editingItem ? 'Edit Item' : 'Add Item'}
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <InputWithLabel
            label="Description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Instructions for the technician..."
          />
          <InputWithLabel
            label="Description When Completed"
            value={formDescCompleted}
            onChange={(e) => setFormDescCompleted(e.target.value)}
            placeholder="Text to show after checking (optional)"
          />
        </Modal.Body>
        <Modal.Actions>
          <Button onClick={resetForm} color="ghost">Cancel</Button>
          <Button onClick={handleSaveItem} color="primary">Save</Button>
        </Modal.Actions>
      </Modal>
    </div>
  );
};

export default ChecklistManager;
