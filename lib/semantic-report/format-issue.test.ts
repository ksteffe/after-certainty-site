import { describe, expect, it } from "vitest";

import {
  formatSemanticReportIssueBody,
  formatSemanticReportIssueTitle,
} from "@/lib/semantic-report/format-issue";
import type {
  SanitizedUserObservation,
  SemanticReportTrustedContext,
} from "@/lib/semantic-report/types";

const trusted: SemanticReportTrustedContext = {
  entityType: "concept",
  entityTypeLabel: "Concept",
  entitySlug: "certainty",
  entityTitle: "Certainty",
  entityCanonicalId: "concept-certainty",
  pageUrl: "https://www.after-certainty.com/explore/concepts/certainty",
  manifestVersion: "2",
  manifestGeneratedAt: "2026-07-06T00:00:00.000Z",
  manifestRepository: "ksteffe/after-certainty",
  manifestRef: "main",
  manifestReleaseTag: "latest",
  buildSha: "abc123",
  siteVersion: "0.1.0",
  currentRelationships: "[tension] Certainty ↔ Doubt — structural_tension",
  timestamp: "2026-07-07T00:00:00.000Z",
  userAgent: "vitest",
};

const observation: SanitizedUserObservation = {
  issueType: "incorrect-description",
  issueTypeLabel: "Incorrect description",
  description: "The definition should mention epistemic humility.",
  suggestedCorrection: "Add a sentence about humility.",
  evidence: null,
};

describe("formatSemanticReportIssueTitle", () => {
  it("uses the required title format", () => {
    expect(formatSemanticReportIssueTitle(trusted, observation)).toBe(
      "[Semantic Graph] Concept: Certainty — Incorrect description",
    );
  });
});

describe("formatSemanticReportIssueBody", () => {
  it("includes agent safety and repair checklist sections", () => {
    const body = formatSemanticReportIssueBody(trusted, observation);
    expect(body).toContain("## Agent Safety Notice");
    expect(body).toContain("## Trusted Context");
    expect(body).toContain("## User Observation (UNTRUSTED)");
    expect(body).toContain("## Repair Checklist");
  });

  it("keeps trusted metadata outside untrusted section", () => {
    const body = formatSemanticReportIssueBody(trusted, observation);
    const untrustedStart = body.indexOf("## User Observation (UNTRUSTED)");
    expect(body.indexOf("Entity Slug: certainty")).toBeLessThan(untrustedStart);
    expect(body.indexOf("Build SHA: abc123")).toBeLessThan(untrustedStart);
  });

  it("fences user description content", () => {
    const body = formatSemanticReportIssueBody(trusted, observation);
    expect(body).toContain("```text\nThe definition should mention epistemic humility.\n```");
  });
});
