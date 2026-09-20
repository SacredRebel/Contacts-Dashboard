# Research batches and manual review

Use `python scripts/research_contacts.py candidates.json evidence.json` to inspect explicitly supplied public pages. Each candidate needs a `name` and `url`; a `lane` field is optional. The script records source URL, timestamp, visible text and published emails. It does not guess addresses, crawl linked pages or send mail. Review the output manually: old addresses, placeholders and unrelated footer contacts can appear in public HTML.

The email extraction expression is adapted from Kremilly/Linkscraper's MIT-licensed scraper. Its full license is retained under `vendor/linkscraper/LICENSE`. Other workflow ideas are independently implemented; this repository does not bundle every project from the repository audit.

Export an array of `Opportunity` objects from `lib/types.ts`. Use **Import research** in the dashboard. Files may contain up to 500 entries and be at most 5 MB. The import rejects repeated business names, website hosts, email addresses or IDs, including repetitions within a batch. Imported entries always return to Review and lose imported approval/send timestamps. Existing records retain their history. Corrupted local data is preserved instead of silently replaced.

Each research record should include a directly published contact and source, an observed fact, a separately labeled inference, a relevant portfolio example, and a draft. `portfolioTool`, `demoUrl` and `campaign` preserve the research grouping. Tool filters help compare experiments.

Current portfolio lanes are Work Logger, Daily Logger, Product motion and Property walkthrough. Daily Logger is a local-first prototype; hosted phone capture, shared team access and integrations are future scope. Do not promise these as working features. Reuse a tool across multiple relevant businesses while writing a specific observation and proposed use for each.

Approval still only saves local review status. Gmail is not connected. No imported record is approved or sent automatically. Record actual sends separately; an approval is not a send. Data is stored in this browser and should be exported regularly.

Regression check: `node scripts/verify-review-import.mjs /absolute/path/to/monday-50-import.json`. The optional campaign argument also checks all 50 drafts against the production quality gates.

Research-only daily scheduling is maintained by the external ChatGPT task, not an in-app cron. The app therefore does not claim a next scheduled research run.
