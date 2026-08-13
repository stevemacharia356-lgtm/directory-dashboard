// Auth state management
auth.onAuthStateChanged((user) => {
  const currentPath = window.location.pathname;
  
  if (user) {
    // User is signed in
    if (currentPath.includes('index.html') || currentPath === '/' || currentPath.endsWith('/directory-dashboard/')) {
      window.location.href = 'dashboard.html';
    }
  } else {
    // User is signed out
    if (!currentPath.includes('index.html') && currentPath !== '/' && !currentPath.endsWith('/directory-dashboard/')) {
      window.location.href = 'index.html';
    }
  }
});

// Login function
function login(email, password) {
  return auth.signInWithEmailAndPassword(email, password);
}

// Logout function
function logout() {
  return auth.signOut();
}