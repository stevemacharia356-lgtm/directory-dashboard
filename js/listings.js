// Show listing form for creating or editing a listing
async function showListingForm(directorySlug, listingId) {
  const doc = await db.collection('directories').doc(directorySlug).get();
  const dirData = doc.data();
  const existingListing = listingId ? (dirData.listings || []).find(l => l.id === listingId) : null;
  
  const content = document.getElementById('content');
  content.innerHTML = `
    <h2>${existingListing ? 'Edit' : 'Add'} Listing - ${dirData.nicheDisplay} in ${dirData.locationDisplay}</h2>
    
    <div class="card">
      <h3>Common Details</h3>
      <div class="form-group">
        <label>Business Name *</label>
        <input type="text" id="listingName" value="${existingListing?.name || ''}">
      </div>
      <div class="form-group">
        <label>Verified Status</label>
        <select id="listingVerified">
          <option value="false" ${existingListing?.verified === true ? '' : 'selected'}>Free (unverified)</option>
          <option value="true" ${existingListing?.verified === true ? 'selected' : ''}>✓ Verified</option>
        </select>
      </div>
      <div class="form-group">
        <label>Price Category</label>
        <select id="listingPriceCategory">
          <option value="">-- Select --</option>
          <option value="Budget" ${existingListing?.priceCategory === 'Budget' ? 'selected' : ''}>Budget</option>
          <option value="Mid-range" ${existingListing?.priceCategory === 'Mid-range' ? 'selected' : ''}>Mid-range</option>
          <option value="Premium" ${existingListing?.priceCategory === 'Premium' ? 'selected' : ''}>Premium</option>
          <option value="Luxury" ${existingListing?.priceCategory === 'Luxury' ? 'selected' : ''}>Luxury</option>
        </select>
      </div>
      <div class="form-group">
        <label>Exact Price (optional)</label>
        <input type="number" id="listingPrice" value="${existingListing?.priceNumeric || ''}" placeholder="e.g., 1500">
      </div>
      <div class="form-group">
        <label>Summary Description</label>
        <textarea id="listingSummary">${existingListing?.summary || ''}</textarea>
        <button class="btn-secondary" id="btnGenSummary" onclick="generateSummary()" style="width:auto; margin-top:0.5rem;">✨ Generate Summary</button>
      </div>
      <div class="form-group">
        <label>Phone Number</label>
        <input type="text" id="listingPhone" value="${existingListing?.phoneDisplay || ''}" onblur="this.value = formatPhoneInternational(this.value)">
      </div>
      <div class="form-group">
        <label>WhatsApp Number</label>
        <input type="text" id="listingWhatsapp" value="${existingListing?.whatsapp || ''}" onblur="this.value = formatPhoneInternational(this.value)">
      </div>
      <div class="form-group">
        <label>WhatsApp Message Template</label>
        <textarea id="listingWhatsappMsg">${existingListing?.whatsappMessage || 'Hello, I saw this on ' + dirData.nicheDisplay + ' in ' + dirData.locationDisplay + '. Is there availability?'}</textarea>
      </div>
      <div class="form-group">
        <label>Written Directions</label>
        <textarea id="listingDirections" placeholder="e.g., From the bus stop, walk 200m towards the market...">${existingListing?.directions || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Latitude (Kenya: -5 to 5)</label>
        <input type="number" id="listingLat" step="any" value="${existingListing?.coordinates?.lat || ''}">
      </div>
      <div class="form-group">
        <label>Longitude (Kenya: 33 to 42)</label>
        <input type="number" id="listingLng" step="any" value="${existingListing?.coordinates?.lng || ''}">
      </div>
      <div class="form-group">
        <label>Thumbnail Photo (optional)</label>
        <input type="file" id="listingPhoto" accept="image/*">
        <div id="thumbnailPreview">${existingListing?.thumbnail ? '<img src="' + existingListing.thumbnail + '" alt="' + (existingListing.thumbnailAlt || '') + '" class="image-preview">' : ''}</div>
      </div>
      <div class="form-group">
        <label>Photo Alt Text</label>
        <input type="text" id="listingPhotoAlt" value="${existingListing?.thumbnailAlt || ''}">
      </div>

      <h3 style="margin-top:1.5rem;">Photo Gallery (Premium/Verified)</h3>
      <div id="galleryContainer"></div>
      <button class="btn-secondary" onclick="addGalleryCategory()">+ Add Photo Category</button>

      <h3 style="margin-top:1.5rem;">${dirData.nicheDisplay} Specific Details</h3>
      <div id="nicheSpecificContainer"><p style="color:#666;">Loading fields...</p></div>

      <h3 style="margin-top:1.5rem;">FAQs</h3>
      <div id="listingFaqsContainer">
        ${(existingListing?.faqs || []).map((faq, idx) => '<div class="faq-row"><div class="form-group"><input value="' + faq.question + '" id="lfaqQ' + idx + '"></div><div class="form-group"><textarea id="lfaqA' + idx + '">' + faq.answer + '</textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button></div>').join('')}
      </div>
      <button class="btn-secondary" onclick="addListingFaqRow()">+ Add FAQ</button>

      <h3 style="margin-top:1.5rem;">Blog Review</h3>
      <div class="form-group">
        <label>Target Keyword</label>
        <input type="text" id="blogKeyword" value="${existingListing?.blogKeyword || ''}" placeholder="e.g., best nightclub in Hindi">
      </div>
      <div class="form-group">
        <label>Standout Feature</label>
        <textarea id="blogStandout">${existingListing?.blogStandout || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Owner Story</label>
        <textarea id="blogOwnerStory">${existingListing?.blogOwnerStory || ''}</textarea>
      </div>
      <button class="btn-primary" id="btnGenerateBlog" onclick="generateBlogForListing('${directorySlug}')" style="width:auto; margin-bottom:1rem;">✨ Generate Blog with AI</button>
      <div class="form-group">
        <label>Blog Title</label>
        <input type="text" id="blogTitle" value="${existingListing?.blog?.title || ''}">
      </div>
      <div class="form-group">
        <label>Blog Excerpt</label>
        <textarea id="blogExcerpt">${existingListing?.blog?.excerpt || ''}</textarea>
      </div>
      <div class="form-group">
        <label>Blog Body</label>
        <textarea id="blogBody" style="min-height:200px;">${existingListing?.blog?.body || ''}</textarea>
      </div>

      <div style="display:flex; gap:1rem; margin-top:1rem;">
        <button class="btn-secondary" onclick="editDirectory('${directorySlug}')">Cancel</button>
        <button class="btn-primary" id="saveListingBtn" onclick="saveListing('${directorySlug}', '${listingId || ''}')">Save Listing</button>
      </div>
    </div>
  `;

  const nicheContainer = document.getElementById('nicheSpecificContainer');
  const nicheForm = await renderNicheForm(dirData.nicheSlug, nicheContainer, existingListing?.nicheSpecific || {});
  window._nicheForm = nicheForm;
  window._existingThumbnail = existingListing?.thumbnail || '';
  window._existingThumbnailStatus = existingListing?.thumbnailStatus || 'pending';
  window._existingListingId = existingListing?.id || '';

  if (existingListing?.gallery && existingListing.gallery.length > 0) {
    existingListing.gallery.forEach((cat, idx) => {
      addGalleryCategoryWithData(cat.category, cat.photos, idx);
    });
  }
  window._galleryCounter = existingListing?.gallery ? existingListing.gallery.length : 0;
}

