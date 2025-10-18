import { useState } from 'react';
import toast from 'react-hot-toast';
import { useCustomerPhotos } from '../../../hooks/useCustomerPhotos';
import Image from 'next/image';

interface PhotosComponentProps {
  companySlug: string;
  customerId: string;
}

const PhotosComponent = ({ companySlug, customerId }: PhotosComponentProps) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { photos, isLoading, error, mutate } = useCustomerPhotos(companySlug, customerId);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      // Validate file size (10MB limit)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    console.log('handleUpload', selectedFile, companySlug, customerId);
    if (!selectedFile || !companySlug || !customerId) {
      toast.error('Please select a file and provide company slug and customer id');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch(`/api/upload/customer-photo?companySlug=${companySlug}&customerId=${customerId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      toast.success('Photo uploaded successfully!');
      setSelectedFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
      // Refresh the photos list
      mutate();
      
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeletePhoto = async (photoKey: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    
    try {
      const response = await fetch(`/api/customers/${customerId}/photos/delete?companySlug=${companySlug}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: photoKey }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete photo');
      }

      toast.success('Photo deleted successfully!');
      mutate();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete photo');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div>
      <h1>Photos</h1>
      
      {/* Upload Section */}
      <div className="mt-4 mb-6">
        <h3 className="text-lg font-semibold mb-3">Upload New Photo</h3>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="mb-4"
        />
        
        {selectedFile && (
          <div className="mb-4 p-3 bg-gray-100 rounded">
            <p><strong>Selected:</strong> {selectedFile.name}</p>
            <p><strong>Size:</strong> {(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
            <p><strong>Type:</strong> {selectedFile.type}</p>
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={!selectedFile || isUploading}
          className="btn btn-primary"
        >
          {isUploading ? 'Uploading...' : 'Upload Photo'}
        </button>
      </div>

      {/* Photos Grid */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">
          Customer Photos ({photos.length})
        </h3>
        
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <span className="loading loading-spinner loading-lg"></span>
          </div>
        )}
        
        {error && (
          <div className="alert alert-error">
            <span>Failed to load photos: {error.message}</span>
          </div>
        )}
        
        {!isLoading && !error && photos.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No photos uploaded yet.</p>
            <p>Upload your first photo using the form above.</p>
          </div>
        )}
        
        {!isLoading && !error && photos.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <div key={photo.key} className="card bg-base-100 shadow-xl">
                <figure className="aspect-square">
                  <Image
                    src={photo.downloadUrl}
                    alt={photo.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                </figure>
                <div className="card-body p-3">
                  <h4 className="card-title text-sm truncate">{photo.filename}</h4>
                  <p className="text-xs text-gray-500">
                    {formatFileSize(photo.size)}
                  </p>
                  {photo.lastModified && (
                    <p className="text-xs text-gray-500">
                      {new Date(photo.lastModified).toLocaleDateString()}
                    </p>
                  )}
                  <div className="card-actions justify-end mt-2">
                    <a
                      href={photo.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-xs btn-outline"
                    >
                      View
                    </a>
                    <button
                      onClick={() => handleDeletePhoto(photo.key)}
                      className="btn btn-xs btn-error"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosComponent;