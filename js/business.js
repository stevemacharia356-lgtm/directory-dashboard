function showBusinessList() {
  const content = document.getElementById('content');
  content.innerHTML = '<h2>Business Pages</h2><div style="margin-bottom:1rem;"><button class="btn-primary" onclick="showCreateBusinessForm()" style="width:auto;">+ Create Business Page</button></div><div id="businessList" class="card-grid"></div>';

  db.collection('businesses').onSnapshot((snapshot) => {
    const businesses = [];
    snapshot.forEach(doc => { businesses.push({ id: doc.id, ...doc.data() }); });
    const container = document.getElementById('businessList');
    if (!container) return;
    if (businesses.length === 0) {
      container.innerHTML = '<p style="color:#666;">No business pages yet.</p>';
      return;
    }
    container.innerHTML = businesses.map(b => '<div class="card"><span class="status-badge status-' + (b.status === 'published' ? 'published' : 'draft') + '">' + b.status + '</span><h3>' + b.name + '</h3><p style="color:#666;">' + (b.location || '') + '</p><p style="color:#666;">' + (b.tagline || '') + '</p><div style="display:flex; gap:0.5rem; margin-top:0.5rem;"><button class="btn-secondary" onclick="editBusiness(\'' + b.id + '\')">Edit</button>' + (b.status === 'draft' ? '<button class="btn-success" onclick="publishBusiness(\'' + b.id + '\')">Publish</button>' : '<button class="btn-secondary" onclick="unpublishBusiness(\'' + b.id + '\')">Unpublish</button>') + '<button class="btn-danger" onclick="deleteBusiness(\'' + b.id + '\')">Delete</button></div></div>').join('');
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
    '<div class="form-group"><label>Category</label><select id="bizCategory"><option value="">-- Select --</option><option value="Guesthouse" ' + (d.category === 'Guesthouse' ? 'selected' : '') + '>Guesthouse</option><option value="Hotel" ' + (d.category === 'Hotel' ? 'selected' : '') + '>Hotel</option><option value="Apartment" ' + (d.category === 'Apartment' ? 'selected' : '') + '>Apartment</option><option value="School" ' + (d.category === 'School' ? 'selected' : '') + '>School</option><option value="Health Facility" ' + (d.category === 'Health Facility' ? 'selected' : '') + '>Health Facility</option><option value="Restaurant" ' + (d.category === 'Restaurant' ? 'selected' : '') + '>Restaurant</option><option value="Shop" ' + (d.category === 'Shop' ? 'selected' : '') + '>Shop</option><option value="Other" ' + (d.category === 'Other' ? 'selected' : '') + '>Other</option></select></div>' +
    '<div class="form-group"><label>Tagline</label><input type="text" id="bizTagline" value="' + (d.tagline || '') + '"></div>' +
    '<div class="form-group"><label>About / Description *</label><textarea id="bizDescription">' + (d.description || '') + '</textarea></div>' +
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
    '<h3 style="margin-top:1.5rem;">FAQs</h3><div id="bizFaqsContainer">' + faqRows + '</div><button class="btn-secondary" onclick="addBizFaqRow()">+ Add FAQ</button>' +
    '<h3 style="margin-top:1.5rem;">Blog (optional)</h3>' +
    '<div class="form-group"><label>Blog Title</label><input type="text" id="bizBlogTitle" value="' + ((d.blog && d.blog.title) || '') + '"></div>' +
    '<div class="form-group"><label>Blog Body</label><textarea id="bizBlogBody" style="min-height:150px;">' + ((d.blog && d.blog.body) || '') + '</textarea></div>' +
    '<div style="display:flex; gap:1rem; margin-top:1rem;"><button class="btn-secondary" onclick="showBusinessList()">Cancel</button><button class="btn-secondary" onclick="saveBusiness(\'draft\', \'' + (slug || '') + '\')">Save as Draft</button><button class="btn-primary" onclick="saveBusiness(\'published\', \'' + (slug || '') + '\')">Save & Publish</button></div></div>';
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

function showCreateBusinessForm() {
  buildBusinessForm(null, '');
}

function editBusiness(slug) {
  db.collection('businesses').doc(slug).get().then(doc => {
    if (doc.exists) buildBusinessForm(doc.data(), slug);
  });
}

async function saveBusiness(status, existingSlug) {
  const name = document.getElementById('bizName').value.trim();
  const category = document.getElementById('bizCategory').value;
  const tagline = document.getElementById('bizTagline').value.trim();
  const description = document.getElementById('bizDescription').value.trim();
  const location = document.getElementById('bizLocation').value.trim();
  const slug = document.getElementById('bizSlug').value || existingSlug;
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

  if (!name || !description || !location || !slug) { alert('Business name, description, location, and slug are required.'); return; }

  const now = new Date().toISOString();
  const docRef = db.collection('businesses').doc(slug);

  const data = {
    name: name, category: category, tagline: tagline, description: description,
    location: location,
    phone: phone, phoneDisplay: phoneDisplay, whatsapp: whatsapp, whatsappMessage: whatsappMessage,
    services: services,
    openingHours: { weekdays: hoursWeekdays, saturday: hoursSaturday, sunday: hoursSunday },
    directions: directions, coordinates: { lat: lat, lng: lng },
    heroImage: '', heroImageAlt: heroAlt, photos: [],
    faqs: faqs,
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
}

function publishBusiness(slug) {
  db.collection('businesses').doc(slug).update({ status: 'published', lastEditedAt: new Date().toISOString() }).then(() => showBusinessList());
}

function unpublishBusiness(slug) {
  db.collection('businesses').doc(slug).update({ status: 'draft', lastEditedAt: new Date().toISOString() }).then(() => showBusinessList());
}

function deleteBusiness(slug) {
  if (!confirm('Delete this business page?')) return;
  storage.ref('businesses/' + slug).listAll().then(res => { res.items.forEach(item => item.delete()); });
  db.collection('businesses').doc(slug).delete().then(() => showBusinessList());
}