async function generateSummary() {
  const btn = document.getElementById('btnGenSummary');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    const name = document.getElementById('listingName').value.trim();
    const phoneDisplay = document.getElementById('listingPhone').value.trim();
    const directions = document.getElementById('listingDirections').value.trim();
    const priceCategory = document.getElementById('listingPriceCategory').value;
    const nicheSpecific = window._nicheForm ? window._nicheForm.getValues() : {};

    const nicheValues = Object.values(nicheSpecific).filter(v => 
      v !== undefined && v !== '' && v !== null && 
      !(Array.isArray(v) && v.length === 0)
    );

    if (!name) {
      console.warn('Business name required for summary');
      if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Summary'; }
      return;
    }

    if (nicheValues.length === 0 && !directions && !phoneDisplay) {
      console.warn('Need niche details, directions, or phone for summary');
      if (btn) { btn.disabled = false; btn.textContent = 'Fill more details first'; }
      return;
    }

    const listingData = {
      name: name,
      niche: priceCategory || 'business',
      phoneDisplay: phoneDisplay,
      directions: directions,
      priceCategory: priceCategory,
      nicheSpecific: nicheSpecific
    };

    const genFn = functions.httpsCallable('generateBusinessSummary');
    const result = await genFn({ listingData: listingData });
    document.getElementById('listingSummary').value = result.data.summary || '';
    if (btn) { btn.textContent = '✓ Generated'; setTimeout(() => { btn.disabled = false; btn.textContent = '✨ Generate Summary'; }, 2000); }
  } catch (error) {
    console.error('Summary generation failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = '✗ Failed. Try Again'; setTimeout(() => { btn.textContent = '✨ Generate Summary'; }, 2000); }
  }
}

