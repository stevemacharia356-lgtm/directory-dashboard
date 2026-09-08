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

// ============================================
// PHONE BACK BUTTON NAVIGATION HELPERS
// ============================================

// Navigation history stack
let navHistory = ['directories'];
let currentNavView = 'directories';

// Check if device is mobile
function isMobileDevice() {
  return window.innerWidth <= 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

// Navigate to a view with history tracking
function navigateToView(view, loadFunction) {
  // Don't push duplicate views
  if (navHistory[navHistory.length - 1] === view) {
    return;
  }
  
  navHistory.push(view);
  currentNavView = view;
  
  // Update URL hash
  history.pushState({ view: view }, '', '#' + view);
  
  // Load the view
  if (typeof loadFunction === 'function') {
    loadFunction();
  }
  
  // Update back button visibility
  updateBackButtonVisibility();
}

// Go back to previous view
function goBackView() {
  if (navHistory.length <= 1) {
    // No history, go to directories
    if (currentNavView !== 'directories') {
      navHistory = ['directories'];
      currentNavView = 'directories';
      history.pushState({ view: 'directories' }, '', '#directories');
      if (typeof loadDirectoryList === 'function') {
        loadDirectoryList();
      }
      updateBackButtonVisibility();
      updateNavButtons('directories');
    }
    return;
  }
  
  // Pop current view
  navHistory.pop();
  const previousView = navHistory[navHistory.length - 1] || 'directories';
  currentNavView = previousView;
  
  // Update URL
  history.pushState({ view: previousView }, '', '#' + previousView);
  
  // Load previous view
  if (previousView === 'directories' && typeof loadDirectoryList === 'function') {
    loadDirectoryList();
  } else if (previousView === 'business' && typeof showBusinessList === 'function') {
    showBusinessList();
  } else if (previousView === 'build' && typeof loadBuildStatus === 'function') {
    loadBuildStatus();
  }
  
  // Update navigation buttons
  updateNavButtons(previousView);
  
  // Update back button visibility
  updateBackButtonVisibility();
}

// Update active nav button
function updateNavButtons(activeView) {
  const navDirectories = document.getElementById('navDirectories');
  const navBusiness = document.getElementById('navBusiness');
  const navBuild = document.getElementById('navBuild');
  
  if (navDirectories) {
    navDirectories.classList.toggle('active', activeView === 'directories');
  }
  if (navBusiness) {
    navBusiness.classList.toggle('active', activeView === 'business');
  }
  if (navBuild) {
    navBuild.classList.toggle('active', activeView === 'build');
  }
}

// Update back button visibility
function updateBackButtonVisibility() {
  const showBack = navHistory.length > 1;
  const isMobile = isMobileDevice();
  
  // Floating back button (mobile)
  const backBtn = document.getElementById('backButton');
  if (backBtn) {
    backBtn.style.display = showBack && isMobile ? 'flex' : 'none';
  }
  
  // Header back button (desktop)
  const backHeader = document.getElementById('backButtonHeader');
  if (backHeader) {
    backHeader.style.display = showBack && !isMobile ? 'inline-flex' : 'none';
  }
}

// Handle browser back button
window.addEventListener('popstate', function(e) {
  if (e.state && e.state.view) {
    const view = e.state.view;
    // Find if view exists in history
    const index = navHistory.indexOf(view);
    if (index !== -1) {
      navHistory = navHistory.slice(0, index + 1);
    } else {
      navHistory.push(view);
    }
    currentNavView = view;
    
    // Load view
    if (view === 'directories' && typeof loadDirectoryList === 'function') {
      loadDirectoryList();
    } else if (view === 'business' && typeof showBusinessList === 'function') {
      showBusinessList();
    } else if (view === 'build' && typeof loadBuildStatus === 'function') {
      loadBuildStatus();
    }
    
    updateNavButtons(view);
    updateBackButtonVisibility();
  }
});

// Handle window resize for mobile/desktop toggle
let resizeTimeout;
window.addEventListener('resize', function() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(function() {
    updateBackButtonVisibility();
  }, 250);
});

// Initialize back button on page load
document.addEventListener('DOMContentLoaded', function() {
  // Reset history
  navHistory = ['directories'];
  currentNavView = 'directories';
  
  // Check URL hash for initial view
  const hash = window.location.hash.replace('#', '');
  if (hash && ['directories', 'business', 'build'].includes(hash)) {
    navHistory = [hash];
    currentNavView = hash;
    updateNavButtons(hash);
  }
  
  updateBackButtonVisibility();
  
  // Expose functions globally
  window.goBackView = goBackView;
  window.navigateToView = navigateToView;
  window.isMobileDevice = isMobileDevice;
  window.updateBackButtonVisibility = updateBackButtonVisibility;
});

// ============================================
// OVERRIDE: Patch existing navigation functions
// ============================================

// Store original functions if they exist
const originalNavigateTo = window.navigateTo || function() {};

// Override navigateTo to use history
window.navigateTo = function(view) {
  if (view === 'directories') {
    navigateToView('directories', loadDirectoryList);
  } else if (view === 'business') {
    navigateToView('business', showBusinessList);
  } else if (view === 'build') {
    navigateToView('build', loadBuildStatus);
  }
};

// Override goBack if it exists
window.goBack = function() {
  goBackView();
};

// Override showDirectories, showBusinessPages, showBuildStatus
window.showDirectories = function() {
  navigateToView('directories', loadDirectoryList);
};

window.showBusinessPages = function() {
  navigateToView('business', showBusinessList);
};

window.showBuildStatus = function() {
  navigateToView('build', loadBuildStatus);
};

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateSlug,
    validateKenyaCoordinates,
    sanitizeFormValues,
    formatPhoneInternational,
    getPriceSuffix,
    goBackView,
    navigateToView,
    isMobileDevice,
    updateBackButtonVisibility
  };
}