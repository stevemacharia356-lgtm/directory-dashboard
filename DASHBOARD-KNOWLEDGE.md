# KNOWLEDGE.md — KEDIRECTORY DASHBOARD V1.9 (COMPLETE)

## PROJECT OVERVIEW
Vanilla JS mobile-friendly dashboard for managing directory listings and business pages. Connects to same Firestore and Storage as the engine. Deployed to admin-dashboard-dc821.web.app. Public site at kedirectory.co.ke.

## STACK
Vanilla HTML/CSS/JS + Firebase SDK (Auth, Firestore, Storage, Functions) + Firebase Hosting

## URL
admin-dashboard-dc821.web.app

## TABS
1. Directories — Manage directory pages (create, edit, publish, delete)
2. Business Pages — Manage standalone business pages (create, edit, publish, delete)
3. Build Status — Trigger builds, view deployment status

## DYNAMIC NICHES (UNLIMITED) & FIRESTORE PERSISTENCE
Niche type is a text input. Type ANY business type.
Gemini generates the correct form fields automatically via `getNicheFields`.
**Custom Niche Persistence:** The field definitions are saved to Firestore (`nicheFields/{nicheSlug}`) so they NEVER regenerate when you edit the listing later.

## AI LAYOUT ENGINE (V1.8)
The Dashboard now generates TWO things for every custom niche:
1. **Fields:** Data inputs (e.g., "WiFi", "Parking") via `getNicheFields`.
2. **Layout:** UI blueprint (`directoryCard`, `listingPage`) via `generateNicheLayout`.
Both are saved to Firestore (`nicheFields/{nicheSlug}`).

### How the Dashboard Does It:
- `js/form-engine.js` calls `getNicheFields`, then `generateNicheLayout`.
- The returned `layout` is passed to `saveNicheFieldsToFirestore` and saved under the `layout` key.
- Once saved, it never regenerates, so the layout is permanent.
- **Retry Logic:** Both functions have automatic retries if Gemini is overloaded (503 error).

## AI FAQ GENERATOR (V1.9)
- **Cloud Function:** `generateFAQs`.
- **Where:** Button on the listing form in `js/listings.js`.
- **Trigger:** Manual. Clicking the button generates 3 Q&As for the current listing.
- **Inputs read by Gemini:** listing name, niche, location, summary, `nicheSpecific` fields, and the generated blog body (if any).
- **Output:** Exactly 3 FAQs — `[{question, answer}]`.
- **Persistence:** FAQs are stored on the listing document when the listing is saved. Generating FAQs alone does not persist until Save Listing is clicked.
- **Why it's separate from `askDirectoryAssistant`:** `askDirectoryAssistant` answers visitor questions on the public site; `generateFAQs` pre-generates FAQ content for the listing page itself.

## AI PHOTO ALT TEXT (V1.9)
- **Cloud Function:** `generatePhotoAltText` (Gemini Vision — receives `imageBase64` + `mimeType`).
- **Three modes:**
  - **Hero image (button):** Manual trigger in `js/directories.js`.
  - **Thumbnail (button):** Manual trigger in `js/directories.js`.
  - **Gallery photos (auto):** Runs automatically on gallery upload; helper lives in `js/image-upload.js`.
- **Also wired in `js/listings.js`** for listing-level hero/thumbnail alt text.
- **Output:** A single ≤15-word SEO/accessibility-friendly alt text string describing the visible image content.
- **Constraint:** The model is told not to invent features, prices, or claims not visible in the image.

## STRICT GEMINI RULES (V1.8)
- **Niche Fields:** No location fields, no Yes/No toggles, no "Other" options, no Price fields.
- **Safety Filter:** `js/form-engine.js` strips out any field containing "price", "cost", "rate", or "fee".
- **Location Description:** Strict MAX 100 words, 2 paragraphs.
- **Business Summary:** 60-100 words.
- **Blog Generator:** 400-600 words, EEAT rules.
- **Layout Generation:** Must follow the UX rules (Decision facts first, Deep content last, Compact cards).
- **FAQ Generator (V1.9):** Exactly 3 Q&As. Must use only provided context. Must not invent facts. Output JSON only.
- **Alt Text Generator (V1.9):** Max 15 words. Describe only what is visible. Output the alt text string only.

