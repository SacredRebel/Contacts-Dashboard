import seed from "@/data/relationship-contacts.json";
import {
  PIPELINE_LABELS,
  STAGE_LABELS,
  type ContactDocument,
  type Interaction,
  type RelationshipContact,
  type TeamMemberId,
  type Task,
  type WorkspaceSnapshot,
} from "@/lib/relationship-types";

const STORAGE_KEY = "unified-relationship-outreach:v1";
const LAST_SEEN_KEY = "unified-relationship-outreach:last-seen";
const USER_KEY = "unified-relationship-outreach:active-user";
const TEAM_CODE_KEY = "unified-relationship-outreach:team-code";

type SeedShape = {
  contacts: RelationshipContact[];
};

function now() {
  return new Date().toISOString();
}

export function uid(prefix = "id") {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return prefix + "-" + crypto.randomUUID();
  }
  return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
}

function cleanContact(input: RelationshipContact): RelationshipContact {
  return {
    ...input,
    name: input.name || input.organization || "Unknown contact",
    organization: input.organization || "",
    title: input.title || "",
    email: input.email || "",
    phone: input.phone || "",
    website: input.website || "",
    linkedin: input.linkedin || "",
    nextAction: input.nextAction || "",
    nextActionDue: input.nextActionDue || null,
    interactions: Array.isArray(input.interactions) ? input.interactions : [],
    tasks: Array.isArray(input.tasks) ? input.tasks : [],
    documents: Array.isArray(input.documents) ? input.documents : [],
    connections: Array.isArray(input.connections) ? input.connections : [],
    alignmentTags: Array.isArray(input.alignmentTags) ? input.alignmentTags : [],
  };
}

export function seedContacts(): RelationshipContact[] {
  return ((seed as SeedShape).contacts || []).map((contact) => cleanContact(contact));
}

export function loadContacts(): RelationshipContact[] {
  if (typeof window === "undefined") return seedContacts();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const contacts = seedContacts();
    saveContacts(contacts);
    return contacts;
  }
  try {
    const parsed = JSON.parse(stored) as WorkspaceSnapshot;
    const contacts = Array.isArray(parsed.contacts) ? parsed.contacts.map(cleanContact) : seedContacts();
    const existingIds = new Set(contacts.map((contact) => contact.id));
    for (const item of seedContacts()) {
      if (!existingIds.has(item.id)) contacts.push(item);
    }
    return contacts;
  } catch {
    return seedContacts();
  }
}

export function saveContacts(contacts: RelationshipContact[]) {
  if (typeof window === "undefined") return;
  const snapshot: WorkspaceSnapshot = { version: 1, updatedAt: now(), contacts };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

export function exportWorkspace(contacts: RelationshipContact[]) {
  const snapshot: WorkspaceSnapshot = { version: 1, updatedAt: now(), contacts };
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "relationship-outreach-backup-" + new Date().toISOString().slice(0, 10) + ".json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importWorkspace(file: File): Promise<RelationshipContact[]> {
  if (file.size > 10_000_000) throw new Error("Choose a JSON file smaller than 10 MB.");
  const raw = JSON.parse(await file.text()) as WorkspaceSnapshot | RelationshipContact[];
  const contacts = Array.isArray(raw) ? raw : raw.contacts;
  if (!Array.isArray(contacts)) throw new Error("That file does not contain a contact workspace.");
  return contacts.map(cleanContact);
}

export function activeUser(): TeamMemberId {
  if (typeof window === "undefined") return "paul";
  const value = window.localStorage.getItem(USER_KEY);
  return value === "mark" || value === "jonathan" ? value : "paul";
}

export function setActiveUser(userId: TeamMemberId) {
  window.localStorage.setItem(USER_KEY, userId);
}

export function teamCode() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(TEAM_CODE_KEY) || "";
}

export function setTeamCode(value: string) {
  if (!value) window.sessionStorage.removeItem(TEAM_CODE_KEY);
  else window.sessionStorage.setItem(TEAM_CODE_KEY, value);
}

