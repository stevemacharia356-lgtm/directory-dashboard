// Show listing form for creating or editing a listing
function showListingForm(directorySlug, listingId) {
  db.collection('directories').doc(directorySlug).get().then(doc => {
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

        <h3 style="margin-top:1.5rem;">${dirData.nicheDisplay} Specific Details</h3>
        <div id="nicheSpecificContainer"></div>

        <h3 style="margin-top:1.5rem;">FAQs</h3>
        <div id="listingFaqsContainer">
          ${(existingListing?.faqs || []).map((faq, idx) => '<div class="faq-row"><div class="form-group"><input value="' + faq.question + '" id="lfaqQ' + idx + '"></div><div class="form-group"><textarea id="lfaqA' + idx + '">' + faq.answer + '</textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button></div>').join('')}
        </div>
        <button class="btn-secondary" onclick="addListingFaqRow()">+ Add FAQ</button>

        <h3 style="margin-top:1.5rem;">Blog Review (optional)</h3>
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
    const nicheForm = renderNicheForm(dirData.nicheSlug, nicheContainer, existingListing?.nicheSpecific || {});
    window._nicheForm = nicheForm;
    window._existingThumbnail = existingListing?.thumbnail || '';
    window._existingThumbnailStatus = existingListing?.thumbnailStatus || 'pending';
    window._existingListingId = existingListing?.id || '';
  });
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

    if (!name) { alert('Business name is required.'); if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; } return; }

    const id = listingId || Date.now().toString();
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const now = new Date().toISOString();
    const existingThumbnail = window._existingThumbnail || '';

    const listingData = {
      id: id, name: name, slug: slug, priceCategory: priceCategory, priceNumeric: priceNumeric,
      summary: summary, thumbnail: existingThumbnail, thumbnailAlt: photoAlt, thumbnailStatus: 'ready',
      phone: phone, phoneDisplay: phoneDisplay, whatsapp: whatsapp, whatsappMessage: whatsappMessage,
      directions: directions, coordinates: { lat: lat, lng: lng }, faqs: [],
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
        alert('Photo upload failed. Please try again.');
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

    alert('Listing saved!');
    editDirectory(directorySlug);
  } catch (error) {
    console.error('Save failed:', error);
    alert('Save failed. Please try again.');
    if (btn) { btn.disabled = false; btn.textContent = 'Save Listing'; }
  }
}

function deleteListing(directorySlug, listingId) {
  if (!confirm('Delete this listing?')) return;
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