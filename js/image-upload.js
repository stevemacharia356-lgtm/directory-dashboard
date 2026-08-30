// Compress image before upload to prevent hanging on large files
function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          const ratio = maxWidth / width;
          width = maxWidth;
          height = Math.round(height * ratio);
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(function(blob) {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Compression failed'));
          }
        }, 'image/jpeg', quality);
      };
      img.onerror = function() { reject(new Error('Image load failed')); };
      img.src = e.target.result;
    };
    reader.onerror = function() { reject(new Error('File read failed')); };
    reader.readAsDataURL(file);
  });
}

// Simple direct image upload with compression
function uploadImage(file, storagePath) {
  return new Promise((resolve, reject) => {
    // Compress first — max 800px width, 70% quality
    compressImage(file, 800, 0.7).then(compressedBlob => {
      const uploadTask = storage.ref(storagePath).put(compressedBlob);
      
      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload: ' + progress.toFixed(0) + '%');
        },
        (error) => { reject(error); },
        async () => {
          const url = await uploadTask.snapshot.ref.getDownloadURL();
          resolve(url);
        }
      );
    }).catch(error => { reject(error); });
  });
}

function showProcessingIndicator(containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '<div class="processing-indicator"><div class="spinner"></div><span>Compressing & Uploading...</span></div>';
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

function uploadHeroImage(file, directorySlug, docRef) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

function uploadThumbnailImage(file, directorySlug, listingSlug, listingId) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/' + listingSlug + '/thumbnail.' + file.name.split('.').pop(), 'thumbnailPreview');
}

function uploadBusinessHero(file, businessSlug) {
  return uploadAnyImage(file, 'businesses/' + businessSlug + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

function uploadHero(file, pathPrefix) {
  return uploadAnyImage(file, pathPrefix + '/hero.' + file.name.split('.').pop(), 'heroPreview');
}

function uploadThumbnail(file, directorySlug, listingSlug) {
  return uploadAnyImage(file, 'directories/' + directorySlug + '/' + listingSlug + '/thumbnail.' + file.name.split('.').pop(), 'thumbnailPreview');
}