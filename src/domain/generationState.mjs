export const GenerationStatus = Object.freeze({
  IDLE: 'IDLE',
  QUEUED: 'QUEUED',
  STREAMING: 'STREAMING',
  CANCELLING: 'CANCELLING',
  COMPLETE: 'COMPLETE',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
});

const transitions = Object.freeze({
  [GenerationStatus.IDLE]: [GenerationStatus.QUEUED],
  [GenerationStatus.QUEUED]: [GenerationStatus.STREAMING, GenerationStatus.CANCELLING, GenerationStatus.FAILED, GenerationStatus.CANCELLED],
  [GenerationStatus.STREAMING]: [GenerationStatus.CANCELLING, GenerationStatus.COMPLETE, GenerationStatus.FAILED, GenerationStatus.CANCELLED],
  [GenerationStatus.CANCELLING]: [GenerationStatus.CANCELLED, GenerationStatus.FAILED],
  [GenerationStatus.COMPLETE]: [GenerationStatus.QUEUED],
  [GenerationStatus.FAILED]: [GenerationStatus.QUEUED],
  [GenerationStatus.CANCELLED]: [GenerationStatus.QUEUED],
});

export const createGeneration = ({ jobId, chatId, targetMessageId, now = Date.now(), retryOf = null }) => ({
  jobId,
  chatId,
  targetMessageId,
  status: GenerationStatus.QUEUED,
  createdAt: now,
  updatedAt: now,
  retryOf,
  error: null,
});

export const canTransition = (from, to) => Boolean(transitions[from]?.includes(to));

export const transitionGeneration = (generation, nextStatus, now = Date.now(), error = null) => {
  if (!generation || !canTransition(generation.status, nextStatus)) {
    throw new Error(`Invalid generation transition: ${generation?.status || 'MISSING'} → ${nextStatus}`);
  }
  return { ...generation, status: nextStatus, updatedAt: now, error: nextStatus === GenerationStatus.FAILED ? String(error || 'Generation failed.') : null };
};

export const terminalStatuses = new Set([GenerationStatus.COMPLETE, GenerationStatus.FAILED, GenerationStatus.CANCELLED]);
export const isActiveGeneration = (generation) => Boolean(generation && !terminalStatuses.has(generation.status));

export const recoverGenerationAfterLifecycleTransition = (generation, now = Date.now()) => {
  if (!generation || terminalStatuses.has(generation.status)) return generation;
  return { ...generation, status: GenerationStatus.FAILED, error: 'Generation interrupted by an application lifecycle transition. Retry to continue.', updatedAt: now, recoveredFromLifecycle: true };
};
