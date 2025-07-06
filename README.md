# Jadoo Marketplace Feed Optimizer

## Overview
Jadoo is a modern backend system for transforming, enriching, and optimizing product feeds for marketplaces (e.g., Walmart, Amazon, TikTok, Reebelo, Meta, etc.). It is designed for seamless integration with the Lovable frontend, providing fast, reliable, and AI-enriched product feed uploads for sellers.

---

## 🚀 Current Progress

- **E2E flow:** Upload, process, enrich, download, and Supabase Storage upload are all working end-to-end.
- **Supabase RLS:** Fixed and fully operational for secure storage.
- **Logging:** Improved logs for debugging and monitoring (see `logs/combined.log` and `logs/error.log`).
- **Frontend:** Deployed and live at [feed-flow-ai-transform.lovable.app/new-feed](https://feed-flow-ai-transform.lovable.app/new-feed)
- **Public Release:** App is published and accessible!

---

## 🎉 Success Message

> **Jadoo is LIVE!**
> - E2E pipeline is working.
> - Supabase Storage is secure and functional.
> - Frontend is deployed and ready for users.
> - Next: Productize, optimize data quality, and make everything lightning fast!

---

## 🛠️ Next Steps

- **Productization:**
  - Add pricing tiers (free, per-row, per-field, per-quality, etc.)
  - Segment data fill based on user payment
  - Add payment integration
- **Data Quality:**
  - Improve LLM prompts and mapping
  - Ensure key fields (SKU, etc.) are always filled
  - Offer SEO/data quality tiers
- **Performance:**
  - Optimize backend and frontend for speed (category dropdown, file processing, etc.)
  - Reduce all UI/API latency to sub-second where possible
- **Frontend:**
  - Consider Figma for rapid prototyping and design
  - Add insights, analytics, and better UX
  - Color code output files, add "Products" tab, etc.
- **Custom Domain:**
  - You can buy a domain and connect it via Lovable for a branded URL

---

## 💡 How to Check Logs
- **Backend:** `logs/combined.log`, `logs/error.log`
- **Supabase:** Dashboard for storage and RLS
- **API:** `/api/feeds/{feedId}/progress` for job status

---

## 🌐 Public App URL
- [feed-flow-ai-transform.lovable.app/new-feed](https://feed-flow-ai-transform.lovable.app/new-feed)

---

## 🏁 Let's keep building!
- Next up: Productization, data quality, and speed. Ready for magic!

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

## Contributors
- Pratik Shekhar (@noodle630)

---

For more details, see the codebase and `/server/` directory for backend logic, `/client/` for Lovable frontend, and Supabase/OpenTelemetry configuration files.

## QA & E2E Testing Workflow

### Local QA (Full E2E)

1. Install dependencies:
   ```sh
   npm install
   ```
2. Start both the Express server and the worker in parallel:
   ```sh
   npm run qa
   ```
3. Run the E2E upload test:
   ```sh
   npm test test/e2e-upload.test.js
   ```

### Fly.io Deployment (Production/QA)

1. Deploy your app as usual:
   ```sh
   fly deploy
   ```
2. Scale up the worker process:
   ```sh
   fly scale count 1 --process-group worker
   ```
3. The app process runs the API server, the worker process runs the BullMQ worker.
4. Test uploads from the frontend or via API.
5. Monitor logs for both processes in the Fly.io dashboard.

### Troubleshooting
- If uploads stay pending, ensure the worker process is running (locally or on Fly.io).
- Check logs for both the app and worker for errors or progress.
