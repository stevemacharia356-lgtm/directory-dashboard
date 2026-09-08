// Global state
let activeTab = 'published';
let currentDirectorySlug = null;

// Load directory list with Published/Drafts tabs
function loadDirectoryList() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="tabs"><button class="tab ' + (activeTab === 'published' ? 'active' : '') + '" onclick="switchTab(\'published\')" id="tabPublished">Published</button><button class="tab ' + (activeTab === 'drafts' ? 'active' : '') + '" onclick="switchTab(\'drafts\')" id="tabDrafts">Drafts</button></div><div style="margin-bottom:1rem;"><button class="btn-primary" onclick="showCreateDirectoryForm()" style="width:auto;">+ Create New Directory</button></div><div id="directoryList" class="card-grid"></div>';

  db.collection('directories').onSnapshot((snapshot) => {
    const directories = [];
    snapshot.forEach(doc => { directories.push({ id: doc.id, ...doc.data() }); });
    window.allDirectories = directories;
    renderDirectoryCards(directories, activeTab);
  });
}

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('tabPublished').classList.toggle('active', tab === 'published');
  document.getElementById('tabDrafts').classList.toggle('active', tab === 'drafts');
  renderDirectoryCards(window.allDirectories || [], tab);
}

function renderDirectoryCards(directories, filter) {
  const container = document.getElementById('directoryList');
  if (!container) return;
  const filtered = directories.filter(d => { if (filter === 'published') return d.status === 'published'; return d.status === 'draft'; });
  if (filtered.length === 0) { container.innerHTML = '<p style="color:#666;">No ' + filter + ' directories yet.</p>'; return; }
  container.innerHTML = filtered.map(dir => {
    let displayTitle = dir.nicheDisplay + ' in ' + dir.locationDisplay;
    if (dir.categoryTag) displayTitle = dir.categoryTag + ' ' + dir.nicheDisplay + ' in ' + dir.locationDisplay;
    return '<div class="card"><div style="display:flex; justify-content:space-between; align-items:start;"><span class="status-badge status-' + (dir.status === 'published' ? 'published' : 'draft') + '">' + dir.status + '</span></div><h3 style="margin:0.5rem 0;">' + displayTitle + '</h3><p style="color:#666; font-size:0.9rem;">' + (dir.listings ? dir.listings.length : 0) + ' listings</p><p style="color:#999; font-size:0.8rem;">Last edited: ' + new Date(dir.lastEditedAt).toLocaleDateString('en-KE') + '</p><div style="display:flex; gap:0.5rem; margin-top:0.5rem;"><button class="btn-secondary" onclick="editDirectory(\'' + dir.id + '\')">Edit</button>' + (dir.status === 'draft' ? '<button class="btn-success" onclick="changeDirectoryStatus(\'' + dir.id + '\', \'published\')">Publish</button>' : '<button class="btn-secondary" onclick="changeDirectoryStatus(\'' + dir.id + '\', \'draft\')">Unpublish</button>') + '<button class="btn-danger" onclick="deleteDirectory(\'' + dir.id + '\', this)">Delete</button></div></div>';
  }).join('');
}

