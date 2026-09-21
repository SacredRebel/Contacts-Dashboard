"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight, BarChart3, BriefcaseBusiness, Check, CheckCircle2, ChevronRight,
  CircleAlert, ClipboardCheck, Clock3, Copy, Download, ExternalLink, FilePenLine,
  Filter, Inbox, Mail, MessageSquareReply, RefreshCw, Search, Send,
  ShieldCheck, Sparkles, Target, Upload, WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Toaster } from "@/components/ui/sonner";
import { getQualityChecks, isReady, safeSources } from "@/lib/outreach-quality";
import {
  csvExport, downloadFile, downloadOpportunities, fingerprint, importOpportunities,
  loadOpportunities, saveOpportunities,
} from "@/lib/local-outreach-store";
import type { Activity, Opportunity, OpportunityStatus } from "@/lib/types";

type View = "inbox" | "pipeline" | "replies" | "analytics";
type QueueFilter = "all" | "monday" | "ready" | "review" | "approved" | "sent";

const statusLabel: Record<OpportunityStatus, string> = {
  research: "Research", review: "Review", needs_edit: "Needs edit", approved: "Approved",
  sent: "Sent", replied: "Replied", meeting: "Meeting", won: "Client", archived: "Archived",
  bounced: "Bounced", not_interested: "Opted out",
};

const terminalStatuses: OpportunityStatus[] = ["sent", "replied", "meeting", "won", "bounced", "not_interested", "archived"];
const pipelineStatuses: OpportunityStatus[] = ["approved", "sent", "replied", "meeting", "won"];
const replyStatuses: OpportunityStatus[] = ["replied", "meeting", "won", "not_interested"];

function dateLabel(value?: string | null) {
  if (!value) return "Not recorded";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function host(value: string) {
  try { return new URL(value).hostname.replace(/^www\./, ""); } catch { return value; }
}

function activity(type: Activity["type"], note: string, extra: Partial<Activity> = {}): Activity {
  return { id: crypto.randomUUID(), type, note, at: new Date().toISOString(), ...extra };
}

function nextFollowUp() {
  const date = new Date();
  let days = 0;
  while (days < 3) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) days += 1;
  }
  return date.toISOString();
}

