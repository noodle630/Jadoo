# Project "S" – AI-Native Product Feed Engine

**S** is an AI-first, marketplace-as-a-service platform that transforms messy vendor product data into clean, structured, marketplace-ready listings using OpenAI and marketplace-specific templates.

---

## 🧠 Mission

**Give vendors superpowers.**  
Let them upload any inventory file — in any format — and generate optimized, validated feeds for marketplaces like Amazon, Walmart, TikTok, Reebelo, and more, with one click.

---

## ✅ Current Capabilities (MVP)

- Upload CSVs via web UI
- Supports authentication (dev bypass + Supabase for prod)
- AI-powered transformation per marketplace (Amazon template live)
- Templates are stored in `/attached_assets/templates/{marketplace}/base.csv`
- Grounding files per marketplace for smarter output (in progress)
- 1:1 input-output guarantee (no dropped rows)
- Output file download
- Supabase used for tracking feed status & row counts
- Frontend flow: Upload → Processing → Summary → Download
- Partial Products tab UI live (showing flagged rows needing review)

---

## 🧩 Tech Stack

| Layer        | Tech                             |
|--------------|----------------------------------|
| Frontend     | React + Tailwind + Vite          |
| Backend      | Node.js + Express + TypeScript   |
| AI Layer     | OpenAI GPT-4 (3.5 fallback soon) |
| Storage      | Supabase (feeds, uploads, status)|
| Auth         | Google OAuth (fallback to dev@local) |
| Infra        | GitHub Codespaces (live dev)     |

---

## 🛠️ Local Dev Setup

```bash
npm install
npm run dev


## 🛠️ Local Dev Setup

```bash
npm install
npm run dev
Visit: http://localhost:3000

Default dev auth: dev@local.test

📁 Directory Overview
pgsql
Copy
Edit
client/                         → React frontend (upload, processing, summary UI)
server/                         → Express backend (routes, transform logic)
attached_assets/templates/      → Marketplace-specific base templates
grounding/{marketplace}/        → Vendor sample data (used for grounding, WIP)
temp_uploads/                   → Uploaded CSVs before transformation
transformer.ts / app_unified.py → Core logic (OpenAI-powered row transformer)

🚀 What's Next

🔧 Infra / Core Fixes
 Fix Supabase write failures on large file uploads

 Add background job or chunked transformation flow for 500+ row files

 Add retry logic & row-level error logging

🧠 Model & Grounding
 Support grounding per marketplace using vendor samples

 Smarter prompt templates using product title × price × category

 Add support for more templates (Walmart, TikTok, Reebelo)

💾 Output File Improvements
 Color-coded Excel output using OpenPyXL

✅ Green = confident rows

⚠️ Yellow = needs human review

❌ Red = missing or invalid data

 Maintain row metadata for "Products" tab inspection

🧑‍💻 SaaS UX Polish
 Sidebar UI with tabs: Upload Feed / Products / Marketplaces / Settings

 Products Tab → View and correct flagged rows

 Summary Tab → Show upload stats, % optimized, download links

 Dashboard Tab → Recent uploads, total products processed

🧪 Legacy Mode
You can still run the old Python transformers:

bash
Copy
Edit
python app_unified.py sample.csv amazon
But they are deprecated in favor of the TypeScript backend.

🎯 Long-Term Vision
S is becoming a centralized marketplace ops engine.
Let vendors upload once, and auto-sync everywhere:

Clean inventory → push to Amazon/Walmart/Meta/TikTok

Flag dirty data → auto-review or human correction

Track performance, reformat, relist — all from one place

🤝 Acknowledgments
OpenAI for GPT-4

Supabase for simple infra

Docs & templates from Amazon, Walmart, Meta, Reebelo

📄 License
MIT License: https://github.com/noodle630/S/blob/main/LICENSE