export function previousLastSeen() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(LAST_SEEN_KEY);
}

export function markSeen() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_SEEN_KEY, now());
}

export function makeInteraction(
  userId: TeamMemberId,
  type: Interaction["type"],
  summary: string,
  transcript?: string,
): Interaction {
  return { id: uid("interaction"), userId, type, at: now(), summary, transcript };
}

export function makeTask(
  title: string,
  assignedTo: TeamMemberId,
  createdBy: TeamMemberId,
  dueAt?: string | null,
  details?: string,
): Task {
  return {
    id: uid("task"),
    title,
    details,
    assignedTo,
    createdBy,
    dueAt: dueAt || null,
    status: "todo",
    priority: "normal",
    createdAt: now(),
    completedAt: null,
  };
}

export function makeDocument(
  title: string,
  type: ContactDocument["type"],
  confidentiality: ContactDocument["confidentiality"],
  createdBy: TeamMemberId,
  content?: string,
  url?: string,
): ContactDocument {
  return {
    id: uid("document"),
    title,
    type,
    confidentiality,
    createdBy,
    createdAt: now(),
    content,
    url,
    version: 1,
    sentAt: null,
  };
}

export function relationshipDepth(contact: RelationshipContact) {
  const interactions = contact.interactions || [];
  if (!interactions.length) return { label: "New", score: 0 };
  const daysSince = Math.max(
    0,
    Math.floor((Date.now() - Date.parse(interactions[interactions.length - 1]?.at || now())) / 86_400_000),
  );
  const meetings = interactions.filter((item) => item.type === "call" || item.type === "meeting").length;
  const documents = contact.documents.length;
  const score = Math.min(100, interactions.length * 7 + meetings * 9 + documents * 4);
  if (daysSince > 60) return { label: "Dormant", score };
  if (score >= 70) return { label: "Deep", score };
  if (score >= 35) return { label: "Active", score };
  return { label: "Developing", score };
}

export function nextOpenTask(contact: RelationshipContact) {
  return contact.tasks
    .filter((task) => !["done", "canceled"].includes(task.status))
    .sort((a, b) => {
      if (!a.dueAt && !b.dueAt) return b.createdAt.localeCompare(a.createdAt);
      if (!a.dueAt) return 1;
      if (!b.dueAt) return -1;
      return a.dueAt.localeCompare(b.dueAt);
    })[0];
}

export function contactHeadline(contact: RelationshipContact) {
  const task = nextOpenTask(contact);
  if (task) return task.title;
  return contact.nextAction || "No action queued";
}

function intro(contact: RelationshipContact) {
  return [contact.name, contact.title, contact.organization].filter(Boolean).join(" — ");
}

export function generateHandoff(contact: RelationshipContact) {
  const last = [...contact.interactions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5);
  const capital = contact.capital
    ? [
        "Capital role: " + contact.capital.capitalType,
        "Direct vs intermediary: " + contact.capital.directness,
        "Decision-maker: " + contact.capital.decisionMakerStatus,
        "Capacity: " + contact.capital.capacityStatus,
        "Disclosure: " + contact.capital.disclosureLevel,
      ].join("\n")
    : "";
  return [
    "HANDOFF — " + intro(contact),
    "",
    "Why this contact matters",
    contact.publicObservation || contact.outreachHook || contact.category,
    "",
    "Current stage",
    STAGE_LABELS[contact.stage] + " / " + PIPELINE_LABELS[contact.pipeline],
    "",
    "Next action",
    contactHeadline(contact),
    contact.nextActionDue ? "Due: " + new Date(contact.nextActionDue).toLocaleString() : "",
    "",
    capital,
    capital ? "" : "",
    "Recent relationship history",
    ...(last.length
      ? last.map((item) => new Date(item.at).toLocaleString() + " — " + item.type.toUpperCase() + " — " + item.summary)
      : ["No logged interactions yet."]),
    "",
    "Documents",
    contact.documents.length
      ? contact.documents.map((doc) => doc.title + " [" + doc.confidentiality + "]").join("\n")
      : "No documents attached.",
    "",
    "Warnings / open questions",
    contact.warnings || "None recorded.",
  ].filter((line) => line !== undefined).join("\n");
}

