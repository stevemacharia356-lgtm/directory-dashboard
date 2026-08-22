# KNOWLEDGE.md — POLYMORPHIC LOCAL AUTHORITY ENGINE V1 — DASHBOARD

## PROJECT OVERVIEW
Vanilla JS mobile-friendly dashboard for managing directory listings and business pages. Connects to same Firestore and Storage as the engine. Deployed to admin-dashboard-dc821.web.app.

## STACK
Vanilla HTML/CSS/JS + Firebase SDK (Auth, Firestore, Storage, Functions) + Firebase Hosting

## URL
admin-dashboard-dc821.web.app

## TABS
1. Directories — Manage directory pages (create, edit, publish, delete)
2. Business Pages — Manage standalone business pages (create, edit, publish, delete)
3. Build Status — Trigger builds and view deployment status

## 5 NICHES (DIRECTORIES)
Guesthouse, Hotel, Apartment, School, Health

## PRICE CATEGORIES
Budget, Mid-range, Premium, Luxury — dropdown selector. Exact numeric price optional.

## BUSINESS PAGES
Standalone one-page business websites. Fields: business name, location, category, tagline, description, phone, WhatsApp, services, opening hours, directions, coordinates, hero image, FAQs, optional blog. Slug auto-generated as business-{location}-{name}.

## REQUIRED FIELDS (MINIMAL)
- Directory: Location name only
- Listing: Business name only
- Business page: Name and location only
- Everything else optional — save and publish with partial data allowed

## BUTTON LOCKING (ANTI DOUBLE-CLICK)
All buttons disable themselves while their function is running:
- Save buttons show "Saving..." and disable
- Publish/Unpublish buttons show "Processing..." and disable
- Delete buttons show "Deleting..." and disable
- Publish All Changes shows "Publishing..." and disables
- Prevents duplicate saves from double or triple clicks

## FOLDER STRUCTURE
directory-dashboard/
├── index.html — Login page
├── dashboard.html — Main dashboard with 3 tabs
├── css/styles.css — All dashboard styles
├── js/firebase-config.js — Firebase initialization
├── js/auth.js — Login, logout, auth state
├── js/utils.js — Slug generation, coordinate validation, phone formatting
├── js/form-engine.js — NICHE_FIELDS config, dynamic form renderer
├── js/image-upload.js — Direct image upload, uploadAnyImage, uploadBusinessHero
├── js/directories.js — Directory management with button locking
├── js/listings.js — Listing form with button locking
├── js/business.js — Business page management with FAQ and button locking
├── js/publish.js — Publish button with button locking, build status
├── functions/index.js — triggerPublish (GitHub dispatch)
├── firebase.json — Hosting config
├── firestore.rules — Security rules for directories and businesses
└── KNOWLEDGE.md — This file

## KEY FEATURES
- Login with email/password (single admin)
- Directory slugs auto-generated (niche + location + optional category tag)
- Business slugs auto-generated (business-{location}-{name})
- Dynamic listing form per niche (config-driven)
- Minimal required fields — save partial data freely
- Button locking prevents duplicate saves
- Price category dropdown
- Direct photo upload (no Cloud Function, immediate preview)
- Coordinate validation against Kenya bounds
- Per-listing FAQs, global FAQs, business FAQs
- Blog editor
- Firestore transactions for safe saves
- Manual publish button via Cloud Function
- Build status with color-coded indicator

## CLOUD FUNCTIONS
- triggerPublish: HTTPS callable, proxies GitHub repository_dispatch

## SECURITY
- Firestore rules: public read, write only for authenticated admin
- Collections: directories and businesses
- Firebase Auth: email/password, single user account

## WORKFLOW
1. Login at admin-dashboard-dc821.web.app
2. Create directory (niche + location, slug auto-generates)
3. Add listings (name only required, fill rest as available)
4. Upload photos (direct upload, immediate preview)
5. Create business pages (name + location, slug auto-generates)
6. Add FAQs and blog content as needed
7. Save as draft or publish — buttons lock during save
8. Click Publish All Changes → triggers engine rebuild
9. Content appears at directory-engine-7a41f.web.app