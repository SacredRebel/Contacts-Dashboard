import snapshot from "@/data/research-snapshot.json";
import type { Activity, Opportunity, OpportunityStatus, WorkspaceSettings } from "@/lib/types";

export const STORAGE_KEY = "pauls-outreach-command-center:v1";
const SETTINGS_KEY = "pauls-outreach-settings:v2";
const SNAPSHOT_BACKUP_KEY = `${STORAGE_KEY}:before-v2`;
const MAX_CONTACTS = 2_000;

const validStatuses = new Set<OpportunityStatus>([
  "research", "review", "needs_edit", "approved", "sent", "replied",
  "meeting", "won", "archived", "bounced", "not_interested",
]);
const validActivityTypes = new Set<Activity["type"]>([
  "note", "approved", "edited", "sent", "reply", "meeting",
  "deposit", "opt_out", "bounced", "follow_up",
]);

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function dateValue(value: unknown) {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : null;
}

function idValue(value: unknown) {
  return stringValue(value) || crypto.randomUUID();
}

export function emailKey(value: string) {
  return value.trim().toLowerCase();
}

export function nameKey(value: string) {
  return value.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]/g, "");
}

export function websiteKey(value: string) {
  try {
    return new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`)
      .hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function safeUrl(value?: string) {
  try {
    const url = new URL(value || "");
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

export function fingerprint(opportunity: Opportunity) {
  return JSON.stringify([
    emailKey(opportunity.contactEmail),
    opportunity.subject,
    opportunity.emailBody,
    opportunity.draftKind || "initial",
  ]);
}

export function sameBusiness(a: Opportunity, b: Opportunity) {
  const sameEmail = Boolean(a.contactEmail && emailKey(a.contactEmail) === emailKey(b.contactEmail));
  const aHost = websiteKey(a.website);
  const sameHost = Boolean(aHost && aHost === websiteKey(b.website));
  const sameParent = Boolean(a.parentGroup && b.parentGroup && nameKey(a.parentGroup) === nameKey(b.parentGroup));
  return a.id === b.id || nameKey(a.businessName) === nameKey(b.businessName)
    || sameEmail || sameHost || sameParent;
}

function normalizeActivity(value: unknown): Activity[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
    const raw = entry as Record<string, unknown>;
    const type = stringValue(raw.type) as Activity["type"];
    const at = dateValue(raw.at);
    if (!validActivityTypes.has(type) || !at) return [];
    return [{
      id: idValue(raw.id),
      type,
      at,
      note: stringValue(raw.note),
      ...(["positive", "neutral", "negative"].includes(stringValue(raw.outcome))
        ? { outcome: raw.outcome as Activity["outcome"] }
        : {}),
      ...(typeof raw.amount === "number" && Number.isFinite(raw.amount) && raw.amount >= 0
        ? { amount: raw.amount }
        : {}),
    }];
  });
}

export function normalize(raw: Record<string, unknown>): Opportunity {
  const now = new Date().toISOString();
  const status = validStatuses.has(stringValue(raw.status) as OpportunityStatus)
    ? raw.status as OpportunityStatus
    : "review";
  const emailConfidence = ["HIGH", "MEDIUM", "LOW", "NONE"].includes(stringValue(raw.emailConfidence))
    ? raw.emailConfidence as Opportunity["emailConfidence"]
    : "NONE";
  const fit = ["BEST FIT", "GOOD FIT", "EXPERIMENT"].includes(stringValue(raw.fit))
    ? raw.fit as Opportunity["fit"]
    : "GOOD FIT";
  const replyOutcome = ["positive", "neutral", "negative"].includes(stringValue(raw.replyOutcome))
    ? raw.replyOutcome as Opportunity["replyOutcome"]
    : null;
  const sourceUrls = Array.isArray(raw.sourceUrls)
    ? JSON.stringify(raw.sourceUrls.filter((source) => typeof source === "string"))
    : stringValue(raw.sourceUrls, "[]");

  return {
    id: idValue(raw.id),
    businessName: stringValue(raw.businessName, "Unnamed business").trim().slice(0, 180),
    website: stringValue(raw.website),
    location: stringValue(raw.location),
    industry: stringValue(raw.industry),
    portfolioTool: stringValue(raw.portfolioTool),
    demoUrl: stringValue(raw.demoUrl),
    campaign: stringValue(raw.campaign),
    contactName: stringValue(raw.contactName),
    contactRole: stringValue(raw.contactRole),
    contactEmail: stringValue(raw.contactEmail),
    emailConfidence,
    emailSourceUrl: stringValue(raw.emailSourceUrl),
    fit,
    score: Math.max(0, Math.min(100, Number(raw.score) || 0)),
    status,
    signalType: stringValue(raw.signalType),
    signalSummary: stringValue(raw.signalSummary),
    observation: stringValue(raw.observation),
    inference: stringValue(raw.inference),
    offerTitle: stringValue(raw.offerTitle),
    offerScope: stringValue(raw.offerScope),
    priceRange: stringValue(raw.priceRange),
    deliveryTime: stringValue(raw.deliveryTime),
    previewIdea: stringValue(raw.previewIdea),
    subject: stringValue(raw.subject),
    emailBody: stringValue(raw.emailBody),
    reviewerNote: stringValue(raw.reviewerNote),
    sourceUrls,
    approvedAt: dateValue(raw.approvedAt),
    sentAt: dateValue(raw.sentAt),
    repliedAt: dateValue(raw.repliedAt),
    nextFollowUpAt: dateValue(raw.nextFollowUpAt),
    createdAt: dateValue(raw.createdAt) || now,
    updatedAt: dateValue(raw.updatedAt) || now,
    niche: stringValue(raw.niche),
    parentGroup: stringValue(raw.parentGroup),
    sourceCheckedAt: dateValue(raw.sourceCheckedAt) || "",
    reviewRank: typeof raw.reviewRank === "number" && raw.reviewRank > 0 ? raw.reviewRank : null,
    researchBatch: stringValue(raw.researchBatch),
    holdReason: stringValue(raw.holdReason),
    doNotContact: raw.doNotContact === true,
    draftKind: raw.draftKind === "follow_up" ? "follow_up" : "initial",
    approvedSnapshot: stringValue(raw.approvedSnapshot) || null,
    lastSentSnapshot: stringValue(raw.lastSentSnapshot) || null,
    replyOutcome,
    meetingAt: dateValue(raw.meetingAt),
    depositAmount: typeof raw.depositAmount === "number"
      && Number.isFinite(raw.depositAmount) && raw.depositAmount >= 0
      ? raw.depositAmount
      : null,
    notes: stringValue(raw.notes),
    activity: normalizeActivity(raw.activity),
  };
}

export function reconcileSnapshot(current: Opportunity[], seeds: unknown[] = snapshot) {
  const result = [...current];
  for (const raw of seeds) {
    const seed = normalize(raw as Record<string, unknown>);
    const index = result.findIndex((record) => sameBusiness(record, seed));
    if (index < 0) {
      result.push(seed);
      continue;
    }

    const live = result[index];
    const next = { ...seed, ...live };
    const migrateToThreeRoleProduct = seed.campaign === "Client–Crew–Office interest-CTA-v2"
      && (live.portfolioTool === "Work Logger"
        || (live.portfolioTool === "Client–Crew–Office Platform"
          && live.campaign === "Client–Crew–Office first-send"))
      && !live.sentAt
      && !live.repliedAt
      && !live.approvedAt;
    if (migrateToThreeRoleProduct) {
      const productFields = [
        "portfolioTool", "demoUrl", "campaign", "reviewRank", "offerTitle",
        "offerScope", "priceRange", "deliveryTime", "previewIdea", "inference",
        "subject", "emailBody", "reviewerNote", "updatedAt",
      ] as const;
      productFields.forEach((field) => { next[field] = seed[field] as never; });
    }
    next.niche = live.niche || seed.niche;
    next.parentGroup = live.parentGroup || seed.parentGroup;
    next.sourceCheckedAt = live.sourceCheckedAt || seed.sourceCheckedAt;
    next.researchBatch = live.researchBatch || seed.researchBatch;
    next.reviewRank = live.reviewRank ?? seed.reviewRank;
    if (migrateToThreeRoleProduct) next.reviewRank = seed.reviewRank;
    next.holdReason = live.holdReason || seed.holdReason;
    next.sentAt = live.sentAt || seed.sentAt;
    next.repliedAt = live.repliedAt || seed.repliedAt;
    next.replyOutcome = live.replyOutcome || seed.replyOutcome;

    if (seed.sentAt && !live.sentAt && !["won", "meeting", "bounced", "not_interested", "replied"].includes(live.status)) {
      next.status = seed.status;
    }
    if (seed.repliedAt && !live.repliedAt && !["won", "meeting", "not_interested", "bounced"].includes(live.status)) {
      next.status = "replied";
    }
    if (seed.sentAt && live.draftKind !== "follow_up") {
      next.approvedSnapshot = null;
      next.approvedAt = null;
    }

    const activity = [...(live.activity || [])];
    for (const item of seed.activity || []) {
      const duplicateSend = item.type === "sent" && activity.some((existing) => existing.type === "sent");
      if (!activity.some((existing) => existing.id === item.id) && !duplicateSend) activity.push(item);
    }
    next.activity = activity;
    if (seed.id === "sweet-smiling" && !live.notes) next.notes = seed.reviewerNote;
    result[index] = next;
  }
  return result;
}

export function saveOpportunities(opportunities: Opportunity[]) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
  }
}

export function loadOpportunities() {
  if (typeof window === "undefined") return [];
  const saved = window.localStorage.getItem(STORAGE_KEY);
  let current: Opportunity[] = [];

  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed) || parsed.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
        throw new Error("Invalid saved workspace.");
      }
      current = parsed.map((item) => normalize(item));
    } catch {
      throw new Error("Saved data could not be read. It has been kept intact. Export the raw backup before recovery.");
    }
  }

  const reconciled = reconcileSnapshot(current);
  if (saved && !window.localStorage.getItem(SNAPSHOT_BACKUP_KEY)) {
    window.localStorage.setItem(SNAPSHOT_BACKUP_KEY, saved);
  }
  saveOpportunities(reconciled);
  return reconciled;
}

export function importOpportunities(current: Opportunity[], incoming: unknown[]) {
  if (!Array.isArray(incoming) || incoming.length > MAX_CONTACTS) {
    throw new Error(`Choose a JSON array with up to ${MAX_CONTACTS.toLocaleString()} contacts.`);
  }
  const created: Opportunity[] = [];
  let skipped = 0;

  for (const raw of incoming) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)
      || !stringValue((raw as Record<string, unknown>).businessName).trim()) {
      skipped += 1;
      continue;
    }
    const candidate = normalize(raw as Record<string, unknown>);
    if ([...current, ...created].some((record) => sameBusiness(record, candidate))) {
      skipped += 1;
      continue;
    }
    Object.assign(candidate, {
      status: "review",
      approvedAt: null,
      approvedSnapshot: null,
      sentAt: null,
      repliedAt: null,
      nextFollowUpAt: null,
      meetingAt: null,
      depositAmount: null,
      replyOutcome: null,
      lastSentSnapshot: null,
      activity: [],
      draftKind: "initial",
    });
    created.push(candidate);
  }

  const opportunities = [...current, ...created];
  saveOpportunities(opportunities);
  return { opportunities, created, skipped };
}

export function settings(): WorkspaceSettings {
  try {
    const saved = JSON.parse(window.localStorage.getItem(SETTINGS_KEY) || "{}");
    return {
      senderEmail: stringValue(saved.senderEmail, "paul.business77@gmail.com"),
      dailyReviewTarget: Math.max(1, Math.min(100, Number(saved.dailyReviewTarget) || 10)),
    };
  } catch {
    return { senderEmail: "paul.business77@gmail.com", dailyReviewTarget: 10 };
  }
}

export function saveSettings(value: WorkspaceSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(value));
}

export function downloadFile(name: string, content: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export function downloadOpportunities(opportunities: Opportunity[]) {
  downloadFile(
    `outreach-backup-${new Date().toISOString().slice(0, 10)}.json`,
    JSON.stringify({ version: 2, exportedAt: new Date().toISOString(), opportunities, settings: settings() }, null, 2),
  );
}

export function csvExport(opportunities: Opportunity[]) {
  const fields = [
    "businessName", "contactName", "contactEmail", "niche", "portfolioTool",
    "campaign", "status", "sentAt", "repliedAt", "replyOutcome",
    "nextFollowUpAt", "subject", "emailBody", "emailSourceUrl", "notes",
  ] as const;
  const escape = (value: unknown) => {
    let string = String(value ?? "");
    if (/^[=+@\-\t\r]/.test(string)) string = `'${string}`;
    return `"${string.replace(/"/g, '""')}"`;
  };
  return [
    fields.join(","),
    ...opportunities.map((item) => fields.map((field) => escape(item[field])).join(",")),
  ].join("\r\n");
}