function showCreateDirectoryForm() {
  const content = document.getElementById('content');
  content.innerHTML = '<h2>Create New Directory</h2><div class="card"><div class="form-group"><label>Business Type / Niche *</label><input type="text" id="nicheType" placeholder="e.g., Guesthouse, Nightclub, Supermarket" oninput="updateSlugPreview()" list="nicheSuggestions"><datalist id="nicheSuggestions"><option value="Guesthouse"><option value="Hotel"><option value="Apartment"><option value="School"><option value="Health Facility"><option value="Nightclub"><option value="Supermarket"><option value="Restaurant"><option value="Gym"><option value="Salon"><option value="Pharmacy"><option value="Hardware"><option value="Church"><option value="Car Wash"></datalist></div><div class="form-group"><label>Location Name *</label><input type="text" id="locationName" placeholder="e.g., Mpeketoni" oninput="updateSlugPreview()"></div><div class="form-group"><label>County</label><input type="text" id="locationCounty" placeholder="e.g., Lamu"></div><div class="form-group"><label>Sub-County</label><input type="text" id="locationSubCounty" placeholder="e.g., Mpeketoni Ward"></div><div class="form-group"><label>Category Tag (optional)</label><input type="text" id="categoryTag" placeholder="e.g., Luxury, Budget, Premium" oninput="updateSlugPreview()"></div><div class="form-group"><label>Directory Slug (auto-generated)</label><input type="text" id="directorySlug" readonly style="background:#f5f5f5;"></div><div class="form-group"><label>Location Description</label><textarea id="locationDescription" placeholder="Describe this location or use AI..."></textarea><button class="btn-secondary" id="btnGenLocDesc" onclick="generateLocationDesc()" style="width:auto; margin-top:0.5rem;">✨ Generate Location Description</button></div><div class="form-group"><label>Hero Image</label><input type="file" id="heroImageFile" accept="image/*"><div id="heroPreview"></div></div><div class="form-group"><label>Hero Image Alt Text</label><input type="text" id="heroImageAlt" placeholder="Describe the hero image"></div><div style="display:flex; gap:1rem;"><button class="btn-secondary" onclick="loadDirectoryList()">Cancel</button><button class="btn-secondary" id="btnDraft" onclick="saveDirectory(\'draft\')">Save as Draft</button><button class="btn-primary" id="btnPublish" onclick="saveDirectory(\'published\')">Save & Publish</button></div></div>';
}

async function generateLocationDesc() {
  const btn = document.getElementById('btnGenLocDesc');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    const locationName = document.getElementById('locationName').value.trim();
    const county = document.getElementById('locationCounty').value.trim();
    const subCounty = document.getElementById('locationSubCounty').value.trim();
    const niche = document.getElementById('nicheType').value.trim();

    if (!locationName || !niche) {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Location Description'; }
      return;
    }

    const genFn = functions.httpsCallable('generateLocationDescription');
    const result = await genFn({ locationName, county, subCounty, niche });
    document.getElementById('locationDescription').value = result.data.description || '';
    if (btn) { btn.textContent = '✓ Generated'; setTimeout(() => { btn.disabled = false; btn.textContent = '✨ Generate Location Description'; }, 2000); }
  } catch (error) {
    console.error('Location description generation failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = '✗ Failed. Try Again'; setTimeout(() => { btn.textContent = '✨ Generate Location Description'; }, 2000); }
  }
}