async function generateBlogForListing(directorySlug) {
  const btn = document.getElementById('btnGenerateBlog');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }

  try {
    const name = document.getElementById('listingName').value.trim();
    const summary = document.getElementById('listingSummary').value.trim();
    const phoneDisplay = document.getElementById('listingPhone').value.trim();
    const directions = document.getElementById('listingDirections').value.trim();
    const priceCategory = document.getElementById('listingPriceCategory').value;
    const nicheSpecific = window._nicheForm ? window._nicheForm.getValues() : {};
    const keyword = document.getElementById('blogKeyword').value.trim();
    const standout = document.getElementById('blogStandout').value.trim();
    const ownerStory = document.getElementById('blogOwnerStory').value.trim();

    const listingData = {
      name: name, summary: summary, phoneDisplay: phoneDisplay,
      directions: directions, priceCategory: priceCategory, nicheSpecific: nicheSpecific,
      targetKeyword: keyword, standoutFeature: standout, ownerStory: ownerStory,
      directorySlug: directorySlug
    };

    if (!name || !summary || !directions || !keyword) {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Blog with AI'; }
      return;
    }

    const generateFn = functions.httpsCallable('generateBlog');
    const result = await generateFn({ listingData: listingData });
    const blog = result.data;
    document.getElementById('blogTitle').value = blog.title || '';
    document.getElementById('blogExcerpt').value = blog.excerpt || '';
    document.getElementById('blogBody').value = blog.body || '';
    if (btn) { btn.textContent = '✓ Generated. Click again to regenerate'; setTimeout(() => { btn.disabled = false; btn.textContent = '✨ Generate Blog with AI'; }, 2500); }
  } catch (error) {
    console.error('Blog generation failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = '✗ Failed. Try Again'; setTimeout(() => { btn.textContent = '✨ Generate Blog with AI'; }, 2500); }
  }
}

function addGalleryCategoryWithData(categoryName, photos, catIdx) {
  const container = document.getElementById('galleryContainer');
  const div = document.createElement('div');
  div.className = 'gallery-category';
  div.id = 'galleryCat' + catIdx;
  div.style.border = '1px solid #e0e0e0';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.margin = '0.5rem 0';
  let photosHtml = '';
  photos.forEach(photo => {
    photosHtml += '<img src="' + photo.src + '" alt="' + (photo.alt || '') + '" style="width:100px; height:75px; object-fit:cover; border-radius:4px;" data-url="' + photo.src + '">';
  });
  div.innerHTML = '<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;"><input type="text" value="' + (categoryName || '') + '" placeholder="Category name" style="flex:1; font-weight:600;"><button class="btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button></div><div class="gallery-photos" style="display:flex; flex-wrap:wrap; gap:0.5rem;">' + photosHtml + '</div><button class="btn-secondary" onclick="addSinglePhoto(' + catIdx + ')">+ Add Photo</button><input type="file" id="photoInput' + catIdx + '" accept="image/*" style="display:none;" onchange="uploadSinglePhoto(this, ' + catIdx + ')">';
  container.appendChild(div);
}

