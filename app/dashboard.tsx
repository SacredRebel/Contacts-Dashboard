"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, Check, ChevronRight, CircleAlert, Clock3, Download, ExternalLink,
  FilePenLine, Inbox, Mail, MessageSquareReply, RefreshCw, Search, Send,
  ShieldCheck, Sparkles, Target, Upload, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import type { Opportunity, OpportunityStatus } from "@/lib/types";
import { getQualityChecks, isReady, personalizationTier, safeSources } from "@/lib/outreach-quality";
import {
  downloadOpportunities,
  importOpportunities,
  loadOpportunities,
  saveOpportunities,
} from "@/lib/local-outreach-store";

type Filter = "all" | "ready" | "review" | "approved" | "sent" | "replied";

const statusLabel: Record<OpportunityStatus, string> = {
  research: "Researching", review: "Review", needs_edit: "Needs edit",
  approved: "Approved", sent: "Sent", replied: "Replied", won: "Client", archived: "Archived",
};

const statusClass: Record<OpportunityStatus, string> = {
  research: "status-neutral", review: "status-review", needs_edit: "status-edit",
  approved: "status-approved", sent: "status-sent", replied: "status-replied",
  won: "status-won", archived: "status-neutral",
};

function dateLabel(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function workflowPosition(status: OpportunityStatus) {
  if (status === "research") return 0;
  if (["review", "needs_edit"].includes(status)) return 3;
  if (status === "approved") return 4;
  if (status === "sent") return 5;
  if (["replied", "won"].includes(status)) return 6;
  return 0;
}

export function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [today, setToday] = useState("Today");
  const [portfolioTool, setPortfolioTool] = useState("all");
  const fileInput = useRef<HTMLInputElement>(null);

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 5_000_000) throw new Error("Choose a research file smaller than 5 MB.");
      const incoming = JSON.parse(await file.text());
      const current = loadOpportunities();
      const result = importOpportunities(current, incoming);
      setOpportunities(result.opportunities);
      setSelectedId(result.created[0]?.id ?? result.opportunities[0]?.id ?? "");
      setFilter("review");
      setQuery("");
      setPortfolioTool("all");
      toast.success(`${result.created.length} drafts imported`, { description: `${result.skipped} duplicate or invalid records skipped. Nothing approved or sent.` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not import this research file.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const load = useCallback(() => {
    setLoading(true);
    try {
      const stored = loadOpportunities();
      setOpportunities(stored);
      setSelectedId((current) => current || stored.find((item) => item.status === "review")?.id || stored[0]?.id || "");
      setToday(new Intl.DateTimeFormat("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      }).format(new Date()));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load the research inbox.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const selected = opportunities.find((item) => item.id === selectedId) ?? opportunities[0];

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      setSubject(selected.subject);
      setBody(selected.emailBody);
      setNote(selected.reviewerNote);
      setEditing(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const patchOpportunity = useCallback(async (id: string, patch: Record<string, string | null>) => {
    setSaving(true);
    try {
      const current = opportunities.find((item) => item.id === id);
      if (!current) throw new Error("Opportunity not found.");
      const updated = { ...current, ...patch, updatedAt: new Date().toISOString() } as Opportunity;

      if (patch.status === "approved" && !isReady(updated)) {
        const blockers = getQualityChecks(updated)
          .filter((check) => check.blocking && !check.pass)
          .map((check) => check.label);
        throw new Error(`Quality gate failed: ${blockers.join(", ")}.`);
      }

      const next = opportunities.map((item) => item.id === id ? updated : item);
      saveOpportunities(next);
      setOpportunities(next);
      return updated;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save this change.");
      throw error;
    } finally { setSaving(false); }
  }, [opportunities]);

  useEffect(() => {
    const context = (document as unknown as { modelContext?: { registerTool: (tool: unknown, options?: { signal?: AbortSignal }) => void | Promise<void> } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    const register = async () => {
      await context.registerTool({
        name: "list_outreach_opportunities", title: "List outreach opportunities",
        description: "Read the visible outreach queue, including score, status, contact, offer, and email draft.",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true }, execute: async () => ({ opportunities }),
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "approve_outreach_opportunity", title: "Approve outreach opportunity",
        description: "Approve one reviewed opportunity. When Gmail is disconnected this stages the email and does not send it.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const id = (input as { id?: string }).id;
          const target = opportunities.find((item) => item.id === id);
          if (!id || !target) throw new Error("Unknown opportunity id.");
          const blockers = getQualityChecks(target).filter((check) => check.blocking && !check.pass);
          if (blockers.length) throw new Error(`Quality gate failed: ${blockers.map((check) => check.label).join(", ")}.`);
          const opportunity = await patchOpportunity(id, { status: "approved", approvedAt: new Date().toISOString() });
          return { id, status: opportunity.status, sent: false, reason: "Gmail is not connected." };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "inspect_outreach_quality", title: "Inspect outreach quality",
        description: "Run the evidence, contact, copy, link, opt-out, and plain-language checks for one opportunity before approval.",
        inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"], additionalProperties: false },
        annotations: { readOnlyHint: true, untrustedContentHint: true },
        execute: async (input: unknown) => {
          const id = (input as { id?: string }).id;
          const target = opportunities.find((item) => item.id === id);
          if (!target) throw new Error("Unknown opportunity id.");
          const checks = getQualityChecks(target);
          return { id, ready: isReady(target), checks, personalization: personalizationTier(target) };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "import_outreach_opportunities", title: "Import researched opportunities",
        description: "Add a completed research batch to the review inbox. Duplicate business names and websites are skipped.",
        inputSchema: {
          type: "object",
          properties: {
            opportunities: {
              type: "array", maxItems: 500,
              items: {
                type: "object",
                properties: { businessName: { type: "string" }, website: { type: "string" } },
                required: ["businessName"], additionalProperties: true,
              },
            },
          },
          required: ["opportunities"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: true },
        execute: async (input: unknown) => {
          const batch = (input as { opportunities?: unknown[] }).opportunities;
          if (!Array.isArray(batch) || batch.length === 0) throw new Error("No opportunities supplied.");
          const result = importOpportunities(opportunities, batch);
          setOpportunities(result.opportunities);
          return { imported: result.created.length, skipped: result.skipped };
        },
      }, { signal: lifecycle.signal });
      await context.registerTool({
        name: "revise_outreach_opportunity", title: "Revise outreach draft",
        description: "Replace the subject and email copy after the reviewer requests an edit, then return it to review.",
        inputSchema: {
          type: "object",
          properties: {
            id: { type: "string" }, subject: { type: "string" }, emailBody: { type: "string" }, reviewerNote: { type: "string" },
          },
          required: ["id", "subject", "emailBody"], additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        execute: async (input: unknown) => {
          const revision = input as { id?: string; subject?: string; emailBody?: string; reviewerNote?: string };
          if (!revision.id || !opportunities.some((item) => item.id === revision.id)) throw new Error("Unknown opportunity id.");
          const opportunity = await patchOpportunity(revision.id, {
            subject: revision.subject ?? "", emailBody: revision.emailBody ?? "",
            reviewerNote: revision.reviewerNote ?? "", status: "review",
          });
          return { id: opportunity.id, status: opportunity.status, subject: opportunity.subject };
        },
      }, { signal: lifecycle.signal });
    };
    void register().catch(() => undefined);
    return () => lifecycle.abort();
  }, [opportunities, patchOpportunity]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return opportunities.filter((item) => {
      const text = [item.businessName, item.industry, item.location, item.offerTitle, item.signalType, item.portfolioTool, item.campaign].join(" ").toLowerCase();
      const matchesFilter = filter === "all"
        || (filter === "ready" && isReady(item) && ["review", "needs_edit"].includes(item.status))
        || (filter === "review" && ["research", "review", "needs_edit"].includes(item.status))
        || (filter === "approved" && item.status === "approved")
        || (filter === "sent" && ["sent", "replied", "won"].includes(item.status))
        || (filter === "replied" && ["replied", "won"].includes(item.status));
      return (!needle || text.includes(needle)) && matchesFilter && (portfolioTool === "all" || item.portfolioTool === portfolioTool);
    });
  }, [filter, opportunities, query, portfolioTool]);

  const metrics = useMemo(() => ({
    researched: opportunities.length,
    ready: opportunities.filter((item) => isReady(item) && ["review", "needs_edit"].includes(item.status)).length,
    review: opportunities.filter((item) => ["research", "review", "needs_edit"].includes(item.status)).length,
    approved: opportunities.filter((item) => item.status === "approved").length,
    sent: opportunities.filter((item) => ["sent", "replied", "won"].includes(item.status)).length,
    replies: opportunities.filter((item) => ["replied", "won"].includes(item.status)).length,
  }), [opportunities]);

  const approve = async () => {
    if (!selected) return;
    const blockers = getQualityChecks(selected).filter((check) => check.blocking && !check.pass);
    if (blockers.length) {
      toast.error("This draft is not ready to approve", { description: `Fix: ${blockers.map((check) => check.label).join(", ")}.` });
      return;
    }
    const opportunity = await patchOpportunity(selected.id, { status: "approved", approvedAt: new Date().toISOString() });
    toast.success(`${opportunity.businessName} approved`, { description: "Added to the safe send queue. Nothing was sent because Gmail is disconnected." });
  };

  const qualityChecks = selected ? getQualityChecks(selected, editing ? subject : selected.subject, editing ? body : selected.emailBody) : [];
  const qualityScore = qualityChecks.filter((check) => check.pass).length;
  const ready = selected ? isReady(selected, editing ? subject : selected.subject, editing ? body : selected.emailBody) : false;
  const researchTier = selected ? personalizationTier(selected) : { tier: 1, label: "profile-based" };
  const currentStep = selected ? workflowPosition(selected.status) : 0;
  const workflowSteps = ["Research", "Verify", "Draft", "Review", "Approve", "Send", "Reply"];

  const saveEdit = async () => {
    if (!selected) return;
    await patchOpportunity(selected.id, { subject, emailBody: body, reviewerNote: note, status: "needs_edit", approvedAt: null });
    setEditing(false);
    toast.success("Edit request saved", { description: "The opportunity is marked for another writing pass." });
  };

  return (
    <>
      <Toaster position="bottom-right" richColors />
      <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-lockup"><div className="brand-mark">PM</div><div><strong>Outreach</strong><span>Command center</span></div></div>
        <nav className="side-nav" aria-label="Dashboard sections">
          <button className={["all", "review", "ready"].includes(filter) ? "active" : ""} onClick={() => setFilter("review")}><Inbox />Research inbox<span>{metrics.review}</span></button>
          <button className={["approved", "sent"].includes(filter) ? "active" : ""} onClick={() => setFilter("sent")}><Target />Pipeline<span>{metrics.sent}</span></button>
          <button className={filter === "replied" ? "active" : ""} onClick={() => setFilter("replied")}><MessageSquareReply />Replies<span>{metrics.replies}</span></button>
        </nav>
        <div className="side-card">
          <div className="side-card-head"><Sparkles /><span>Daily research</span></div>
          <strong>Your review queue</strong><p>Import researched batches, compare offers and approve each draft.</p>
          <div className="next-run"><Clock3 />Sending requires your approval</div>
        </div>
        <div className="sidebar-foot"><button onClick={() => downloadOpportunities(opportunities)}><Download />Export backup</button><span>Saved in this browser</span></div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">{today}</p><h1>Research inbox</h1></div>
          <div className="top-actions">
            <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Import research JSON" onChange={(event) => void importFile(event.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload />Import research</Button>
            <Dialog>
              <DialogTrigger asChild><Button variant="outline" className="connection-button"><WifiOff />Gmail disconnected</Button></DialogTrigger>
              <DialogContent className="connect-dialog">
                <DialogHeader><DialogTitle>Connect the sending layer</DialogTitle><DialogDescription>Research and approval already work. Gmail remains locked until your business mailbox is connected and tested.</DialogDescription></DialogHeader>
                <div className="connect-steps">
                  <div><span>1</span><p><strong>Prepare the sending identity</strong>Use the approved business mailbox and confirm SPF, DKIM and DMARC.</p></div>
                  <div><span>2</span><p><strong>Send one test to yourself</strong>Verify plain text, direct links, threading and the exact From address.</p></div>
                  <div><span>3</span><p><strong>Unlock approved sending</strong>Only quality-gated drafts and your click can release an email.</p></div>
                </div>
                <div className="safe-note"><ShieldCheck />No background sending. No guessed emails. No send without approval.</div>
                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="icon" onClick={load} aria-label="Refresh research"><RefreshCw /></Button>
          </div>
        </header>

        <section className="metrics" aria-label="Outreach metrics">
          <Metric label="Researched" value={metrics.researched} note="saved opportunities" />
          <Metric label="Ready" value={metrics.ready} note="all hard gates pass" accent />
          <Metric label="Needs review" value={metrics.review} note="your decision" />
          <Metric label="Approved" value={metrics.approved} note="safe send queue" />
          <Metric label="Sent" value={metrics.sent} note="tracked contacts" />
          <Metric label="Replies" value={metrics.replies} note={metrics.sent ? `${Math.round((metrics.replies / metrics.sent) * 100)}% reply rate` : "no sends yet"} positive />
        </section>

        <section className="command-grid">
          <div className="queue-panel">
            <div className="queue-tools">
              <div className="search-box"><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search businesses, niches, offers…" /></div>
              <select aria-label="Filter by portfolio tool" value={portfolioTool} onChange={(event) => setPortfolioTool(event.target.value)} className="tool-filter">
                <option value="all">All portfolio tools</option>
                {[...new Set(opportunities.map((item) => item.portfolioTool).filter((tool): tool is string => Boolean(tool)))].sort().map((tool) => <option key={tool} value={tool}>{tool}</option>)}
              </select>
              <div className="filters" aria-label="Filter opportunities">
                {(["all", "ready", "review", "approved", "sent", "replied"] as Filter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}
              </div>
            </div>
            <div className="queue-summary"><span>{filtered.length} opportunities</span><span>sorted by fit score</span></div>
            <div className="opportunity-list">
              {loading ? <LoadingRows /> : filtered.map((item) => (
                <button key={item.id} onClick={() => setSelectedId(item.id)} className={`opportunity-row ${selected?.id === item.id ? "selected" : ""}`}>
                  <div className="score-ring" style={{ "--score": `${item.score * 3.6}deg` } as React.CSSProperties}><span>{item.score}</span></div>
                  <div className="row-main"><div className="row-title"><strong>{item.businessName}</strong><Badge className={statusClass[item.status]}>{statusLabel[item.status]}</Badge></div><p>{item.offerTitle}</p><div className="row-meta"><span>{item.industry}</span><span>T{personalizationTier(item).tier}</span><span>{item.priceRange}</span></div></div>
                  <ChevronRight className="row-arrow" />
                </button>
              ))}
              {!loading && filtered.length === 0 && <div className="empty-queue"><Search /><strong>No opportunities match</strong><span>Try another search or filter.</span></div>}
            </div>
          </div>

          <section className="detail-panel">
            {!selected ? <div className="empty-detail"><Inbox /><h2>Select an opportunity</h2></div> : <>
              <div className="detail-head">
                <div className="detail-title"><div className="fit-line"><Badge className="fit-badge">{selected.fit}</Badge><span>{selected.score}/100 fit</span></div><h2>{selected.businessName}</h2><p>{selected.industry} · {selected.location}</p></div>
                <a className="site-link" href={selected.website} target="_blank" rel="noreferrer">Website <ArrowUpRight /></a>
              </div>
              <div className="approval-bar">
                <div><span className={`status-dot ${selected.status}`} /><p><strong>{statusLabel[selected.status]}</strong><span>{["sent", "replied", "won"].includes(selected.status) ? `Sent ${dateLabel(selected.sentAt)}` : selected.status === "approved" ? "Waiting for Gmail" : "Decision required"}</span></p></div>
                <div className="approval-actions"><Button variant="outline" onClick={() => setEditing(true)} disabled={["sent", "replied", "won"].includes(selected.status)}><FilePenLine />Edit</Button><Button className="approve-button" onClick={() => void approve()} disabled={saving || !ready || ["sent", "replied", "won", "approved"].includes(selected.status)}><Check />{ready ? "Approve" : "Fix blockers"}</Button></div>
              </div>

              <div className="workflow-strip" aria-label="Opportunity workflow">
                {workflowSteps.map((step, index) => <div key={step} className={`${index < currentStep ? "done" : ""} ${index === currentStep ? "current" : ""}`}><span>{index < currentStep ? <Check /> : index + 1}</span><strong>{step}</strong></div>)}
              </div>

              <div className="detail-scroll">
                <section className="insight-block">
                  <div className="section-label"><Target />Why now</div>
                  <div className="signal-card"><span>{selected.signalType}</span><p>{selected.signalSummary}</p></div>
                  <div className="evidence-grid"><div><span>Observed fact</span><p>{selected.observation}</p></div><div><span>Our inference</span><p>{selected.inference}</p></div></div>
                  <div className="sources"><span>Evidence</span>{safeSources(selected.sourceUrls).map((source, index) => <a key={source} href={source} target="_blank" rel="noreferrer">Source {index + 1}<ExternalLink /></a>)}</div>
                </section>
                <section className="quality-block">
                  <div className="quality-heading">
                    <div className="section-label"><ShieldCheck />Quality gate</div>
                    <div className={`quality-score ${ready ? "pass" : "hold"}`}><strong>{qualityScore}/{qualityChecks.length}</strong><span>{ready ? "ready to approve" : "hold for fixes"}</span></div>
                  </div>
                  <div className="research-tier"><span>T{researchTier.tier}</span><div><strong>{researchTier.label}</strong><p>Research depth follows the cheapest credible signal and preserves the source trail.</p></div></div>
                  <div className="quality-grid">{qualityChecks.map((check) => <div key={check.id} className={check.pass ? "pass" : check.blocking ? "fail" : "warn"}>{check.pass ? <Check /> : <CircleAlert />}<p><strong>{check.label}</strong><span>{check.detail}</span></p>{check.blocking && !check.pass && <em>blocker</em>}</div>)}</div>
                </section>
                <section className="offer-block">
                  <div className="section-label"><Sparkles />Recommended offer</div>
                  <div className="offer-title"><div><h3>{selected.offerTitle}</h3><p>{selected.offerScope}</p></div><div className="offer-price"><strong>{selected.priceRange}</strong><span>{selected.deliveryTime}</span></div></div>
                  <div className="preview-idea"><span>30-minute preview</span><p>{selected.previewIdea}</p></div>
                </section>
                <section className="contact-block">
                  <div className="section-label"><Mail />Recipient</div>
                  <div className="recipient-row"><div className="contact-avatar">{selected.contactName.slice(0, 1).toUpperCase()}</div><div><strong>{selected.contactName}</strong><span>{selected.contactRole}</span></div><div className="email-address"><strong>{selected.contactEmail}</strong><a href={selected.emailSourceUrl} target="_blank" rel="noreferrer">{selected.emailConfidence} confidence <ExternalLink /></a></div></div>
                </section>
                <section className="email-block">
                  <div className="email-head"><div className="section-label"><Send />Email draft</div><span>{body.trim().split(/\s+/).filter(Boolean).length} words</span></div>
                  {editing ? <div className="editor">
                    <label>Subject<Input value={subject} onChange={(event) => setSubject(event.target.value)} /></label>
                    <label>Message<Textarea value={body} onChange={(event) => setBody(event.target.value)} rows={13} /></label>
                    <label>What should change?<Textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Tell the next writing pass what feels wrong or missing…" /></label>
                    <div className="editor-actions"><Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={() => void saveEdit()} disabled={saving}><FilePenLine />Save edit request</Button></div>
                  </div> : <div className="email-preview"><div className="email-to"><span>To</span><strong>{selected.contactEmail}</strong></div><div className="email-subject"><span>Subject</span><strong>{selected.subject}</strong></div><pre>{selected.emailBody}</pre></div>}
                </section>
                {selected.reviewerNote && <section className="review-note"><CircleAlert /><div><strong>Review note</strong><p>{selected.reviewerNote}</p></div></section>}
                <section className="learning-block">
                  <div className="section-label"><Target />Learning loop</div>
                  <div className="learning-grid">
                    <div><span>Hypothesis</span><strong>{selected.signalType}</strong><p>The public signal makes this offer timely enough to earn a reply.</p></div>
                    <div><span>Current outcome</span><strong>{["replied", "won"].includes(selected.status) ? "Reply received" : selected.status === "sent" ? "Awaiting reply" : "Not sent"}</strong><p>{selected.repliedAt ? `Reply logged ${dateLabel(selected.repliedAt)}` : selected.nextFollowUpAt ? `Next touch ${dateLabel(selected.nextFollowUpAt)}` : "No outcome data yet."}</p></div>
                    <div><span>Iteration rule</span><strong>Change one variable</strong><p>Review each 10-prospect cohort; adjust the subject, angle, offer or CTA—not all four.</p></div>
                  </div>
                </section>
              </div>
            </>}
          </section>
        </section>
      </main>
      </div>
    </>
  );
}

function Metric({ label, value, note, accent, positive }: { label: string; value: number; note: string; accent?: boolean; positive?: boolean }) {
  return <div className={`metric-card ${accent ? "accent" : ""} ${positive ? "positive" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small>{label === "Researched" && <Progress value={100} />}</div>;
}

function LoadingRows() {
  return <>{[0, 1, 2, 3, 4].map((item) => <div className="loading-row" key={item}><span /><div><i /><i /></div></div>)}</>;
}
