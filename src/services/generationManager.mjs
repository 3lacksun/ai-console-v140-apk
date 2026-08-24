import {
  GenerationStatus,
  createGeneration,
  isActiveGeneration,
  recoverGenerationAfterLifecycleTransition,
  transitionGeneration,
} from '../domain/generationState.mjs';

const makeJobId = () => `generation-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export class GenerationManager {
  constructor({ onStateChange = () => {}, now = () => Date.now() } = {}) {
    this.jobs = new Map();
    this.streams = new Map();
    this.onStateChange = onStateChange;
    this.now = now;
  }

  snapshot() {
    return Object.fromEntries(this.jobs.entries());
  }

  get(chatId) {
    return this.jobs.get(chatId) || null;
  }

  start({ chatId, targetMessageId, streamFactory, retryOf = null }) {
    const current = this.get(chatId);
    if (isActiveGeneration(current)) throw new Error('A generation is already active in this chat.');
    const job = createGeneration({ jobId: makeJobId(), chatId, targetMessageId, now: this.now(), retryOf });
    this.jobs.set(chatId, job);
    this.emit(chatId);
    const activate = () => {
      const queued = this.get(chatId);
      if (!queued || queued.jobId !== job.jobId) return false;
      this.jobs.set(chatId, transitionGeneration(queued, GenerationStatus.STREAMING, this.now()));
      this.emit(chatId);
      return true;
    };
    const isCurrent = () => this.get(chatId)?.jobId === job.jobId;
    const callbacks = {
      onDelta: (delta) => isCurrent() && this.get(chatId).status === GenerationStatus.STREAMING && this.onDelta?.(chatId, job, delta),
      onDone: () => this.complete(chatId, job.jobId),
      onError: (error) => this.fail(chatId, job.jobId, error),
    };
    try {
      activate();
      const stream = streamFactory(callbacks);
      if (!isCurrent()) stream?.cancel?.();
      else this.streams.set(chatId, { jobId: job.jobId, stream });
    } catch (error) {
      this.fail(chatId, job.jobId, error);
    }
    return job;
  }

  setDeltaHandler(handler) {
    this.onDelta = handler;
  }

  complete(chatId, jobId) {
    const current = this.get(chatId);
    if (!current || current.jobId !== jobId || current.status !== GenerationStatus.STREAMING) return false;
    this.jobs.set(chatId, transitionGeneration(current, GenerationStatus.COMPLETE, this.now()));
    this.streams.delete(chatId);
    this.emit(chatId);
    return true;
  }

  fail(chatId, jobId, error) {
    const current = this.get(chatId);
    if (!current || current.jobId !== jobId || !isActiveGeneration(current)) return false;
    const status = current.status === GenerationStatus.CANCELLING ? GenerationStatus.CANCELLED : GenerationStatus.FAILED;
    this.jobs.set(chatId, transitionGeneration(current, status, this.now(), error));
    this.streams.delete(chatId);
    this.emit(chatId);
    return true;
  }

  cancel(chatId, reason = 'Cancelled by the user.') {
    const current = this.get(chatId);
    if (!current || !isActiveGeneration(current)) return false;
    if (current.status !== GenerationStatus.CANCELLING) {
      this.jobs.set(chatId, transitionGeneration(current, GenerationStatus.CANCELLING, this.now()));
      this.emit(chatId);
    }
    const entry = this.streams.get(chatId);
    entry?.stream?.cancel?.();
    const cancelling = this.get(chatId);
    if (cancelling?.status === GenerationStatus.CANCELLING) {
      this.jobs.set(chatId, transitionGeneration(cancelling, GenerationStatus.CANCELLED, this.now(), reason));
      this.streams.delete(chatId);
      this.emit(chatId);
    }
    return true;
  }

  cancelForDeletedChat(chatId) {
    const current = this.get(chatId);
    if (!current) return false;
    this.cancel(chatId, 'Cancelled because the source chat was deleted.');
    this.jobs.delete(chatId);
    this.streams.delete(chatId);
    this.emit(chatId);
    return true;
  }

  cancelForRemovedMessage(chatId, messageId) {
    const current = this.get(chatId);
    if (!current || current.targetMessageId !== messageId) return false;
    return this.cancel(chatId, 'Cancelled because the source message was removed.');
  }

  retry(chatId, streamFactory) {
    const current = this.get(chatId);
    if (!current || ![GenerationStatus.FAILED, GenerationStatus.CANCELLED].includes(current.status)) throw new Error('Only failed or cancelled jobs may be retried.');
    return this.start({ chatId, targetMessageId: current.targetMessageId, streamFactory, retryOf: current.jobId });
  }

  recoverAfterLifecycleTransition() {
    for (const [chatId, job] of this.jobs.entries()) {
      const recovered = recoverGenerationAfterLifecycleTransition(job, this.now());
      if (recovered !== job) {
        this.streams.get(chatId)?.stream?.cancel?.();
        this.streams.delete(chatId);
        this.jobs.set(chatId, recovered);
        this.emit(chatId);
      }
    }
  }

  emit(chatId) {
    this.onStateChange(chatId, this.get(chatId), this.snapshot());
  }
}
