# MediBook app

The Sprint 1 journey from `03-build/mvp-boundary.md`: a patient sends his doctor a question between visits, the doctor answers, and the patient confirms it was resolved without a trip.

## Run it locally

1. `npm install` (first time, or after someone adds a package)
2. Copy `.env.example` to `.env.local` and fill in `DATABASE_URL` (ask the team for the Neon connection string). Never commit `.env.local`.
3. `npm run dev`, then open http://localhost:3000

## Where things go

| What | Where |
|---|---|
| Patient page (`/p/[token]`) | `app/p/[token]/page.tsx` |
| Doctor page (`/d/[token]`) | `app/d/[token]/page.tsx` |
| Server routes | `app/api/.../route.ts` |
| Database connection | `lib/db.ts` (`import { sql } from "@/lib/db"`) |

Event names are copied from `03-build/analytics/event-schema.md`, never retyped. Setup steps: `PDFSE-F26/Lab-6/setup/SHIP-STACK-SETUP.md`.
