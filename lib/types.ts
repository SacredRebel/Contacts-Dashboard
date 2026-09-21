export type OpportunityStatus =
  | "research"
  | "review"
  | "needs_edit"
  | "approved"
  | "sent"
  | "replied"
  | "meeting"
  | "bounced"
  | "not_interested"
  | "won"
  | "archived";

export type Opportunity = {
  id: string;
  businessName: string;
  website: string;
  location: string;
  industry: string;
  portfolioTool?: string;
  demoUrl?: string;
  campaign?: string;
  contactName: string;
  contactRole: string;
  contactEmail: string;
  emailConfidence: "HIGH" | "MEDIUM" | "LOW" | "NONE";
  emailSourceUrl: string;
  fit: "BEST FIT" | "GOOD FIT" | "EXPERIMENT";
  score: number;
  status: OpportunityStatus;
  signalType: string;
  signalSummary: string;
  observation: string;
  inference: string;
  offerTitle: string;
  offerScope: string;
  priceRange: string;
  deliveryTime: string;
  previewIdea: string;
  subject: string;
  emailBody: string;
  reviewerNote: string;
  sourceUrls: string;
  approvedAt: string | null;
  sentAt: string | null;
  repliedAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
  niche?: string;
  parentGroup?: string;
  sourceCheckedAt?: string;
  reviewRank?: number | null;
  researchBatch?: string;
  holdReason?: string;
  doNotContact?: boolean;
  draftKind?: "initial" | "follow_up";
  approvedSnapshot?: string | null;
  lastSentSnapshot?: string | null;
  replyOutcome?: "positive" | "neutral" | "negative" | null;
  meetingAt?: string | null;
  depositAmount?: number | null;
  notes?: string;
  activity?: Activity[];
};

export type Activity = {
  id: string;
  type: "note" | "approved" | "edited" | "sent" | "reply" | "meeting" | "deposit" | "opt_out" | "bounced" | "follow_up";
  at: string;
  note: string;
  amount?: number;
  outcome?: "positive" | "neutral" | "negative";
};

export type WorkspaceSettings = {
  senderEmail: string;
  dailyReviewTarget: number;
};
