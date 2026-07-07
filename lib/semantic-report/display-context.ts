import type { GraphIndex } from "@/lib/graph/graph";
import {
  buildSemanticReportTrustedContext,
  resolveEntityByKindAndSlug,
  serializeRelationshipsForEntity,
} from "@/lib/semantic-report/build-context";
import type { SemanticReportDisplayContext } from "@/lib/semantic-report/types";
import { ENTITY_KIND_LABELS } from "@/lib/semantic-report/types";
import type { GraphEntityKind, SemanticGraph } from "@/types/semanticGraph";

export function buildSemanticReportDisplayContext(
  graph: SemanticGraph,
  index: GraphIndex,
  entity: {
    kind: GraphEntityKind;
    slug: string;
    canonicalId: string;
    title: string;
  },
): SemanticReportDisplayContext {
  const relationships = serializeRelationshipsForEntity(index, entity.canonicalId);
  const trusted = buildSemanticReportTrustedContext({
    graph,
    index,
    entity: {
      kind: entity.kind,
      slug: entity.slug,
      canonicalId: entity.canonicalId,
      title: entity.title,
    },
  });

  return {
    entityType: entity.kind,
    entityTypeLabel: ENTITY_KIND_LABELS[entity.kind],
    entitySlug: entity.slug,
    entityTitle: entity.title,
    pageUrl: trusted.pageUrl,
    manifestVersion: trusted.manifestVersion,
    relationshipsPreview:
      relationships.count > 0
        ? relationships.text.split("\n").slice(0, 4).join("\n") +
          (relationships.count > 4 ? `\n… and ${relationships.count - 4} more` : "")
        : "None rendered on this page.",
    relationshipCount: relationships.count,
  };
}

export function resolveEntityForDisplay(
  graph: SemanticGraph,
  index: GraphIndex,
  kind: GraphEntityKind,
  slug: string,
): SemanticReportDisplayContext | null {
  const entity = resolveEntityByKindAndSlug(graph, index, kind, slug);
  if (!entity) return null;
  return buildSemanticReportDisplayContext(graph, index, {
    kind: entity.kind,
    slug: entity.slug,
    canonicalId: entity.canonicalId,
    title: entity.title,
  });
}
