# KNOWLEDGE.md — KEDIRECTORY DASHBOARD V1.8 (COMPLETE)

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

## STRICT GEMINI RULES (V1.8)
- **Niche Fields:** No location fields, no Yes/No toggles, no "Other" options, no Price fields.
- **Safety Filter:** `js/form-engine.js` strips out any field containing "price", "cost", "rate", or "fee".
- **Location Description:** Strict MAX 100 words, 2 paragraphs.
- **Business Summary:** 60-100 words.
- **Blog Generator:** 400-600 words, EEAT rules.
- **Layout Generation:** Must follow the UX rules (Decision facts first, Deep content last, Compact cards).

## AI ASSISTANT (V1.7)
- **New Cloud Function:** `askDirectoryAssistant`.
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
├── js/image-upload.js — Direct upload with compression
├── js/directories.js — Directory management
├── js/listings.js — Listing form with summary/blog generators
├── js/business.js — Business pages with gallery
├── js/publish.js — Publish button
├── functions/index.js — 8 Cloud Functions
├── firebase.json — Hosting + Firestore rules config
├── firestore.rules — Security rules (includes nicheFields)
└── KNOWLEDGE.md — This file

## CLOUD FUNCTIONS (8 TOTAL)
1. processImage — Storage trigger, converts images to WebP
2. triggerPublish — GitHub repository_dispatch proxy
3. getNicheFields — Gemini generates clean fields (no location, no price, no toggles)
4. generateLocationDescription — Generates max 100 words / 2 paragraphs
5. generateBusinessSummary — Generates summaries with EEAT rules
6. generateBlog — Generates blogs with niche tone rules
7. askDirectoryAssistant — New AI FAQ assistant for the public website. Reads listing or directory data to answer visitor questions.
8. **generateNicheLayout** — **NEW:** Generates `directoryCard` and `listingPage` JSON layouts based on UX rules.

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
5. Generate summary/blog with AI
6. Upload photos
7. Save as draft or publish
8. Trigger build → engine rebuilds → live at kedirectory.co.ke