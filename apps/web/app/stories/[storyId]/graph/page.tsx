"use client";

import { use, useState, useEffect, useCallback } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import dagre from "dagre";
import "@xyflow/react/dist/style.css";
import { useRouter } from "next/navigation";
import type { Entity, Relationship } from "@/types/entity";
import { RELATIONSHIP_TYPE_LABELS, ENTITY_TYPE_LABELS } from "@superwriter/shared";
import type { EntityType } from "@superwriter/shared";
import { EntityNode } from "@/components/graph/entity-node";
import { GraphFilters, TYPE_COLORS } from "@/components/graph/graph-filters";
import { RelationshipSuggestionPanel } from "@/components/graph/relationship-suggestion-panel";
import { Button } from "@/components/ui/button";
import { readTextFromDataStream } from "@/lib/ai/read-data-stream";
import {
  buildRelationshipSuggestionPrompt,
  parseRelationshipSuggestions,
  type RelationshipSuggestion,
} from "@/lib/relationships/relationship-suggestions";
import { Sparkles } from "lucide-react";

const NODE_WIDTH = 140;
const NODE_HEIGHT = 60;

// 使用 dagre 对节点进行自动布局，避免随机位置导致的混乱
function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  if (nodes.length === 0) return nodes;

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 50 });

  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
  edges.forEach((e) => {
    // dagre 只接受图内存在的节点，过滤掉悬空边
    if (g.hasNode(e.source) && g.hasNode(e.target)) {
      g.setEdge(e.source, e.target);
    }
  });

  dagre.layout(g);

  return nodes.map((n) => {
    const pos = g.node(n.id);
    if (!pos) return n;
    return {
      ...n,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
    };
  });
}

const nodeTypes: NodeTypes = { entityNode: EntityNode };

