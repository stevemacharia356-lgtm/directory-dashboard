# KNOWLEDGE.md — KEDIRECTORY DASHBOARD V1.7 (COMPLETE)

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

## STRICT GEMINI RULES (V1.6)
- **Niche Fields:** Gemini is strictly forbidden from generating Location fields, Yes/No toggles, "Other" dropdown options, and Price fields.
- **Safety Filter:** `js/form-engine.js` has a filter that strips out any field containing "price", "cost", "rate", or "fee".
- **Location Description:** Strict MAX 100 words. MUST break into 2 short paragraphs.
- **Business Summary:** 60-100 words.
- **Blog Generator:** 400-600 words, EEAT rules.

## AI ASSISTANT (V1.7)
- **New Cloud Function:** `askDirectoryAssistant`.
- **RAG System:** Gemini acts as a Retrieval-Augmented Generation assistant.
- **Listing Mode:** Reads ONLY the specific listing's data. If the answer isn't there, it politely tells the user to call the business's phone number.
- **Directory Mode:** Reads ALL listings in the directory. Allows users to ask comparison questions (e.g., "Who has WiFi?", "Which is cheapest?").

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
├── js/form-engine.js — NICHE_FIELDS + dynamic Gemini fields + strict price filter
├── js/image-upload.js — Direct upload with compression
├── js/directories.js — Directory management
├── js/listings.js — Listing form with summary/blog generators
├── js/business.js — Business pages with gallery
├── js/publish.js — Publish button
├── functions/index.js — 7 Cloud Functions
├── firebase.json — Hosting + Firestore rules config
├── firestore.rules — Security rules (includes nicheFields)
└── KNOWLEDGE.md — This file

## CLOUD FUNCTIONS (7 TOTAL)
1. processImage — Storage trigger, converts images to WebP
2. triggerPublish — GitHub repository_dispatch proxy
3. getNicheFields — Gemini generates clean fields (no location, no price, no toggles)
4. generateLocationDescription — Generates max 100 words / 2 paragraphs
5. generateBusinessSummary — Generates summaries with EEAT rules
6. generateBlog — Generates blogs with niche tone rules
7. askDirectoryAssistant — New AI FAQ assistant for the public website. Reads listing or directory data to answer visitor questions.

## SECURITY
- Firestore rules: public read, write only authenticated admin
- Collections: directories, businesses, nicheFields
- Firebase Auth: single admin

## WORKFLOW
1. Login at admin-dashboard-dc821.web.app
2. Create directory — type niche, location, county, sub-county
3. Generate location description (Short, 2 paragraphs)
4. Add listings — dynamic form per niche
5. Generate summary/blog with AI
6. Upload photos
7. Save as draft or publish
8. Trigger build → engine rebuilds → live at kedirectory.co.ke