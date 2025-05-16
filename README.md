# Project "S" – AI-Powered Product Feed Manager

Project "S" is an AI-native application that transforms messy vendor product data into clean, marketplace-ready product feeds using OpenAI's GPT models.

---

## 📌 Overview

This project started with a Python/Flask-based backend, but is now being actively migrated to a modern stack using **TypeScript**, **Node.js**, and **React**. Both versions currently coexist in this repo.

---

## 🚀 Key Features (Target Version)

- Upload messy CSV product files from vendors
- Transform rows into marketplace-ready format using OpenAI (GPT)
- Support for Amazon, Walmart, Meta, TikTok, Catch, and Reebelo templates
- 1:1 input-output transformation guarantee (no dropped rows)
- Download final feed as CSV
- Web UI + REST API

---

## 📦 Tech Stack (New Version)

- **Frontend**: React + Vite + Tailwind (`/client`)
- **Backend**: Node.js + Express + TypeScript (`/server`)
- **AI**: OpenAI GPT-4
- **Dev**: GitHub Codespaces
- **Templating**: Static CSV-based field maps in `/templates`

---

## 🧪 Getting Started (New Version)

```bash
npm install
npm run dev
```

Then open the app in your Codespaces preview or http://localhost:3000.

🔄 Current Hybrid State
| Stack           | Status                   | Path Example                      |
| --------------- | ------------------------ | --------------------------------- |
| 🟢 Node/React   | ✅ Actively developed     | `client/`, `server/`, `tsx` files |
| 🔵 Python/Flask | 💤 Legacy/prototype code | `app.py`, `transform_to_*.py`     |


You can still run legacy scripts like transform_to_amazon.py or run_amazon.sh for testing, but they are being phased out.

🛠 Roadmap Highlights

See ROADMAP.md for full context.

Immediate Priorities
- Bulletproof 1:1 row mapping in core flow
- Improve GPT prompt logic (infer full output from name/price/qty)
- Remove dependency on Replit OAuth
- Clean up and re-style the UI for feedback/testing
- Future
- Push listings directly to marketplaces (Amazon, Reebelo, etc.)
- Expand category-specific prompts and validations
- Support user templates, roles, dashboards

🤖 How It Works

Upload raw CSV
Parse into rows
GPT processes each row individually
Output file generated (same # of rows, all columns enriched)
Download CSV or push to marketplace (planned)


📁 Repo Structure (Simplified)
client/             → React frontend
server/             → Express backend
templates/          → CSV field templates
transform_to_*.py   → Legacy per-marketplace transformers (Python)
run_*.sh            → Legacy shell scripts
*.csv               → Test/product sample data

License

[MIT License](https://github.com/noodle630/S/blob/main/LICENSE)

Acknowledgments

OpenAI for GPT. Docs from Amazon, TikTok, Reebelo, Walmart, and Meta.