export default function GraphPage({
  params,
}: {
  params: Promise<{ storyId: string }>;
}) {
  const { storyId } = use(params);
  const router = useRouter();

  const [entities, setEntities] = useState<Entity[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [relationshipSuggestions, setRelationshipSuggestions] = useState<
    RelationshipSuggestion[]
  >([]);
  const [relationshipError, setRelationshipError] = useState<string | null>(null);
  const [generatingRelationships, setGeneratingRelationships] = useState(false);
  const [savingSuggestionIds, setSavingSuggestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [activeTypes, setActiveTypes] = useState<EntityType[]>(
    Object.keys(ENTITY_TYPE_LABELS) as EntityType[]
  );
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/stories/${storyId}/entities`).then((r) => r.json()),
      fetch(`/api/stories/${storyId}/relationships`).then((r) => r.json()),
    ])
      .then(([entitiesJson, relsJson]) => {
        setEntities(entitiesJson.data ?? []);
        setRelationships(relsJson.data ?? []);
      })
      .finally(() => setLoading(false));
  }, [storyId]);

  // 数据或过滤器变化时，重新生成节点并布局
  useEffect(() => {
    const filtered = entities.filter((e) => activeTypes.includes(e.type));

    const rawNodes: Node[] = filtered.map((entity) => ({
      id: entity.id,
      type: "entityNode",
      data: {
        label: entity.name,
        entityType: entity.type,
        color: TYPE_COLORS[entity.type] ?? "#666",
      },
      position: { x: 0, y: 0 }, // dagre 会覆盖这些值
    }));

    const filteredIds = new Set(filtered.map((e) => e.id));
    const rawEdges: Edge[] = relationships
      .filter((r) => filteredIds.has(r.from_entity_id) && filteredIds.has(r.to_entity_id))
      .map((rel) => ({
        id: rel.id,
        source: rel.from_entity_id,
        target: rel.to_entity_id,
        label:
          RELATIONSHIP_TYPE_LABELS[rel.type as keyof typeof RELATIONSHIP_TYPE_LABELS] ?? rel.type,
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#888", strokeWidth: 1.5 },
        labelStyle: { fontSize: 11, fill: "#666" },
      }));

    const laidOutNodes = applyDagreLayout(rawNodes, rawEdges);
    setNodes(laidOutNodes);
    setEdges(rawEdges);
  }, [entities, relationships, activeTypes, setNodes, setEdges]);

  const handleToggleType = useCallback((type: EntityType) => {
    setActiveTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }, []);

  const generateRelationshipSuggestions = useCallback(async () => {
    if (entities.length < 2) {
      setRelationshipError("至少需要 2 个世界实体才能梳理关系。");
      return;
    }

    setGeneratingRelationships(true);
    setRelationshipError(null);
    try {
      const prompt = buildRelationshipSuggestionPrompt({
        storyTitle: "当前故事",
        entities,
        existingRelationships: relationships,
      });
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "relationship_suggest",
          storyId,
          prompt,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("AI 关系梳理失败");
      }

      const fullText = await readTextFromDataStream(response.body);
      const suggestions = parseRelationshipSuggestions(fullText, {
        entityIds: entities.map((entity) => entity.id),
        existingRelationships: relationships,
      });

      setRelationshipSuggestions(suggestions);
      if (suggestions.length === 0) {
        setRelationshipError("AI 未返回新的可用关系候选。");
      }
    } catch (error) {
      setRelationshipError(
        error instanceof Error ? error.message : "AI 关系梳理失败",
      );
    } finally {
      setGeneratingRelationships(false);
    }
  }, [entities, relationships, storyId]);

  const acceptRelationshipSuggestion = useCallback(
    async (suggestion: RelationshipSuggestion) => {
      setSavingSuggestionIds((prev) => new Set(prev).add(suggestion.id));
      setRelationshipError(null);
      try {
        const response = await fetch(`/api/stories/${storyId}/relationships`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_entity_id: suggestion.fromEntityId,
            to_entity_id: suggestion.toEntityId,
            type: suggestion.type,
            bidirectional: suggestion.bidirectional,
            description: suggestion.description || suggestion.reason || undefined,
          }),
        });

        if (!response.ok) {
          throw new Error("保存关系失败");
        }

        const result = await response.json();
        if (result.data) {
          setRelationships((prev) => [...prev, result.data as Relationship]);
        }
        setRelationshipSuggestions((prev) =>
          prev.filter((item) => item.id !== suggestion.id),
        );
      } catch (error) {
        setRelationshipError(
          error instanceof Error ? error.message : "保存关系失败",
        );
      } finally {
        setSavingSuggestionIds((prev) => {
          const next = new Set(prev);
          next.delete(suggestion.id);
          return next;
        });
      }
    },
    [storyId],
  );

  const acceptAllRelationshipSuggestions = useCallback(async () => {
    for (const suggestion of relationshipSuggestions) {
      // Keep this sequential so a duplicate failure does not hide later UI state.
      await acceptRelationshipSuggestion(suggestion);
    }
  }, [acceptRelationshipSuggestion, relationshipSuggestions]);

  // 双击节点跳转到对应实体详情
  const handleNodeDoubleClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      const entity = entities.find((e) => e.id === node.id);
      if (!entity) return;
      router.push(`/stories/${storyId}/entities?type=${entity.type}`);
    },
    [entities, storyId, router]
  );

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        加载关系图谱...
      </div>
    );
  }

  if (entities.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg">暂无实体数据</p>
          <p className="text-sm">先在「角色」「地点」等页面创建实体，再返回查看图谱。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <GraphFilters activeTypes={activeTypes} onToggle={handleToggleType} />
      <div className="absolute right-4 top-4 z-10 flex flex-col items-end gap-2">
        {relationshipSuggestions.length === 0 ? (
          <Button
            type="button"
            onClick={generateRelationshipSuggestions}
            disabled={generatingRelationships}
            className="shadow-sm"
          >
            <Sparkles className="h-4 w-4" />
            {generatingRelationships ? "梳理中..." : "AI 梳理关系"}
          </Button>
        ) : null}
        {relationshipError ? (
          <div className="max-w-xs rounded-md border border-destructive/30 bg-background/95 px-3 py-2 text-sm text-destructive shadow-sm">
            {relationshipError}
          </div>
        ) : null}
      </div>
      <RelationshipSuggestionPanel
        entities={entities}
        suggestions={relationshipSuggestions}
        savingIds={savingSuggestionIds}
        onAccept={acceptRelationshipSuggestion}
        onAcceptAll={acceptAllRelationshipSuggestions}
        onDismiss={() => setRelationshipSuggestions([])}
      />
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.3}
        maxZoom={2}
      >
        <Background color="#e5e7eb" gap={20} />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const d = n.data as { color?: string };
            return d.color ?? "#888";
          }}
          maskColor="rgba(240,240,240,0.7)"
        />
      </ReactFlow>
    </div>
  );
}