function updateSlugPreview() {
  const niche = document.getElementById('nicheType').value;
  const location = document.getElementById('locationName').value;
  const category = document.getElementById('categoryTag').value.trim();
  const nicheSlug = niche.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  let slugParts = [nicheSlug];
  if (category) slugParts.push(category.toLowerCase().replace(/\s+/g, '-'));
  slugParts.push(location.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  document.getElementById('directorySlug').value = slugParts.join('-');
}

async function saveDirectory(status) {
  const btnDraft = document.getElementById('btnDraft');
  const btnPublish = document.getElementById('btnPublish');
  if (btnDraft) { btnDraft.disabled = true; btnDraft.textContent = 'Saving...'; }
  if (btnPublish) { btnPublish.disabled = true; btnPublish.textContent = 'Saving...'; }

  try {
    const nicheType = document.getElementById('nicheType').value.trim();
    const locationName = document.getElementById('locationName').value.trim();
    const categoryTag = document.getElementById('categoryTag').value.trim();
    const locationDescription = document.getElementById('locationDescription').value.trim();
    const slug = document.getElementById('directorySlug').value;
    const heroAlt = document.getElementById('heroImageAlt').value.trim();
    const heroFile = document.getElementById('heroImageFile').files[0];

    if (!nicheType || !locationName) { console.warn('Niche and location required'); if (btnDraft) { btnDraft.disabled = false; btnDraft.textContent = 'Save as Draft'; } if (btnPublish) { btnPublish.disabled = false; btnPublish.textContent = 'Save & Publish'; } return; }

    const nicheSlug = nicheType.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const nicheDisplay = nicheType.charAt(0).toUpperCase() + nicheType.slice(1);
    const docRef = db.collection('directories').doc(slug);
    const now = new Date().toISOString();

    const data = {
      directory: slug, nicheSlug: nicheSlug, nicheDisplay: nicheDisplay,
      location: locationName.toLowerCase().replace(/\s+/g, '-'), locationDisplay: locationName,
      categoryTag: categoryTag, locationDescription: locationDescription,
      heroImage: '', heroImageAlt: heroAlt, heroImageStatus: 'pending',
      status: status, lastModified: now, lastEditedAt: now, listings: [], globalFaqs: []
    };

    if (heroFile) {
      try {
        const imageUrl = await uploadHero(heroFile, slug);
        data.heroImage = imageUrl;
        data.heroImageStatus = 'ready';
      } catch (error) { console.error('Hero image upload failed:', error); }
    }

    await docRef.set(data);
    activeTab = status === 'draft' ? 'drafts' : 'published';
    loadDirectoryList();
  } catch (error) {
    console.error('Save failed:', error);
    if (btnDraft) { btnDraft.disabled = false; btnDraft.textContent = 'Save as Draft'; }
    if (btnPublish) { btnPublish.disabled = false; btnPublish.textContent = 'Save & Publish'; }
  }
}

function editDirectory(slug) {
  // Store current directory and push sub-view state
  currentDirectorySlug = slug;
  
  // Push sub-view state for listing list
  if (typeof navigateToSubView === 'function') {
    navigateToSubView('directories', 'listing_list', { directorySlug: slug });
  }

  db.collection('directories').doc(slug).get().then(doc => {
    const data = doc.data();
    let displayTitle = data.nicheDisplay + ' in ' + data.locationDisplay;
    if (data.categoryTag) displayTitle = data.categoryTag + ' ' + data.nicheDisplay + ' in ' + data.locationDisplay;
    const content = document.getElementById('content');
    content.innerHTML = '<h2>Edit: ' + displayTitle + '</h2><span class="status-badge status-' + (data.status === 'published' ? 'published' : 'draft') + '">' + data.status + '</span><div class="card" style="margin-top:1rem;"><div class="form-group"><label>Location Description</label><textarea id="editDescription">' + (data.locationDescription || '') + '</textarea></div><div class="form-group"><label>Hero Image</label><input type="file" id="editHeroFile" accept="image/*"><div id="heroPreview">' + (data.heroImage ? '<img src="' + data.heroImage + '" alt="' + (data.heroImageAlt || '') + '" class="image-preview">' : '') + '</div></div><div class="form-group"><label>Hero Alt Text</label><input type="text" id="editHeroAlt" value="' + (data.heroImageAlt || '') + '"></div><button class="btn-primary" id="btnUpdateDir" onclick="updateDirectory(\'' + slug + '\')">Update Directory</button>' + (data.status === 'draft' ? '<button class="btn-success" id="btnPubNow" onclick="changeDirectoryStatus(\'' + slug + '\', \'published\')">Publish Now</button>' : '<button class="btn-secondary" id="btnUnpub" onclick="changeDirectoryStatus(\'' + slug + '\', \'draft\')">Unpublish</button>') + '</div><h3 style="margin-top:1.5rem;">Listings (' + ((data.listings || []).length) + '/10)</h3><button class="btn-primary" onclick="showListingForm(\'' + slug + '\')" style="width:auto;">+ Add Listing</button><div id="listingsList" style="margin-top:1rem;">' + (data.listings || []).map((listing, idx) => '<div class="listing-item" onclick="showListingForm(\'' + slug + '\', \'' + listing.id + '\')"><img src="' + (listing.thumbnail || '') + '" alt="' + (listing.thumbnailAlt || '') + '"><div class="listing-item-info"><h3>' + listing.name + '</h3><p>' + (listing.priceCategory || 'No price') + ' | ' + (listing.phoneDisplay || '') + '</p></div><button class="btn-danger" onclick="event.stopPropagation(); deleteListing(\'' + slug + '\', \'' + listing.id + '\')">Delete</button></div>').join('') + '</div><h3 style="margin-top:1.5rem;">Global FAQs</h3><div id="globalFaqsContainer">' + (data.globalFaqs || []).map((faq, idx) => '<div class="faq-row"><div class="form-group"><input value="' + faq.question + '" id="faqQ' + idx + '"></div><div class="form-group"><textarea id="faqA' + idx + '">' + faq.answer + '</textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button></div>').join('') + '</div><button class="btn-secondary" onclick="addGlobalFaqRow()">+ Add FAQ</button><button class="btn-primary" id="btnSaveFaqs" onclick="saveGlobalFaqs(\'' + slug + '\')" style="margin-top:1rem;">Save FAQs</button><div style="margin-top:1.5rem;"><button class="btn-secondary" onclick="goBackFromDirectoryList()">← Back to Directories</button></div>';
  });
}

// Go back from directory listing list to directories tab
function goBackFromDirectoryList() {
  currentDirectorySlug = null;
  if (typeof goBack === 'function') {
    goBack();
  } else {
    loadDirectoryList();
  }
}

// Go back from listing form to listing list
function goBackFromListing(directorySlug) {
  // Restore the listing list view
  if (typeof goBack === 'function') {
    goBack();
  } else {
    editDirectory(directorySlug);
  }
}

async function updateDirectory(slug) {
  const btn = document.getElementById('btnUpdateDir');
  if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
  try {
    const desc = document.getElementById('editDescription').value;
    const heroAlt = document.getElementById('editHeroAlt').value;
    const heroFile = document.getElementById('editHeroFile').files[0];
    const updates = { locationDescription: desc, heroImageAlt: heroAlt, lastEditedAt: new Date().toISOString() };
    if (heroFile) {
      try {
        const imageUrl = await uploadHero(heroFile, slug);
        updates.heroImage = imageUrl;
        updates.heroImageStatus = 'ready';
      } catch (error) { console.error('Hero image upload failed:', error); }
    }
    await db.collection('directories').doc(slug).update(updates);
    loadDirectoryList();
  } catch (error) {
    console.error('Update failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'Update Directory'; }
  }
}

function changeDirectoryStatus(slug, newStatus) {
  const btn = document.getElementById(newStatus === 'published' ? 'btnPubNow' : 'btnUnpub');
  if (btn) { btn.disabled = true; btn.textContent = 'Processing...'; }
  activeTab = newStatus === 'draft' ? 'drafts' : 'published';
  db.collection('directories').doc(slug).update({ status: newStatus, lastEditedAt: new Date().toISOString() }).then(() => loadDirectoryList()).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = newStatus === 'published' ? 'Publish Now' : 'Unpublish'; } });
}

