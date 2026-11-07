const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sharp = require('sharp');
const path = require('path');
const os = require('os');
const fs = require('fs');

admin.initializeApp();

// ============================================
// DEEPSEEK FALLBACK HELPER
// ============================================
async function callDeepSeek(prompt, isJson = false, base64Image = null, mimeType = null) {
  const deepseekKey = process.env.DEEPSEEK_API_KEY || functions.config().deepseek?.key;
  if (!deepseekKey) {
    throw new Error('DeepSeek API key not configured.');
  }

  let messages = [];
  
  if (base64Image && mimeType) {
    // DeepSeek Vision Format
    messages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
        ]
      }
    ];
  } else {
    // DeepSeek Text Format
    messages = [
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: prompt }
    ];
  }

  const body = {
    model: "deepseek-flash",
    messages: messages,
    temperature: 0.7,
  };

  if (isJson) {
    body.response_format = { type: "json_object" };
  }

  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${deepseekKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error('DeepSeek API responded with ' + response.status + ': ' + errorText);
  }

  const result = await response.json();
  return result.choices[0].message.content || '';
}

// ============================================
// IMAGE PROCESSING
// ============================================
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

// ============================================
// AI FUNCTIONS (GEMINI -> DEEPSEEK FALLBACK)
// ============================================

exports.getNicheFields = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');
  
  const apiKey = functions.config().gemini.key;
  const { nicheName } = data;
  if (!nicheName) throw new functions.https.HttpsError('invalid-argument', 'Niche name is required.');

  const prompt = 'You are an expert directory content strategist for Kenyan businesses. A user wants to create a directory listing for a "' + nicheName + '" business. Generate a list of 6-8 essential fields that should be collected for this type of business. For each field, specify: fieldName (camelCase), label (human-readable), inputType (text, number, dropdown, or checkbox-group), required (true/false), and options (array of strings for dropdown or checkbox-group, empty for text/number).\n\nCRITICAL RULES:\n1. NEVER include location, county, town, or address fields. The location is already known from the directory.\n2. NEVER use "toggle" input type. Use "checkbox-group" instead so users can just select what applies.\n3. NEVER include "Other" as a dropdown option.\n4. Do NOT create fields for obvious negative questions (like "Emergency services available?"). Instead, create a positive checkbox-group field (like "Services Offered") and include "Emergency Services" as one of the options.\n5. NEVER include "Price", "Price Category", "Cost", or "Rates" fields. The dashboard already handles pricing globally for all listings.\n\nIMPORTANT: Return ONLY valid JSON in this format:\n[{"fieldName":"example","label":"Example Label","inputType":"text","required":true,"options":[]}]\n\nDo NOT include markdown, comments, or any text before or after the JSON.';

  let text = '';
  try {
    // Try Gemini
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (response.ok) break; 
        if (response.status === 503) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 2000)); continue; }
        break; 
      } catch (err) {
        retries--; if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!response || !response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    // Fallback to DeepSeek
    text = await callDeepSeek(prompt, true);
  }

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse JSON output');
    return { fields: JSON.parse(jsonMatch[0]) };
  } catch (error) {
    console.error('Niche fields generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.generateLocationDescription = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { locationName, county, subCounty, niche } = data;
  if (!locationName || !niche) throw new functions.https.HttpsError('invalid-argument', 'Location name and niche are required.');

  const prompt = 'You are an expert Kenyan local guide. Write a location description for "' + locationName + '" in ' + (subCounty || '') + ', ' + (county || '') + ' Kenya. This description will appear on a directory page for "' + niche + '" businesses. Focus on what makes this location relevant for ' + niche + ' customers. Include local context — transportation, landmarks, community feel. Use third person. No markdown. No exclamation points. Write naturally as a knowledgeable local guide.\n\nCRITICAL RULES:\n1. MAXIMUM 100 words. Do NOT go over 100 words.\n2. You MUST break the text into exactly 2 short paragraphs using two line breaks (\\n\\n).\n3. The first paragraph should focus on the town and its accessibility.\n4. The second paragraph should focus on the specific vibe of the location regarding the ' + niche + ' businesses.\n5. Do not write a wall of text.';

  let text = '';
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, false);
  }

  return { description: text.trim() };
});

