const normalise = (value) => String(value || '').toLocaleLowerCase();
const updated = (chat, now) => ({ ...chat, updatedAt: now });

export const searchChats = (chats, query) => {
  const needle = normalise(query).trim();
  if (!needle) return [...(chats || [])];
  return (chats || []).filter((chat) => {
    const haystack = [chat.title, ...(chat.tags || []), chat.folderName, ...(chat.messages || []).map((message) => message.content)].map(normalise).join('\n');
    return haystack.includes(needle);
  });
};

export const sortChats = (chats, mode = 'updated') => [...(chats || [])].sort((left, right) => {
  if (left.pinned !== right.pinned) return left.pinned ? -1 : 1;
  if (mode === 'title') return String(left.title).localeCompare(String(right.title));
  if (mode === 'created') return Number(right.createdAt || 0) - Number(left.createdAt || 0);
  return Number(right.updatedAt || 0) - Number(left.updatedAt || 0);
});

export const setPinned = (chat, value, now = Date.now()) => updated({ ...chat, pinned: Boolean(value) }, now);
export const setArchived = (chat, value, now = Date.now()) => updated({ ...chat, archived: Boolean(value) }, now);
export const setTags = (chat, tags, now = Date.now()) => updated({ ...chat, tags: Array.from(new Set((tags || []).filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim()))) }, now);
export const assignFolder = (chat, folder, now = Date.now()) => updated({ ...chat, folderId: folder?.id || null, folderName: folder?.name || null }, now);

export const bulkArchive = (chats, selectedIds, now = Date.now()) => (chats || []).map((chat) => selectedIds.includes(chat.id) ? setArchived(chat, true, now) : chat);
export const bulkDelete = (chats, selectedIds) => (chats || []).filter((chat) => !selectedIds.includes(chat.id));

export const createFolder = (name, now = Date.now()) => ({
  id: `folder-${now}-${Math.random().toString(36).slice(2, 8)}`,
  name: String(name || '').trim() || 'Untitled folder',
  createdAt: now,
  updatedAt: now,
});