function deleteDirectory(slug, btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting...'; }
  storage.ref('directories/' + slug).listAll().then(res => {
    res.items.forEach(item => item.delete());
    res.prefixes.forEach(prefix => prefix.listAll().then(r => r.items.forEach(i => i.delete())));
  });
  db.collection('directories').doc(slug).delete().then(() => loadDirectoryList()).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = 'Delete'; } });
}

function addGlobalFaqRow() {
  const container = document.getElementById('globalFaqsContainer');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'faq-row';
  row.innerHTML = '<div class="form-group"><input id="faqQ' + idx + '" placeholder="Question"></div><div class="form-group"><textarea id="faqA' + idx + '" placeholder="Answer"></textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button>';
  container.appendChild(row);
}

function saveGlobalFaqs(slug) {
  const btn = document.getElementById('btnSaveFaqs');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }
  const container = document.getElementById('globalFaqsContainer');
  const rows = container.querySelectorAll('.faq-row');
  const faqs = [];
  rows.forEach(row => {
    const q = row.querySelector('input')?.value?.trim();
    const a = row.querySelector('textarea')?.value?.trim();
    if (q && a) faqs.push({ question: q, answer: a });
  });
  db.collection('directories').doc(slug).update({ globalFaqs: faqs, lastEditedAt: new Date().toISOString() }).then(() => editDirectory(slug)).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = 'Save FAQs'; } });
}