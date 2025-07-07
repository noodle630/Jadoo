# Jadoo Tech Stack Documentation

## Overview
Jadoo is built on a modern, cloud-native, and highly scalable stack designed for rapid iteration, global reach, and seamless integration with e-commerce platforms.

---

## 🧩 Core Stack Components

| Service/Provider | Purpose | Why We Use It |
|------------------|---------|--------------|
| **Fly.io**       | App hosting, global edge deployment | Fast, reliable, and easy to scale Node.js/Express backend and static frontend. Supports Docker, zero-downtime deploys, and global edge locations. |
| **Upstash**      | Redis (queue, caching) | Serverless, pay-per-use Redis for BullMQ job queues and caching. No ops, instant scaling, global latency. |
| **Supabase**     | Auth, database, storage | Managed Postgres DB, row-level security, JWT auth, and S3-compatible storage. Modern, open-source, and developer-friendly. |
| **Lovable**      | Frontend builder & hosting | No-code/low-code builder for rapid UI iteration, A/B testing, and instant deploys. Integrates with our backend API. |
| **Cloudflare**   | CDN, DNS, security | Global CDN for static assets, DDoS protection, and DNS management. Ensures fast, secure delivery worldwide. |
| **OpenAI**       | AI enrichment | GPT-4o and GPT-4o-mini for product data transformation, enrichment, and field mapping. |
| **Stripe**       | Payments | Subscription billing, one-time payments, and webhook integration for monetization. |
| **BullMQ**       | Job queue | Handles async processing, large file jobs, and background enrichment. |
| **Node.js/Express** | Backend API | Fast, flexible, and widely supported for REST APIs and background workers. |
| **React/Vite**   | (Optional) Custom frontend | For advanced UI/UX or white-label deployments. |

---

## 🏗️ Infrastructure & Service Details

### **Fly.io**
- **Role:** Hosts backend API and (optionally) static frontend.
- **Why:** Global edge locations, Docker support, easy scaling, and zero-downtime deploys.
- **How Used:** Deploys via GitHub Actions or CLI. Handles SSL, custom domains, and health checks.

### **Upstash**
- **Role:** Redis for BullMQ job queue and caching.
- **Why:** Serverless, pay-per-request, no maintenance, global low-latency.
- **How Used:** Stores job state, progress, and async task data for feed processing.

### **Supabase**
- **Role:** Auth, Postgres DB, and file storage.
- **Why:** Modern, open-source, RLS, JWT, and S3-compatible storage. Great DX.
- **How Used:**
  - **Auth:** Email/password, JWT, and RLS for secure multi-tenant access.
  - **DB:** Stores users, feeds, jobs, analytics, and LLM cache.
  - **Storage:** Stores transformed files, templates, and uploads.

### **Lovable**
- **Role:** No-code/low-code frontend builder and hosting.
- **Why:** Rapid UI iteration, A/B testing, and instant deploys for non-technical users.
- **How Used:** Connects to backend API for all data and actions. Can be replaced with custom React app if needed.

### **Cloudflare**
- **Role:** CDN, DNS, and security.
- **Why:** Fast, global delivery of static assets, DDoS protection, and DNS management.
- **How Used:** Serves static files, protects API endpoints, and manages custom domains.

### **OpenAI**
- **Role:** AI-powered data enrichment and transformation.
- **Why:** Best-in-class LLMs for product data mapping, enrichment, and compliance.
- **How Used:** API calls for field mapping, description generation, and category classification.

### **Stripe**
- **Role:** Payments and billing.
- **Why:** Secure, global, and easy to integrate for subscriptions and one-time payments.
- **How Used:** Handles plan upgrades, webhooks, and payment flows.

### **BullMQ**
- **Role:** Background job queue.
- **Why:** Robust, scalable, and integrates with Redis/Upstash for async processing.
- **How Used:** Manages feed transformation jobs, analytics updates, and file processing.

### **Node.js/Express**
- **Role:** Backend API and worker processes.
- **Why:** Fast, flexible, and widely supported for REST APIs and background jobs.
- **How Used:** Serves all API endpoints, handles uploads, and runs background workers.

### **React/Vite (Optional)**
- **Role:** Custom frontend (if not using Lovable).
- **Why:** For advanced UI/UX, white-label, or partner deployments.
- **How Used:** Consumes the same backend API as Lovable.

---

## 🔒 Security & Compliance
- **Supabase RLS:** Row-level security for all user data.
- **JWT Auth:** Stateless, secure authentication for all API calls.
- **Cloudflare:** DDoS protection, SSL, and WAF.
- **Stripe:** PCI-compliant payments.
- **Upstash:** Secure, isolated Redis instances.

---

## ⚡ Scalability & Reliability
- **Serverless/managed services:** No single point of failure, auto-scaling.
- **Global edge/CDN:** Fast for users everywhere.
- **Async job queue:** Handles spikes, large files, and slow AI calls.
- **API-first:** Easy to add new UIs, partners, or integrations.

---

## 🛣️ Future Extensibility
- **Add new marketplaces:** Plug in new templates, categories, and API integrations.
- **Direct API push:** Integrate with Walmart, Amazon, Meta, etc. for one-click listing.
- **Partner/agency portals:** Multi-tenant, white-label, and API access.
- **Advanced analytics:** Real-time dashboards, feedback loops, and AI-driven insights.

---

## 📊 Summary Table

| Layer         | Service/Provider      | Key Features                        |
|---------------|----------------------|-------------------------------------|
| Hosting       | Fly.io, Lovable      | Global, edge, no-code, Docker       |
| Queue         | Upstash (Redis), BullMQ | Async jobs, scalable, serverless |
| Database      | Supabase (Postgres)  | RLS, JWT, managed, scalable         |
| Storage       | Supabase Storage     | S3-compatible, secure, fast         |
| CDN/Security  | Cloudflare           | CDN, DNS, DDoS, SSL                 |
| AI            | OpenAI               | GPT-4o, enrichment, mapping         |
| Payments      | Stripe               | Subscriptions, webhooks, PCI        |
| Frontend      | Lovable, React/Vite  | No-code, custom, A/B, white-label   |

---

## Monetization & Payments
- **Stripe** is used for payment processing and wallet top-ups.
- **Wallet/Credit System:** Users load credits and pay per row processed.
- **Processing Modes:** Free ($0/row), Ultra ($0.15/row), God Mode ($0.35/row).
- All logic is backend-enforced and ready for frontend integration.

**Jadoo's stack is designed for speed, scale, and flexibility—ready for millions of sellers, new marketplaces, and the next wave of e-commerce innovation.** 