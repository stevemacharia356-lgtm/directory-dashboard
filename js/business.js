function showBusinessList() {
  const content = document.getElementById('content');
  content.innerHTML = '<h2>Business Pages</h2><div style="margin-bottom:1rem;"><button class="btn-primary" onclick="showCreateBusinessForm()" style="width:auto;">+ Create Business Page</button></div><div id="businessList" class="card-grid"></div>';

  db.collection('businesses').onSnapshot((snapshot) => {
    const businesses = [];
    snapshot.forEach(doc => { businesses.push({ id: doc.id, ...doc.data() }); });
    const container = document.getElementById('businessList');
    if (!container) return;
    if (businesses.length === 0) { container.innerHTML = '<p style="color:#666;">No business pages yet.</p>'; return; }
    container.innerHTML = businesses.map(b => '<div class="card"><span class="status-badge status-' + (b.status === 'published' ? 'published' : 'draft') + '">' + b.status + '</span><span class="status-badge ' + (b.verified ? 'status-published' : 'status-draft') + '" style="margin-left:0.5rem;">' + (b.verified ? '✓ Verified' : 'Free') + '</span><h3>' + b.name + '</h3><p style="color:#666;">' + (b.location || '') + '</p><p style="color:#666;">' + (b.tagline || '') + '</p><div style="display:flex; gap:0.5rem; margin-top:0.5rem;"><button class="btn-secondary" onclick="editBusiness(\'' + b.id + '\')">Edit</button>' + (b.status === 'draft' ? '<button class="btn-success" onclick="publishBusiness(\'' + b.id + '\')">Publish</button>' : '<button class="btn-secondary" onclick="unpublishBusiness(\'' + b.id + '\')">Unpublish</button>') + '<button class="btn-danger" onclick="deleteBusiness(\'' + b.id + '\')">Delete</button></div></div>').join('');
  });
}

