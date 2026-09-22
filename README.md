# Relationship OS

A shared relationship, outreach and capital-qualification workspace for Paul, Mark and Jonathan.

This repository implements the Notion specification **Unified Relationship & Outreach Platform — Architecture & Implementation Plan** under **Outreach Intelligence System — Capital, Architects & Contractors**.

## Current platform

Main now includes:

- 216 researched contacts imported from Notion:
  - 62 Capital & Deal Network
  - 68 Architects
  - 86 Contractors / Builders
- Equal core-team access model with permanent Paul / Mark / Jonathan color attribution
- "What's next?" daily command center
- Mobile one-contact-at-a-time deck with swipe navigation
- Mobile contact browser / queue picker
- Desktop contact list + living relationship dossier
- Call / text / email shortcuts
- Voice-note capture with browser transcription where available and typed transcript fallback
- Chronological relationship timeline
- Tasks, assignments, due dates and handoffs
- Next Best Action
- Relationship-depth indicator
- Last-interaction attribution near the top of each contact
- Important-warning context surfaced prominently
- Pipeline-specific relationship stages
- Capital qualification:
  - direct vs intermediary / broker / introducer
  - decision-maker status
  - entity verification
  - mandate and public size/range
  - capacity / proof status
  - disclosure level
  - NDA and diligence
  - risk / verification notes
- Five-step disclosure ladder
- Regenerative / impact / material-fit professional context
- Relationship connections + graph
- Working generators:
  - Handoff Summary
  - Call Brief
  - Meeting Notes
  - Proposal Working Brief
  - Day 0 Email
  - Day 3 Follow-up
  - Day 10 Close-the-loop
  - Capital Due-Diligence Request
  - Public Teaser Package
  - Architect / Contractor Information Pack
- Explicit sent-email logging
- Document history with confidentiality labels
- Workspace activity log
- Search across identity, research notes, interaction summaries/transcripts and saved document content
- Operational filters:
  - due today
  - overdue
  - assigned to me
  - high priority
  - direct capital
  - intermediary
  - dormant
- Full JSON backup / restore

## Storage

The app is intentionally **local-first** for now.

Relationship data persists in browser storage and can be:

- exported as a complete JSON backup;
- restored from JSON;
- exported as CSV for spreadsheet review, contact cleanup or team handoff.

Supabase / shared-database work is currently **skipped**. The current focus is making the operating workflow useful first: contact depth, outreach drafts, send queue, tasks, documents, verification and relationship history.

## Email state

Relationship OS currently:

- creates pipeline-specific email drafts;
- opens the user’s mail client;
- lets the team explicitly log an email as sent;
- preserves that action in the relationship timeline.

A real mailbox connection is still required for thread IDs, verified sent state, reply ingestion, inbox monitoring and same-thread follow-up automation. External sending remains human-controlled until that connection is configured.

## Voice

V1 uses browser speech recognition when supported and does not require a paid reasoning-model API.

Core workflow:

1. record / dictate or type a relationship update;
2. save it to the contact timeline;
3. create the next task;
4. hand it to the right teammate;
5. execute and mark complete.

A later AI layer can turn transcripts into reviewable suggestions for structured updates, tasks, dates, capital qualification and reply drafts.

## Deployment

This repository is not currently attached to a Vercel project.

To deploy:

1. Vercel → **Add New → Project**
2. Import **SacredRebel/Contacts-Dashboard**
3. Framework: **Next.js**
4. Root directory: `./`
5. Use Vercel protection or application authentication before real sensitive relationship data is used.
6. Deploy.

No database environment variables are required for the current local-first version.

The app metadata sets `robots.index=false`.

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

## Source map

- `data/relationship-contacts.json` — 216-contact Notion migration seed
- `lib/relationship-types.ts` — domain model
- `lib/relationship-store.ts` — local persistence, relationship helpers, generators, backups and CSV export
- `app/dashboard.tsx` — unified operating interface
- `app/styles/relationship-*.css` — desktop/mobile UI
- `docs/platform-implementation.md` — architecture / rollout map
- `docs/shared-backend-schema.sql` — normalized long-term backend schema

## Operating principle

A beautiful CRM that slows the team down after a call is a failed design.

**Call → quick voice/text note → relationship timeline → exact next action → teammate executes → mark complete.**

For capital, a responsive person is not automatically qualified capital. Disclosure and verification remain explicit, reviewable human decisions.
