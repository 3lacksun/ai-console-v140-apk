import { createChat } from './conversationSchema.mjs';

export const WORKFLOW_STATUSES = Object.freeze(['ACTIVE', 'BLOCKED', 'COMPLETE']);

export const normaliseWorkflowStatus = (value) => WORKFLOW_STATUSES.includes(value) ? value : 'ACTIVE';

export function workflowTree(chats = [], sortMode = 'updated') {
  const byId = new Map((chats || []).map((chat) => [chat.id, chat]));
  const childrenByParent = new Map();
  const roots = [];

  for (const chat of chats || []) {
    const parentId = chat.workflowParentId;
    if (!parentId || parentId === chat.id || !byId.has(parentId)) roots.push(chat);
    else (childrenByParent.get(parentId) || childrenByParent.set(parentId, []).get(parentId)).push(chat);
  }

  const compare = (left, right) => sortMode === 'title' ? String(left.title || '').localeCompare(String(right.title || '')) : sortMode === 'created' ? Number(right.createdAt || 0) - Number(left.createdAt || 0) : Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
  roots.sort(compare);
  for (const children of childrenByParent.values()) children.sort(compare);

  const visited = new Set();
  const build = (chat, ancestry = new Set()) => {
    if (ancestry.has(chat.id)) return { chat: { ...chat, workflowParentId: null }, children: [] };
    visited.add(chat.id);
    const nextAncestry = new Set(ancestry);
    nextAncestry.add(chat.id);
    return { chat, children: (childrenByParent.get(chat.id) || []).map((child) => build(child, nextAncestry)) };
  };

  const result = roots.map((root) => build(root));
  for (const chat of chats || []) if (!visited.has(chat.id)) result.push(build(chat));
  return result;
}

export function flattenWorkflowTree(chats = [], sortMode = 'updated') {
  const rows = [];
  const visit = (node, depth = 0) => {
    rows.push({ chat: node.chat, depth, hasChildren: node.children.length > 0 });
    node.children.forEach((child) => visit(child, depth + 1));
  };
  workflowTree(chats, sortMode).forEach((node) => visit(node));
  return rows;
}

export function createWorkflowChildChat(parentChat, title = '', now = Date.now()) {
  if (!parentChat?.id) throw new Error('A workflow child requires an existing parent chat.');
  const childTitle = String(title || '').trim() || `${parentChat.title || 'Workflow'} — subtask`;
  return {
    ...createChat(childTitle, now),
    workspaceId: parentChat.workspaceId,
    workflowParentId: parentChat.id,
    workflowStatus: 'ACTIVE',
  };
}

export function setWorkflowStatus(chat, status) {
  if (!chat?.id) throw new Error('A workflow status requires an existing chat.');
  return { ...chat, workflowStatus: normaliseWorkflowStatus(status) };
}

export function nextWorkflowStatus(status) {
  const current = normaliseWorkflowStatus(status);
  return current === 'ACTIVE' ? 'BLOCKED' : current === 'BLOCKED' ? 'COMPLETE' : 'ACTIVE';
}
