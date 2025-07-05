# Jadoo Marketplace Feed Optimizer

## Overview
Jadoo is a modern backend system for transforming, enriching, and optimizing product feeds for marketplaces (e.g., Walmart, Amazon, TikTok, Reebelo, Meta, etc.). It is designed for seamless integration with the Lovable frontend, providing fast, reliable, and AI-enriched product feed uploads for sellers.

---

## Key Features & Progress

### Backend (Node.js, TypeScript)
- **ESM Migration:** All backend code now uses ECMAScript Modules (ESM) for modern compatibility and future-proofing.
- **OpenTelemetry Integration:** Full tracing and observability for file operations, LLM calls, database, and Supabase storage using OpenTelemetry Collector.
- **BullMQ Job Queue:** Asynchronous, scalable job queue for fast, parallel feed processing and LLM enrichment.
- **Supabase Storage & Database:** All processed files and logs are stored in Supabase, with public URLs returned to the frontend for download.
- **Robust CORS & File Uploads:** Dynamic CORS for Lovable and dev/test domains. Multer-based file uploads for reliability.
- **Header Mapping & Fuzzy Matching:** Automatic normalization and fuzzy matching of vendor headers to marketplace templates.
- **LLM Enrichment:** Unmapped or blank fields are filled using OpenAI LLM, with batch row-level calls for speed and cost efficiency.
- **Comprehensive Summary JSON:** Each processed feed returns a summary with SKU counts, detected category, confidence scores, warnings, and suggestions for sellers.
- **Error Handling:** All errors are logged and surfaced to the frontend, with robust process and promise error handling.

### Frontend (Lovable)
- **Modern React UI:** Lovable provides a beautiful, dark-themed, seller-friendly interface for uploading, previewing, and downloading optimized feeds.
- **Polling & Download:** Frontend polls backend job status and enables download of processed files via real Supabase public URLs.
- **Category & Field Insights:** Displays detected category, field definitions, LLM/mapped/blank status, and allows user feedback/corrections.
- **Feedback Loop:** Planned: POST feedback endpoint for user corrections to improve future enrichments.

### Integration
- **API Endpoints:**
  - `/api/simple-upload` for file uploads and job creation
  - `/feeds/:feedId/ready` for job status polling
  - `/feeds/:feedId/download` for processed file download
- **Supabase:** Used for both file storage and metadata logging.
- **OpenTelemetry Collector:** Local and remote tracing supported for debugging and performance monitoring.

---

## Recent Updates
- Migrated backend to ESM (import/export) and fixed all CommonJS/ESM compatibility issues.
- Patched OpenTelemetry Resource usage for Node.js 20+ and latest package versions.
- Added robust error logging and process-level error handlers.
- Improved LLM enrichment batching for much faster processing.
- All changes committed and pushed to GitHub (noodle630/Jadoo).

---

## Next Steps
- Finalize OpenTelemetry Resource import for your specific version (see server/telemetry.js).
- Continue optimizing LLM batching and concurrency.
- Expand feedback and correction loop for sellers.
- Add more marketplace templates and categories.

---

## Contributors
- Pratik Shekhar (@noodle630)

---

For more details, see the codebase and `/server/` directory for backend logic, `/client/` for Lovable frontend, and Supabase/OpenTelemetry configuration files.