export function generateCallBrief(contact: RelationshipContact) {
  const recent = [...contact.interactions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  const capitalQuestions = contact.capital
    ? [
        "Confirm whether this person is direct principal, authorized investment professional, broker or introducer.",
        "Confirm who controls the transaction decision.",
        "Confirm mandate, check/loan size, geography, asset type and timing.",
        "Do not increase disclosure level without identity/role verification.",
        "Capacity status: " + contact.capital.capacityStatus + ".",
      ]
    : [
        "Confirm the current project or business need.",
        "Confirm who owns the next decision.",
        "Agree on one concrete next step and timing.",
      ];
  return [
    "CALL BRIEF — " + intro(contact),
    "",
    "Public context",
    contact.publicObservation || "No public observation recorded.",
    "",
    "Current next action",
    contactHeadline(contact),
    "",
    "Questions to resolve",
    ...capitalQuestions.map((item) => "• " + item),
    "",
    "Recent interactions",
    ...(recent.length ? recent.map((item) => "• " + item.summary) : ["• No interaction history yet."]),
  ].join("\n");
}

export function generateProposalBrief(contact: RelationshipContact) {
  const safeDisclosure = contact.capital?.disclosureLevel || "Internal";
  return [
    "PROPOSAL WORKING BRIEF",
    "",
    "Prepared for: " + intro(contact),
    "Pipeline: " + PIPELINE_LABELS[contact.pipeline],
    "Disclosure level: " + safeDisclosure,
    "",
    "Public / verified context",
    contact.publicObservation || "Add verified context before finalizing.",
    "",
    "Opportunity / fit",
    contact.materialFit || contact.outreachHook || contact.professionalThemes || "To be confirmed.",
    "",
    "Requested / next step",
    contactHeadline(contact),
    "",
    "Relationship notes",
    contact.interactions.length
      ? [...contact.interactions].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 5).map((item) => "• " + item.summary).join("\n")
      : "No relationship notes yet.",
    "",
    "Human review required before external use.",
  ].join("\n");
}

export function generateMeetingNotes(contact: RelationshipContact) {
  return [
    "MEETING / CALL NOTES — " + intro(contact),
    "",
    "Date",
    new Date().toLocaleString(),
    "",
    "People present",
    contact.name + (contact.organization ? " — " + contact.organization : ""),
    "",
    "Context",
    contact.publicObservation || contact.outreachHook || "Add context.",
    "",
    "Discussion",
    "",
    "Decisions / commitments",
    "",
    "Documents requested",
    "",
    "Open questions",
    contact.capital
      ? "• Direct principal / intermediary?\n• Actual decision-maker?\n• Mandate and size?\n• Capacity / proof status?\n• Safe disclosure level?"
      : "• Who owns the next decision?\n• What exact project / sourcing need exists?\n• What is the agreed next step?",
    "",
    "Next action",
    contactHeadline(contact),
  ].join("\n");
}

export function generateDueDiligenceRequest(contact: RelationshipContact) {
  const capital = contact.capital;
  return [
    "DUE-DILIGENCE / QUALIFICATION WORKING REQUEST",
    "",
    "Counterparty: " + intro(contact),
    "",
    "Purpose",
    "Confirm identity, transaction authority, mandate and appropriate financial capacity before advancing sensitive diligence.",
    "",
    "Items to confirm",
    "• Legal entity / operating entity",
    "• Current role and authority",
    "• Direct principal, managed capital, broker, introducer or representative",
    "• Actual transaction decision-maker",
    "• Investment / lending mandate",
    "• Typical transaction size and current appetite",
    "• Geography and asset / project fit",
    "• Expected timing and internal approval process",
    "• Appropriate evidence of capacity / proof of funds when warranted",
    "• Any intermediary economics / fees disclosed before diligence",
    "",
    "Current platform status",
    "Directness: " + (capital?.directness || "Unknown"),
    "Decision-maker: " + (capital?.decisionMakerStatus || "Unknown"),
    "Entity: " + (capital?.entityStatus || "Pending"),
    "Capacity: " + (capital?.capacityStatus || "Not requested"),
    "Disclosure: " + (capital?.disclosureLevel || "Public only"),
    "",
    "Important",
    "This is a working checklist. Use counsel / transaction-specific judgment before requesting or sharing regulated, confidential or sensitive financial material.",
  ].join("\n");
}

