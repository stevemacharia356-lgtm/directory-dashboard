// Simple direct image upload - works for all image types
function uploadImage(file, storagePath) {
  return new Promise((resolve, reject) => {
    const uploadTask = storage.ref(storagePath).put(file);
    
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        console.log('Upload: ' + progress.toFixed(0) + '%');
      },
      (error) => {
        reject(error);
      },
      async () => {
        const url = await uploadTask.snapshot.ref.getDownloadURL();
        resolve(url);
      }
    );
  });
}

function showProcessingIndicator(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="processing-indicator"><div class="spinner"></div><span>Uploading...</span></div>';
}

function showImagePreview(containerId, url, alt) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<img src="' + url + '" alt="' + (alt || '') + '" class="image-preview">';
}

function showUploadError(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<p class="error-message">Upload failed. Try again.</p>';
}

// Universal upload - call with full path and preview container ID
function uploadAnyImage(file, fullPath, previewId) {
  showProcessingIndicator(previewId);
  return uploadImage(file, fullPath).then(url => {
    showImagePreview(previewId, url, '');
    return url;
  }).catch(error => {
    showUploadError(previewId);
    throw error;
  });
}

// Directory hero image
function uploadHeroImage(file, directorySlug, docRef) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

// Directory listing thumbnail
function uploadThumbnailImage(file, directorySlug, listingSlug, listingId) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/' + listingSlug + '/thumbnail.' + file.name.split('.').pop(), 'thumbnailPreview');
}

// Business hero image
function uploadBusinessHero(file, businessSlug) {
  return uploadAnyImage(file, 'businesses/' + businessSlug + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

// Backward compatibility
function uploadHero(file, pathPrefix) {
  return uploadAnyImage(file, pathPrefix + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

function uploadThumbnail(file, directorySlug, listingSlug) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/' + listingSlug + '/thumbnail.' + file.name.split('.').pop(), 'thumbnailPreview');
}