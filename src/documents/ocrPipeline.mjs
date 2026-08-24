export const OcrStatus = Object.freeze({ IDLE: 'IDLE', PROCESSING: 'PROCESSING', READY: 'READY', CANCELLED: 'CANCELLED', FAILED: 'FAILED', UNAVAILABLE: 'UNAVAILABLE' });

export const detectOcrCapability = (adapter) => Boolean(adapter && typeof adapter.recognise === 'function');
export const createOcrJob = (source, now = Date.now()) => ({ source: { filename: source?.name || 'image', pageNumber: source?.pageNumber || null, uri: source?.uri || null }, status: OcrStatus.IDLE, text: '', error: null, progress: 0, createdAt: now, updatedAt: now });
export const cancelOcrJob = (job, now = Date.now()) => ({ ...job, status: OcrStatus.CANCELLED, error: 'OCR cancelled.', updatedAt: now });

export const runOcr = async ({ source, adapter, isCancelled = () => false, onProgress = () => {}, now = Date.now() }) => {
  let job = createOcrJob(source, now);
  if (!detectOcrCapability(adapter)) return { ...job, status: OcrStatus.UNAVAILABLE, error: 'OCR is unavailable on this device/runtime.' };
  if (isCancelled()) return cancelOcrJob(job, now);
  job = { ...job, status: OcrStatus.PROCESSING, progress: 1 };
  onProgress(job);
  try {
    const result = await adapter.recognise(source, (progress) => { if (!isCancelled()) { job = { ...job, progress: Math.max(job.progress, Number(progress) || 0) }; onProgress(job); } });
    if (isCancelled()) return cancelOcrJob(job, now);
    if (!result || typeof result.text !== 'string') return { ...job, status: OcrStatus.FAILED, error: 'OCR returned no attributable text.' };
    return { ...job, status: OcrStatus.READY, text: result.text, progress: 100, attribution: { filename: source?.name || 'image', pageNumber: source?.pageNumber || null }, updatedAt: now };
  } catch (error) {
    return { ...job, status: OcrStatus.FAILED, error: error?.message || 'OCR failed.', updatedAt: now };
  }
};
