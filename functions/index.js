const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();

exports.processImage = functions.storage.object().onFinalize(async (object) => {
  const filePath = object.name;
  const contentType = object.contentType;

  if (!contentType || !contentType.startsWith('image/')) return;
  if (!filePath.includes('-raw.')) return;

  const bucket = admin.storage().bucket(object.bucket);
  const fileName = path.basename(filePath);
  const dirName = path.dirname(filePath);
  const outputFileName = fileName.replace('-raw.', '.');
  const outputPath = path.join(dirName, outputFileName);

  const tempInputPath = path.join(os.tmpdir(), fileName);
  const tempOutputPath = path.join(os.tmpdir(), outputFileName);

  try {
    const dirSlug = filePath.split('/')[1];
    const listingSlug = filePath.split('/')[2];
    const docRef = admin.firestore().collection('directories').doc(dirSlug);
    const doc = await docRef.get();
    
    if (!doc.exists) return;

    const statusField = filePath.includes('/hero-') ? 'heroImageStatus' : 'thumbnailStatus';
    
    if (listingSlug && statusField === 'thumbnailStatus') {
      const data = doc.data();
      const listings = data.listings || [];
      const listingIndex = listings.findIndex(l => l.slug === listingSlug);
      if (listingIndex !== -1) {
        listings[listingIndex].thumbnailStatus = 'processing';
        await docRef.update({ listings: listings });
      }
    } else {
      await docRef.update({ [statusField]: 'processing' });
    }

    await bucket.file(filePath).download({ destination: tempInputPath });
    await sharp(tempInputPath)
      .resize(800)
      .webp({ quality: 80 })
      .toFile(tempOutputPath);

    await bucket.upload(tempOutputPath, {
      destination: outputPath,
      metadata: { contentType: 'image/webp' }
    });

    await bucket.file(filePath).delete();

    const encodedPath = encodeURIComponent(outputPath);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodedPath}?alt=media`;

    if (listingSlug && statusField === 'thumbnailStatus') {
      const doc2 = await docRef.get();
      const data2 = doc2.data();
      const listings2 = data2.listings || [];
      const idx = listings2.findIndex(l => l.slug === listingSlug);
      if (idx !== -1) {
        listings2[idx].thumbnailStatus = 'ready';
        listings2[idx].thumbnail = url;
        await docRef.update({ listings: listings2 });
      }
    } else {
      await docRef.update({ 
        [statusField]: 'ready',
        heroImage: url
      });
    }

    fs.unlinkSync(tempInputPath);
    fs.unlinkSync(tempOutputPath);

  } catch (error) {
    console.error('Image processing failed:', error);
    
    const dirSlug = filePath.split('/')[1];
    const listingSlug = filePath.split('/')[2];
    const docRef = admin.firestore().collection('directories').doc(dirSlug);
    const statusField = filePath.includes('/hero-') ? 'heroImageStatus' : 'thumbnailStatus';

    if (listingSlug && statusField === 'thumbnailStatus') {
      const doc = await docRef.get();
      const data = doc.data();
      const listings = data.listings || [];
      const idx = listings.findIndex(l => l.slug === listingSlug);
      if (idx !== -1) {
        listings[idx].thumbnailStatus = 'error';
        await docRef.update({ listings: listings });
      }
    } else {
      await docRef.update({ [statusField]: 'error' });
    }
  }
});

exports.triggerPublish = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const githubToken = functions.config().github.token;
  if (!githubToken) {
    throw new functions.https.HttpsError('internal', 'GitHub token not configured.');
  }

  try {
    const response = await fetch('https://api.github.com/repos/stevemacharia356-lgtm/directory-engine/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ event_type: 'manual-deploy' })
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Publish trigger failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Get niche-specific fields from Gemini
exports.getNicheFields = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { nicheName } = data;
  if (!nicheName) {
    throw new functions.https.HttpsError('invalid-argument', 'Niche name is required.');
  }

  const prompt = 'You are an expert directory content strategist for Kenyan businesses. A user wants to create a directory listing for a "' + nicheName + '" business. Generate a list of 6-8 essential fields that should be collected for this type of business. For each field, specify: fieldName (camelCase), label (human-readable), inputType (text, number, dropdown, checkbox-group, or toggle), required (true/false), and options (array of strings for dropdown or checkbox-group, empty for text/number/toggle).\n\nIMPORTANT: Return ONLY valid JSON in this format:\n[{"fieldName":"example","label":"Example Label","inputType":"text","required":true,"options":[]}]\n\nDo NOT include markdown, comments, or any text before or after the JSON.';

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error response:', errorText);
      throw new Error('Gemini API responded with ' + response.status);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Failed to parse JSON from Gemini output');
    }
    
    const fields = JSON.parse(jsonMatch[0]);
    return { fields };
  } catch (error) {
    console.error('Niche fields generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Generate location description from Gemini
exports.generateLocationDescription = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { locationName, county, subCounty, niche } = data;
  if (!locationName || !niche) {
    throw new functions.https.HttpsError('invalid-argument', 'Location name and niche are required.');
  }

  const prompt = 'You are an expert Kenyan local guide. Write a 100-150 word location description for "' + locationName + '" in ' + (subCounty || '') + ', ' + (county || '') + ' Kenya. This description will appear on a directory page for "' + niche + '" businesses. Focus on what makes this location relevant for ' + niche + ' customers. Include local context — transportation, landmarks, community feel. Use third person. No markdown. No exclamation points. Write naturally as a knowledgeable local guide.';

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error response:', errorText);
      throw new Error('Gemini API responded with ' + response.status);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { description: text.trim() };
  } catch (error) {
    console.error('Location description generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Generate business summary from Gemini
exports.generateBusinessSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { listingData } = data;
  if (!listingData || !listingData.name) {
    throw new functions.https.HttpsError('invalid-argument', 'Listing data is required.');
  }

  const prompt = 'You are an expert Kenyan business writer following Google\'s E-E-A-T guidelines. Write a concise 60-100 word summary for "' + listingData.name + '", a "' + (listingData.niche || 'business') + '" business located in "' + (listingData.location || 'Kenya') + '". Use ONLY these details:\n' + JSON.stringify(listingData, null, 2) + '\n\nRULES:\n- First sentence must include business name, niche, and location naturally.\n- Write in third person. No "I", "me", "we", "our".\n- No markdown. No exclamation points.\n- No invented facts. Use only provided details.\n- Mention key services or features from the details provided.\n- End with a practical reason to visit or contact.\n- Keep under 100 words.';

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error response:', errorText);
      throw new Error('Gemini API responded with ' + response.status);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { summary: text.trim() };
  } catch (error) {
    console.error('Business summary generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Gemini Blog Generator
exports.generateBlog = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  }

  const apiKey = functions.config().gemini.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Gemini API key not configured.');
  }

  const { listingData } = data;
  if (!listingData || !listingData.name) {
    throw new functions.https.HttpsError('invalid-argument', 'Listing data is required.');
  }

  const keyword = listingData.targetKeyword || '';
  const standout = listingData.standoutFeature || '';
  const ownerStory = listingData.ownerStory || '';
  const niche = listingData.priceCategory || listingData.niche || 'business';

  const prompt = 'You are an expert local SEO copywriter and directory content strategist specializing in Kenyan local business reviews. Your sole purpose is to generate highly authoritative, helpful, human-first directory blog posts that dominate Google\'s E-E-A-T ranking guidelines.\n\nYou will be provided with specific local business details from a dashboard form. You must weave these details naturally into a compelling article without sounding robotic, mechanical, or repetitive.\n\nCRITICAL OUTPUT FORMATTING RULES:\n1. Separate output into exactly three clearly labeled sections: [BLOG TITLE], [BLOG EXCERPT], and [BLOG BODY].\n2. [BLOG TITLE]: Single, punchy, SEO-optimized title that MUST include the target keyword.\n3. [BLOG EXCERPT]: Brief, engaging 2-to-3 sentence summary under 160 characters. No markdown.\n4. [BLOG BODY]: Main article in clean Markdown (## for subheadings). Target 400-600 words.\n\nKEYWORD RULES:\n- The target keyword is "' + keyword + '". Use it naturally in the title, within the first 100 words, and once in a subheading. Do not stuff.\n\nSTANDOUT FEATURE RULES:\n- The standout feature is "' + standout + '". Anchor the article around this — make it the primary reason this business serves the community.\n\nOWNER STORY RULES:\n- The owner story is "' + ownerStory + '". Weave this into the narrative naturally as a human element. If empty, skip.\n\nNICHE TONE RULES:\n- This is a "' + niche + '" business. Match the tone accordingly.\n- Health/Medical/Clinic/Hospital: Professional, authoritative, factual. Reference services and qualifications. Never give medical advice. Calm and reassuring tone.\n- School/Education/College: Informative, institutional, community-focused. Reference curriculum and facilities. Trust-building tone.\n- Financial/Legal: Formal, precise, trustworthy. Reference compliance and credentials.\n- Guesthouse/Hotel/Apartment: Warm, descriptive, experience-driven. Use sensory details.\n- Nightclub/Bar/Restaurant: Energetic, exciting, experience-focused. Reference music, atmosphere, food, events.\n- Supermarket/Shop/Retail: Practical, value-focused, factual. Reference products, prices, convenience.\n- Salon/Gym/Car Wash/Service: Personal, experience-driven, results-focused. Reference skills, equipment, transformations.\n\nANTI-ROBOTIC RULES:\n- Write in third person as an experienced local guide. Never use "I", "me", "my", "we", "our". Use phrases like "Visitors will find", "The guesthouse offers", "Located near", "Guests can expect".\n- Use Kenyan context: matatu stages, boda boda shades, chai, M-Pesa.\n- Rely strictly on facts provided. No invented statistics or names.\n- Be honest. Mention minor drawbacks.\n- End with a practical verdict.\n- Do NOT use phrases: "look no further", "nestled in the heart of", "testament to", "moreover", "furthermore", "delve", "in conclusion".\n- No exclamation points.\n\nUNIQUENESS RULES:\n- Every article must feel distinct.\n- Vary structure based on standout feature, landmarks, and owner story.\n- Match structure to niche.\n\nBUSINESS DETAILS:\n' + JSON.stringify(listingData, null, 2) + '\n\nGenerate the blog now. Output ONLY the three sections with their labels.';

  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=' + apiKey, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini error response:', errorText);
      throw new Error('Gemini API responded with ' + response.status);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    const titleMatch = text.match(/\[BLOG TITLE\]\s*([\s\S]*?)(?=\[BLOG EXCERPT\])/i);
    const excerptMatch = text.match(/\[BLOG EXCERPT\]\s*([\s\S]*?)(?=\[BLOG BODY\])/i);
    const bodyMatch = text.match(/\[BLOG BODY\]\s*([\s\S]*?)$/i);

    if (!titleMatch || !excerptMatch || !bodyMatch) {
      throw new Error('Failed to parse blog sections from Gemini output');
    }

    return {
      title: titleMatch[1].trim(),
      excerpt: excerptMatch[1].trim(),
      body: bodyMatch[1].trim()
    };
  } catch (error) {
    console.error('Gemini blog generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});