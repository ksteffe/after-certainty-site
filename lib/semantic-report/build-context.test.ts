import { describe, expect, it } from "vitest";

import { buildGraphIndex } from "@/lib/graph/graph";
import {
  buildSemanticReportTrustedContext,
  resolveEntityByKindAndSlug,
  serializeRelationshipsForEntity,
} from "@/lib/semantic-report/build-context";
import type { SemanticGraph } from "@/types/semanticGraph";

const miniGraph: SemanticGraph = {
  books: [{ id: "book-1", slug: "after-certainty", title: "After Certainty" }],
  glossary: [{ id: "c1", slug: "certainty", title: "Certainty", shortDefinition: "x" }],
  patterns: [],
  sources: [],
  thinkers: [{ id: "t1", slug: "aristotle", name: "Aristotle", type: "person", works: [] }],
  relationships: [
    { id: "rel-1", source: "c1", target: "book-1", relationship: "structural_tension" },
  ],
  manifestVersion: 2,
  generatedAt: "2026-07-06T00:00:00.000Z",
  repository: "ksteffe/after-certainty",
  ref: "main",
  releaseTag: "latest",
};

describe("resolveEntityByKindAndSlug", () => {
  const index = buildGraphIndex(miniGraph);

  it("resolves concepts, books, and thinkers", () => {
    expect(resolveEntityByKindAndSlug(miniGraph, index, "concept", "certainty")?.title).toBe(
      "Certainty",
    );
    expect(resolveEntityByKindAndSlug(miniGraph, index, "book", "after-certainty")?.title).toBe(
      "After Certainty",
    );
    expect(resolveEntityByKindAndSlug(miniGraph, index, "thinker", "aristotle")?.title).toBe(
      "Aristotle",
    );
  });

  it("returns null for unknown slugs", () => {
    expect(resolveEntityByKindAndSlug(miniGraph, index, "concept", "missing")).toBeNull();
  });
});

describe("serializeRelationshipsForEntity", () => {
  it("renders tension relationships for the focal entity", () => {
    const index = buildGraphIndex(miniGraph);
    const serialized = serializeRelationshipsForEntity(index, "c1");
    expect(serialized.count).toBe(1);
    expect(serialized.text).toContain("[tension]");
    expect(serialized.text).toContain("Certainty");
    expect(serialized.text).toContain("After Certainty");
  });
});

describe("buildSemanticReportTrustedContext", () => {
  it("includes manifest and page provenance", () => {
    const index = buildGraphIndex(miniGraph);
    const entity = resolveEntityByKindAndSlug(miniGraph, index, "concept", "certainty");
    expect(entity).not.toBeNull();
    if (!entity) return;

    const trusted = buildSemanticReportTrustedContext({
      graph: miniGraph,
      index,
      entity,
      userAgent: "vitest",
      timestamp: "2026-07-07T00:00:00.000Z",
    });

    expect(trusted.manifestVersion).toBe("2");
    expect(trusted.pageUrl).toContain("/explore/concepts/certainty");
    expect(trusted.userAgent).toBe("vitest");
  });
});
