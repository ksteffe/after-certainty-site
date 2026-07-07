import type { IssueType } from "@/lib/semantic-report/types";

export const BASE_ISSUE_LABELS = ["semantic-graph", "data-quality", "report-from-site"] as const;

const ISSUE_TYPE_LABEL_MAP: Record<IssueType, string> = {
  "missing-relationship": "missing-relationship",
  "incorrect-relationship": "incorrect-relationship",
  "missing-entity": "missing-entity",
  "duplicate-entity": "duplicate-entity",
  "incorrect-description": "incorrect-description",
  "missing-citation": "missing-citation",
  "broken-external-link": "broken-external-link",
  other: "other",
};

export function labelsForSemanticReport(issueType: IssueType): string[] {
  return [...BASE_ISSUE_LABELS, ISSUE_TYPE_LABEL_MAP[issueType]];
}
