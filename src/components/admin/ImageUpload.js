import React, { useState, useRef } from 'react';
import { FiUpload, FiX, FiImage } from 'react-icons/fi';
import './ImageUpload.css';

const ImageUpload = ({ 
  onImagesSelected = () => {}, 
  maxImages = 5, 
  existingImages = [],
  onRemoveExisting,
  label = "Product Images"
}) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Handle file selection
  const handleFileSelect = (files) => {
    const fileArray = Array.from(files);
    const totalImages = existingImages.length + selectedFiles.length + fileArray.length;

    if (totalImages > maxImages) {
      alert(`You can only upload up to ${maxImages} images`);
      return;
    }

    // Validate files
    const validFiles = fileArray.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      const maxSize = 5 * 1024 * 1024; // 5MB

      if (!validTypes.includes(file.type)) {
        alert(`${file.name} is not a valid image type`);
        return false;
      }

      if (file.size > maxSize) {
        alert(`${file.name} exceeds 5MB size limit`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Create previews
    const newPreviews = validFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }));

    const updatedFiles = [...selectedFiles, ...validFiles];
    const updatedPreviews = [...previews, ...newPreviews];

    setSelectedFiles(updatedFiles);
    setPreviews(updatedPreviews);
    onImagesSelected(updatedFiles);
  };

  // Handle drag events
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  // Handle file input change
  const handleInputChange = (e) => {
    const files = e.target.files;
    handleFileSelect(files);
  };

  // Remove selected image
  const removeImage = (index) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    // Revoke object URL to prevent memory leaks
    URL.revokeObjectURL(previews[index].preview);

    setSelectedFiles(newFiles);
    setPreviews(newPreviews);
    onImagesSelected(newFiles);
  };

  // Open file picker
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      previews.forEach(preview => {
        URL.revokeObjectURL(preview.preview);
      });
    };
  }, [previews]);

  return (
    <div className="image-upload-container">
      <label className="image-upload-label">{label}</label>
      
      {/* Upload Area */}
      <div
        className={`image-upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={openFilePicker}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />
        
        <div className="upload-icon">
          <FiUpload size={48} />
        </div>
        <p className="upload-text">
          Drag and drop images here or <span className="upload-link">browse</span>
        </p>
        <p className="upload-hint">
          JPG, PNG or WebP (max 5MB each, up to {maxImages} images)
        </p>
      </div>

      {/* Image Previews */}
      {previews.length > 0 && (
        <div className="image-preview-grid">
          {previews.map((preview, index) => (
            <div key={index} className="image-preview-item">
              <img src={preview.preview} alt={preview.name} />
              <button
                type="button"
                className="remove-image-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  removeImage(index);
                }}
              >
                <FiX size={16} />
              </button>
              <div className="image-name">{preview.name}</div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div className="existing-images-section">
          <label className="existing-images-label">Existing Images</label>
          <div className="image-preview-grid">
            {existingImages.map((image, index) => (
              <div key={`existing-${index}`} className="image-preview-item existing">
                <img src={image.url} alt={`Existing ${index + 1}`} />
                {onRemoveExisting ? (
                  <button
                    type="button"
                    className="remove-image-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveExisting(image, index);
                    }}
                    title="Remove Image"
                  >
                    <FiX size={16} />
                  </button>
                ) : (
                  <div className="existing-badge">
                    <FiImage size={12} /> Saved
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload Info */}
      <div className="upload-info">
        <span>
          {selectedFiles.length + existingImages.length} / {maxImages} images
        </span>
      </div>
    </div>
  );
};

export default ImageUpload;