function addGalleryCategory() {
  const container = document.getElementById('galleryContainer');
  const idx = window._galleryCounter || 0;
  const div = document.createElement('div');
  div.className = 'gallery-category';
  div.id = 'galleryCat' + idx;
  div.style.border = '1px solid #e0e0e0';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.margin = '0.5rem 0';
  div.innerHTML = '<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;"><input type="text" placeholder="Category name" style="flex:1; font-weight:600;"><button class="btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button></div><div class="gallery-photos" style="display:flex; flex-wrap:wrap; gap:0.5rem;"></div><button class="btn-secondary" onclick="addSinglePhoto(' + idx + ')">+ Add Photo</button><input type="file" id="photoInput' + idx + '" accept="image/*" style="display:none;" onchange="uploadSinglePhoto(this, ' + idx + ')">';
  container.appendChild(div);
  window._galleryCounter = idx + 1;
}

function addSinglePhoto(catIdx) { document.getElementById('photoInput' + catIdx).click(); }

async function uploadSinglePhoto(input, catIdx) {
  const file = input.files[0];
  if (!file) return;
  const categoryDiv = document.getElementById('galleryCat' + catIdx);
  if (!categoryDiv) return;
  const photosContainer = categoryDiv.querySelector('.gallery-photos');
  try {
    const imageUrl = await uploadAnyImage(file, 'galleries/' + Date.now() + '-' + file.name, '');
    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = '';
    img.style.width = '100px';
    img.style.height = '75px';
    img.style.objectFit = 'cover';
    img.style.borderRadius = '4px';
    img.dataset.url = imageUrl;
    photosContainer.appendChild(img);
  } catch (error) { console.error('Gallery photo upload failed:', error); }
  input.value = '';
}

function collectGalleryData() {
  const categories = [];
  const categoryDivs = document.querySelectorAll('.gallery-category');
  categoryDivs.forEach(div => {
    const categoryInput = div.querySelector('input[type="text"]');
    const categoryName = categoryInput ? categoryInput.value.trim() : '';
    const photos = [];
    const photoImgs = div.querySelectorAll('.gallery-photos img');
    photoImgs.forEach(img => { photos.push({ src: img.dataset.url || img.src, alt: img.alt || '' }); });
    if (categoryName && photos.length > 0) categories.push({ category: categoryName, photos: photos });
  });
  return categories;
}

function addListingFaqRow() {
  const container = document.getElementById('listingFaqsContainer');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'faq-row';
  row.innerHTML = '<div class="form-group"><input id="lfaqQ' + idx + '" placeholder="Question"></div><div class="form-group"><textarea id="lfaqA' + idx + '" placeholder="Answer"></textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button>';
  container.appendChild(row);
}

