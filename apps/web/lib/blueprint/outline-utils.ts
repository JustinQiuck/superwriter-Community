import type { OutlineNode } from "./workflow-types";

export function flattenOutlineLeaves(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.flatMap((node) =>
    node.children.length > 0 ? flattenOutlineLeaves(node.children) : [node],
  );
}

export function createOutlineNode(title = "新的大纲节点"): OutlineNode {
  return {
    id: crypto.randomUUID(),
    title,
    synopsis: "",
    order: 0,
    function: "custom",
    children: [],
  };
}

export function normalizeOutlineOrder(nodes: OutlineNode[]): OutlineNode[] {
  return nodes.map((node, index) => ({
    ...node,
    order: index,
    children: normalizeOutlineOrder(node.children),
  }));
}

export function moveOutlineSibling(
  nodes: OutlineNode[],
  index: number,
  direction: "up" | "down",
): OutlineNode[] {
  const targetIndex = direction === "up" ? index - 1 : index + 1;

  if (targetIndex < 0 || targetIndex >= nodes.length) {
    return nodes;
  }

  const nextNodes = [...nodes];
  const current = nextNodes[index];
  const target = nextNodes[targetIndex];

  if (!current || !target) {
    return nodes;
  }

  nextNodes[index] = target;
  nextNodes[targetIndex] = current;
  return normalizeOutlineOrder(nextNodes);
}