exports.generateBusinessSummary = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { listingData } = data;
  if (!listingData || !listingData.name) throw new functions.https.HttpsError('invalid-argument', 'Listing data is required.');

  const prompt = 'You are an expert Kenyan business writer following Google\'s E-E-A-T guidelines. Write a concise 60-100 word summary for "' + listingData.name + '", a "' + (listingData.niche || 'business') + '" business located in "' + (listingData.location || 'Kenya') + '". Use ONLY these details:\n' + JSON.stringify(listingData, null, 2) + '\n\nRULES:\n- First sentence must include business name, niche, and location naturally.\n- Write in third person. No "I", "me", "we", "our".\n- No markdown. No exclamation points.\n- No invented facts. Use only provided details.\n- Mention key services or features from the details provided.\n- End with a practical reason to visit or contact.\n- Keep under 100 words.';

  let text = '';
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, false);
  }

  return { summary: text.trim() };
});

exports.generateBlog = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { listingData } = data;
  if (!listingData || !listingData.name) throw new functions.https.HttpsError('invalid-argument', 'Listing data is required.');

  const keyword = listingData.targetKeyword || '';
  const standout = listingData.standoutFeature || '';
  const ownerStory = listingData.ownerStory || '';
  const niche = listingData.priceCategory || listingData.niche || 'business';

  const prompt = 'You are an expert local SEO copywriter and directory content strategist specializing in Kenyan local business reviews. Your sole purpose is to generate highly authoritative, helpful, human-first directory blog posts that dominate Google\'s E-E-A-T ranking guidelines.\n\nYou will be provided with specific local business details from a dashboard form. You must weave these details naturally into a compelling article without sounding robotic, mechanical, or repetitive.\n\nCRITICAL OUTPUT FORMATTING RULES:\n1. Separate output into exactly three clearly labeled sections: [BLOG TITLE], [BLOG EXCERPT], and [BLOG BODY].\n2. [BLOG TITLE]: Single, punchy, SEO-optimized title that MUST include the target keyword.\n3. [BLOG EXCERPT]: Brief, engaging 2-to-3 sentence summary under 160 characters. No markdown.\n4. [BLOG BODY]: Main article in clean Markdown (## for subheadings). Target 400-600 words.\n\nKEYWORD RULES:\n- The target keyword is "' + keyword + '". Use it naturally in the title, within the first 100 words, and once in a subheading. Do not stuff.\n\nSTANDOUT FEATURE RULES:\n- The standout feature is "' + standout + '". Anchor the article around this — make it the primary reason this business serves the community.\n\nOWNER STORY RULES:\n- The owner story is "' + ownerStory + '". Weave this into the narrative naturally as a human element. If empty, skip.\n\nNICHE TONE RULES:\n- This is a "' + niche + '" business. Match the tone accordingly.\n- Health/Medical/Clinic/Hospital: Professional, authoritative, factual. Reference services and qualifications. Never give medical advice. Calm and reassuring tone.\n- School/Education/College: Informative, institutional, community-focused. Reference curriculum and facilities. Trust-building tone.\n- Financial/Legal: Formal, precise, trustworthy. Reference compliance and credentials.\n- Guesthouse/Hotel/Apartment: Warm, descriptive, experience-driven. Use sensory details.\n- Nightclub/Bar/Restaurant: Energetic, exciting, experience-focused. Reference music, atmosphere, food, events.\n- Supermarket/Shop/Retail: Practical, value-focused, factual. Reference products, prices, convenience.\n- Salon/Gym/Car Wash/Service: Personal, experience-driven, results-focused. Reference skills, equipment, transformations.\n\nANTI-ROBOTIC RULES:\n- Write in third person as an experienced local guide. Never use "I", "me", "my", "we", "our". Use phrases like "Visitors will find", "The guesthouse offers", "Located near", "Guests can expect".\n- Use Kenyan context: matatu stages, boda boda shades, chai, M-Pesa.\n- Rely strictly on facts provided. No invented statistics or names.\n- Be honest. Mention minor drawbacks.\n- End with a practical verdict.\n- Do NOT use phrases: "look no further", "nestled in the heart of", "testament to", "moreover", "furthermore", "delve", "in conclusion".\n- No exclamation points.\n\nUNIQUENESS RULES:\n- Every article must feel distinct.\n- Vary structure based on standout feature, landmarks, and owner story.\n- Match structure to niche.\n\nBUSINESS DETAILS:\n' + JSON.stringify(listingData, null, 2) + '\n\nGenerate the blog now. Output ONLY the three sections with their labels.';

  let text = '';
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    if (!response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, false);
  }

  try {
    const titleMatch = text.match(/\[BLOG TITLE\]\s*([\s\S]*?)(?=\[BLOG EXCERPT\])/i);
    const excerptMatch = text.match(/\[BLOG EXCERPT\]\s*([\s\S]*?)(?=\[BLOG BODY\])/i);
    const bodyMatch = text.match(/\[BLOG BODY\]\s*([\s\S]*?)$/i);

    if (!titleMatch || !excerptMatch || !bodyMatch) {
      throw new Error('Failed to parse blog sections from output');
    }
    return {
      title: titleMatch[1].trim(),
      excerpt: excerptMatch[1].trim(),
      body: bodyMatch[1].trim()
    };
  } catch (error) {
    console.error('Blog generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.askDirectoryAssistant = functions.https.onCall(async (data, context) => {
  const apiKey = functions.config().gemini.key;
  const { question, mode, listingData, directoryData, relatedDirectories } = data;
  
  if (!question || !mode) throw new functions.https.HttpsError('invalid-argument', 'Question and mode are required.');

  let prompt = '';

  if (mode === 'listing' && listingData) {
    const name = listingData.name || 'this business';
    const niche = listingData.niche || 'business';
    const location = listingData.location || 'Kenya';
    const phone = listingData.phoneDisplay || listingData.phone || 'their listed phone number';
    let blogContent = listingData.blog ? (listingData.blog.title + '\n' + listingData.blog.body) : '';
    let faqContent = listingData.faqs && listingData.faqs.length > 0 ? listingData.faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n') : '';

    prompt = `You are a helpful, professional assistant for "${name}", a ${niche} located in ${location}, Kenya.
CONTEXT (SOURCE OF TRUTH):
- Business Name: ${name}
- Summary: ${listingData.summary || 'N/A'}
- Amenities/Services: ${JSON.stringify(listingData.nicheSpecific || {})}
- FAQs: ${faqContent || 'None provided'}
- Blog/Review: ${blogContent || 'None provided'}
VISITOR QUESTION: ${question}
RULES:
1. You must answer using ONLY the context provided above.
2. Do NOT invent or guess any information.
3. If the answer is NOT found in the context, you must respond EXACTLY with:
   "I don't have that specific information right now. For the most accurate details, please contact ${name} directly at ${phone}."
4. Keep your answer concise (2-3 sentences maximum). Be friendly and professional.
5. Never mention that you are an AI or that you are using a language model.`;
  }
  else if (mode === 'directory' && directoryData) {
    const niche = directoryData.nicheDisplay || 'businesses';
    const location = directoryData.locationDisplay || 'Kenya';
    const listingsContext = (directoryData.listings || []).map((l, idx) => {
      return `Listing ${idx + 1}:
- Name: ${l.name}
- Price Category: ${l.priceCategory || 'N/A'}
- Exact Price: ${l.priceNumeric || 'N/A'}
- Summary: ${l.summary || 'N/A'}
- Amenities/Services: ${JSON.stringify(l.nicheSpecific || {})}
- Phone: ${l.phoneDisplay || l.phone || 'N/A'}`;
    }).join('\n');

    let relatedContext = '';
    if (relatedDirectories && relatedDirectories.length > 0) {
      relatedContext = relatedDirectories.map(d => `- ${d.nicheDisplay} in ${d.locationDisplay} (URL: /${d.directory}/)`).join('\n');
    }

    prompt = `You are a helpful, professional local assistant for a directory of ${niche} in ${location}, Kenya.
CONTEXT (SOURCE OF TRUTH - ALL LISTINGS IN THIS DIRECTORY):
${listingsContext}
${relatedContext ? `OTHER BUSINESS CATEGORIES IN THIS LOCATION:\n${relatedContext}\n` : ''}
VISITOR QUESTION: ${question}
RULES:
1. You must answer using ONLY the context provided above.
2. If the user asks to compare, find the cheapest, or find a specific amenity, you MUST read the listings above and give a recommendation based on the data.
3. If the user asks for a DIFFERENT type of business (e.g., a hospital), check the "OTHER BUSINESS CATEGORIES" list above. If it exists, tell them it is available and provide the category name.
4. Do NOT invent or guess any information not in the context above.
5. If the answer is NOT found in the context or the related categories, respond with:
   "I don't have that information in this directory. Please browse the listings above or contact them directly."
6. Keep your answer concise (2-4 sentences maximum). Be friendly and professional.
7. Never mention that you are an AI or that you are using a language model.`;
  } 
  else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid mode or missing data.');
  }

  let text = '';
  try {
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (response.ok) break;
        if (response.status === 503) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      } catch (err) {
        retries--; if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!response || !response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, false);
  }

  return { answer: text.trim() };
});