async function saveListing(directorySlug, listingId) {
  const btn = document.getElementById('saveListingBtn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const name = document.getElementById('listingName').value.trim();
    const verified = document.getElementById('listingVerified').value === 'true';
    const priceCategory = document.getElementById('listingPriceCategory').value;
    const priceNumeric = parseFloat(document.getElementById('listingPrice').value) || 0;
    const summary = document.getElementById('listingSummary').value.trim();
    const phoneDisplay = document.getElementById('listingPhone').value.trim();
    const phone = formatPhoneInternational(phoneDisplay);
    const whatsapp = formatPhoneInternational(document.getElementById('listingWhatsapp').value.trim()) || phone;
    const whatsappMessage = document.getElementById('listingWhatsappMsg').value.trim();
    const directions = document.getElementById('listingDirections').value.trim();
    const lat = parseFloat(document.getElementById('listingLat').value) || 0;
    const lng = parseFloat(document.getElementById('listingLng').value) || 0;
    const photoAlt = document.getElementById('listingPhotoAlt').value.trim();
    const photoFile = document.getElementById('listingPhoto').files[0];
    const blogTitle = document.getElementById('blogTitle').value.trim();
    const blogExcerpt = document.getElementById('blogExcerpt').value.trim();
    const blogBody = document.getElementById('blogBody').value.trim();
    const blogKeyword = document.getElementById('blogKeyword').value.trim();
    const blogStandout = document.getElementById('blogStandout').value.trim();
    const blogOwnerStory = document.getElementById('blogOwnerStory').value.trim();
    const gallery = collectGalleryData();

    if (!name) { console.warn('Business name required'); if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; } return; }

    const id = listingId || Date.now().toString();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();
    const existingThumbnail = window._existingThumbnail || '';

    const listingData = {
      id: id, name: name, slug: slug, verified: verified, priceCategory: priceCategory, priceNumeric: priceNumeric,
      summary: summary, thumbnail: existingThumbnail, thumbnailAlt: photoAlt, thumbnailStatus: 'ready',
      phone: phone, phoneDisplay: phoneDisplay, whatsapp: whatsapp, whatsappMessage: whatsappMessage,
      directions: directions, coordinates: { lat: lat, lng: lng }, faqs: [], gallery: gallery,
      blogKeyword: blogKeyword, blogStandout: blogStandout, blogOwnerStory: blogOwnerStory,
      blog: { title: blogTitle || '', slug: (blogTitle || 'review').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), excerpt: blogExcerpt || '', body: blogBody || '', lastModified: now },
      nicheSpecific: window._nicheForm ? window._nicheForm.getValues() : {}, lastEditedAt: now
    };

    const faqContainer = document.getElementById('listingFaqsContainer');
    if (faqContainer) {
      const rows = faqContainer.querySelectorAll('.faq-row');
      rows.forEach(row => {
        const q = row.querySelector('input')?.value?.trim();
        const a = row.querySelector('textarea')?.value?.trim();
        if (q && a) listingData.faqs.push({ question: q, answer: a });
      });
    }

    const docRef = db.collection('directories').doc(directorySlug);

    if (photoFile) {
      try {
        const imageUrl = await uploadThumbnail(photoFile, directorySlug, slug);
        listingData.thumbnail = imageUrl;
        listingData.thumbnailStatus = 'ready';
      } catch (error) {
        console.error('Photo upload failed:', error);
        if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; }
        return;
      }
    }

    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(docRef);
      if (!doc.exists) throw new Error('Directory not found');
      const data = doc.data();
      const listings = data.listings || [];
      if (listingId) {
        const index = listings.findIndex(l => l.id === listingId);
        if (index !== -1) {
          if (!listingData.thumbnail) listingData.thumbnail = listings[index].thumbnail;
          listings[index] = listingData;
        }
      } else {
        listings.push(listingData);
      }
      transaction.update(docRef, { listings: listings, lastEditedAt: now });
    });

    editDirectory(directorySlug);
  } catch (error) {
    console.error('Save failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; }
  }
}

function deleteListing(directorySlug, listingId) {
  db.runTransaction(async (transaction) => {
    const docRef = db.collection('directories').doc(directorySlug);
    const doc = await transaction.get(docRef);
    const data = doc.data();
    const listings = (data.listings || []).filter(l => l.id !== listingId);
    const listing = (data.listings || []).find(l => l.id === listingId);
    if (listing) {
      storage.ref('directories/' + directorySlug + '/' + listing.slug).listAll().then(res => { res.items.forEach(item => item.delete()); });
    }
    transaction.update(docRef, { listings: listings, lastEditedAt: new Date().toISOString() });
  }).then(() => editDirectory(directorySlug));
}