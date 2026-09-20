export type OpportunityStatus =
  | "research"
  | "review"
  | "needs_edit"
  | "approved"
  | "sent"
  | "replied"
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
};
