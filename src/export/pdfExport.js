import * as Print from 'expo-print';
import { createChatPdfHtml, pdfFilename, PDF_LAYOUTS } from './pdfContent.mjs';

export { createChatPdfHtml, pdfFilename, PDF_LAYOUTS };

export const createChatPdf = async (chat = {}, messages = [], options = {}) => {
  const layout = options.layout === PDF_LAYOUTS.COMPACT ? PDF_LAYOUTS.COMPACT : PDF_LAYOUTS.POLISHED;
  const result = await Print.printToFileAsync({ html: createChatPdfHtml(chat, messages, new Date().toLocaleString(), { layout }), base64: false });
  return { uri: result.uri, filename: pdfFilename(chat, layout), layout };
};
