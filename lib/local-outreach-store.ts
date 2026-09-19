import { sampleOpportunities } from "@/lib/sample-opportunities";
import type { Opportunity, OpportunityStatus } from "@/lib/types";

const STORAGE_KEY = "pauls-outreach-command-center:v1";

const validStatuses = new Set<OpportunityStatus>([
  "research",
  "review",
  "needs_edit",
  "approved",
  "sent",
  "replied",
  "won",
  "archived",
]);

function idFor(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `opportunity-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" ? value : null;
}

function normalize(raw: Record<string, unknown>): Opportunity {
  const now = new Date().toISOString();
  const status = validStatuses.has(raw.status as OpportunityStatus)
    ? (raw.status as OpportunityStatus)
    : "review";

  return {
    id: idFor(raw.id),
    businessName: text(raw.businessName, "Unnamed business").slice(0, 180),
    website: text(raw.website),
    location: text(raw.location),
    industry: text(raw.industry),
    contactName: text(raw.contactName, "Business team"),
    contactRole: text(raw.contactRole),
    contactEmail: text(raw.contactEmail),
    emailConfidence: ["HIGH", "MEDIUM", "LOW", "NONE"].includes(text(raw.emailConfidence))
      ? (text(raw.emailConfidence) as Opportunity["emailConfidence"])
      : "NONE",
    emailSourceUrl: text(raw.emailSourceUrl),
    fit: ["BEST FIT", "GOOD FIT", "EXPERIMENT"].includes(text(raw.fit))
      ? (text(raw.fit) as Opportunity["fit"])
      : "GOOD FIT",
    score: Math.max(0, Math.min(100, Number(raw.score ?? 50))),
    status,
    signalType: text(raw.signalType, "Research opportunity"),
    signalSummary: text(raw.signalSummary),
    observation: text(raw.observation),
    inference: text(raw.inference),
    offerTitle: text(raw.offerTitle),
    offerScope: text(raw.offerScope),
    priceRange: text(raw.priceRange),
    deliveryTime: text(raw.deliveryTime),
    previewIdea: text(raw.previewIdea),
    subject: text(raw.subject),
    emailBody: text(raw.emailBody),
    reviewerNote: text(raw.reviewerNote),
    sourceUrls: Array.isArray(raw.sourceUrls)
      ? JSON.stringify(raw.sourceUrls.filter((source) => typeof source === "string"))
      : text(raw.sourceUrls, "[]"),
    approvedAt: nullableText(raw.approvedAt),
    sentAt: nullableText(raw.sentAt),
    repliedAt: nullableText(raw.repliedAt),
    nextFollowUpAt: nullableText(raw.nextFollowUpAt),
    createdAt: text(raw.createdAt, now),
    updatedAt: text(raw.updatedAt, now),
  };
}

function seededOpportunities() {
  return sampleOpportunities
    .map((item) => normalize(item as unknown as Record<string, unknown>))
    .sort((a, b) => b.score - a.score);
}

export function loadOpportunities(): Opportunity[] {
  if (typeof window === "undefined") return [];

  const saved = window.localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    const seeded = seededOpportunities();
    saveOpportunities(seeded);
    return seeded;
  }

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new Error("Saved outreach data is not an array.");
    return parsed.map((item) => normalize(item)).sort((a, b) => b.score - a.score);
  } catch {
    const seeded = seededOpportunities();
    saveOpportunities(seeded);
    return seeded;
  }
}

export function saveOpportunities(opportunities: Opportunity[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(opportunities));
}

export function importOpportunities(
  current: Opportunity[],
  incoming: unknown[],
): { opportunities: Opportunity[]; created: Opportunity[]; skipped: number } {
  const knownNames = new Set(current.map((item) => item.businessName.trim().toLowerCase()));
  const knownWebsites = new Set(
    current.map((item) => item.website.trim().toLowerCase()).filter(Boolean),
  );
  const created: Opportunity[] = [];
  let skipped = 0;

  for (const raw of incoming.slice(0, 50)) {
    if (!raw || typeof raw !== "object") continue;
    const candidate = normalize(raw as Record<string, unknown>);
    const name = candidate.businessName.trim().toLowerCase();
    const website = candidate.website.trim().toLowerCase();

    if (knownNames.has(name) || (website && knownWebsites.has(website))) {
      skipped += 1;
      continue;
    }

    candidate.status = "review";
    candidate.updatedAt = new Date().toISOString();
    created.push(candidate);
    knownNames.add(name);
    if (website) knownWebsites.add(website);
  }

  const opportunities = [...created, ...current].sort((a, b) => b.score - a.score);
  saveOpportunities(opportunities);
  return { opportunities, created, skipped };
}

export function downloadOpportunities(opportunities: Opportunity[]) {
  const blob = new Blob([JSON.stringify(opportunities, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `outreach-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
