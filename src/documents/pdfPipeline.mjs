export const PDF_LIMITS = Object.freeze({ maxBytes: 10 * 1024 * 1024, maxPages: 100, maxContextCharacters: 60000 });
export const PdfStatus = Object.freeze({ IDLE: 'IDLE', INSPECTING: 'INSPECTING', EXTRACTING: 'EXTRACTING', READY: 'READY', CANCELLED: 'CANCELLED', FAILED: 'FAILED', UNAVAILABLE: 'UNAVAILABLE' });

export const createPdfJob = (file, now = Date.now()) => ({ file: { name: file?.name || 'document.pdf', size: Number(file?.size) || 0, mimeType: file?.mimeType || 'application/pdf' }, status: PdfStatus.IDLE, pageCount: null, pages: [], selectedPages: [], extractedText: '', error: null, progress: 0, createdAt: now, updatedAt: now });
export const validatePdfInput = (file, limits = PDF_LIMITS) => { if (!file || !/\.pdf$/i.test(file.name || '') && file.mimeType !== 'application/pdf') throw new Error('Unsupported PDF file.'); if (Number(file.size) > limits.maxBytes) throw new Error('PDF exceeds configured size ceiling.'); return true; };
export const selectedPdfPages = (job) => job.pages.filter((page) => job.selectedPages.includes(page.pageNumber));
export const selectPdfPages = (job, pages, now = Date.now()) => ({ ...job, selectedPages: Array.from(new Set((pages || []).filter((page) => Number.isInteger(page) && page >= 1 && page <= (job.pageCount || 0)))).sort((left, right) => left - right), updatedAt: now });
export const cancelPdfJob = (job, now = Date.now()) => ({ ...job, status: PdfStatus.CANCELLED, error: 'PDF extraction cancelled.', updatedAt: now });

export const processPdf = async ({ file, adapter, limits = PDF_LIMITS, isCancelled = () => false, onProgress = () => {}, now = Date.now() }) => {
  validatePdfInput(file, limits);
  if (!adapter?.inspect || !adapter?.extractPages) return { ...createPdfJob(file, now), status: PdfStatus.UNAVAILABLE, error: 'PDF extraction capability is unavailable in this runtime.' };
  if (isCancelled()) return cancelPdfJob(createPdfJob(file, now), now);
  let job = { ...createPdfJob(file, now), status: PdfStatus.INSPECTING, progress: 5 };
  onProgress(job);
  try {
    const inspected = await adapter.inspect(file);
    if (inspected?.encrypted) return { ...job, status: PdfStatus.FAILED, error: 'Encrypted PDFs cannot be processed.' };
    const pageCount = Number(inspected?.pageCount);
    if (!Number.isInteger(pageCount) || pageCount < 1) return { ...job, status: PdfStatus.FAILED, error: 'Corrupt or unsupported PDF.' };
    if (pageCount > limits.maxPages) return { ...job, status: PdfStatus.FAILED, error: 'PDF exceeds configured page ceiling.' };
    job = { ...job, pageCount, pages: Array.from({ length: pageCount }, (_, index) => ({ pageNumber: index + 1, text: '', status: 'PENDING' })), selectedPages: Array.from({ length: pageCount }, (_, index) => index + 1), status: PdfStatus.EXTRACTING, progress: 15 };
    onProgress(job);
    const extracted = await adapter.extractPages(file, job.selectedPages, ({ pageNumber, text, progress }) => { if (isCancelled()) return; const safe = String(text || ''); job = { ...job, pages: job.pages.map((page) => page.pageNumber === pageNumber ? { ...page, text: safe, status: 'READY' } : page), progress: Math.max(job.progress, Number(progress) || job.progress) }; onProgress(job); });
    if (isCancelled()) return cancelPdfJob(job, now);
    const ordered = (extracted || job.pages).sort((left, right) => left.pageNumber - right.pageNumber).map((page) => String(page.text || '')).join('\n\n');
    if (ordered.length > limits.maxContextCharacters) return { ...job, status: PdfStatus.FAILED, error: 'PDF text exceeds configured context ceiling.' };
    return { ...job, status: PdfStatus.READY, extractedText: ordered, progress: 100, updatedAt: now };
  } catch (error) {
    return { ...job, status: PdfStatus.FAILED, error: error?.message || 'PDF extraction failed.', updatedAt: now };
  }
};
