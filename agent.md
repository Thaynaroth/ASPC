Here is a complete, production-ready ruleset tailored precisely to your chosen tech stack (**Vite + React + ShadCN** frontend, **Fastify + Prisma + Socket.io** backend).

You can copy and paste this text directly into your `agent.md`, `.cursorrules`, or custom instructions file. It translates the visual folder structure you provided into strict, actionable engineering guardrails for your AI agent.

---

```markdown
# AI Agent Rules: ASPC Project Structure & Coding Standards

You are an expert full-stack engineer building the ASPC (Automation Selling Platform in Cambodia). You must strictly follow this folder architecture, file layout, and engineering workflow. Do not deviate from these paths or patterns unless explicitly instructed.

---

## 1. Directory Tree Structural Layout

You must organize all generated code according to the following strict layout:

```text
my-project/
├── frontend/                     # Vite + React Static Frontend
│   ├── public/                   # Static public assets
│   └── src/
│       ├── assets/               # Images, local fonts, global styles
│       ├── components/           # Reusable UI parts
│       │   ├── common/           # Generic buttons, inputs, alerts
│       │   ├── ui/               # ShadCN auto-generated primitives
│       │   └── layout/           # Sidebar, Navbar, Page wrappers
│       ├── pages/                # Screen views (Dashboard, Login, Catalog)
│       ├── hooks/                # Custom React hooks (useSocket, useAuth)
│       ├── context/              # Global React Contexts (AuthContext)
│       ├── services/             # API connection layers (api.ts)
│       ├── utils/                # Pure utility helper functions
│       ├── routes/               # Client-side router declarations
│       ├── App.tsx               # Main App component
│       └── main.tsx              # Application entry point
│
├── backend/                      # Fastify + TypeScript Backend
│   └── src/
│       ├── config/               # Server initialization, env setups
│       ├── controllers/          # Business logic handlers per route
│       ├── routes/               # Fastify API endpoint definitions
│       ├── middleware/           # Auth guards, validation hooks
│       ├── services/             # External modules (OpenAI, Telegram Bot API)
│       ├── utils/                # Server-wide utility scripts
│       ├── app.ts                # Fastify app configuration & plugins
│       └── server.ts             # Server entry point & listener
│
├── prisma/                       # Database Data Layer
│   ├── schema.prisma             # Primary source of truth database layout
│   └── seed.ts                   # Local development database seed data
│
├── README.md                     # Project documentation
└── package.json                  # Root monorepo workspace configurations

```

---

## 2. Core Frontend Directives (Vite + React + ShadCN)

* **UI Components:** Write modular, atomic UI components. Put custom layouts in `components/layout/` and business elements in `components/common/`. Never modify primitives inside `components/ui/` manually; use ShadCN CLI tools or manage custom overrides cleanly via Tailwind helper classes.
* **Routing Architecture:** All routes must be managed explicitly inside `src/routes/` using `react-router-dom`. Keep path trees clear and enforce client-side page guards programmatically via authentication status selectors.
* **API Integrations:** Never inline raw `fetch` or Axios statements inside components. Put all HTTP requests within standalone functions inside `src/services/`. Always ensure `withCredentials: true` is configured to ensure cross-domain `HttpOnly` cookie passing is handled safely.
* **State Control:** Keep component workspaces lean. Abstract core cross-component features using dedicated custom hooks inside `src/hooks/` or manage them using dedicated states inside `src/context/` (e.g., `AuthContext`).

---

## 3. Core Backend Directives (Fastify + Prisma + Socket.io)

* **Controller Separation:** Keep route registration modules purely configuration-focused. Route modules inside `src/routes/` must map requests directly to standalone execution targets written inside `src/controllers/`.
* **Data Models & Access Layer:** Prisma Client acts as the database management tier. Never write raw SQL statements directly in line. Use explicit TypeScript functions via standard Prisma parameters. Always execute database changes explicitly through `npx prisma migrate dev`.
* **Strict Security & Session Management:** Enforce session protection securely. Implement user validations via `@fastify/jwt` paired with `@fastify/cookie`. Use a custom `preHandler` validation hook inside `src/middleware/` to gracefully block unauthorized inbound API calls with immediate `401` errors.
* **Real-time Event Management:** Socket.io must mount on top of the Fastify server. Use custom cookie parsers during the initial socket connection handshake to identify the active user before establishing communication loops. Keep system messaging real-time by linking webhook events straight to your socket emitters.

---

## 4. Universal Development Guardrails

* **Defensive Error Handling:** Wrap all third-party external integrations (such as Telegram API requests and OpenAI token exchanges) within strict, comprehensive `try / catch` blocks. Log all operational errors explicitly using the built-in Fastify telemetry layers.
* **Phonetic Language Processing Context:** When generating natural language parsers or setting up system prompts, explicitly account for casual, unspaced Khmer script structures and phonetic Khmerlish phrases (e.g., "orkun", "sl mtl", "bos bon"). Use structured JSON outputs from your AI processing engines to ensure consistent structural parsing.
* **Secret Tracking Security:** Never write hardcoded keys, bot tokens, or database credential strings directly inside code files. Read configuration details dynamically from environment variables using a system-level `.env` profile. Add `.env` to your global ignore listings right away.

```
