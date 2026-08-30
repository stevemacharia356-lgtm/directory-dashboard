# KNOWLEDGE.md — KEDIRECTORY DASHBOARD V1 (FINAL)

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

## 5 NICHES (DIRECTORIES)
Guesthouse, Hotel, Apartment, School, Health

## PRICE CATEGORIES
Budget, Mid-range, Premium, Luxury — dropdown. Exact numeric price optional.

## BUSINESS PAGES
Standalone business pages. Fields: name, location, category, tagline, description, phone, WhatsApp, services, opening hours, directions, coordinates, hero image, FAQs, optional blog. Slug auto-generated as business-{location}-{name}.

## REQUIRED FIELDS (MINIMAL)
- Directory: Location name only
- Listing: Business name only
- Business page: Name and location only
- Everything else optional

## BUTTON LOCKING
All buttons disable during operation:
- Save: "Saving..." disabled
- Publish/Unpublish: "Processing..." disabled
- Delete: "Deleting..." disabled
- Publish All Changes: "Publishing..." disabled
Prevents duplicate saves from double/triple clicks.

## FOLDER STRUCTURE
directory-dashboard/
├── index.html — Login page
├── dashboard.html — Main dashboard with 3 tabs
├── css/styles.css — Dashboard styles
├── js/firebase-config.js — Firebase initialization
├── js/auth.js — Auth state
├── js/utils.js — Slug generation, validation, formatting
├── js/form-engine.js — NICHE_FIELDS config, dynamic form renderer
├── js/image-upload.js — Direct upload with client-side compression (800px, 70%)
├── js/directories.js — Directory management with button locking
├── js/listings.js — Listing form with button locking
├── js/business.js — Business pages with FAQ and button locking
├── js/publish.js — Publish button, build status
├── functions/index.js — triggerPublish (GitHub dispatch)
├── firebase.json — Hosting config
├── firestore.rules — Security rules
└── KNOWLEDGE.md — This file

## KEY FEATURES
- Login with email/password (single admin)
- Directory slugs: niche + location + optional category tag
- Business slugs: business-{location}-{name}
- Dynamic listing form per niche
- Minimal required fields
- Button locking
- Price category dropdown
- Direct photo upload with compression
- Coordinate validation (Kenya bounds)
- Per-listing FAQs, global FAQs, business FAQs
- Blog editor
- Firestore transactions
- Manual publish via Cloud Function
- Build status indicator

## CLOUD FUNCTIONS
- triggerPublish: HTTPS callable, proxies GitHub repository_dispatch

## SECURITY
- Firestore rules: public read, write only authenticated admin
- Collections: directories and businesses
- Firebase Auth: single admin

## V2 PLANNED
1. Multi-photo gallery with dynamic categories
2. Premium toggle (manual after payment)
3. Claim business flow
4. Business owner dashboard
5. Gemini blog generator

## WORKFLOW
1. Login at admin-dashboard-dc821.web.app
2. Create directory or business page
3. Add listings (name only required)
4. Upload photos (compressed, immediate preview)
5. Save as draft or publish
6. Publish All Changes → engine rebuild
7. Content live at kedirectory.co.ke