## AI ASSISTANT (V1.7)
- **Cloud Function:** `askDirectoryAssistant`.
- **RAG System:** Gemini acts as a Retrieval-Augmented Generation assistant.
- **Listing Mode:** Reads ONLY the specific listing's data. If the answer isn't there, it politely tells the user to call the business's phone number.
- **Directory Mode:** Reads ALL listings in the directory AND related directories. Allows users to ask comparison questions (e.g., "Who has WiFi?", "Which is cheapest?", "Do you have a hospital in Hindi?").

## PRICE CATEGORIES
Budget, Mid-range, Premium, Luxury — dropdown. Exact numeric price optional.

## BUSINESS PAGES (V1.5 COMPLETE)
Business pages have all features: verified toggle, photo gallery with categories, target keyword, standout feature, owner story, Gemini blog generator, FAQs, opening hours, services.

## REQUIRED FIELDS (MINIMAL)
- Directory: Niche and location only
- Listing: Business name only
- Business page: Name and location only
- Everything else optional

## BUTTON LOCKING
All buttons disable during operation. Prevents duplicate saves.

## TAB MEMORY
Dashboard remembers active tab (Published/Drafts). After delete, publish, or unpublish, stays on the same tab.

## FOLDER STRUCTURE
directory-dashboard/
├── index.html — Login page
├── dashboard.html — Main dashboard with 3 tabs
├── css/styles.css — Dashboard styles
├── js/firebase-config.js — Firebase initialization
├── js/auth.js — Auth state
├── js/utils.js — Slug generation, validation
├── js/form-engine.js — NICHE_FIELDS + calls both Gemini functions + saves fields + layout
├── js/image-upload.js — Direct upload with compression; auto alt-text helper (V1.9)
├── js/directories.js — Directory management; hero + thumbnail alt-text buttons (V1.9)
├── js/listings.js — Listing form with summary/blog generators; AI FAQ button + listing-level alt-text buttons (V1.9)
├── js/business.js — Business pages with gallery
├── js/publish.js — Publish button
├── functions/index.js — 10 Cloud Functions
├── firebase.json — Hosting + Firestore rules config
├── firestore.rules — Security rules (includes nicheFields)
└── KNOWLEDGE.md — This file

## CLOUD FUNCTIONS (10 TOTAL)
1. processImage — Storage trigger, converts images to WebP, updates hero/thumbnail status in Firestore
2. triggerPublish — GitHub repository_dispatch proxy
3. getNicheFields — Gemini generates clean fields (no location, no price, no toggles)
4. generateLocationDescription — Generates max 100 words / 2 paragraphs
5. generateBusinessSummary — Generates summaries with EEAT rules
6. generateBlog — Generates blogs with niche tone rules
7. askDirectoryAssistant — RAG AI assistant for the public website. Reads listing or directory data to answer visitor questions.
8. generateNicheLayout — Generates `directoryCard` and `listingPage` JSON layouts based on UX rules.
9. **generateFAQs (V1.9)** — Generates exactly 3 Q&As per listing from summary + nicheSpecific + blog. JSON output.
10. **generatePhotoAltText (V1.9)** — Gemini Vision. Generates ≤15-word SEO alt text from an image (base64 + mimeType).

## BACKFILLING EXISTING NICHES
If a niche was created before V1.8, it will not have a `layout`. You can run a one-time script in the browser console to generate layouts for all existing niches. (See the `backfillLayouts` script).

## SECURITY
- Firestore rules: public read, write only authenticated admin
- Collections: directories, businesses, nicheFields
- Firebase Auth: single admin

## WORKFLOW
1. Login at admin-dashboard-dc821.web.app
2. Create directory — type niche, location, county, sub-county
3. Generate location description (Short, 2 paragraphs)
4. Add listings — dynamic form per niche (generates fields + layout)
5. Generate summary/blog/FAQs with AI (FAQs save on Save Listing)
6. Upload photos — alt text can be generated per image (hero/thumbnail buttons, gallery auto)
7. Save as draft or publish
8. Trigger build → engine rebuilds → live at kedirectory.co.ke