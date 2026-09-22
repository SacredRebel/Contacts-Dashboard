# Relationship OS — Daily Operating Workflow

This is the practical operating loop for Paul, Mark and Jonathan.

The system is intentionally local-first for the current stage. Supabase and shared-database work are deferred.

## Core rule

Every meaningful relationship event should end in one of three things:

1. a timeline update;
2. a concrete next action;
3. a reviewed document / email that someone can execute.

If an interaction does not produce any of those, the relationship file is probably incomplete.

## Paul — lead intake and first outreach

### Add / enrich

For each new lead:

- identify the person and organization;
- choose Capital, Architect or Contractor;
- use a published contact route only;
- save the public observation;
- save the exact outreach hook;
- capture professional themes / material fit;
- record warnings rather than hiding uncertainty.

### Ready-to-draft gate

A contact appears in **Outreach → Ready to draft** only when:

- a usable email exists;
- the email route is not marked unverified / no-published-email / failed deep search;
- a public observation exists;
- an outreach hook exists;
- the relationship is not on hold or inactive.

Use **Create Day 0** to generate the first draft.

This creates a draft only. It does not send anything.

## Jonathan — review, approval and sending

### Outreach queue

The **Outreach** page is the daily send desk.

Each unsent saved email appears in **Drafts waiting**.

For each draft:

1. open **Edit draft**;
2. improve the message if necessary;
3. save it;
4. approve it;
5. open it in the normal mail client;
6. send from the mailbox;
7. return to Relationship OS and click **Mark sent**.

Editing a previously approved draft automatically resets approval.

### Why approval is explicit

Approval separates:

- AI / template generation;
- human review;
- the actual sending decision.

No email should be treated as sent merely because a draft exists.

## Automatic Day 3 / Day 10 follow-up loop

When a Day 0 email is marked sent:

- the contact moves to Contacted if it was still in an early stage;
- the send is written to the relationship timeline;
- a Day 3 outreach task is created automatically;
- the contact Next Action becomes the Day 3 follow-up.

When the Day 3 email is marked sent:

- the Day 3 task is completed;
- a Day 10 task is created automatically.

When Day 10 is marked sent:

- the Day 10 task is completed;
- no further automatic outreach task is created.

Due follow-ups appear in **Outreach → Follow-ups due**.

Use **Draft Day 3** or **Draft Day 10**, review, approve, send and mark sent.

## Mark — calls, qualification and relationship depth

Immediately after a meaningful call:

1. open the contact;
2. tap **Voice note**;
3. dictate the facts, requests, commitments and concerns;
4. save the note to the timeline;
5. create the concrete follow-up task;
6. generate a Call Brief / Meeting Notes / Handoff / Proposal Working Brief when needed.

A good post-call note should capture:

- what the person actually said;
- what they asked for;
- who they represent;
- who controls the decision;
- documents requested;
- commitments made;
- timing;
- unresolved questions;
- the exact next action.

## Capital-specific workflow

A responsive capital contact is not automatically qualified capital.

Before increasing disclosure, document:

- capital type;
- direct principal vs broker / introducer / representative;
- actual decision-maker status;
- entity verification;
- mandate;
- transaction size / range;
- appropriate capacity / proof status;
- NDA status;
- diligence status;
- warnings / risk flags.

Use the disclosure ladder:

1. Public only
2. Public teaser
3. Selected transaction information
4. Confidential proposal
5. Data room

The system includes working generators for:

- Capital Due-Diligence Request
- Public Teaser Package
- Call Brief
- Handoff Summary
- Proposal Working Brief

These are working drafts and still require transaction-specific human review.

## Architects and contractors

Use the public professional context and material-fit fields to keep outreach specific.

The system includes an **Information Pack** working generator for:

- material / sourcing fit;
- RFQ route;
- relevant product categories;
- logistics / lead-time questions;
- next-step framing.

## Tasks and handoffs

Every task has:

- a contact;
- an assignee;
- a creator;
- an optional due date;
- status;
- timeline context.

The color system remains:

- Paul — permanent Paul color
- Mark — permanent Mark color
- Jonathan — permanent Jonathan color

The colors indicate who acted; they do not restrict access.

## Documents

Generated and attached documents remain inside the contact file.

The Documents page supports:

- search;
- confidentiality filtering;
- quick return to the relationship record.

Use confidentiality labels deliberately:

- Public
- Internal
- Confidential
- Restricted

## Relationship network

When someone introduces, represents or refers another person, record the relationship link.

The graph can be filtered by connection type.

This prevents the team from losing:

- introducer chains;
- broker relationships;
- referral paths;
- architect / contractor associations;
- repeat relationship context.

## Backups

Because the current build is local-first:

- export a full JSON backup routinely;
- JSON is the restorable source;
- CSV is for spreadsheet review / cleanup / portability;
- importing JSON replaces the working local snapshot.

A practical cadence is to export JSON after a meaningful outreach or diligence session.

## What the app does not currently pretend to do

It does not currently claim to:

- synchronize three browsers in realtime;
- verify that an email actually left Gmail;
- ingest replies automatically;
- create a secure shared data room;
- replace legal / financial diligence;
- infer private beliefs or affiliations.

Those can be considered later only if the real workflow proves they are worth adding.
