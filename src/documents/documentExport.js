import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import { renderDocumentHtml, renderDocumentMarkdown, renderDocumentText } from './documentRender.mjs';

const safeName=(title='Document')=>String(title).replace(/[^a-z0-9._-]+/gi,'_').replace(/^_+|_+$/g,'')||'Document';
export const documentExportFilename=(doc,format)=>`${safeName(doc?.title)}.${format}`;
export async function previewDocumentPdf(doc){ return Print.printAsync({ html:renderDocumentHtml(doc) }); }
export async function exportDocument(doc,format='pdf'){
  const selected=String(format).toLowerCase();
  if(selected==='pdf'){
    const result=await Print.printToFileAsync({html:renderDocumentHtml(doc),base64:false});
    return {uri:result.uri,filename:documentExportFilename(doc,'pdf'),mimeType:'application/pdf'};
  }
  const content=selected==='md'?renderDocumentMarkdown(doc):selected==='html'?renderDocumentHtml(doc):renderDocumentText(doc);
  const ext=['md','html','txt'].includes(selected)?selected:'txt';
  const uri=`${FileSystem.cacheDirectory}${documentExportFilename(doc,ext)}`;
  await FileSystem.writeAsStringAsync(uri,content,{encoding:FileSystem.EncodingType.UTF8});
  return {uri,filename:documentExportFilename(doc,ext),mimeType:ext==='html'?'text/html':'text/plain'};
}
