import type { GraphIndex } from "@/lib/graph/graph";
import { graphNodeTitle } from "@/lib/graph/graph";
import { explorePaths } from "@/lib/graph/explorePaths";
import { relationshipEndpointsResolved } from "@/lib/graph/graphTraversal";
import {
  getBookBySlug,
  getConceptBySlug,
  getPatternBySlug,
  getSourceBySlug,
  getThinkerBySlug,
} from "@/lib/graph/graphQueries";
import { sourceDisplayTitle } from "@/lib/graph/sourceDisplay";
import { isSymmetricRelationship, relationshipsForConcept } from "@/lib/graph/relationshipTaxonomy";
import { resolveDeploymentUrl, resolveSiteBuildSha, resolveSiteVersion } from "@/lib/site-config";
import type { SemanticReportTrustedContext } from "@/lib/semantic-report/types";
import { ENTITY_KIND_LABELS } from "@/lib/semantic-report/types";
import type { GraphEntityKind, SemanticGraph } from "@/types/semanticGraph";

type ResolvedEntity = {
  kind: GraphEntityKind;
  slug: string;
  canonicalId: string;
  title: string;
};

function explorePathForKind(kind: GraphEntityKind, slug: string): string {
  switch (kind) {
    case "concept":
      return `${explorePaths.concepts}/${slug}`;
    case "pattern":
      return `${explorePaths.patterns}/${slug}`;
    case "book":
      return `${explorePaths.books}/${slug}`;
    case "source":
      return `${explorePaths.sources}/${slug}`;
    case "thinker":
      return `${explorePaths.thinkers}/${slug}`;
  }
}

export function resolveEntityByKindAndSlug(
  graph: SemanticGraph,
  index: GraphIndex,
  kind: GraphEntityKind,
  slug: string,
): ResolvedEntity | null {
  switch (kind) {
    case "concept": {
      const entity = getConceptBySlug(index, slug);
      if (!entity) return null;
      return { kind, slug: entity.slug, canonicalId: entity.id, title: entity.title };
    }
    case "pattern": {
      const entity = getPatternBySlug(index, slug);
      if (!entity) return null;
      return { kind, slug: entity.slug, canonicalId: entity.id, title: entity.title };
    }
    case "book": {
      const entity = getBookBySlug(index, slug);
      if (!entity) return null;
      return { kind, slug: entity.slug, canonicalId: entity.id, title: entity.title };
    }
    case "source": {
      const entity = getSourceBySlug(index, slug);
      if (!entity) return null;
      return {
        kind,
        slug: entity.slug,
        canonicalId: entity.id,
        title: sourceDisplayTitle(entity),
      };
    }
    case "thinker": {
      const entity = getThinkerBySlug(graph, slug);
      if (!entity) return null;
      return { kind, slug: entity.slug, canonicalId: entity.id, title: entity.name };
    }
  }
}

function labelForCanonicalId(index: GraphIndex, id: string): string {
  const node = index.getNodeByCanonicalId(id);
  if (!node) return id;
  return graphNodeTitle(node);
}

export function serializeRelationshipsForEntity(
  index: GraphIndex,
  canonicalId: string,
): { text: string; count: number } {
  const { tensions, outgoingDynamics, incomingDynamics } = relationshipsForConcept(
    index,
    canonicalId,
  );
  const lines: string[] = [];

  for (const r of tensions) {
    const ends = relationshipEndpointsResolved(index, r);
    if (!ends) continue;
    const source = labelForCanonicalId(index, ends.sourceId);
    const target = labelForCanonicalId(index, ends.targetId);
    const idSuffix = r.id ? ` (id: ${r.id})` : "";
    lines.push(`[tension] ${source} ↔ ${target} — ${r.relationship}${idSuffix}`);
  }

  for (const r of outgoingDynamics) {
    const ends = relationshipEndpointsResolved(index, r);
    if (!ends) continue;
    const source = labelForCanonicalId(index, ends.sourceId);
    const target = labelForCanonicalId(index, ends.targetId);
    const idSuffix = r.id ? ` (id: ${r.id})` : "";
    lines.push(`[outgoing] ${source} → ${r.relationship} → ${target}${idSuffix}`);
  }

  for (const r of incomingDynamics) {
    const ends = relationshipEndpointsResolved(index, r);
    if (!ends) continue;
    const source = labelForCanonicalId(index, ends.sourceId);
    const target = labelForCanonicalId(index, ends.targetId);
    const idSuffix = r.id ? ` (id: ${r.id})` : "";
    const direction = isSymmetricRelationship(r.relationship) ? "↔" : "→";
    lines.push(
      `[incoming] ${source} ${direction} ${r.relationship} ${direction} ${target}${idSuffix}`,
    );
  }

  if (lines.length === 0) {
    return { text: "_None rendered on this page._", count: 0 };
  }

  return { text: lines.join("\n"), count: lines.length };
}

export function buildSemanticReportTrustedContext(input: {
  graph: SemanticGraph;
  index: GraphIndex;
  entity: ResolvedEntity;
  userAgent?: string | null;
  timestamp?: string;
}): SemanticReportTrustedContext {
  const { graph, index, entity } = input;
  const relationships = serializeRelationshipsForEntity(index, entity.canonicalId);
  const pagePath = explorePathForKind(entity.kind, entity.slug);

  return {
    entityType: entity.kind,
    entityTypeLabel: ENTITY_KIND_LABELS[entity.kind],
    entitySlug: entity.slug,
    entityTitle: entity.title,
    entityCanonicalId: entity.canonicalId,
    pageUrl: `${resolveDeploymentUrl()}${pagePath}`,
    manifestVersion: graph.manifestVersion != null ? String(graph.manifestVersion) : "unknown",
    manifestGeneratedAt: graph.generatedAt ?? "unknown",
    manifestRepository: graph.repository ?? "ksteffe/after-certainty",
    manifestRef: graph.ref ?? "unknown",
    manifestReleaseTag: graph.releaseTag ?? "unknown",
    buildSha: resolveSiteBuildSha() ?? "unknown",
    siteVersion: resolveSiteVersion(),
    currentRelationships: relationships.text,
    timestamp: input.timestamp ?? new Date().toISOString(),
    userAgent: input.userAgent ?? null,
  };
}
