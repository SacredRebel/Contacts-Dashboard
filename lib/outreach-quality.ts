import type { Opportunity } from "@/lib/types";

export type QualityCheck = {
  id: string;
  label: string;
  detail: string;
  pass: boolean;
  blocking: boolean;
};

const bannedPhrases = [
  "hope this finds you well",
  "quick question",
  "just following up",
  "revolutionize",
  "10x",
  "synergy",
  "ai expert",
  "ai agency",
];

export function safeSources(raw: string): string[] {
  try {
    const sources = JSON.parse(raw);
    return Array.isArray(sources) ? sources.filter((value) => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function getQualityChecks(item: Opportunity, draftSubject = item.subject, draftBody = item.emailBody): QualityCheck[] {
  const words = draftBody.trim().split(/\s+/).filter(Boolean).length;
  const subjectWords = draftSubject.trim().split(/\s+/).filter(Boolean).length;
  const urls = draftBody.match(/https?:\/\/[^\s)]+/g) ?? [];
  const lowerBody = draftBody.toLowerCase();
  const unsafePhrase = bannedPhrases.find((phrase) => lowerBody.includes(phrase));
  const publishedEmail = Boolean(item.contactEmail && item.emailSourceUrl && ["HIGH", "MEDIUM"].includes(item.emailConfidence));
  const sources = safeSources(item.sourceUrls);

  return [
    { id: "contact", label: "Published contact", detail: publishedEmail ? `${item.emailConfidence} confidence with source` : "Use a published, verified address", pass: publishedEmail, blocking: true },
    { id: "evidence", label: "Cited evidence", detail: sources.length ? `${sources.length} public source(s)` : "Add at least one public source", pass: sources.length > 0, blocking: true },
    { id: "grounding", label: "Fact before inference", detail: item.observation && item.inference ? "Observation and inference are separated" : "Document what is known versus inferred", pass: Boolean(item.observation && item.inference), blocking: true },
    { id: "subject", label: "Short subject", detail: `${subjectWords} word${subjectWords === 1 ? "" : "s"}; target 1–4`, pass: subjectWords >= 1 && subjectWords <= 4, blocking: true },
    { id: "length", label: "Mobile-length copy", detail: `${words} words; target 50–100`, pass: words >= 50 && words <= 100, blocking: true },
    { id: "link", label: "One direct link", detail: `${urls.length} link${urls.length === 1 ? "" : "s"} in the message`, pass: urls.length === 1, blocking: true },
    { id: "cta", label: "One low-friction ask", detail: `${(draftBody.match(/\?/g) ?? []).length} question mark(s)`, pass: (draftBody.match(/\?/g) ?? []).length <= 1, blocking: false },
    { id: "optout", label: "Easy opt-out", detail: "A clear reply-no instruction", pass: /reply\s+(no|stop)|do not follow up|won't follow up|will not follow up/i.test(draftBody), blocking: true },
    { id: "language", label: "Plain-language scan", detail: unsafePhrase ? `Remove “${unsafePhrase}”` : "No common automation tells found", pass: !unsafePhrase, blocking: true },
  ];
}

export function isReady(item: Opportunity, draftSubject = item.subject, draftBody = item.emailBody) {
  return getQualityChecks(item, draftSubject, draftBody).filter((check) => check.blocking).every((check) => check.pass);
}

export function personalizationTier(item: Opportunity) {
  const sources = safeSources(item.sourceUrls).length;
  const namedPerson = Boolean(item.contactName && !/team|office|estimating/i.test(item.contactName));
  if (sources >= 3 && namedPerson) return { tier: 4, label: "deep research" };
  if (sources >= 2 && item.observation && item.signalSummary) return { tier: 3, label: "observation-based" };
  if (sources >= 1 && item.signalSummary) return { tier: 2, label: "signal-based" };
  return { tier: 1, label: "profile-based" };
}