export function restoreBackup(current: Opportunity[], raw: unknown) {
  const parsed = raw as { version?: number; opportunities?: unknown[] };
  if (parsed?.version !== 2 || !Array.isArray(parsed.opportunities) || parsed.opportunities.length > MAX_CONTACTS) {
    throw new Error("Choose a version 2 workspace backup; use Import research for prospect arrays.");
  }
  const result = [...current];
  for (const entry of parsed.opportunities) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error("Backup contains an invalid record. Nothing restored.");
    }
    const incoming = normalize(entry as Record<string, unknown>);
    const index = result.findIndex((record) => sameBusiness(record, incoming));
    if (index < 0) {
      incoming.approvedAt = null;
      incoming.approvedSnapshot = null;
      if (incoming.status === "approved") incoming.status = "review";
      result.push(incoming);
      continue;
    }

    const live = result[index];
    const chosen = Date.parse(incoming.updatedAt) > Date.parse(live.updatedAt) ? incoming : live;
    const activity = new Map(
      [...(live.activity || []), ...(incoming.activity || [])].map((item) => [item.id, item]),
    );
    const restored: Opportunity = {
      ...chosen,
      id: live.id,
      sentAt: live.sentAt || incoming.sentAt,
      repliedAt: live.repliedAt || incoming.repliedAt,
      meetingAt: live.meetingAt || incoming.meetingAt,
      depositAmount: Math.max(live.depositAmount || 0, incoming.depositAmount || 0) || null,
      doNotContact: live.doNotContact || incoming.doNotContact,
      activity: [...activity.values()],
      approvedAt: null,
      approvedSnapshot: null,
    };
    restored.status = restored.doNotContact ? "not_interested"
      : restored.depositAmount ? "won"
      : restored.meetingAt ? "meeting"
      : restored.repliedAt ? "replied"
      : restored.sentAt ? "sent"
      : chosen.status === "approved" ? "review"
      : chosen.status;
    result[index] = restored;
  }
  saveOpportunities(result);
  return result;
}