function buildBusinessForm(data, slug) {
  const d = data || {};
  const faqRows = (d.faqs || []).map((faq, idx) => '<div class="faq-row"><div class="form-group"><input value="' + faq.question + '" id="bizFaqQ' + idx + '"></div><div class="form-group"><textarea id="bizFaqA' + idx + '">' + faq.answer + '</textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button></div>').join('');

  const content = document.getElementById('content');
  content.innerHTML = '<h2>' + (slug ? 'Edit' : 'Create') + ' Business Page</h2><div class="card">' +
    '<div class="form-group"><label>Business Name *</label><input type="text" id="bizName" value="' + (d.name || '') + '" oninput="updateBizSlug()"></div>' +
    '<div class="form-group"><label>Location *</label><input type="text" id="bizLocation" value="' + (d.location || '') + '" oninput="updateBizSlug()"></div>' +
    '<div class="form-group"><label>URL Slug (auto-generated)</label><input type="text" id="bizSlug" readonly style="background:#f5f5f5;" value="' + (slug || '') + '"></div>' +
    '<div class="form-group"><label>Verified Status</label><select id="bizVerified"><option value="false" ' + (d.verified === true ? '' : 'selected') + '>Free (unverified)</option><option value="true" ' + (d.verified === true ? 'selected' : '') + '>✓ Verified</option></select></div>' +
    '<div class="form-group"><label>Category</label><input type="text" id="bizCategory" value="' + (d.category || '') + '" placeholder="e.g., Nightclub, Supermarket, Gym, Salon"></div>' +
    '<div class="form-group"><label>Tagline</label><input type="text" id="bizTagline" value="' + (d.tagline || '') + '"></div>' +
    '<div class="form-group"><label>About / Description</label><textarea id="bizDescription">' + (d.description || '') + '</textarea></div>' +
    '<div class="form-group"><label>Phone Number</label><input type="text" id="bizPhone" value="' + (d.phoneDisplay || '') + '" onblur="this.value = formatPhoneInternational(this.value)"></div>' +
    '<div class="form-group"><label>WhatsApp Number</label><input type="text" id="bizWhatsapp" value="' + (d.whatsapp || '') + '" onblur="this.value = formatPhoneInternational(this.value)"></div>' +
    '<div class="form-group"><label>WhatsApp Message</label><textarea id="bizWhatsappMsg">' + (d.whatsappMessage || 'Hello, I visited your website.') + '</textarea></div>' +
    '<div class="form-group"><label>Services (comma separated)</label><input type="text" id="bizServices" value="' + ((d.services || []).join(', ')) + '"></div>' +
    '<div class="form-group"><label>Mon-Fri Hours</label><input type="text" id="bizHoursWeekdays" value="' + ((d.openingHours && d.openingHours.weekdays) || '') + '"></div>' +
    '<div class="form-group"><label>Saturday Hours</label><input type="text" id="bizHoursSaturday" value="' + ((d.openingHours && d.openingHours.saturday) || '') + '"></div>' +
    '<div class="form-group"><label>Sunday Hours</label><input type="text" id="bizHoursSunday" value="' + ((d.openingHours && d.openingHours.sunday) || '') + '"></div>' +
    '<div class="form-group"><label>Written Directions</label><textarea id="bizDirections">' + (d.directions || '') + '</textarea></div>' +
    '<div class="form-group"><label>Latitude</label><input type="number" id="bizLat" step="any" value="' + ((d.coordinates && d.coordinates.lat) || '') + '"></div>' +
    '<div class="form-group"><label>Longitude</label><input type="number" id="bizLng" step="any" value="' + ((d.coordinates && d.coordinates.lng) || '') + '"></div>' +
    '<div class="form-group"><label>Hero Image</label><input type="file" id="bizHeroFile" accept="image/*"><div id="heroPreview">' + (d.heroImage ? '<img src="' + d.heroImage + '" alt="' + (d.heroImageAlt || '') + '" class="image-preview">' : '') + '</div></div>' +
    '<div class="form-group"><label>Hero Alt Text</label><input type="text" id="bizHeroAlt" value="' + (d.heroImageAlt || '') + '"></div>' +
    '<h3 style="margin-top:1.5rem;">Photo Gallery (Verified)</h3><div id="bizGalleryContainer"></div><button class="btn-secondary" onclick="addBizGalleryCategory()">+ Add Photo Category</button>' +
    '<h3 style="margin-top:1.5rem;">FAQs</h3><div id="bizFaqsContainer">' + faqRows + '</div><button class="btn-secondary" onclick="addBizFaqRow()">+ Add FAQ</button>' +
    '<h3 style="margin-top:1.5rem;">Blog (optional)</h3>' +
    '<div class="form-group"><label>Target Keyword</label><input type="text" id="bizBlogKeyword" value="' + (d.blogKeyword || '') + '" placeholder="e.g., best gym in Hindi"></div>' +
    '<div class="form-group"><label>Standout Feature</label><textarea id="bizBlogStandout">' + (d.blogStandout || '') + '</textarea></div>' +
    '<div class="form-group"><label>Owner Story</label><textarea id="bizBlogOwnerStory">' + (d.blogOwnerStory || '') + '</textarea></div>' +
    '<button class="btn-primary" id="btnBizGenerateBlog" onclick="generateBizBlog(\'' + (slug || '') + '\')" style="width:auto; margin-bottom:1rem;">✨ Generate Blog with AI</button>' +
    '<div class="form-group"><label>Blog Title</label><input type="text" id="bizBlogTitle" value="' + ((d.blog && d.blog.title) || '') + '"></div>' +
    '<div class="form-group"><label>Blog Body</label><textarea id="bizBlogBody" style="min-height:150px;">' + ((d.blog && d.blog.body) || '') + '</textarea></div>' +
    '<div style="display:flex; gap:1rem; margin-top:1rem;"><button class="btn-secondary" onclick="showBusinessList()">Cancel</button><button class="btn-secondary" id="btnBizDraft" onclick="saveBusiness(\'draft\', \'' + (slug || '') + '\')">Save as Draft</button><button class="btn-primary" id="btnBizPublish" onclick="saveBusiness(\'published\', \'' + (slug || '') + '\')">Save & Publish</button></div></div>';

  // Load existing gallery
  if (d.gallery && d.gallery.length > 0) {
    d.gallery.forEach((cat, idx) => {
      addBizGalleryCategoryWithData(cat.category, cat.photos, idx);
    });
  }
  window._bizGalleryCounter = d.gallery ? d.gallery.length : 0;
}

