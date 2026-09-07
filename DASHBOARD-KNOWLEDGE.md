# KNOWLEDGE.md — KEDIRECTORY DASHBOARD V1.5 (COMPLETE)

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

## DYNAMIC NICHES (UNLIMITED)
Niche type is now a text input with suggestions. Type ANY business type — Nightclub, Supermarket, Gym, Salon, Pharmacy, Hardware, Church, Car Wash. Gemini generates the correct form fields for that niche automatically via getNicheFields Cloud Function.

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

## GEMINI AI INTEGRATIONS (4 CLOUD FUNCTIONS)
1. getNicheFields — Generates form fields per niche type
2. generateLocationDescription — Generates location description from county, sub-county, niche
3. generateBusinessSummary — Generates business summary with completeness check
4. generateBlog — Generates SEO blog with keyword, standout, owner story, niche tone rules

## FOLDER STRUCTURE
directory-dashboard/
├── index.html — Login page
├── dashboard.html — Main dashboard with 3 tabs
├── css/styles.css — Dashboard styles
├── js/firebase-config.js — Firebase initialization
├── js/auth.js — Auth state
├── js/utils.js — Slug generation, validation, formatting
├── js/form-engine.js — NICHE_FIELDS + dynamic Gemini fields
├── js/image-upload.js — Direct upload with compression (800px, 70%)
├── js/directories.js — Directory management with tab memory, location description button
├── js/listings.js — Listing form with summary button, blog generator, completeness check
├── js/business.js — Business pages with gallery, blog generator
├── js/publish.js — Publish button, build status
├── functions/index.js — processImage, triggerPublish, getNicheFields, generateLocationDescription, generateBusinessSummary, generateBlog
├── firebase.json — Hosting config (no-cache JS/CSS)
├── firestore.rules — Security rules
└── KNOWLEDGE.md — This file

## KEY FEATURES
- Login with email/password (single admin)
- Dynamic niche system — any business type works
- Gemini generates form fields per niche
- Gemini generates location descriptions
- Gemini generates business summaries (with completeness check to prevent hallucination)
- Gemini generates SEO blogs with niche tone rules (YMYL aware)
- Verified toggle for premium listings
- Photo gallery with dynamic categories and lightbox
- Tab memory (stays on Drafts after delete)
- Button locking prevents duplicates
- Direct photo upload with compression
- Coordinate validation (Kenya bounds)
- Per-listing FAQs, global FAQs, business FAQs
- Firestore transactions
- Manual publish via Cloud Function
- Build status indicator

## CLOUD FUNCTIONS (6 TOTAL)
1. processImage — Storage trigger, converts images to WebP
2. triggerPublish — GitHub repository_dispatch proxy
3. getNicheFields — Gemini generates form fields per niche
4. generateLocationDescription — Gemini generates location descriptions
5. generateBusinessSummary — Gemini generates summaries with EEAT rules
6. generateBlog — Gemini generates blogs with niche tone rules

## GEMINI PROMPT HIGHLIGHTS
- Niche tone rules: Health sounds professional, Nightclub sounds energetic, Supermarket sounds practical
- Anti-robotic: No "I", "me", "we", "our". Third person only.
- No hallucination: Use only provided details
- YMYL aware: Health and finance get authoritative tone
- Keyword targeting: Title, first 100 words, and subheading
- Standout feature anchors the article
- Owner story adds human element

## SECURITY
- Firestore rules: public read, write only authenticated admin
- Collections: directories and businesses
- Firebase Auth: single admin
- Gemini API key stored in Cloud Function environment

## WORKFLOW
1. Login at admin-dashboard-dc821.web.app
2. Create directory — type niche, location, county, sub-county
3. Generate location description with AI
4. Add listings — dynamic form per niche
5. Generate summary with AI (requires name + some niche data)
6. Generate blog with AI (requires summary + directions + keyword)
7. Upload photos (compressed, gallery categories)
8. Save as draft or publish
9. Publish All Changes → engine rebuild
10. Content live at kedirectory.co.ke