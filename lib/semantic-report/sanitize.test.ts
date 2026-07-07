import { describe, expect, it } from "vitest";

import {
  fencedUserContent,
  sanitizeDescription,
  sanitizeUserObservation,
  sanitizeUserTextField,
} from "@/lib/semantic-report/sanitize";

describe("sanitizeUserTextField", () => {
  it("normalizes unicode and strips control characters", () => {
    expect(sanitizeUserTextField("café\u0007", "description")).toBe("café");
  });

  it("neutralizes @mentions and issue references", () => {
    const value = sanitizeUserTextField("Contact @evil and see #123", "description");
    expect(value).toBe("Contact \\@evil and see \\#123");
  });

  it("escapes triple backticks", () => {
    expect(sanitizeUserTextField("```rm -rf /```", "description")).toBe("``\\`rm -rf /``\\`");
  });

  it("enforces max length", () => {
    const long = "a".repeat(6000);
    expect(sanitizeUserTextField(long, "description")?.length).toBe(5000);
  });

  it("returns null for empty optional fields", () => {
    expect(sanitizeUserTextField("   ", "evidence")).toBeNull();
  });
});

describe("sanitizeDescription", () => {
  it("rejects whitespace-only descriptions", () => {
    expect(sanitizeDescription("   \n\t  ")).toBeNull();
  });
});

describe("sanitizeUserObservation", () => {
  it("returns sanitized observation for valid input", () => {
    const result = sanitizeUserObservation({
      issueType: "missing-relationship",
      description: "A link to resilience is missing.",
      evidence: "Book chapter 3",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.observation.issueTypeLabel).toBe("Missing relationship");
      expect(result.observation.evidence).toBe("Book chapter 3");
    }
  });

  it("rejects empty description", () => {
    const result = sanitizeUserObservation({
      issueType: "other",
      description: " ",
    });
    expect(result.ok).toBe(false);
  });
});

describe("fencedUserContent", () => {
  it("wraps content in a text fence", () => {
    expect(fencedUserContent("hello")).toBe("```text\nhello\n```");
  });

  it("returns placeholder for null", () => {
    expect(fencedUserContent(null)).toBe("_None provided._");
  });
});
