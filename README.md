# Paul’s Outreach Command Center

A focused research and approval dashboard for turning business research into thoughtful, evidence-backed client outreach.

## What works now

- Review 10 preloaded prospect opportunities
- Search and filter the research inbox
- Inspect evidence, observations and inferences separately
- Run a nine-point quality gate before approval
- Edit subjects, email drafts and reviewer notes
- Approve only drafts that pass every hard gate
- Track researched, ready, approved, sent and replied counts
- Prevent duplicate business names and websites during imports
- Export the complete workspace as a JSON backup
- Keep all changes in the current browser with `localStorage`

Gmail is deliberately disconnected. Approving a draft adds it to the safe send queue; it does not send email.

## Deploy on Vercel

1. Open the repository in GitHub.
2. In Vercel, select **Add New → Project**.
3. Import `SacredRebel/email-outreach`.
4. Keep the detected framework as **Next.js**.
5. Leave the root directory as `./` and deploy.

No environment variables or build overrides are required for this version.

## Local development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Production verification:

```bash
pnpm lint
pnpm build
```

## Storage and privacy

This first Vercel version stores edits and approvals in the browser that opened the dashboard. That gives the MVP immediate persistence without exposing a database or requiring account setup.

Important consequences:

- Use the **Export backup** button regularly.
- Data does not automatically appear on another browser or device.
- Clearing site data resets the browser copy to the included sample opportunities.
- A public Vercel deployment can be opened by anyone with the URL, although each browser has its own local copy.

Before loading private client data, enable Vercel deployment protection or add application authentication.

## Next production layer

The repository is intentionally ready for the next controlled integrations:

1. Add authenticated cloud storage for cross-device access.
2. Add Gmail OAuth with a dedicated business mailbox.
3. Send one self-test email.
4. Keep manual approval as the only send trigger.
5. Add same-thread follow-ups, unsubscribe suppression and reply tracking.

Never commit Gmail credentials, OAuth tokens or Vercel secrets to this repository.

## Quality gate

Approval requires:

1. A published contact address with its source
2. At least one public research source
3. Separate fact and inference fields
4. A one-to-four-word subject
5. A 50–100-word message
6. Exactly one direct link
7. No more than one low-friction question
8. Clear opt-out language
9. No common spam or automation phrases

## Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Radix UI
- Sonner notifications
