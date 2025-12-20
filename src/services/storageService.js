import { ref, uploadBytesResumable, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { storage } from '../config/firebase';

/**
 * Compress and validate image before upload
 * @param {File} file - Image file to validate
 * @returns {Promise<File>} - Validated file
 */
const validateImage = async (file) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!validTypes.includes(file.type)) {
    throw new Error('Invalid file type. Only JPG, PNG, and WebP are allowed.');
  }

  if (file.size > maxSize) {
    throw new Error('File size exceeds 5MB limit.');
  }

  return file;
};

/**
 * Generate unique filename
 * @param {string} originalName - Original filename
 * @returns {string} - Unique filename
 */
const generateUniqueFilename = (originalName) => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}_${randomString}.${extension}`;
};

/**
 * Upload single image to Firebase Storage
 * @param {File} file - Image file to upload
 * @param {string} path - Storage path (e.g., 'products/productId')
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<string>} - Download URL
 */
export const uploadImage = async (file, path, onProgress = null) => {
  try {
    // Validate image
    await validateImage(file);

    // Generate unique filename
    const filename = generateUniqueFilename(file.name);
    const fullPath = `${path}/${filename}`;

    // Create storage reference
    const storageRef = ref(storage, fullPath);

    // Upload file
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle errors
          console.error('Upload error:', error);
          reject(error);
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({
              url: downloadURL,
              path: fullPath,
              filename: filename
            });
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  } catch (error) {
    throw error;
  }
};

/**
 * Upload multiple images
 * @param {FileList|Array} files - Array of image files
 * @param {string} path - Storage path
 * @param {Function} onProgress - Progress callback for each file
 * @returns {Promise<Array>} - Array of download URLs
 */
export const uploadMultipleImages = async (files, path, onProgress = null) => {
  const uploadPromises = Array.from(files).map((file, index) => {
    const progressCallback = onProgress 
      ? (progress) => onProgress(index, progress)
      : null;
    return uploadImage(file, path, progressCallback);
  });

  try {
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Delete image from Firebase Storage
 * @param {string} imagePath - Full path to image in storage
 * @returns {Promise<void>}
 */
export const deleteImage = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    await deleteObject(imageRef);
    console.log('Image deleted successfully:', imagePath);
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 * @param {Array<string>} imagePaths - Array of image paths
 * @returns {Promise<void>}
 */
export const deleteMultipleImages = async (imagePaths) => {
  const deletePromises = imagePaths.map(path => deleteImage(path));
  
  try {
    await Promise.all(deletePromises);
    console.log('All images deleted successfully');
  } catch (error) {
    console.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Get download URL for an image
 * @param {string} imagePath - Path to image in storage
 * @returns {Promise<string>} - Download URL
 */
export const getImageURL = async (imagePath) => {
  try {
    const imageRef = ref(storage, imagePath);
    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error('Error getting image URL:', error);
    throw error;
  }
};

/**
 * List all images in a directory
 * @param {string} path - Directory path
 * @returns {Promise<Array>} - Array of image references
 */
export const listImages = async (path) => {
  try {
    const listRef = ref(storage, path);
    const result = await listAll(listRef);
    
    const imagePromises = result.items.map(async (itemRef) => {
      const url = await getDownloadURL(itemRef);
      return {
        name: itemRef.name,
        fullPath: itemRef.fullPath,
        url: url
      };
    });

    const images = await Promise.all(imagePromises);
    return images;
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
};

/**
 * Extract storage path from download URL
 * @param {string} downloadURL - Firebase download URL
 * @returns {string} - Storage path
 */
export const getPathFromURL = (downloadURL) => {
  try {
    const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
    const startIndex = downloadURL.indexOf(baseUrl) + baseUrl.length;
    const endIndex = downloadURL.indexOf('/o/') + 3;
    const pathEncoded = downloadURL.substring(endIndex, downloadURL.indexOf('?'));
    return decodeURIComponent(pathEncoded);
  } catch (error) {
    console.error('Error extracting path from URL:', error);
    return null;
  }
};
