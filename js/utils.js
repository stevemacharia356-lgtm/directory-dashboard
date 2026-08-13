// Generate directory slug from niche and location
function generateSlug(nicheSlug, locationName) {
  const locationSlug = locationName
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
  return `${nicheSlug}-${locationSlug}`;
}

// Validate Kenya coordinates
function validateKenyaCoordinates(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  
  if (isNaN(parsedLat) || isNaN(parsedLng)) return false;
  
  const isLatValid = parsedLat >= -5.0 && parsedLat <= 5.0;
  const isLngValid = parsedLng >= 33.0 && parsedLng <= 42.0;
  
  return isLatValid && isLngValid;
}

// Sanitize form values
function sanitizeFormValues(rawValues) {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(rawValues)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed === '') continue;
      
      if (trimmed.includes(',')) {
        sanitized[key] = trimmed.split(',')
          .map(item => item.trim())
          .filter(item => item !== '');
        continue;
      }
      sanitized[key] = trimmed;
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Format phone to international format
function formatPhoneInternational(phone) {
  let cleaned = phone.replace(/\s+/g, '').trim();
  if (cleaned.startsWith('0')) {
    cleaned = '+254' + cleaned.substring(1);
  }
  if (cleaned.startsWith('7')) {
    cleaned = '+254' + cleaned;
  }
  if (cleaned.startsWith('254') && !cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Get formatted price display (preview only, engine does final formatting)
function getPriceSuffix(nicheSlug) {
  const suffixes = {
    guesthouse: '/night',
    hotel: '/night',
    apartment: '/month',
    school: '/term',
    health: ''
  };
  return suffixes[nicheSlug] || '';
}