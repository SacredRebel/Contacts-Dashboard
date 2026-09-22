export type TeamMemberId = "paul" | "mark" | "jonathan";
export type Pipeline = "capital" | "architect" | "contractor";
export type RelationshipStage =
  | "new"
  | "research"
  | "ready"
  | "contacted"
  | "replied"
  | "verification"
  | "qualified"
  | "call"
  | "nda"
  | "diligence"
  | "proposal"
  | "active"
  | "won"
  | "nurture"
  | "hold"
  | "inactive";

export type InteractionType =
  | "call"
  | "email"
  | "text"
  | "meeting"
  | "voice"
  | "note"
  | "document"
  | "introduction"
  | "status"
  | "task";

export type TaskStatus = "todo" | "in_progress" | "waiting" | "done" | "canceled";
export type Confidentiality = "public" | "internal" | "confidential" | "restricted";

export type TeamMember = {
  id: TeamMemberId;
  name: string;
  color: string;
  initials: string;
};

export type Interaction = {
  id: string;
  userId: TeamMemberId;
  type: InteractionType;
  at: string;
  summary: string;
  transcript?: string;
  important?: boolean;
  relatedTaskId?: string;
  relatedDocumentId?: string;
};

export type Task = {
  id: string;
  title: string;
  details?: string;
  assignedTo: TeamMemberId;
  createdBy: TeamMemberId;
  dueAt?: string | null;
  status: TaskStatus;
  priority: "low" | "normal" | "high";
  createdAt: string;
  completedAt?: string | null;
};

export type ContactDocument = {
  id: string;
  title: string;
  type:
    | "proposal"
    | "teaser"
    | "nda"
    | "proof_of_funds"
    | "term_sheet"
    | "quote"
    | "catalog"
    | "meeting_notes"
    | "call_brief"
    | "handoff"
    | "email"
    | "other";
  confidentiality: Confidentiality;
  url?: string;
  content?: string;
  version: number;
  createdBy: TeamMemberId;
  createdAt: string;
  sentAt?: string | null;
};

export type Connection = {
  id: string;
  contactId: string;
  relationship:
    | "introduced"
    | "works_with"
    | "represents"
    | "partner"
    | "invested_with"
    | "broker_for"
    | "architect_for"
    | "contractor_for"
    | "referred"
    | "other";
  note?: string;
  createdBy: TeamMemberId;
  createdAt: string;
};

export type CapitalProfile = {
  capitalType: string;
  directness:
    | "Direct principal"
    | "Managed capital"
    | "Authorized professional"
    | "Representative"
    | "Broker"
    | "Introducer"
    | "Network / platform"
    | "Unknown"
    | string;
  decisionMakerStatus:
    | "Unknown"
    | "Not the decision-maker"
    | "Decision-maker claimed"
    | "Decision-maker confirmed";
  entityStatus: string;
  mandate: string;
  sizeRange: string;
  capacityStatus:
    | "Not requested"
    | "Requested"
    | "Received"
    | "Under review"
    | "Verified"
    | "Insufficient / unclear";
  disclosureLevel:
    | "Public only"
    | "Public teaser"
    | "Selected transaction info"
    | "Confidential proposal"
    | "Data room"
    | string;
  ndaStatus: "Not started" | "Requested" | "Sent" | "Signed" | "Not required";
  diligenceStatus: "Not started" | "Initial" | "Active" | "Complete" | "Stopped";
  riskFlags: string;
};

export type RelationshipContact = {
  id: string;
  name: string;
  organization: string;
  title: string;
  pipeline: Pipeline;
  category: string;
  email: string;
  phone: string;
  website: string;
  linkedin: string;
  location: string;
  priority: string;
  score: number;
  stage: RelationshipStage;
  nextAction: string;
  nextActionDue: string | null;
  publicObservation: string;
  outreachHook: string;
  professionalThemes: string;
  materialFit: string;
  sourceUrl: string;
  verificationUrl: string;
  emailConfidence: string;
  researchDepth: string;
  warnings: string;
  alignmentTags: string[];
  notionUrl?: string;
  owner: TeamMemberId | null;
  capital?: CapitalProfile;
  interactions: Interaction[];
  tasks: Task[];
  documents: ContactDocument[];
  connections: Connection[];
};

export type WorkspaceSnapshot = {
  version: 1;
  updatedAt: string;
  contacts: RelationshipContact[];
};

export const TEAM_MEMBERS: Record<TeamMemberId, TeamMember> = {
  paul: { id: "paul", name: "Paul", color: "#7c3aed", initials: "P" },
  mark: { id: "mark", name: "Mark", color: "#0f766e", initials: "M" },
  jonathan: { id: "jonathan", name: "Jonathan", color: "#ea580c", initials: "J" },
};

export const STAGE_LABELS: Record<RelationshipStage, string> = {
  new: "New",
  research: "Research",
  ready: "Ready",
  contacted: "Contacted",
  replied: "Replied",
  verification: "Verification",
  qualified: "Qualified",
  call: "Call",
  nda: "NDA",
  diligence: "Diligence",
  proposal: "Proposal",
  active: "Active",
  won: "Won",
  nurture: "Nurture",
  hold: "Hold",
  inactive: "Inactive",
};

export const PIPELINE_LABELS: Record<Pipeline, string> = {
  capital: "Capital",
  architect: "Architects",
  contractor: "Contractors",
};
