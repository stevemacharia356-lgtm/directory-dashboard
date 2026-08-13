// Niche field configurations
const NICHE_FIELDS = {
  guesthouse: [
    { fieldName: 'rooms', label: 'Number of Rooms', inputType: 'number', required: true, nicheSpecificKey: 'rooms' },
    { fieldName: 'checkIn', label: 'Check-in Time', inputType: 'text', required: true, nicheSpecificKey: 'checkIn', placeholder: '12:00 PM' },
    { fieldName: 'checkOut', label: 'Check-out Time', inputType: 'text', required: true, nicheSpecificKey: 'checkOut', placeholder: '10:00 AM' },
    { fieldName: 'amenities', label: 'Amenities', inputType: 'checkbox-group', required: false, nicheSpecificKey: 'amenities',
      options: ['WiFi', 'Hot Water', 'Secure Parking', 'Mosquito Nets', 'Breakfast Included', 'Room Service', 'Laundry', 'Generator Backup'] }
  ],
  hotel: [
    { fieldName: 'rooms', label: 'Number of Rooms', inputType: 'number', required: true, nicheSpecificKey: 'rooms' },
    { fieldName: 'starRating', label: 'Star Rating (1-5)', inputType: 'number', required: true, nicheSpecificKey: 'starRating' },
    { fieldName: 'checkIn', label: 'Check-in Time', inputType: 'text', required: true, nicheSpecificKey: 'checkIn', placeholder: '12:00 PM' },
    { fieldName: 'checkOut', label: 'Check-out Time', inputType: 'text', required: true, nicheSpecificKey: 'checkOut', placeholder: '10:00 AM' },
    { fieldName: 'amenities', label: 'Amenities', inputType: 'checkbox-group', required: false, nicheSpecificKey: 'amenities',
      options: ['WiFi', 'Hot Water', 'Secure Parking', 'Restaurant', 'Bar', 'TV', 'Air Conditioning', 'Room Service', 'Airport Shuttle', 'Swimming Pool', 'Gym', 'Conference Room', 'Generator Backup'] }
  ],
  apartment: [
    { fieldName: 'apartmentType', label: 'Apartment Type', inputType: 'dropdown', required: true, nicheSpecificKey: 'apartmentType',
      options: ['Bedsitter', 'One Bedroom', 'Two Bedroom', 'Three Bedroom', 'Studio'] },
    { fieldName: 'monthlyRent', label: 'Monthly Rent (KSh)', inputType: 'number', required: true, nicheSpecificKey: 'monthlyRent' },
    { fieldName: 'deposit', label: 'Deposit (KSh)', inputType: 'number', required: true, nicheSpecificKey: 'deposit' },
    { fieldName: 'furnished', label: 'Furnished', inputType: 'toggle', required: false, nicheSpecificKey: 'furnished' },
    { fieldName: 'unitsAvailable', label: 'Units Available', inputType: 'number', required: true, nicheSpecificKey: 'unitsAvailable' },
    { fieldName: 'amenities', label: 'Amenities', inputType: 'checkbox-group', required: false, nicheSpecificKey: 'amenities',
      options: ['WiFi', 'Water Included', 'Electricity Included', 'Secure Parking', 'Security Guard', 'CCTV', 'Balcony', 'Kitchen', 'Laundry Area', 'Gated Compound'] }
  ],
  school: [
    { fieldName: 'schoolType', label: 'School Type', inputType: 'dropdown', required: true, nicheSpecificKey: 'schoolType',
      options: ['Primary', 'Secondary', 'Combined Primary/Secondary', 'College', 'Vocational'] },
    { fieldName: 'curriculum', label: 'Curriculum', inputType: 'text', required: true, nicheSpecificKey: 'curriculum', placeholder: '8-4-4, CBC, IGCSE' },
    { fieldName: 'studentCount', label: 'Number of Students', inputType: 'number', required: true, nicheSpecificKey: 'studentCount' },
    { fieldName: 'feesPerTerm', label: 'Fees per Term (KSh)', inputType: 'number', required: true, nicheSpecificKey: 'feesPerTerm' },
    { fieldName: 'boarding', label: 'Boarding Available', inputType: 'toggle', required: false, nicheSpecificKey: 'boarding' },
    { fieldName: 'daySchool', label: 'Day School Available', inputType: 'toggle', required: false, nicheSpecificKey: 'daySchool' },
    { fieldName: 'facilities', label: 'Facilities', inputType: 'checkbox-group', required: false, nicheSpecificKey: 'facilities',
      options: ['Library', 'Computer Lab', 'Science Lab', 'Sports Field', 'Swimming Pool', 'School Bus', 'Chapel/Mosque', 'Dining Hall'] }
  ],
  health: [
    { fieldName: 'facilityType', label: 'Facility Type', inputType: 'dropdown', required: true, nicheSpecificKey: 'facilityType',
      options: ['Hospital', 'Clinic', 'Dispensary', 'Health Centre', 'Maternity Home'] },
    { fieldName: 'services', label: 'Services Offered', inputType: 'checkbox-group', required: false, nicheSpecificKey: 'services',
      options: ['General Consultation', 'Maternity', 'Surgery', 'Laboratory', 'Pharmacy', 'Dental', 'Eye Care', 'Pediatrics', 'X-Ray', 'Ambulance', 'Inpatient', 'Outpatient'] },
    { fieldName: 'doctorCount', label: 'Number of Doctors', inputType: 'number', required: true, nicheSpecificKey: 'doctorCount' },
    { fieldName: 'visitingHours', label: 'Visiting Hours', inputType: 'text', required: true, nicheSpecificKey: 'visitingHours', placeholder: '7:00 AM - 6:00 PM' },
    { fieldName: 'emergency', label: 'Emergency Services', inputType: 'toggle', required: false, nicheSpecificKey: 'emergency' },
    { fieldName: 'insuranceAccepted', label: 'Insurance Accepted', inputType: 'text', required: true, nicheSpecificKey: 'insuranceAccepted', placeholder: 'NHIF, AAR, Jubilee' }
  ]
};

