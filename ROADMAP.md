# Project S – Development Roadmap

Project S is being built as a practical, lightweight, and AI-native product feed manager. This roadmap outlines the phased development of the project, grounded in real vendor needs, GPT transformation, and marketplace compliance.

---

## ✅ Immediate Focus (Core Flow)

### 🎯 Goal: Bulletproof input → transform → output pipeline

1. **1:1 Input-Output Row Mapping**
   - User uploads CSV with X rows
   - Output file must contain the exact same number of rows
   - No data loss, row skipping, or transformation mismatch

2. **OpenAI Transformation Optimization**
   - Use just product name, price, and quantity (plus SKU if available) as base
   - GPT should intelligently infer all required fields for target marketplace

3. **Data Completeness**
   - Output should populate all known fields (brand, color, condition, etc.)
   - Make outputs useful, complete, and consistent even with sparse input

---

## 🧰 In Parallel (Manual + Non-Code Tasks)

- Hardcode Reebelo template for each category
- Scrape or collect attribute definitions for Amazon, TikTok, Meta, Walmart
- Map each marketplace to a standardized format structure
- Write static field schemas as prompts or TypeScript validation maps

---

## 🟡 Phase 2 – Auth + UI Cleanup

- Remove Replit-based Google OAuth (currently breaks Codespaces)
- Add a dev bypass or migrate to Firebase/Auth0
- Clean UI for demo readiness
- Stub out tabs: Products | Dashboard | Integrations

---

## 🔵 Phase 3 – Advanced Data Enrichment

- Improve GPT prompt quality for SEO titles, optimized descriptions
- Add intelligent column population (e.g. color, brand, condition, warranty)
- Visual preview of row input vs output in UI
- Add validation warnings before export

---

## 🟣 Phase 4 – Marketplace Integration

- Connect to Amazon MWS, Walmart, TikTok, and Reebelo APIs
- Allow vendors to link their seller accounts
- Push listings directly from app after preview
- Include sync status, listing feedback/errors

---

## 🔮 Future Enhancements

- Saved templates per vendor or marketplace
- Multi-user logic and permissions
- AI chat assistant to help fix or interpret errors
- Dashboard analytics: transformation coverage, error trends
- Build a public API for vendors to upload programmatically

---

## Guiding Principles

- App must always be testable, working, and deployable at every phase
- Prioritize speed of feedback over engineering perfection
- Stay lean — real vendors should be able to use it soon

---

**Maintained by:** Pratik  
**Last updated:** May 2025
