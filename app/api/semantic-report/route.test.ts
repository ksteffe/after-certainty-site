import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

vi.mock("@/lib/explore/exploreSemanticGraph", () => ({
  getExploreSemanticGraph: vi.fn(),
}));

import { getExploreSemanticGraph } from "@/lib/explore/exploreSemanticGraph";
import { resetRateLimitStoresForTests } from "@/lib/semantic-report/rate-limit";
import type { SemanticGraph } from "@/types/semanticGraph";

const miniGraph: SemanticGraph = {
  books: [],
  glossary: [{ id: "c1", slug: "certainty", title: "Certainty", shortDefinition: "x" }],
  patterns: [],
  sources: [],
  relationships: [],
  manifestVersion: 2,
};

function requestJson(body: unknown, ip = "203.0.113.10"): Request {
  return new Request("http://localhost/api/semantic-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/semantic-report", () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let prevToken: string | undefined;

  beforeEach(() => {
    prevToken = process.env.GITHUB_ISSUE_REPORT_TOKEN;
    process.env.GITHUB_ISSUE_REPORT_TOKEN = "ghp_test_token";
    resetRateLimitStoresForTests();

    fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            html_url: "https://github.com/ksteffe/after-certainty/issues/1",
            number: 1,
          }),
          { status: 201 },
        ),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    vi.mocked(getExploreSemanticGraph).mockResolvedValue({
      graph: miniGraph,
      catalogBooks: [],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetRateLimitStoresForTests();
    if (prevToken === undefined) delete process.env.GITHUB_ISSUE_REPORT_TOKEN;
    else process.env.GITHUB_ISSUE_REPORT_TOKEN = prevToken;
  });

  it("returns 503 when token is not configured", async () => {
    delete process.env.GITHUB_ISSUE_REPORT_TOKEN;
    const res = await POST(
      requestJson({
        entityKind: "concept",
        entitySlug: "certainty",
        issueType: "other",
        description: "Test",
      }),
    );
    expect(res.status).toBe(503);
  });

  it("returns 400 for invalid payload", async () => {
    const res = await POST(requestJson({ entityKind: "concept" }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown entity", async () => {
    const res = await POST(
      requestJson({
        entityKind: "concept",
        entitySlug: "missing",
        issueType: "other",
        description: "Test",
      }),
    );
    expect(res.status).toBe(404);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("creates a GitHub issue for valid reports", async () => {
    const res = await POST(
      requestJson({
        entityKind: "concept",
        entitySlug: "certainty",
        issueType: "missing-relationship",
        description: "Missing link to resilience.",
        evidence: "Chapter 2",
      }),
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: true,
      issueUrl: "https://github.com/ksteffe/after-certainty/issues/1",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/ksteffe/after-certainty/issues");
    const payload = JSON.parse(String(init.body)) as { labels: string[]; title: string };
    expect(payload.labels).toContain("semantic-graph");
    expect(payload.labels).toContain("missing-relationship");
    expect(payload.title).toContain("Certainty");
  });

  it("returns 409 for duplicate submissions", async () => {
    const body = {
      entityKind: "concept",
      entitySlug: "certainty",
      issueType: "other",
      description: "Duplicate report body",
    };

    const first = await POST(requestJson(body));
    expect(first.status).toBe(200);

    const second = await POST(requestJson(body));
    expect(second.status).toBe(409);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns 429 when rate limit is exceeded", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 5; i += 1) {
      const res = await POST(
        requestJson(
          {
            entityKind: "concept",
            entitySlug: "certainty",
            issueType: "other",
            description: `Rate limit test ${i}`,
          },
          ip,
        ),
      );
      expect(res.status).toBe(200);
    }

    const blocked = await POST(
      requestJson(
        {
          entityKind: "concept",
          entitySlug: "certainty",
          issueType: "other",
          description: "Rate limit test overflow",
        },
        ip,
      ),
    );
    expect(blocked.status).toBe(429);
  });
});
