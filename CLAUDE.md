# Shopizi - Karpathy Guidelines & Project Rules

## Karpathy Skills (Active)

### 1. Think Before Coding
**Don't assume. Don't hide confusion. Surface tradeoffs.**
- Before implementing, state assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick in silence.
- If a simpler approach exists, say so.

### 2. Simplicity First
**Write the minimum code that solves the problem. Nothing speculative.**
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- If the code could be 50 lines instead of 200, rewrite it.

### 3. Surgical Changes
**Touch only what you must. Clean up only your own mess.**
- Match existing style, even if you'd do it differently.
- Don't refactor things that aren't broken.
- Remove only the code that YOUR changes made unused.

### 4. Goal-Driven Execution
**Define success criteria. Loop until verified.**
- "Fix the bug" → Write a test that reproduces it, then make it pass.
- "Add validation" → Write tests for invalid inputs, then make them pass.
- State a brief plan for multi-step tasks.

---

## Project: Shopizi (SaaS E-commerce Burkina Faso)

**Stack Backend:** Node.js, Express, PostgreSQL (raw SQL), Redis, Bull Queue
**Stack Frontend:** React 19, Vite, TypeScript, Tailwind CSS, TanStack Query, Zustand, Axios
**Generator:** Python Reuse | Templates Jinja2

**Key Enums:**
- Order Statuses: new → confirmed → processing → ready → delivered → completed
- Subscription Plans: Free (0 XOF), Pro (7500/mois), Business (20000/mois)
- Delivery Statuses: pending_driver → driver_assigned → in_transit → delivered
- Review workflow: pending → approved / rejected

**Database:** 15+ tables (users, shops, products, orders, categories, subscriptions, payments, delivery_drivers, deliveries, reviews, chat_rooms, chat_messages, cities, media, site_generation_logs)

**API Base:** `http://localhost:3000/api/v1`
- Auth: JWT Bearer (access 15min / refresh 7days)
- Response format: `{ success, data, meta, error }`

**Frontend URLs:**
- `/login`, `/register`
- `/` (Dashboard)
- `/products` (CRUE Products)
- `/orders` (CRUE Orders)
- `/categories`
- `/subscription`
- `/settings`
- `/chat`
- `/reviews`

**New Features V2:**
- Delivery: drivers register, receive notifications, earn 95% commission (dev keeps 5%)
- Reviews: 1-5 stars on products, cumulative shop rating
- Chat: Customer ↔ Merchant, Group reviews
- Cities: merchants select city, clients filter by city