export function generatePublicTeaserPackage(contact: RelationshipContact) {
  return [
    "PUBLIC TEASER PACKAGE — WORKING COVER",
    "",
    "Prepared for: " + intro(contact),
    "",
    "Permitted level",
    "PUBLIC / NON-CONFIDENTIAL ONLY",
    "",
    "Why this outreach may fit",
    contact.publicObservation || contact.professionalThemes || contact.outreachHook || "Public alignment to be confirmed.",
    "",
    "Package checklist",
    "• Public project teaser",
    "• High-level development vision",
    "• Public location / market context only as approved",
    "• High-level use-of-funds framing only as approved",
    "• Contact / call request",
    "",
    "Do not include at this stage",
    "• Raw title / ownership records",
    "• Non-public debt or lender records",
    "• Private appraisals",
    "• Bank statements / reserves",
    "• Confidential partner information",
    "• Data-room access",
    "",
    "Next gate",
    "Verify identity, role and fit before increasing disclosure.",
  ].join("\n");
}

export function generateInformationPack(contact: RelationshipContact) {
  const audience = contact.pipeline === "architect" ? "ARCHITECT" : "CONTRACTOR / BUILDER";
  return [
    audience + " INFORMATION PACK — WORKING BRIEF",
    "",
    "Prepared for: " + intro(contact),
    "",
    "Public project / professional context",
    contact.publicObservation || "Add verified public context.",
    "",
    "Relevant professional themes",
    contact.professionalThemes || "To be confirmed.",
    "",
    "Potential material / sourcing fit",
    contact.materialFit || contact.outreachHook || "To be confirmed.",
    "",
    "Suggested package",
    "• Short European material overview",
    "• RFQ / sourcing process",
    "• Product categories relevant to their work",
    "• Lead-time / logistics questions to confirm",
    "• Route to quote / specification conversation",
    "",
    "Next action",
    contactHeadline(contact),
  ].join("\n");
}

