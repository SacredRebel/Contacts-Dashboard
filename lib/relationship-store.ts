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

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? "").replace(/\r?\n/g, " ").trim();
  return '"' + text.replace(/"/g, '""') + '"';
}

export function exportContactsCsv(contacts: RelationshipContact[]) {
  const headers = [
    "Pipeline", "Name", "Organization", "Title", "Email", "Phone", "Stage", "Priority", "Score",
    "Next Action", "Next Action Due", "Category", "Professional Themes", "Public Observation",
    "Outreach Hook", "Material Fit", "Warnings",
  ];
  const rows = contacts.map((contact) => [
    contact.pipeline,
    contact.name,
    contact.organization,
    contact.title,
    contact.email,
    contact.phone,
    contact.stage,
    contact.priority,
    contact.score,
    contact.nextAction,
    contact.nextActionDue,
    contact.category,
    contact.professionalThemes,
    contact.publicObservation,
    contact.outreachHook,
    contact.materialFit,
    contact.warnings,
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "relationship-contacts-" + new Date().toISOString().slice(0, 10) + ".csv";
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

export type EmailStrategy =
  | "smart"
  | "cold_research"
  | "short_50"
  | "value_first"
  | "check_in"
  | "proposal"
  | "nda"
  | "capital_qualify"
  | "referral"
  | "followup_3"
  | "breakup_10"
  | "custom";

function firstName(contact: RelationshipContact) {
  return contact.name && !/team|desk|office|contact/i.test(contact.name)
    ? contact.name.split(" ")[0]
    : "there";
}

function cleanSentence(value: string) {
  return value.trim().replace(/[.?!]+$/, "");
}

function contactReason(contact: RelationshipContact) {
  return cleanSentence(
    contact.publicObservation ||
    contact.outreachHook ||
    contact.materialFit ||
    contact.professionalThemes ||
    contact.category ||
    "your work",
  );
}

function pipelineOffer(contact: RelationshipContact) {
  if (contact.pipeline === "capital") {
    return "a regenerative real-estate opportunity where we qualify fit before sharing non-public transaction material";
  }
  if (contact.pipeline === "architect") {
    return "a European building-material sourcing and RFQ route for high-performance, regenerative and design-led projects";
  }
  return "a direct European construction-material sourcing and RFQ route for contractors and development teams";
}

function pipelineCta(contact: RelationshipContact) {
  if (contact.pipeline === "capital") {
    return "If it fits your mandate, I can send the public teaser and coordinate the right next conversation.";
  }
  if (contact.pipeline === "architect") {
    return "Would it be useful if I sent the short material overview and sourcing route?";
  }
  return "Would it be useful if I sent the catalog / RFQ overview to the right preconstruction or procurement contact?";
}

function signature() {
  return "Paul\n\nReply \"no\" and I won’t follow up.";
}

export function draftEmail(
  contact: RelationshipContact,
  touch: 0 | 3 | 10 = 0,
  strategy: EmailStrategy = "smart",
  customInstruction = "",
  variant = 0,
) {
  const first = firstName(contact);
  const reason = contactReason(contact);
  const offer = pipelineOffer(contact);
  const cta = pipelineCta(contact);
  const variantIndex = Math.abs(variant) % 3;

  if (touch === 3 || strategy === "followup_3") {
    const details = [
      contact.materialFit || contact.outreachHook || "the fit I mentioned",
      contact.publicObservation || contact.professionalThemes || "the reason I reached out",
      contact.pipeline === "capital" ? "the mandate and direct-capital fit" : "the sourcing / project fit",
    ];
    const subject = contact.pipeline === "capital" ? "one detail" : "one more detail";
    return {
      subject,
      body:
        "Hi " + first + ",\n\n" +
        "One thing I didn’t mention: " + cleanSentence(details[variantIndex]) + ".\n\n" +
        (contact.pipeline === "capital"
          ? "Before anything non-public moves, I’d rather confirm whether you participate directly, advise the capital, or introduce the principal."
          : "If there’s a better person for specifications, procurement or RFQs, I’m happy to send it there instead.") +
        "\n\nNo need to reply if it’s not relevant.\n\nPaul",
    };
  }

  if (touch === 10 || strategy === "breakup_10") {
    const closes = [
      "I’ll close the loop after this.",
      "Last note from me and I’ll leave it here.",
      "I’ll make this my last message on it.",
    ];
    return {
      subject: "close the loop",
      body:
        "Hi " + first + ",\n\n" +
        closes[variantIndex] + " " +
        (contact.pipeline === "capital"
          ? "If this type of opportunity is outside your mandate, no problem."
          : "If this isn’t relevant to current projects, no problem.") +
        " If there’s a better person or a better time, a quick direction is enough.\n\nPaul",
    };
  }

  if (strategy === "check_in") {
    const openers = [
      "Wanted to check back in on where this sits.",
      "Quick check-in on this relationship.",
      "Circling back because there may be a useful next step here.",
    ];
    return {
      subject: "quick check-in",
      body:
        "Hi " + first + ",\n\n" +
        openers[variantIndex] + " " +
        (contact.nextAction ? "The last next step on my side was: " + cleanSentence(contact.nextAction) + "." : "") +
        "\n\nIf priorities changed, no issue — just point me in the right direction.\n\nPaul",
    };
  }

  if (strategy === "proposal") {
    return {
      subject: "proposal",
      body:
        "Hi " + first + ",\n\n" +
        "I put together the proposal around " + reason + ". It’s focused on the concrete next step rather than a broad service list.\n\n" +
        "If the direction looks right, I can tighten the scope and move the working pieces forward.\n\nPaul",
    };
  }

  if (strategy === "nda") {
    return {
      subject: "nda",
      body:
        "Hi " + first + ",\n\n" +
        "Before we move into the non-public material, I’d like to get the confidentiality step handled cleanly. " +
        "I can send our NDA, or I’m happy to review yours if that’s easier.\n\n" +
        "Once that’s in place, we can move into the appropriate documents.\n\nPaul",
    };
  }

  if (strategy === "capital_qualify") {
    return {
      subject: "capital fit",
      body:
        "Hi " + first + ",\n\n" +
        (contact.publicObservation ? reason + " is what put you on my radar. " : "") +
        "Before I send anything beyond public material, I want to make sure I understand the capital role correctly. " +
        "Do you participate directly, represent the decision-maker, or make introductions — and what rough transaction range / mandate do you typically work within?\n\nPaul",
    };
  }

  if (strategy === "referral") {
    return {
      subject: "right person",
      body:
        "Hi " + first + ",\n\n" +
        "I’m reaching out because of " + reason + ". " +
        "The fit on my side is " + offer + ".\n\n" +
        "If this belongs with someone else on your team, who would be the right person for me to contact?\n\nPaul",
    };
  }

  if (strategy === "short_50") {
    const observations = [
      reason,
      cleanSentence(contact.outreachHook || reason),
      cleanSentence(contact.materialFit || reason),
    ];
    return {
      subject: contact.pipeline === "capital" ? "capital fit" : contact.pipeline === "architect" ? "material fit" : "project sourcing",
      body:
        observations[variantIndex] + ".\n\n" +
        "I’m working on " + offer + ". " +
        cta + "\n\nPaul",
    };
  }

  if (strategy === "value_first") {
    const valueLine = contact.pipeline === "capital"
      ? "I can send a public-only teaser first so you can decide whether it belongs in your mandate before either side spends time on diligence."
      : "I can send a short, concrete overview first so you can decide whether it belongs in an active project before anyone gets pulled into a meeting.";
    return {
      subject: contact.pipeline === "capital" ? "public teaser" : "useful overview",
      body:
        "Hi " + first + ",\n\n" +
        reason + " is what made me think this may be worth putting in front of you.\n\n" +
        valueLine + "\n\n" +
        "If it’s useful, I’ll send it over. If not, no problem.\n\nPaul",
    };
  }

  if (strategy === "custom") {
    const instruction = cleanSentence(customInstruction || "send a concise, specific note about the next step");
    return {
      subject: "next step",
      body:
        "Hi " + first + ",\n\n" +
        reason + " is the context. " +
        "I wanted to reach out about " + instruction.toLowerCase() + ".\n\n" +
        "I’ll keep it simple: " + cta + "\n\nPaul",
    };
  }

  if (strategy === "cold_research" || strategy === "smart") {
    if (contact.pipeline === "capital") {
      const directness = contact.capital?.directness || "Unknown";
      const qualifier =
        /broker|introducer|representative|unknown/i.test(directness)
          ? "Before anything non-public moves, could you clarify whether you are the direct decision-maker for the capital or representing / introducing the party that is?"
          : "Could you share how you typically participate in transactions like this and what mandate or sizing parameters you would want us to confirm first?";
      const openings = [
        contact.publicObservation ? reason + "." : "I’m reaching out regarding a regenerative real-estate development opportunity in California.",
        contact.publicObservation ? "Your public focus on " + reason + " is what put you on my radar." : "I’m selectively mapping capital partners for a regenerative real-estate opportunity in California.",
        contact.publicObservation ? reason + " looked relevant to something we’re working on." : "I’m looking for a very specific capital fit for a regenerative California development.",
      ];
      return {
        subject: variantIndex === 1 ? "capital mandate" : "regenerative real estate",
        body:
          "Hi " + first + ",\n\n" +
          openings[variantIndex] + "\n\n" +
          qualifier +
          "\n\nIf there’s a fit, I can send the public teaser and coordinate the right next conversation.\n\nPaul",
      };
    }

    const openings = [
      "I noticed " + reason + ".",
      reason + " is what caught my attention.",
      "I was looking through " + contact.organization + " and " + reason.toLowerCase() + " stood out.",
    ];
    const fit = contact.materialFit || contact.professionalThemes || contact.outreachHook || "future project specifications";
    return {
      subject: contact.pipeline === "architect" ? "material collaboration" : "project sourcing",
      body:
        "Hi " + first + ",\n\n" +
        openings[variantIndex] + "\n\n" +
        "I’m building " + offer + ". " +
        "The possible fit I saw is around " + cleanSentence(fit) + ".\n\n" +
        cta + "\n\n" + signature(),
    };
  }

  return draftEmail(contact, touch, "smart", customInstruction, variant);
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