// Render niche-specific form fields dynamically
function renderNicheForm(nicheSlug, containerElement, existingData) {
  containerElement.innerHTML = '';
  const fields = NICHE_FIELDS[nicheSlug] || [];
  const customInputs = {};

  fields.forEach(field => {
    const formGroup = document.createElement('div');
    formGroup.className = 'form-group';

    const label = document.createElement('label');
    label.textContent = field.label + (field.required ? ' *' : '');
    formGroup.appendChild(label);

    if (field.inputType === 'text' || field.inputType === 'number') {
      const input = document.createElement('input');
      input.type = field.inputType;
      input.name = field.fieldName;
      input.placeholder = field.placeholder || '';
      if (field.required) input.required = true;
      if (existingData && existingData[field.nicheSpecificKey] !== undefined) {
        input.value = existingData[field.nicheSpecificKey];
      }
      formGroup.appendChild(input);
    }

    if (field.inputType === 'dropdown') {
      const select = document.createElement('select');
      select.name = field.fieldName;
      if (field.required) select.required = true;
      field.options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt;
        option.textContent = opt;
        if (existingData && existingData[field.nicheSpecificKey] === opt) {
          option.selected = true;
        }
        select.appendChild(option);
      });
      formGroup.appendChild(select);
    }

    if (field.inputType === 'checkbox-group') {
      const checkboxContainer = document.createElement('div');
      checkboxContainer.style.display = 'flex';
      checkboxContainer.style.flexWrap = 'wrap';
      checkboxContainer.style.gap = '0.5rem';

      field.options.forEach(opt => {
        const checkboxLabel = document.createElement('label');
        checkboxLabel.style.display = 'flex';
        checkboxLabel.style.alignItems = 'center';
        checkboxLabel.style.gap = '0.25rem';
        checkboxLabel.style.fontWeight = 'normal';
        checkboxLabel.style.fontSize = '0.9rem';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = opt;
        checkbox.name = field.fieldName;
        if (existingData && existingData[field.nicheSpecificKey] && existingData[field.nicheSpecificKey].includes(opt)) {
          checkbox.checked = true;
        }

        checkboxLabel.appendChild(checkbox);
        checkboxLabel.appendChild(document.createTextNode(opt));
        checkboxContainer.appendChild(checkboxLabel);
      });

      formGroup.appendChild(checkboxContainer);

      // Custom input for additional options
      const customRow = document.createElement('div');
      customRow.style.display = 'flex';
      customRow.style.gap = '0.5rem';
      customRow.style.marginTop = '0.5rem';

      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.placeholder = 'Add custom (comma separated)';
      customInput.style.flex = '1';

      const addBtn = document.createElement('button');
      addBtn.type = 'button';
      addBtn.textContent = '+';
      addBtn.className = 'btn-secondary';
      addBtn.onclick = function() {
        const val = customInput.value.trim();
        if (val) {
          const items = val.split(',').map(s => s.trim()).filter(s => s);
          items.forEach(item => {
            const customLabel = document.createElement('label');
            customLabel.style.display = 'flex';
            customLabel.style.alignItems = 'center';
            customLabel.style.gap = '0.25rem';
            customLabel.style.fontWeight = 'normal';
            customLabel.style.fontSize = '0.9rem';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = item;
            cb.name = field.fieldName;
            cb.checked = true;
            cb.dataset.custom = 'true';
            customLabel.appendChild(cb);
            customLabel.appendChild(document.createTextNode(item));
            checkboxContainer.appendChild(customLabel);
          });
          customInput.value = '';
        }
      };

      customRow.appendChild(customInput);
      customRow.appendChild(addBtn);
      formGroup.appendChild(customRow);
    }

    if (field.inputType === 'toggle') {
      const toggleLabel = document.createElement('label');
      toggleLabel.style.display = 'flex';
      toggleLabel.style.alignItems = 'center';
      toggleLabel.style.gap = '0.5rem';
      toggleLabel.style.cursor = 'pointer';

      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.name = field.fieldName;
      toggle.style.width = 'auto';
      if (existingData && existingData[field.nicheSpecificKey] === true) {
        toggle.checked = true;
      }

      toggleLabel.appendChild(toggle);
      toggleLabel.appendChild(document.createTextNode('Yes'));
      formGroup.appendChild(toggleLabel);
    }

    containerElement.appendChild(formGroup);
  });

  // Return function to collect values
  return {
    getValues: function() {
      const values = {};
      fields.forEach(field => {
        if (field.inputType === 'checkbox-group') {
          const checked = containerElement.querySelectorAll(`input[name="${field.fieldName}"]:checked`);
          values[field.nicheSpecificKey] = Array.from(checked).map(cb => cb.value);
        } else if (field.inputType === 'toggle') {
          const toggleEl = containerElement.querySelector(`input[name="${field.fieldName}"]`);
          values[field.nicheSpecificKey] = toggleEl ? toggleEl.checked : false;
        } else {
          const inputEl = containerElement.querySelector(`input[name="${field.fieldName}"], select[name="${field.fieldName}"]`);
          if (inputEl) {
            values[field.nicheSpecificKey] = field.inputType === 'number' ? Number(inputEl.value) : inputEl.value;
          }
        }
      });
      return sanitizeFormValues(values);
    }
  };
}