function addBizGalleryCategoryWithData(categoryName, photos, catIdx) {
  const container = document.getElementById('bizGalleryContainer');
  const div = document.createElement('div');
  div.className = 'gallery-category';
  div.id = 'bizGalleryCat' + catIdx;
  div.style.border = '1px solid #e0e0e0';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.margin = '0.5rem 0';
  let photosHtml = '';
  photos.forEach(photo => {
    photosHtml += '<img src="' + photo.src + '" alt="' + (photo.alt || '') + '" style="width:100px; height:75px; object-fit:cover; border-radius:4px;" data-url="' + photo.src + '">';
  });
  div.innerHTML = '<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;"><input type="text" value="' + (categoryName || '') + '" placeholder="Category name" style="flex:1; font-weight:600;"><button class="btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button></div><div class="gallery-photos" style="display:flex; flex-wrap:wrap; gap:0.5rem;">' + photosHtml + '</div><button class="btn-secondary" onclick="addBizSinglePhoto(' + catIdx + ')">+ Add Photo</button><input type="file" id="bizPhotoInput' + catIdx + '" accept="image/*" style="display:none;" onchange="uploadBizSinglePhoto(this, ' + catIdx + ')">';
  container.appendChild(div);
}

function addBizGalleryCategory() {
  const container = document.getElementById('bizGalleryContainer');
  const idx = window._bizGalleryCounter || 0;
  const div = document.createElement('div');
  div.className = 'gallery-category';
  div.id = 'bizGalleryCat' + idx;
  div.style.border = '1px solid #e0e0e0';
  div.style.borderRadius = '8px';
  div.style.padding = '0.75rem';
  div.style.margin = '0.5rem 0';
  div.innerHTML = '<div style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;"><input type="text" placeholder="Category name" style="flex:1; font-weight:600;"><button class="btn-danger" onclick="this.parentElement.parentElement.remove()">Remove</button></div><div class="gallery-photos" style="display:flex; flex-wrap:wrap; gap:0.5rem;"></div><button class="btn-secondary" onclick="addBizSinglePhoto(' + idx + ')">+ Add Photo</button><input type="file" id="bizPhotoInput' + idx + '" accept="image/*" style="display:none;" onchange="uploadBizSinglePhoto(this, ' + idx + ')">';
  container.appendChild(div);
  window._bizGalleryCounter = idx + 1;
}

function addBizSinglePhoto(catIdx) {
  document.getElementById('bizPhotoInput' + catIdx).click();
}