export function draftEmail(contact: RelationshipContact, touch: 0 | 3 | 10 = 0) {
  const first = contact.name && !/team|desk|office|contact/i.test(contact.name) ? contact.name.split(" ")[0] : "there";

  if (touch === 3) {
    if (contact.pipeline === "capital") {
      return {
        subject: "re: regenerative real estate",
        body:
          "Hi " + first + ",\n\n" +
          "Following up with one point that may help determine fit: we are screening for the actual capital role and mandate before moving beyond public materials. " +
          "If this is within your lane, could you tell me whether you participate directly or as an advisor / introducer, and the rough transaction range you typically consider?\n\nPaul",
      };
    }
    return {
      subject: contact.pipeline === "architect" ? "re: material collaboration" : "re: project sourcing",
      body:
        "Hi " + first + ",\n\n" +
        "One quick follow-up: " +
        (contact.materialFit || contact.outreachHook || "the sourcing / project fit") +
        " is the reason I thought this could be relevant. " +
        "If there is a better person for specifications, procurement or RFQs, I’m happy to contact them instead.\n\nPaul",
    };
  }

  if (touch === 10) {
    return {
      subject: contact.pipeline === "capital" ? "close the loop" : "close the loop",
      body:
        "Hi " + first + ",\n\n" +
        "I’ll close the loop after this. If " +
        (contact.pipeline === "capital" ? "this type of opportunity is outside your mandate" : "this is not relevant to your current projects") +
        ", no problem. If there is a better person or a later time, a quick direction is enough.\n\nPaul",
    };
  }

  if (contact.pipeline === "capital") {
    const directness = contact.capital?.directness || "Unknown";
    const qualifier =
      /broker|introducer|representative|unknown/i.test(directness)
        ? "Before I send anything beyond the public overview, could you clarify whether you are the direct decision-maker for the capital or representing / introducing the party that is?"
        : "Could you share how you typically participate in transactions like this and what mandate or sizing parameters you would want us to confirm first?";
    return {
      subject: "regenerative real estate",
      body:
        "Hi " + first + ",\n\n" +
        (contact.publicObservation
          ? "I came across " + contact.organization + " and noticed " + contact.publicObservation.replace(/\.$/, "") + ".\n\n"
          : "I’m reaching out regarding a regenerative real-estate development opportunity in California.\n\n") +
        "We are speaking selectively with capital partners whose public mandate appears aligned before sharing non-public transaction material. " +
        qualifier +
        "\n\nIf there is a fit, I can send the public teaser and coordinate the right next conversation.\n\nPaul",
    };
  }
  if (contact.pipeline === "architect") {
    return {
      subject: "material collaboration",
      body:
        "Hi " + first + ",\n\n" +
        (contact.publicObservation
          ? "I noticed " + contact.publicObservation.replace(/\.$/, "") + ".\n\n"
          : "I’ve been looking at " + contact.organization + "’s work.\n\n") +
        "We are building a European building-material sourcing and RFQ route around high-performance, regenerative and design-led projects. " +
        "I thought there may be a useful fit around " + (contact.materialFit || contact.professionalThemes || "future project specifications") + ".\n\n" +
        "Would it be useful if I sent the short material overview and sourcing route?\n\nPaul",
    };
  }
  return {
    subject: "project sourcing",
    body:
      "Hi " + first + ",\n\n" +
      (contact.publicObservation
        ? "I noticed " + contact.publicObservation.replace(/\.$/, "") + ".\n\n"
        : "I’ve been looking at " + contact.organization + "’s project work.\n\n") +
      "We are building a direct European construction-material sourcing and RFQ route for contractors and development teams. " +
      "Based on your work, " + (contact.materialFit || "the procurement side") + " looked potentially relevant.\n\n" +
      "Would it be useful if I sent the catalog / RFQ overview to the right preconstruction or procurement contact?\n\nPaul",
  };
}

export function disclosureRank(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("data room")) return 5;
  if (normalized.includes("confidential")) return 4;
  if (normalized.includes("selected")) return 3;
  if (normalized.includes("teaser")) return 2;
  return 1;
}

export function changedSince(contacts: RelationshipContact[], since: string | null) {
  if (!since) return [];
  const cutoff = Date.parse(since);
  const rows: { at: string; contact: RelationshipContact; summary: string; userId?: TeamMemberId }[] = [];
  for (const contact of contacts) {
    for (const interaction of contact.interactions) {
      if (Date.parse(interaction.at) > cutoff) {
        rows.push({ at: interaction.at, contact, summary: interaction.summary, userId: interaction.userId });
      }
    }
    for (const task of contact.tasks) {
      if (Date.parse(task.createdAt) > cutoff) {
        rows.push({ at: task.createdAt, contact, summary: "Task created: " + task.title, userId: task.createdBy });
      }
      if (task.completedAt && Date.parse(task.completedAt) > cutoff) {
        rows.push({ at: task.completedAt, contact, summary: "Task completed: " + task.title, userId: task.assignedTo });
      }
    }
  }
  return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
}

async function cloudRequest(_method: "GET" | "POST", _contacts?: RelationshipContact[]): Promise<RelationshipContact[]> {
  void _method;
  void _contacts;
  throw new Error(
    "Shared cloud sync is not configured yet. Use Export backup / Import backup for cross-device handoff until the shared backend is connected.",
  );
}

export async function pullCloud() {
  return (await cloudRequest("GET")).map(cleanContact);
}

export async function pushCloud(contacts: RelationshipContact[]) {
  return (await cloudRequest("POST", contacts)).map(cleanContact);
}