export function Dashboard() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [view, setView] = useState<View>("inbox");
  const [filter, setFilter] = useState<QueueFilter>("monday");
  const [query, setQuery] = useState("");
  const [tool, setTool] = useState("all");
  const [niche, setNiche] = useState("all");
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    try {
      const records = loadOpportunities();
      setOpportunities(records);
      setSelectedId((current) => current || records.find((item) => item.reviewRank === 1)?.id || records[0]?.id || "");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The saved workspace could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const selected = opportunities.find((item) => item.id === selectedId);

  useEffect(() => {
    if (!selected) return;
    const timer = window.setTimeout(() => {
      setSubject(selected.subject);
      setBody(selected.emailBody);
      setNote(selected.reviewerNote || "");
      setEditing(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [selected]);

  const replace = useCallback((record: Opportunity) => {
    setOpportunities((current) => {
      const next = current.map((item) => item.id === record.id ? record : item);
      saveOpportunities(next);
      return next;
    });
  }, []);

  const patch = useCallback((id: string, changes: Partial<Opportunity>, newActivity?: Activity) => {
    const current = opportunities.find((item) => item.id === id);
    if (!current) return null;
    const record: Opportunity = {
      ...current,
      ...changes,
      activity: newActivity ? [...(current.activity || []), newActivity] : current.activity,
      updatedAt: new Date().toISOString(),
    };
    replace(record);
    return record;
  }, [opportunities, replace]);

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 8_000_000) throw new Error("Choose a JSON file smaller than 8 MB.");
      const parsed = JSON.parse(await file.text());
      const incoming = Array.isArray(parsed) ? parsed : parsed?.opportunities;
      if (!Array.isArray(incoming)) throw new Error("The file must contain an opportunity array.");
      const result = importOpportunities(opportunities, incoming);
      setOpportunities(result.opportunities);
      setSelectedId(result.created[0]?.id || selectedId);
      setView("inbox");
      setFilter("review");
      toast.success(`${result.created.length} contacts imported`, { description: `${result.skipped} duplicates or invalid rows skipped. Nothing was sent.` });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That research file could not be imported.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const approve = () => {
    if (!selected) return;
    const blockers = getQualityChecks(selected, subject, body).filter((check) => check.blocking && !check.pass);
    if (blockers.length) {
      toast.error("Approval blocked", { description: blockers.map((check) => check.label).join(", ") });
      return;
    }
    const approvedAt = new Date().toISOString();
    const draft = { ...selected, subject, emailBody: body };
    patch(selected.id, {
      subject, emailBody: body, status: "approved", approvedAt,
      approvedSnapshot: fingerprint(draft), reviewerNote: note,
    }, activity("approved", "Draft approved for the manual send queue."));
    setEditing(false);
    toast.success("Added to approved queue", { description: "No email was sent. Gmail is not connected." });
  };

  const saveEdit = () => {
    if (!selected) return;
    patch(selected.id, {
      subject, emailBody: body, reviewerNote: note, status: "review",
      approvedAt: null, approvedSnapshot: null,
    }, activity("edited", note || "Draft edited and returned to review."));
    setEditing(false);
    toast.success("Draft saved", { description: "It is back in the review queue." });
  };

  const markSent = () => {
    if (!selected || selected.status !== "approved") return;
    const sentAt = new Date().toISOString();
    patch(selected.id, {
      status: "sent", sentAt, nextFollowUpAt: nextFollowUp(),
      lastSentSnapshot: fingerprint(selected), draftKind: "initial",
    }, activity("sent", "Marked as manually sent outside this dashboard."));
    toast.success("Send recorded", { description: "Follow-up scheduled for three business days." });
  };

  const recordReply = (outcome: "positive" | "neutral" | "negative") => {
    if (!selected) return;
    const status: OpportunityStatus = outcome === "negative" ? "not_interested" : "replied";
    patch(selected.id, {
      status, repliedAt: new Date().toISOString(), replyOutcome: outcome,
      doNotContact: outcome === "negative", nextFollowUpAt: null,
    }, activity(outcome === "negative" ? "opt_out" : "reply", `${outcome} reply recorded.`, { outcome }));
    toast.success(outcome === "negative" ? "Opt-out recorded" : "Reply recorded");
  };

  const metrics = useMemo(() => {
    const sent = opportunities.filter((item) => Boolean(item.sentAt)).length;
    const positive = opportunities.filter((item) => item.replyOutcome === "positive" || ["meeting", "won"].includes(item.status)).length;
    return {
      total: opportunities.length,
      review: opportunities.filter((item) => ["research", "review", "needs_edit"].includes(item.status)).length,
      monday: opportunities.filter((item) => item.reviewRank).length,
      approved: opportunities.filter((item) => item.status === "approved").length,
      sent,
      replies: opportunities.filter((item) => Boolean(item.repliedAt)).length,
      positive,
      meetings: opportunities.filter((item) => ["meeting", "won"].includes(item.status)).length,
    };
  }, [opportunities]);

  const tools = useMemo(() => [...new Set(opportunities.map((item) => item.portfolioTool).filter(Boolean))].sort() as string[], [opportunities]);
  const niches = useMemo(() => [...new Set(opportunities.map((item) => item.niche).filter(Boolean))].sort() as string[], [opportunities]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return opportunities
      .filter((item) => {
        const viewMatch = view === "inbox" ? ["research", "review", "needs_edit", "approved"].includes(item.status)
          : view === "pipeline" ? pipelineStatuses.includes(item.status)
          : view === "replies" ? replyStatuses.includes(item.status)
          : true;
        const filterMatch = filter === "all" || (filter === "monday" && Boolean(item.reviewRank))
          || (filter === "ready" && isReady(item) && ["review", "needs_edit"].includes(item.status))
          || (filter === "review" && ["research", "review", "needs_edit"].includes(item.status))
          || item.status === filter;
        const haystack = [item.businessName, item.contactName, item.contactEmail, item.industry, item.location, item.niche, item.offerTitle].join(" ").toLowerCase();
        return viewMatch && filterMatch && (tool === "all" || item.portfolioTool === tool)
          && (niche === "all" || item.niche === niche) && (!needle || haystack.includes(needle));
      })
      .sort((a, b) => (a.reviewRank || 9999) - (b.reviewRank || 9999) || b.score - a.score);
  }, [filter, niche, opportunities, query, tool, view]);

  const nicheRows = useMemo(() => {
    const rows = new Map<string, { total: number; sent: number; replies: number; positive: number }>();
    opportunities.forEach((item) => {
      const key = item.niche || item.industry || "Uncategorized";
      const row = rows.get(key) || { total: 0, sent: 0, replies: 0, positive: 0 };
      row.total += 1;
      if (item.sentAt) row.sent += 1;
      if (item.repliedAt) row.replies += 1;
      if (item.replyOutcome === "positive" || ["meeting", "won"].includes(item.status)) row.positive += 1;
      rows.set(key, row);
    });
    return [...rows.entries()].sort((a, b) => b[1].total - a[1].total);
  }, [opportunities]);

  const selectView = (next: View) => {
    setView(next);
    setFilter(next === "inbox" ? "monday" : "all");
  };

  return (
    <div className="app-shell">
      <Toaster position="bottom-right" richColors />
      <header className="app-nav">
        <div className="brand-lockup">
          <div className="brand-mark">PM</div>
          <div><strong>Outreach OS</strong><span>Paul&apos;s client pipeline</span></div>
        </div>
        <nav className="side-nav" aria-label="Dashboard sections">
          <NavButton active={view === "inbox"} onClick={() => selectView("inbox")} icon={<Inbox />} label="Review inbox" count={metrics.review} />
          <NavButton active={view === "pipeline"} onClick={() => selectView("pipeline")} icon={<BriefcaseBusiness />} label="Pipeline" count={metrics.approved + metrics.sent} />
          <NavButton active={view === "replies"} onClick={() => selectView("replies")} icon={<MessageSquareReply />} label="Replies" count={metrics.replies} />
          <NavButton active={view === "analytics"} onClick={() => selectView("analytics")} icon={<BarChart3 />} label="Performance" />
        </nav>
        <div className="nav-actions">
          <span className="queue-chip"><strong>{metrics.monday}</strong> Monday leads</span>
          <button onClick={() => downloadOpportunities(opportunities)} title="Download workspace backup"><Download /><span>Backup</span></button>
          <button onClick={() => downloadFile("outreach-contacts.csv", csvExport(opportunities), "text/csv")} title="Export contacts as CSV"><Download /><span>CSV</span></button>
        </div>
      </header>

      <main className="workspace">
        <header className="topbar">
          <div className="title-line">
            <div><p>CLIENT ACQUISITION / {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date()).toUpperCase()}</p><h1>{view === "inbox" ? "Review inbox" : view === "pipeline" ? "Outreach pipeline" : view === "replies" ? "Reply center" : "Campaign performance"}</h1></div>
          </div>
          <div className="top-actions">
            <input ref={fileInput} type="file" hidden accept=".json,application/json" onChange={(e) => void importFile(e.target.files?.[0])} />
            <Button variant="outline" onClick={() => fileInput.current?.click()}><Upload />Import</Button>
            <span className="connection-pill"><WifiOff />Gmail disconnected</span>
            <Button variant="outline" size="icon" onClick={load} aria-label="Reload workspace"><RefreshCw /></Button>
          </div>
        </header>

        <section className="metrics" aria-label="Outreach overview">
          <Metric label="Prospects" value={metrics.total} note="deduplicated contacts" />
          <Metric label="Monday queue" value={metrics.monday} note="ordered for review" accent />
          <Metric label="Approved" value={metrics.approved} note="ready for manual send" />
          <Metric label="Sent" value={metrics.sent} note="recorded sends" />
          <Metric label="Replies" value={metrics.replies} note={metrics.sent ? `${Math.round(metrics.replies / metrics.sent * 100)}% of sends` : "no send data"} positive />
          <Metric label="Positive" value={metrics.positive} note="conversations opened" positive />
        </section>

        {view === "analytics" ? (
          <Analytics opportunities={opportunities} rows={nicheRows} metrics={metrics} />
        ) : (
          <section className="command-grid">
            <div className="queue-panel">
              <div className="queue-tools">
                <div className="search-box"><Search /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts…" /></div>
                <div className="select-grid">
                  <label><span>Portfolio lane</span><select value={tool} onChange={(e) => setTool(e.target.value)}><option value="all">All offers</option>{tools.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label><span>Niche</span><select value={niche} onChange={(e) => setNiche(e.target.value)}><option value="all">All niches</option>{niches.map((item) => <option key={item}>{item}</option>)}</select></label>
                </div>
                <div className="filters"><Filter />{(["all", "monday", "ready", "review", "approved", "sent"] as QueueFilter[]).map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
              </div>
              <div className="queue-summary"><strong>{filtered.length} matches</strong><span>{filter === "monday" ? "ordered send review" : "best fit first"}</span></div>
              <div className="opportunity-list">
                {loading ? <LoadingRows /> : filtered.map((item) => (
                  <button key={item.id} onClick={() => setSelectedId(item.id)} className={`opportunity-row ${selected?.id === item.id ? "selected" : ""}`}>
                    <div className="rank-cell">{item.reviewRank ? <strong>#{item.reviewRank}</strong> : <span>{item.score}</span>}</div>
                    <div className="row-main">
                      <div className="row-title"><strong>{item.businessName}</strong><Status status={item.status} /></div>
                      <p>{item.offerTitle || item.portfolioTool}</p>
                      <div className="row-meta"><span>{item.niche || item.industry}</span><span>{item.emailConfidence}</span><span>{item.priceRange}</span></div>
                    </div>
                    <ChevronRight />
                  </button>
                ))}
                {!loading && filtered.length === 0 && <div className="empty-state"><Search /><strong>No matching contacts</strong><span>Clear a filter or search another niche.</span></div>}
              </div>
            </div>

            <Detail
              selected={selected} editing={editing} setEditing={setEditing}
              subject={subject} setSubject={setSubject} body={body} setBody={setBody}
              note={note} setNote={setNote} approve={approve} saveEdit={saveEdit}
              markSent={markSent} recordReply={recordReply} patch={patch}
            />
          </section>
        )}
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label, count }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count?: number }) {
  return <button className={active ? "active" : ""} onClick={onClick}>{icon}<span>{label}</span>{typeof count === "number" && <em>{count}</em>}</button>;
}

function Metric({ label, value, note, accent, positive }: { label: string; value: number; note: string; accent?: boolean; positive?: boolean }) {
  return <div className={`metric-card ${accent ? "accent" : ""} ${positive ? "positive" : ""}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>;
}

function Status({ status }: { status: OpportunityStatus }) {
  return <span className={`status status-${status}`}>{statusLabel[status]}</span>;
}

type DetailProps = {
  selected?: Opportunity; editing: boolean; setEditing: (value: boolean) => void;
  subject: string; setSubject: (value: string) => void; body: string; setBody: (value: string) => void;
  note: string; setNote: (value: string) => void; approve: () => void; saveEdit: () => void;
  markSent: () => void; recordReply: (outcome: "positive" | "neutral" | "negative") => void;
  patch: (id: string, changes: Partial<Opportunity>, newActivity?: Activity) => Opportunity | null;
};

function Detail({ selected, editing, setEditing, subject, setSubject, body, setBody, note, setNote, approve, saveEdit, markSent, recordReply, patch }: DetailProps) {
  if (!selected) return <section className="detail-panel empty-detail"><Inbox /><h2>Select a contact</h2><p>Review the evidence, offer and email before approving it.</p></section>;
  const checks = getQualityChecks(selected, editing ? subject : selected.subject, editing ? body : selected.emailBody);
  const ready = isReady(selected, editing ? subject : selected.subject, editing ? body : selected.emailBody);
  const sources = safeSources(selected.sourceUrls);
  const sent = terminalStatuses.includes(selected.status);
  const canApprove = !sent && selected.status !== "approved";
  const wordCount = (editing ? body : selected.emailBody).trim().split(/\s+/).filter(Boolean).length;

  const copyDraft = async () => {
    await navigator.clipboard.writeText(`Subject: ${selected.subject}\n\n${selected.emailBody}`);
    toast.success("Draft copied");
  };

  return <section className="detail-panel">
    <div className="detail-head">
      <div><div className="fit-line"><span>{selected.fit}</span><span>{selected.score}/100 FIT</span>{selected.reviewRank && <span>QUEUE #{selected.reviewRank}</span>}</div><h2>{selected.businessName}</h2><p>{selected.industry} · {selected.location}</p></div>
      <a href={selected.website} target="_blank" rel="noreferrer">{host(selected.website)} <ArrowUpRight /></a>
    </div>
    <div className="action-bar">
      <div><Status status={selected.status} /><span>{selected.status === "approved" ? "Staged only — Gmail disconnected" : selected.sentAt ? `Sent ${dateLabel(selected.sentAt)}` : "Awaiting your decision"}</span></div>
      <div>
        <Button variant="outline" onClick={() => setEditing(!editing)} disabled={sent}><FilePenLine />{editing ? "Cancel" : "Edit"}</Button>
        {selected.status === "approved" ? <Button onClick={markSent}><Send />Mark manually sent</Button> : <Button onClick={approve} disabled={!canApprove || !ready}><Check />{ready ? "Approve" : "Fix blockers"}</Button>}
      </div>
    </div>
    <div className="detail-scroll">
      <section className="evidence-section">
        <SectionTitle icon={<Target />} title="Why this lead fits" trailing={selected.sourceCheckedAt ? `Checked ${dateLabel(selected.sourceCheckedAt)}` : undefined} />
        <div className="signal-card"><span>{selected.signalType || "PUBLIC SIGNAL"}</span><p>{selected.signalSummary}</p></div>
        <div className="evidence-grid"><div><span>Observed</span><p>{selected.observation}</p></div><div><span>Proposed need · inference</span><p>{selected.inference}</p></div></div>
        <div className="source-row">{sources.map((source, index) => <a key={source} href={source} target="_blank" rel="noreferrer">Source {index + 1}<ExternalLink /></a>)}{selected.emailSourceUrl && <a href={selected.emailSourceUrl} target="_blank" rel="noreferrer">Email source<ExternalLink /></a>}</div>
      </section>

      <section>
        <SectionTitle icon={<ShieldCheck />} title="Approval checks" trailing={`${checks.filter((check) => check.pass).length}/${checks.length} passed`} />
        <div className="quality-grid">{checks.map((check) => <div key={check.id} className={check.pass ? "pass" : check.blocking ? "fail" : "warn"}>{check.pass ? <CheckCircle2 /> : <CircleAlert />}<div><strong>{check.label}</strong><span>{check.detail}</span></div></div>)}</div>
      </section>

      <section>
        <SectionTitle icon={<Sparkles />} title="Paid starter scope" />
        <div className="offer-card"><div><h3>{selected.offerTitle}</h3><p>{selected.offerScope}</p></div><div><strong>{selected.priceRange}</strong><span>{selected.deliveryTime || "After discovery"}</span></div></div>
        {selected.previewIdea && <div className="preview-note"><span>Conversation hook</span><p>{selected.previewIdea}</p></div>}
      </section>

      <section>
        <SectionTitle icon={<Mail />} title="Recipient" trailing={selected.emailConfidence + " published source"} />
        <div className="recipient-card"><div className="avatar">{(selected.contactName || selected.businessName).charAt(0)}</div><div><strong>{selected.contactName || "Business team"}</strong><span>{selected.contactRole || "Published contact"}</span></div><a href={`mailto:${selected.contactEmail}`}>{selected.contactEmail}</a></div>
      </section>

      <section>
        <SectionTitle icon={<Send />} title="Email draft" trailing={`${wordCount} words`} />
        {editing ? <div className="editor">
          <label>Subject<Input value={subject} onChange={(e) => setSubject(e.target.value)} /></label>
          <label>Message<Textarea rows={12} value={body} onChange={(e) => setBody(e.target.value)} /></label>
          <label>Review note<Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should the next revision address?" /></label>
          <div><Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button><Button onClick={saveEdit}><ClipboardCheck />Save revision</Button></div>
        </div> : <div className="email-preview">
          <div><span>TO</span><strong>{selected.contactEmail}</strong><button onClick={() => void copyDraft()}><Copy />Copy</button></div>
          <div><span>SUBJECT</span><strong>{selected.subject}</strong></div>
          <pre>{selected.emailBody}</pre>
        </div>}
      </section>

      {(selected.status === "sent" || selected.status === "replied") && <section>
        <SectionTitle icon={<MessageSquareReply />} title="Record outcome" />
        <div className="outcome-actions"><button onClick={() => recordReply("positive")}>Positive reply</button><button onClick={() => recordReply("neutral")}>Neutral reply</button><button onClick={() => recordReply("negative")}>Not interested / opt out</button></div>
      </section>}

      {selected.status === "replied" && selected.replyOutcome === "positive" && <section>
        <SectionTitle icon={<BriefcaseBusiness />} title="Move conversation forward" />
        <div className="outcome-actions"><button onClick={() => patch(selected.id, { status: "meeting", meetingAt: new Date().toISOString() }, activity("meeting", "Meeting booked."))}>Meeting booked</button><button onClick={() => patch(selected.id, { status: "won" }, activity("deposit", "Paid work recorded."))}>Won paid work</button></div>
      </section>}

      <section>
        <SectionTitle icon={<Clock3 />} title="Activity" />
        <div className="timeline">{(selected.activity || []).slice().reverse().map((item) => <div key={item.id}><span /><div><strong>{item.note}</strong><small>{dateLabel(item.at)}</small></div></div>)}{!(selected.activity || []).length && <p>No activity recorded yet.</p>}</div>
      </section>
    </div>
  </section>;
}

function SectionTitle({ icon, title, trailing }: { icon: React.ReactNode; title: string; trailing?: string }) {
  return <div className="section-title"><div>{icon}<strong>{title}</strong></div>{trailing && <span>{trailing}</span>}</div>;
}

function Analytics({ opportunities, rows, metrics }: { opportunities: Opportunity[]; rows: [string, { total: number; sent: number; replies: number; positive: number }][]; metrics: { sent: number; replies: number; positive: number; meetings: number } }) {
  const laneRows = [...new Set(opportunities.map((item) => item.portfolioTool).filter(Boolean))].map((lane) => {
    const items = opportunities.filter((item) => item.portfolioTool === lane);
    return { lane, total: items.length, sent: items.filter((item) => item.sentAt).length, replies: items.filter((item) => item.repliedAt).length };
  }).sort((a, b) => b.total - a.total);
  return <section className="analytics-page">
    <div className="analytics-hero"><div><span>MEASURE WHAT MATTERS</span><h2>Replies, conversations and paid work</h2><p>Open tracking is intentionally absent. The dashboard records outcomes you can verify.</p></div><div className="rate-card"><span>Reply rate</span><strong>{metrics.sent ? Math.round(metrics.replies / metrics.sent * 100) : 0}%</strong><small>{metrics.replies} replies from {metrics.sent} recorded sends</small></div></div>
    <div className="analytics-grid">
      <div className="data-card"><div className="card-title"><h3>Portfolio lanes</h3><span>coverage and outcomes</span></div><div className="data-table"><div className="table-head"><span>Lane</span><span>Leads</span><span>Sent</span><span>Replies</span></div>{laneRows.map((row) => <div key={row.lane} className="table-row"><strong>{row.lane}</strong><span>{row.total}</span><span>{row.sent}</span><span>{row.replies}</span></div>)}</div></div>
      <div className="data-card"><div className="card-title"><h3>Niches</h3><span>{rows.length} researched categories</span></div><div className="data-table niche-table"><div className="table-head"><span>Niche</span><span>Leads</span><span>Sent</span><span>Replies</span><span>Positive</span></div>{rows.map(([name, row]) => <div key={name} className="table-row"><strong>{name}</strong><span>{row.total}</span><span>{row.sent}</span><span>{row.replies}</span><span>{row.positive}</span></div>)}</div></div>
    </div>
    <div className="truth-strip"><ShieldCheck /><div><strong>Reporting guardrail</strong><p>Unknown sends, replies, meetings and deposits remain unknown. Mark each outcome only after it happens.</p></div><div><strong>{metrics.positive}</strong><span>positive replies</span></div><div><strong>{metrics.meetings}</strong><span>meetings / wins</span></div></div>
  </section>;
}

function LoadingRows() {
  return <>{[1, 2, 3, 4, 5].map((item) => <div className="loading-row" key={item}><span /><div><i /><i /></div></div>)}</>;
}