exports.generateNicheLayout = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { nicheName, fields } = data;
  if (!nicheName || !fields) throw new functions.https.HttpsError('invalid-argument', 'Niche name and fields are required.');

  const prompt = `You are a Master UI/UX Architect. Your job is to generate a strict JSON layout for a "${nicheName}" directory listing page and card, based on the following UX Philosophy.
THE GOLDEN RULES OF KE DIRECTORY:
1. HUMAN TASK FIRST: Structure by user intent: ORIENT (What is this?) -> DECIDE (How much? What does it offer?) -> ACT (Call/WhatsApp) -> DEEPEN (Blog/FAQs).
2. UNKNOWN MEANS NO: If a field is empty or unknown, it must be hidden. 
3. DECISION FACTS UP TOP: Price, core amenities, and major differentiators must be visible immediately. 
4. PROGRESSIVE DISCLOSURE: Long blogs, deep descriptions, and FAQs go at the very bottom.
5. DIRECTORY CARDS: Must be compact. Only include: Image, Name, Price, and 2-3 key differentiators. No long paragraphs.
THE AVAILABLE FIELDS FOR THIS NICHE ARE:
${JSON.stringify(fields, null, 2)}
YOUR TASK:
Generate a JSON object with two keys: "directoryCard" and "listingPage".
"directoryCard": An array of max 5 field keys to display on the directory page card. Must include: "thumbnail", "name", "priceCategory", and 2-3 dynamic fields from the list above that best define this niche. Do NOT include more than 5 fields.
"listingPage": An array of section objects. Allowed sections:
- "hero" (thumbnail, name, summary, verified badge)
- "decision_facts" (price, and 2-3 core dynamic fields from the list)
- "primary_actions" (phone, whatsapp, directions)
- "details_table" (specific stats like check-in, opening hours, etc from the list)
- "amenities" (dynamic fields, features from the list)
- "location" (directions, map)
- "deep_content" (blog, faqs)
CRITICAL: You MUST output ONLY valid JSON. Do not include markdown or explanations. Format exactly like this:
{
  "directoryCard": ["thumbnail", "name", "priceCategory", "field1", "field2"],
  "listingPage": [
    { "section": "hero", "fields": ["thumbnail", "name", "summary"] },
    { "section": "decision_facts", "fields": ["priceCategory", "field1", "field2"] },
    { "section": "primary_actions", "fields": [] },
    { "section": "deep_content", "fields": ["blog", "faqs"] }
  ]
}`;

  let text = '';
  try {
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (response.ok) break;
        if (response.status === 503) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      } catch (err) {
        retries--; if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!response || !response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, true);
  }

  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Failed to parse JSON layout output');
    return { layout: JSON.parse(jsonMatch[0]) };
  } catch (error) {
    console.error('Layout generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.generateFAQs = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { listingData } = data;
  if (!listingData || !listingData.name) throw new functions.https.HttpsError('invalid-argument', 'Listing data is required.');

  const prompt = `You are an expert Kenyan local business writer following Google's E-E-A-T guidelines. 
Generate exactly 3 Frequently Asked Questions and Answers for "${listingData.name}", a "${listingData.niche || 'business'}" located in "${listingData.location || 'Kenya'}".
CONTEXT DETAILS:
- Summary: ${listingData.summary || 'N/A'}
- Niche Details (Amenities, Services, etc): ${JSON.stringify(listingData.nicheSpecific || {})}
- Blog / Review Content: ${listingData.blog && listingData.blog.body ? listingData.blog.body : 'No blog provided'}
RULES:
1. Generate exactly 3 FAQs.
2. If a Blog exists, read it to find deep, specific details about the business (e.g., owner story, standout features) to create meaningful questions.
3. Questions should be natural, customer-focused (e.g., "Do they offer WiFi?", "What makes this place unique?").
4. Answers must be 1-2 sentences and use ONLY the context provided above. Do NOT invent facts.
5. If a field is unknown, do not ask about it.
6. Output ONLY valid JSON in this format:
[{"question": "Example question?", "answer": "Example answer."}]
7. Do NOT include markdown, code blocks, or any text before or after the JSON.`;

  let text = '';
  try {
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        if (response.ok) break;
        if (response.status === 503) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      } catch (err) {
        retries--; if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!response || !response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, true);
  }

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Failed to parse JSON FAQs output');
    return { faqs: JSON.parse(jsonMatch[0]) };
  } catch (error) {
    console.error('FAQ generation failed:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

exports.generatePhotoAltText = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'You must be logged in.');

  const apiKey = functions.config().gemini.key;
  const { imageBase64, mimeType, businessName, niche } = data;
  if (!imageBase64 || !mimeType) throw new functions.https.HttpsError('invalid-argument', 'Image data and mimeType are required.');

  const prompt = `You are an expert SEO copywriter and accessibility expert. 
Look at the provided image. Write a short, descriptive, SEO-friendly alt text (maximum 15 words) for a business named "${businessName || 'this business'}", which is a "${niche || 'local business'}".
RULES:
1. Describe exactly what is visible in the image.
2. Do NOT invent features, prices, or claims that are not in the image.
3. Keep it under 15 words.
4. Output ONLY the alt text string. No quotes, no markdown.`;

  let text = '';
  try {
    let response;
    let retries = 3;
    while (retries > 0) {
      try {
        response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=' + apiKey, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, { inlineData: { mimeType: mimeType, data: imageBase64 } }] }] })
        });
        if (response.ok) break;
        if (response.status === 503) { retries--; if (retries > 0) await new Promise(r => setTimeout(r, 2000)); continue; }
        break;
      } catch (err) {
        retries--; if (retries === 0) throw err;
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    if (!response || !response.ok) throw new Error('Gemini failed');
    const result = await response.json();
    text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
  } catch (geminiError) {
    console.warn('Gemini Vision failed, falling back to DeepSeek:', geminiError.message);
    text = await callDeepSeek(prompt, false, imageBase64, mimeType);
  }

  return { altText: text.trim() };
});