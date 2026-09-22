# Relationship OS

A shared relationship, outreach and capital-qualification workspace for Paul, Mark and Jonathan.

This repository is the implementation of the Notion specification **Unified Relationship & Outreach Platform — Architecture & Implementation Plan** under the project **Outreach Intelligence System — Capital, Architects & Contractors**.

## Current platform

The feature branch `build/unified-relationship-platform` contains the new platform foundation:

- 216 researched contacts imported from the Notion system:
  - 62 Capital & Deal Network
  - 68 Architects
  - 86 Contractors / Builders
- Equal team access with permanent color attribution for Paul, Mark and Jonathan
- "What's next?" daily command center
- Mobile one-contact-at-a-time deck with swipe navigation
- Desktop contact list + living relationship dossier
- Click-to-call, text and email
- Voice-note capture with browser transcription where available, plus typed transcript fallback
- Chronological relationship timeline
- Tasks, due dates and handoffs
- Next Best Action per contact
- Relationship-depth indicator
- Capital qualification panel:
  - direct principal vs intermediary / broker / introducer
  - decision-maker status
  - entity verification
  - mandate and public size/range
  - proof/capacity status
  - disclosure level
  - NDA and diligence status
  - risk / verification notes
- Disclosure ladder from public-only to data-room stage
- Public professional alignment tags for regenerative / impact / wellness / material-fit research
- Relationship connections and graph view
- One-click working drafts:
  - Handoff Summary
  - Call Brief
  - Proposal Working Brief
  - Pipeline-specific Email Draft
- Document history with confidentiality labels
- Workspace activity log
- Search and filters
- Full JSON backup / restore

## Storage state

The application is currently **local-first**. All relationship updates are persisted in browser storage and can be exported/imported as a complete JSON backup.

The UI already contains a Shared Cloud settings section, but shared cloud sync is intentionally marked **not configured** until a real team backend is connected. Do not treat local browser storage as multi-user synchronization.

A production shared backend should provide:

- authentication / team access
- shared contacts
- interactions
- tasks
- documents metadata + private file storage
- capital qualification
- connections
- audit history
- realtime or near-realtime updates

Supabase/Postgres is a suitable implementation path, but credentials and production access controls must be configured outside GitHub before enabling it.

## Voice

V1 uses the browser's speech-recognition capability when supported. No paid reasoning-model API is required for the core workflow.

The app remains useful without AI:

1. record / dictate or type a relationship note
2. save it to the contact timeline
3. create the next task
4. hand it to the right teammate
5. preserve the complete relationship history

A later AI layer can turn transcripts into suggested structured updates, tasks, dates, capital qualification changes and draft replies. Important changes should remain human-reviewed.

## Deployment

To preview this duplicated repository in Vercel:

1. In Vercel choose **Add New → Project**
2. Import **SacredRebel/Contacts-Dashboard**
3. Framework: **Next.js**
4. Root directory: `./`
5. Deploy

The production metadata sets `robots.index=false`, but the deployment should still use Vercel protection or application authentication before sensitive relationship data is used.

## Development

```bash
pnpm install
pnpm dev
```

Validation:

```bash
pnpm lint
pnpm build
```

## Source files

- `data/relationship-contacts.json` — 216-contact Notion migration seed
- `lib/relationship-types.ts` — shared domain model
- `lib/relationship-store.ts` — local persistence, timeline/task/document helpers and generators
- `app/dashboard.tsx` — unified operating interface
- `app/styles/relationship-*.css` — desktop/mobile UI
- `docs/platform-implementation.md` — architecture and rollout notes

## Operating principle

A beautiful CRM that slows the team down after a call is a failed design.

The successful workflow is:

**Call → quick voice/text note → relationship timeline → exact next action → teammate executes → mark complete.**

Sensitive capital information follows the disclosure gate and human verification process; a reply alone never makes a capital contact qualified.
