import { z } from "zod";
import type { GraphEntityKind } from "@/types/semanticGraph";

export const ISSUE_TYPES = [
  "missing-relationship",
  "incorrect-relationship",
  "missing-entity",
  "duplicate-entity",
  "incorrect-description",
  "missing-citation",
  "broken-external-link",
  "other",
] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];

export const ISSUE_TYPE_LABELS: Record<IssueType, string> = {
  "missing-relationship": "Missing relationship",
  "incorrect-relationship": "Incorrect relationship",
  "missing-entity": "Missing entity",
  "duplicate-entity": "Duplicate entity",
  "incorrect-description": "Incorrect description",
  "missing-citation": "Missing citation/source",
  "broken-external-link": "Broken external link",
  other: "Other",
};

export const ENTITY_KIND_LABELS: Record<GraphEntityKind, string> = {
  book: "Book",
  concept: "Concept",
  pattern: "Pattern",
  source: "Source",
  thinker: "Thinker",
};

export const semanticReportRequestSchema = z.object({
  entityKind: z.enum(["book", "concept", "pattern", "source", "thinker"]),
  entitySlug: z.string().min(1).max(200),
  issueType: z.enum(ISSUE_TYPES),
  description: z.string().min(1).max(6000),
  suggestedCorrection: z.string().max(2500).optional(),
  evidence: z.string().max(3500).optional(),
  userAgent: z.string().max(500).optional(),
  captchaToken: z.string().max(2000).optional(),
});

export type SemanticReportRequest = z.infer<typeof semanticReportRequestSchema>;

export type SanitizedUserObservation = {
  issueType: IssueType;
  issueTypeLabel: string;
  description: string;
  suggestedCorrection: string | null;
  evidence: string | null;
};

export type SemanticReportTrustedContext = {
  entityType: GraphEntityKind;
  entityTypeLabel: string;
  entitySlug: string;
  entityTitle: string;
  entityCanonicalId: string;
  pageUrl: string;
  manifestVersion: string;
  manifestGeneratedAt: string;
  manifestRepository: string;
  manifestRef: string;
  manifestReleaseTag: string;
  buildSha: string;
  siteVersion: string;
  currentRelationships: string;
  timestamp: string;
  userAgent: string | null;
};

export type SemanticReportDisplayContext = {
  entityType: GraphEntityKind;
  entityTypeLabel: string;
  entitySlug: string;
  entityTitle: string;
  pageUrl: string;
  manifestVersion: string;
  relationshipsPreview: string;
  relationshipCount: number;
};

export type SemanticReportSuccessResponse = {
  ok: true;
  issueUrl: string;
};

export type SemanticReportErrorResponse = {
  error: string;
};
