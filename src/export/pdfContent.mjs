export const PDF_LAYOUTS = Object.freeze({ POLISHED: 'polished', COMPACT: 'compact' });

export const escapePdfHtml = (value = '') => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const renderText = (value = '') => escapePdfHtml(value).replace(/\n/g, '<br />');
const layoutValue = (value) => value === PDF_LAYOUTS.COMPACT ? PDF_LAYOUTS.COMPACT : PDF_LAYOUTS.POLISHED;

export const pdfFilename = (chat = {}, layout = PDF_LAYOUTS.POLISHED) => {
  const safeTitle = String(chat.title || 'AI_Console_Chat').replace(/[^a-z0-9._-]+/gi, '_').replace(/^\.+/, '').replace(/^_+|_+$/g, '').slice(0, 64) || 'AI_Console_Chat';
  return `${safeTitle}${layoutValue(layout) === PDF_LAYOUTS.COMPACT ? '_compact' : ''}.pdf`;
};

export const createChatPdfHtml = (chat = {}, messages = [], createdAt = new Date().toLocaleString(), options = {}) => {
  const layout = layoutValue(options.layout);
  const messageCount = messages.length;
  const title = escapePdfHtml(chat.title || 'AI Console Chat');
  const rows = messages.map((message, index) => {
    const role = message.role === 'assistant' ? 'Assistant' : 'You';
    const timestamp = message.createdAt ? new Date(message.createdAt).toLocaleString() : '';
    return `<section class="message ${message.role === 'assistant' ? 'assistant' : 'user'}"><header><div class="role"><span class="role-dot">${message.role === 'assistant' ? 'AI' : 'Y'}</span><strong>${role}</strong></div><span>${escapePdfHtml(timestamp)}</span></header><div class="body">${renderText(message.content || '')}</div>${layout === PDF_LAYOUTS.POLISHED ? `<div class="sequence">${String(index + 1).padStart(2, '0')}</div>` : ''}</section>`;
  }).join('');

  const compact = layout === PDF_LAYOUTS.COMPACT;
  return `<!doctype html><html><head><meta charset="utf-8" /><style>
    @page { margin: ${compact ? '12mm 11mm 15mm' : '16mm 13mm 18mm'}; @bottom-right { content: "AI Console · " counter(page); color: #64748b; font-size: 8pt; } }
    * { box-sizing: border-box; } body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #172033; line-height: ${compact ? '1.38' : '1.55'}; font-size: ${compact ? '9.5pt' : '10.5pt'}; background: #ffffff; }
    .cover { border-bottom: 2px solid #0ea5b7; padding: 0 0 ${compact ? '10px' : '16px'}; margin-bottom: ${compact ? '12px' : '18px'}; } .eyebrow { color: #0e7490; font-size: 8pt; font-weight: 800; letter-spacing: 1.1px; text-transform: uppercase; margin: 0 0 6px; } h1 { font-size: ${compact ? '17pt' : '21pt'}; line-height: 1.18; letter-spacing: -0.35px; margin: 0 0 7px; color: #0f172a; } .meta { color: #64748b; margin: 0; font-size: 8.5pt; }
    .metrics { display: flex; gap: 8px; margin: 0 0 ${compact ? '12px' : '18px'}; } .metric { flex: 1; padding: 8px 10px; background: #f1f5f9; border: 1px solid #dbe5ed; border-radius: 8px; } .metric strong { display: block; color: #0f172a; font-size: 11pt; } .metric span { color: #64748b; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .7px; }
    .message { position: relative; page-break-inside: avoid; border: 1px solid #dbe5ed; border-radius: ${compact ? '7px' : '11px'}; padding: ${compact ? '9px 10px' : '12px 14px'}; margin: 0 0 ${compact ? '7px' : '11px'}; overflow: hidden; } .assistant { background: #f8fafc; } .user { background: #effcff; border-color: #b7ecf2; }
    header { display: flex; justify-content: space-between; gap: 12px; margin-bottom: ${compact ? '5px' : '8px'}; color: #475569; font-size: 8pt; } .role { display: flex; align-items: center; gap: 6px; color: #0f172a; } .role-dot { display: inline-flex; width: 18px; height: 18px; border-radius: 9px; align-items: center; justify-content: center; color: #ffffff; background: #0e7490; font-size: 6.5pt; font-weight: 800; } .user .role-dot { background: #0891b2; }
    .body { overflow-wrap: anywhere; white-space: normal; color: #1e293b; } .sequence { position: absolute; right: 12px; bottom: 7px; color: #cbd5e1; font-size: 7pt; font-weight: 800; letter-spacing: .7px; } footer { margin-top: 18px; color: #64748b; font-size: 7.5pt; line-height: 1.4; border-top: 1px solid #e2e8f0; padding-top: 8px; }
  </style></head><body><section class="cover"><p class="eyebrow">AI Console · Local ${compact ? 'Transcript' : 'Conversation Brief'}</p><h1>${title}</h1><p class="meta">Created locally · ${escapePdfHtml(createdAt)}</p></section>${compact ? '' : `<section class="metrics"><div class="metric"><strong>${messageCount}</strong><span>Visible messages</span></div><div class="metric"><strong>${escapePdfHtml(chat.workspaceId ? 'Workspace' : 'Personal')}</strong><span>Conversation scope</span></div></section>`}${rows || '<p>No visible conversation messages to export.</p>'}<footer>Created locally on this device. Export excludes API keys, PIN records, protected instructions, attachment extraction context and hidden request content.</footer></body></html>`;
};
