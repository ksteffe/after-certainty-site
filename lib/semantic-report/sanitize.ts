import type { IssueType } from "@/lib/semantic-report/types";
import { ISSUE_TYPE_LABELS } from "@/lib/semantic-report/types";

const FIELD_LIMITS = {
  description: 5000,
  suggestedCorrection: 2000,
  evidence: 3000,
} as const;

/** Strip C0/C1 control characters except newline and tab. */
function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.charCodeAt(0);
    if (ch === "\n" || ch === "\t") {
      out += ch;
      continue;
    }
    if (code < 32 || (code >= 127 && code <= 159)) continue;
    out += ch;
  }
  return out;
}

/** Neutralize @mentions and #issue references in user text. */
function neutralizeMarkdownTriggers(value: string): string {
  return value.replace(/@([a-zA-Z0-9_-]+)/g, "\\@$1").replace(/#(\d+)/g, "\\#$1");
}

/** Break triple-backtick sequences so fenced blocks cannot be escaped. */
function escapeTripleBackticks(value: string): string {
  return value.replace(/```/g, "``\\`");
}

function normalizeField(value: string, maxLength: number): string {
  const normalized = escapeTripleBackticks(
    neutralizeMarkdownTriggers(stripControlChars(value.normalize("NFKC"))),
  ).trim();
  if (normalized.length <= maxLength) return normalized;
  return normalized.slice(0, maxLength);
}

export function sanitizeUserTextField(
  value: string | undefined,
  field: keyof typeof FIELD_LIMITS,
): string | null {
  if (value === undefined) return null;
  const normalized = normalizeField(value, FIELD_LIMITS[field]);
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeDescription(value: string): string | null {
  const normalized = normalizeField(value, FIELD_LIMITS.description);
  return normalized.length > 0 ? normalized : null;
}

export function sanitizeUserAgent(value: string | undefined): string | null {
  if (!value) return null;
  const normalized = stripControlChars(value.normalize("NFKC")).trim();
  if (!normalized) return null;
  return normalized.length <= 500 ? normalized : normalized.slice(0, 500);
}

export function sanitizeUserObservation(input: {
  issueType: IssueType;
  description: string;
  suggestedCorrection?: string;
  evidence?: string;
}):
  | { ok: true; observation: import("@/lib/semantic-report/types").SanitizedUserObservation }
  | { ok: false; error: string } {
  const description = sanitizeDescription(input.description);
  if (!description) {
    return { ok: false, error: "Description is required." };
  }

  return {
    ok: true,
    observation: {
      issueType: input.issueType,
      issueTypeLabel: ISSUE_TYPE_LABELS[input.issueType],
      description,
      suggestedCorrection: sanitizeUserTextField(input.suggestedCorrection, "suggestedCorrection"),
      evidence: sanitizeUserTextField(input.evidence, "evidence"),
    },
  };
}

/** Wrap user content in a fenced code block for GitHub issue bodies. */
export function fencedUserContent(value: string | null): string {
  if (!value) return "_None provided._";
  return ["```text", value, "```"].join("\n");
}
