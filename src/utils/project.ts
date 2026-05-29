import type { CanvasNode, CanvasProject, Edge, HandleDirection, NodeColor, NodeShape } from '@/types';

const NODE_COLORS: readonly NodeColor[] = ['yellow', 'blue', 'pink', 'green', 'purple'];
const NODE_SHAPES: readonly NodeShape[] = ['rounded', 'circle', 'path'];
const HANDLE_DIRECTIONS: readonly HandleDirection[] = ['t', 'r', 'b', 'l'];

const isObject = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

const isString = (value: unknown): value is string => typeof value === 'string';

const isNodeColor = (value: unknown): value is NodeColor => (
  isString(value) && NODE_COLORS.includes(value as NodeColor)
);

const isNodeShape = (value: unknown): value is NodeShape => (
  isString(value) && NODE_SHAPES.includes(value as NodeShape)
);

const isHandleDirection = (value: unknown): value is HandleDirection => (
  isString(value) && HANDLE_DIRECTIONS.includes(value as HandleDirection)
);

const isPoint = (value: unknown): value is [number, number] => (
  Array.isArray(value) &&
  value.length === 2 &&
  isNumber(value[0]) &&
  isNumber(value[1])
);

const isCanvasNode = (value: unknown): value is CanvasNode => {
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isNodeShape(value.shape) &&
    isNodeColor(value.color) &&
    isNumber(value.x) &&
    isNumber(value.y) &&
    isNumber(value.w) &&
    isNumber(value.h) &&
    (value.content === undefined || isString(value.content)) &&
    (value.strokeWidth === undefined || isNumber(value.strokeWidth)) &&
    (value.points === undefined || (Array.isArray(value.points) && value.points.every(isPoint)))
  );
};

const isEdge = (value: unknown, nodeIds: Set<string>): value is Edge => {
  // 连线必须引用现有节点，避免导入后出现悬空边。
  if (!isObject(value)) return false;

  return (
    isString(value.id) &&
    isString(value.sourceNodeId) &&
    isString(value.targetNodeId) &&
    nodeIds.has(value.sourceNodeId) &&
    nodeIds.has(value.targetNodeId) &&
    isHandleDirection(value.sourceHandle) &&
    isHandleDirection(value.targetHandle)
  );
};

export const parseCanvasProject = (value: unknown): CanvasProject | null => {
  // 外部文件不可信，先收窄数据结构再交给 store 覆盖当前画布。
  if (!isObject(value) || !isObject(value.nodes) || !Array.isArray(value.nodeIds)) {
    return null;
  }

  const nodeIds = value.nodeIds;
  if (!nodeIds.every(isString)) return null;

  const nodes = value.nodes;
  const normalizedNodes: Record<string, CanvasNode> = {};

  for (const id of nodeIds) {
    const node = nodes[id];
    if (!isCanvasNode(node) || node.id !== id) return null;
    normalizedNodes[id] = node;
  }

  const nodeIdSet = new Set(nodeIds);
  const edgesValue = value.edges;
  if (edgesValue !== undefined && !Array.isArray(edgesValue)) return null;

  const edges = (edgesValue ?? []).filter((edge): edge is Edge => isEdge(edge, nodeIdSet));

  return {
    nodes: normalizedNodes,
    nodeIds: [...nodeIds],
    edges,
  };
};