async function uploadBizSinglePhoto(input, catIdx) {
  const file = input.files[0];
  if (!file) return;
  const categoryDiv = document.getElementById('bizGalleryCat' + catIdx);
  if (!categoryDiv) return;
  const photosContainer = categoryDiv.querySelector('.gallery-photos');
  try {
    const imageUrl = await uploadAnyImage(file, 'business-galleries/' + Date.now() + '-' + file.name, '');
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

function collectBizGalleryData() {
  const categories = [];
  const categoryDivs = document.querySelectorAll('#bizGalleryContainer .gallery-category');
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

async function generateBizBlog(slug) {
  const btn = document.getElementById('btnBizGenerateBlog');
  if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
  try {
    const name = document.getElementById('bizName').value.trim();
    const description = document.getElementById('bizDescription').value.trim();
    const phoneDisplay = document.getElementById('bizPhone').value.trim();
    const directions = document.getElementById('bizDirections').value.trim();
    const category = document.getElementById('bizCategory').value.trim();
    const keyword = document.getElementById('bizBlogKeyword').value.trim();
    const standout = document.getElementById('bizBlogStandout').value.trim();
    const ownerStory = document.getElementById('bizBlogOwnerStory').value.trim();

    const listingData = {
      name: name, summary: description, phoneDisplay: phoneDisplay,
      directions: directions, priceCategory: category, targetKeyword: keyword,
      standoutFeature: standout, ownerStory: ownerStory
    };

    if (!name || !description || !keyword) {
      if (btn) { btn.disabled = false; btn.textContent = '✨ Generate Blog with AI'; }
      return;
    }

    const generateFn = functions.httpsCallable('generateBlog');
    const result = await generateFn({ listingData: listingData });
    const blog = result.data;
    document.getElementById('bizBlogTitle').value = blog.title || '';
    document.getElementById('bizBlogBody').value = blog.body || '';
    if (btn) { btn.textContent = '✓ Generated. Click again to regenerate'; setTimeout(() => { btn.disabled = false; btn.textContent = '✨ Generate Blog with AI'; }, 2500); }
  } catch (error) {
    console.error('Blog generation failed:', error);
    if (btn) { btn.disabled = false; btn.textContent = '✗ Failed. Try Again'; setTimeout(() => { btn.textContent = '✨ Generate Blog with AI'; }, 2500); }
  }
}

function addBizFaqRow() {
  const container = document.getElementById('bizFaqsContainer');
  const idx = container.children.length;
  const row = document.createElement('div');
  row.className = 'faq-row';
  row.innerHTML = '<div class="form-group"><input id="bizFaqQ' + idx + '" placeholder="Question"></div><div class="form-group"><textarea id="bizFaqA' + idx + '" placeholder="Answer"></textarea></div><button class="btn-danger" onclick="this.parentElement.remove()">X</button>';
  container.appendChild(row);
}

function updateBizSlug() {
  const name = document.getElementById('bizName').value;
  const location = document.getElementById('bizLocation').value;
  const nameSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const locationSlug = location.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  document.getElementById('bizSlug').value = 'business-' + locationSlug + '-' + nameSlug;
}

function showCreateBusinessForm() { buildBusinessForm(null, ''); }

function editBusiness(slug) {
  db.collection('businesses').doc(slug).get().then(doc => { if (doc.exists) buildBusinessForm(doc.data(), slug); });
}

async function saveBusiness(status, existingSlug) {
  const btnDraft = document.getElementById('btnBizDraft');
  const btnPublish = document.getElementById('btnBizPublish');
  if (btnDraft) { btnDraft.disabled = true; btnDraft.textContent = 'Saving...'; }
  if (btnPublish) { btnPublish.disabled = true; btnPublish.textContent = 'Saving...'; }

  try {
    const name = document.getElementById('bizName').value.trim();
    const category = document.getElementById('bizCategory').value.trim();
    const tagline = document.getElementById('bizTagline').value.trim();
    const description = document.getElementById('bizDescription').value.trim();
    const location = document.getElementById('bizLocation').value.trim();
    const slug = document.getElementById('bizSlug').value || existingSlug;
    const verified = document.getElementById('bizVerified').value === 'true';
    const phoneDisplay = document.getElementById('bizPhone').value.trim();
    const phone = formatPhoneInternational(phoneDisplay);
    const whatsapp = formatPhoneInternational(document.getElementById('bizWhatsapp').value.trim()) || phone;
    const whatsappMessage = document.getElementById('bizWhatsappMsg').value.trim();
    const servicesRaw = document.getElementById('bizServices').value.trim();
    const services = servicesRaw ? servicesRaw.split(',').map(s => s.trim()).filter(s => s) : [];
    const hoursWeekdays = document.getElementById('bizHoursWeekdays').value.trim();
    const hoursSaturday = document.getElementById('bizHoursSaturday').value.trim();
    const hoursSunday = document.getElementById('bizHoursSunday').value.trim();
    const directions = document.getElementById('bizDirections').value.trim();
    const lat = parseFloat(document.getElementById('bizLat').value) || 0;
    const lng = parseFloat(document.getElementById('bizLng').value) || 0;
    const heroAlt = document.getElementById('bizHeroAlt').value.trim();
    const heroFile = document.getElementById('bizHeroFile').files[0];
    const blogTitle = document.getElementById('bizBlogTitle').value.trim();
    const blogBody = document.getElementById('bizBlogBody').value.trim();
    const blogKeyword = document.getElementById('bizBlogKeyword').value.trim();
    const blogStandout = document.getElementById('bizBlogStandout').value.trim();
    const blogOwnerStory = document.getElementById('bizBlogOwnerStory').value.trim();
    const gallery = collectBizGalleryData();

    const faqs = [];
    const faqContainer = document.getElementById('bizFaqsContainer');
    if (faqContainer) {
      const rows = faqContainer.querySelectorAll('.faq-row');
      rows.forEach(row => {
        const q = row.querySelector('input')?.value?.trim();
        const a = row.querySelector('textarea')?.value?.trim();
        if (q && a) faqs.push({ question: q, answer: a });
      });
    }

    if (!name || !location || !slug) { if (btnDraft) { btnDraft.disabled = false; btnDraft.textContent = 'Save as Draft'; } if (btnPublish) { btnPublish.disabled = false; btnPublish.textContent = 'Save & Publish'; } return; }

    const now = new Date().toISOString();
    const docRef = db.collection('businesses').doc(slug);

    const data = {
      name: name, category: category, tagline: tagline, description: description,
      location: location, verified: verified,
      phone: phone, phoneDisplay: phoneDisplay, whatsapp: whatsapp, whatsappMessage: whatsappMessage,
      services: services,
      openingHours: { weekdays: hoursWeekdays, saturday: hoursSaturday, sunday: hoursSunday },
      directions: directions, coordinates: { lat: lat, lng: lng },
      heroImage: '', heroImageAlt: heroAlt, photos: [], gallery: gallery,
      faqs: faqs,
      blogKeyword: blogKeyword, blogStandout: blogStandout, blogOwnerStory: blogOwnerStory,
      blog: { title: blogTitle, body: blogBody, lastModified: now },
      status: status, lastEditedAt: now
    };

    if (heroFile) {
      try {
        const imageUrl = await uploadBusinessHero(heroFile, slug);
        data.heroImage = imageUrl;
      } catch (error) { console.error('Upload failed:', error); }
    }

    await docRef.set(data, { merge: true });
    showBusinessList();
  } catch (error) {
    console.error('Save failed:', error);
    if (btnDraft) { btnDraft.disabled = false; btnDraft.textContent = 'Save as Draft'; }
    if (btnPublish) { btnPublish.disabled = false; btnPublish.textContent = 'Save & Publish'; }
  }
}

function publishBusiness(slug) {
  const btn = event.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Publishing...'; }
  db.collection('businesses').doc(slug).update({ status: 'published', lastEditedAt: new Date().toISOString() }).then(() => showBusinessList()).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = 'Publish'; } });
}

function unpublishBusiness(slug) {
  const btn = event.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Unpublishing...'; }
  db.collection('businesses').doc(slug).update({ status: 'draft', lastEditedAt: new Date().toISOString() }).then(() => showBusinessList()).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = 'Unpublish'; } });
}

function deleteBusiness(slug) {
  const btn = event.target;
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting...'; }
  storage.ref('businesses/' + slug).listAll().then(res => { res.items.forEach(item => item.delete()); });
  db.collection('businesses').doc(slug).delete().then(() => showBusinessList()).catch(error => { console.error(error); if (btn) { btn.disabled = false; btn.textContent = 'Delete'; } });
}