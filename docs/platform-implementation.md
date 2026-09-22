# Platform implementation map

Source specification in Notion:

**Outreach Intelligence System — Capital, Architects & Contractors → Unified Relationship & Outreach Platform — Architecture & Implementation Plan**

Notion page:
https://app.notion.com/p/3e3220cef63881d6899df51a3ad7c842

## What is implemented in the feature branch

### Shared domain model

`lib/relationship-types.ts` models:

- team members and permanent attribution colors
- three pipelines
- relationship stages
- interactions
- tasks
- documents + confidentiality
- contact-to-contact connections
- capital qualification
- contact dossier
- workspace snapshot

### Initial contact migration

`data/relationship-contacts.json` contains the 216 researched Notion contacts.

The source fields are intentionally preserved as structured fields rather than flattened into one notes blob.

### Daily UI

- Today / What's Next
- due + overdue tasks
- What Changed since last visit
- capital watch
- pipeline counts
- team attribution

### Contact UX

Desktop:
- filterable list on left
- full contact dossier on right

Mobile:
- one contact at a time
- previous/next buttons
- horizontal swipe gesture
- direct Call / Text / Email
- voice-note button
- next action above deep details

### Relationship history

Each contact stores:

- interactions
- tasks
- generated documents
- relationship connections
- capital profile where applicable

Timeline entries are timestamped and attributed to Paul, Mark or Jonathan.

### Voice V1

The client tries the browser speech-recognition capability first.

If unavailable, the same modal supports pasted/typed transcript text.

The core relationship workflow therefore does not depend on a paid AI API.

### Capital controls

The capital panel includes:

- capital type
- direct vs intermediary
- actual decision-maker status
- entity check
- mandate
- public size/range
- capacity / proof status
- disclosure level
- NDA status
- diligence status
- risk notes

This is designed around the rule that a responsive person is not automatically qualified capital.

### Document actions

Current local generators:

- Handoff Summary
- Call Brief
- Proposal Working Brief
- Pipeline-specific email draft

Drafts are editable before use and can be saved back to the contact record.

### Relationship network

Contact connections can be logged and viewed as a network.

Initial relationship types include:

- introduced
- referred
- represents
- broker for
- works with
- partner
- architect for
- contractor for

### Local persistence

Browser storage is the current running persistence layer.

Full workspace export/import includes structured relationship data, not merely contact rows.

## External services still required for true production multi-user operation

These capabilities cannot be made genuinely shared merely by adding UI code. They require a configured external service or authenticated account.

### Shared database + file storage

The repository includes a proposed SQL schema in `docs/shared-backend-schema.sql`.

When a shared backend is connected:

- replace local-only persistence with authenticated shared persistence
- migrate current local snapshots into shared tables
- add private file object storage
- add realtime updates
- preserve a local export/backup option

### Email provider connection

Current behavior can open a mail client and preserve generated drafts in the contact file.

Production email integration should later add:

- authenticated mailbox
- draft creation
- thread ID storage
- sent-message verification
- reply ingestion
- unsubscribe / do-not-contact state
- same-thread follow-up
- explicit human approval policy

### AI extraction

Later model-backed features can suggest:

- structured updates from voice notes
- tasks
- follow-up dates
- capital qualification changes
- draft replies
- next-best-action

Important record changes remain reviewable.

## Recommended shared-backend rollout

1. Deploy and review the feature branch as a protected preview.
2. Validate mobile contact deck with Mark.
3. Validate Jonathan task/handoff workflow.
4. Validate Paul quick-add/research workflow.
5. Create a shared database project.
6. Apply `docs/shared-backend-schema.sql`.
7. Add authentication for the three team members.
8. Migrate the 216-contact seed and any new local activity.
9. Add private document storage.
10. Connect email only after team workflow is stable.
