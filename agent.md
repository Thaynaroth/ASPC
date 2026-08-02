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

---

## 5. Frontend Design System: "Sketchbook" Hand-Drawn Style (MANDATORY)

The ASPC frontend uses a cohesive hand-drawn / sketch-on-paper design language. Every new UI must follow this system — do not introduce flat, corporate, or "shadcn default" styling.

### 5.1 Design Tokens (defined in `frontend/src/index.css` — never hardcode raw colors in components)

* **Palette:** Warm paper tones. Use the theme variables (`bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`, `bg-primary`, ...) — they map to warm cream paper, paper-white cards, warm brown ink, and tan accents. Both `:root` (light) and `.dark` (warm dark paper) variants exist and must stay in sync.
* **Do NOT** reintroduce cold colors (indigo, zinc, gray, blue) for the brand; the accent is warm brown ink. Colorful pastel tints (sky/violet/emerald/etc.) are allowed only for small icon tiles / status accents, as in `Dashboard.tsx`.
* **Radius:** use the theme radius (cards `rounded-xl`, inputs/buttons `rounded-lg`). Do not use sharp `rounded-none` or oversized radii.

### 5.2 Typography

* `font-hand` (Kalam) — handwritten font. Use ONLY for: brand wordmark (sidebar "ASPC", login panel), page-level titles / big greetings (dashboard h1, placeholder titles, login headline), and decorative headings. Never use it for body text, labels, buttons, or table content.
* `font-sans` (Nunito) — default body font. Body copy, buttons, inputs, sidebar items, table text.
* Always keep `"Noto Sans Khmer"` in font stacks for Khmer (km) locale support.
* Titles should use `font-bold` + `tracking-tight` with `font-hand`; reserve large sizes (text-2xl+) for hand titles.

### 5.3 Paper Texture & Icon Wobble (global, do not remove)

* `body` in `index.css` carries the paper-grain background image (SVG noise data-URI). Never set a flat solid `background` on page-level containers that hides it.
* `svg.lucide` has `filter: url(#hand-rough)` — a turbulence displacement filter defined in a hidden `<svg>` in `index.html`. Every lucide icon renders slightly wobbly (hand-inked). Never override `filter` on lucide icons except to add transforms.
* When creating new icons/SVGs for the brand, use the same rough-stroke technique (displacement filter or double draft strokes) — never crisp geometric strokes.

### 5.4 Borders & Surfaces

* Cards (`components/ui/card.tsx`) use `border-2 border-dashed` (pen-stroke outline) + `shadow-sm`. Never replace with solid `ring-*` borders on cards.
* Inputs and outline buttons are also dashed (`border-2 border-dashed`). Default buttons stay solid ink (`bg-primary`) like a marker stroke.
* Quick-access / tile cards may alternate a slight tilt (`-rotate-1` / `rotate-1`) for a sticky-note feel, as in `Dashboard.tsx`.


### 5.6 Implementation Checklist for New Screens

1. Page container: `bg-background` (paper shows through) — do not paint over it.
2. Cards: use the `Card` primitives (inherit dashed border + shadow). For custom tiles, copy the dashed style from Dashboard quick-access cards.
3. Titles: `font-hand text-2xl/3xl font-bold tracking-tight`; body text `font-sans text-sm`.
4. Icons: lucide only (auto-wobble). Color icon tiles with pastel tint + `ring-1` like Dashboard modules.
5. Respect dark mode: use theme tokens only, verify both palettes.
6. No flat white panels, no solid gray, no ring-styled cards, no Inter/Roboto fonts.

```
