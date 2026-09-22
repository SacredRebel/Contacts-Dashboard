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

### Document and outreach actions

Current local generators:

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

Drafts are editable before use and can be saved back to the contact record.

Saved email drafts appear in the **Outreach** send queue. The team can open the reviewed draft in their mail client and explicitly mark it sent so the contact timeline and relationship stage update without pretending the dashboard sent it automatically.

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

### Local persistence and portability

Browser storage is the current running persistence layer.

Full workspace JSON export/import includes structured relationship data, not merely contact rows. CSV export is available for spreadsheet review, cleanup and handoff.

**Shared database work is intentionally deferred.** The present build prioritizes the daily operating workflow before infrastructure.

## External services that can be added later

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

## Current rollout priority

1. Deploy the repository as a protected preview.
2. Test the mobile swipe/contact workflow with Mark.
3. Test Jonathan’s task → draft → send → mark-done workflow.
4. Test Paul’s quick-add / research / Day 0 outreach workflow.
5. Use the Outreach queue for real reviewed emails.
6. Use JSON backups routinely while the system remains local-first.
7. Use CSV exports for cleanup, review and external spreadsheet work.
8. Connect a mailbox only when the team wants verified thread-level sending and reply ingestion.
9. Revisit a shared backend later only if the three-person workflow proves it is worth the infrastructure.
