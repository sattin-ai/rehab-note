# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project status

Freshly scaffolded with `create-next-app`; `app/page.tsx` and `app/layout.tsx` are still the template. The product spec lives in `requirements.md` (Japanese) — read it before building features. It is the source of truth for scope, screens, and data fields.

## Commands

- `npm run dev` — dev server at http://localhost:3000
- `npm run build` — production build (also type-checks)
- `npm run lint` — ESLint (flat config, `eslint-config-next` core-web-vitals + typescript)
- No test framework is set up yet.

## Stack and config notes

- Next.js 16.4 (App Router) + React 19.3 + TypeScript (strict) + Tailwind CSS v4. Per AGENTS.md, check `node_modules/next/dist/docs/` before using Next.js APIs — don't rely on memory.
- `next.config.ts` enables `cacheComponents`, `partialPrefetching`, and `experimental.agentFeedback`. With Cache Components on, dynamic data access must be wrapped in `<Suspense>` or cached with `"use cache"`.
- Tailwind v4 is wired through Turbopack: `*.css` files go through the `@tailwindcss/turbopack` loader (configured in `next.config.ts`, not PostCSS). Theme tokens are defined via `@theme inline` in `app/globals.css`.
- Layouts use the global `LayoutProps<"/">` / `PageProps` route-typed helpers (generated types), not hand-written prop types.
- Import alias: `@/*` → repo root.

## Product: リハビリ運動ノート (rehab exercise notebook)

Single-user mobile-first app for recording exercises taught by a physical therapist (photo, name, instructions, target muscles, muscles prone to compensation, duration) and picking a "today's set" with a total time.

Planned (not yet installed) backend: **Supabase Auth** (email + password) and **Supabase Storage** for photos, deployed on **Vercel** free tier. Data and photos must be visible only to the logged-in owner (use RLS / private storage).

Fixed MVP screens — the spec deliberately limits the app to these five:

| Route | Screen |
|---|---|
| `/` | Exercise list: 3-column photo tile grid with names, select for today's set, + add button |
| `/exercises/[id]` | Exercise detail (all fields, large photo), edit button |
| `/exercises/[id]/edit` | Edit form (replace photo, save, delete) |
| `/exercises/new` | Add form — shares the same form component as edit |
| `/today` | Today's selected exercises + total duration; tap through to detail |

Key constraints from the spec:
- Large text, and **never disable pinch-zoom** (no `maximum-scale` / `user-scalable=no` in the viewport).
- Compress photos on upload; list page should render within 3s.
- Out of scope for MVP: the app giving exercise advice, rep/condition logging, photo markup, basic-vs-homework tags, calendar, video, auto-suggested sets. Don't add screens beyond the five above.
## 作業ルール
- 実装の前に Plan Mode で計画を出し、承認を得てから実装する
- 1機能ずつ実装し、そのたびに本番（Vercel）で動作確認する
- 説明は日本語で、初心者にもわかるようにかんたんに書く
- 要件は requirements.md を正とする。書かれていない機能は追加しない