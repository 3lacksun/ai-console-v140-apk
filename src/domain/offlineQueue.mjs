export const QueueStatus=Object.freeze({DRAFT:'DRAFT',QUEUED:'QUEUED',SENDING:'SENDING',SENT:'SENT',FAILED:'FAILED',CANCELLED:'CANCELLED'});
const transitions={DRAFT:['QUEUED','CANCELLED'],QUEUED:['SENDING','CANCELLED'],SENDING:['SENT','FAILED','CANCELLED'],FAILED:['QUEUED','CANCELLED'],SENT:[],CANCELLED:['QUEUED']};
const jobId=()=>`queue-${Date.now()}-${Math.random().toString(36).slice(2,10)}`;
const safeAttachments=(items=[])=>(Array.isArray(items)?items:[]).map(item=>({id:item?.id||null,name:String(item?.name||'Attachment'),type:item?.type||item?.mimeType||null,size:Number(item?.size)||null,requiresReattach:true}));
export const createQueuedTurn=({chatId,messageId,content,attachments=[],providerContextRequired=false,now=Date.now()})=>{const visible=String(content||'').trim();const files=safeAttachments(attachments);if(!visible&&!files.length)throw new Error('Queued turn requires visible text or attachment metadata.');return{id:jobId(),idempotencyKey:jobId(),chatId,messageId,content:visible,attachments:files,providerContextRequired:Boolean(providerContextRequired||files.length),status:QueueStatus.QUEUED,attempts:0,createdAt:now,updatedAt:now,error:null};};
export const transitionQueuedTurn=(turn,status,now=Date.now(),error=null)=>{if(!transitions[turn?.status]?.includes(status))throw new Error(`Invalid queue transition: ${turn?.status||'MISSING'} → ${status}`);return{...turn,status,updatedAt:now,attempts:status===QueueStatus.SENDING?turn.attempts+1:turn.attempts,error:status===QueueStatus.FAILED?String(error||'Unable to send queued turn.'):null};};
export const enqueueTurn=(queue,request)=>{if((queue||[]).some(e=>e.chatId===request.chatId&&e.messageId===request.messageId&&[QueueStatus.QUEUED,QueueStatus.SENDING].includes(e.status)))return queue;return[...(queue||[]),createQueuedTurn(request)];};
export const markSending=(q,id,now=Date.now())=>(q||[]).map(e=>e.id===id?transitionQueuedTurn(e,QueueStatus.SENDING,now):e);
export const markSent=(q,id,now=Date.now())=>(q||[]).map(e=>e.id===id?transitionQueuedTurn(e,QueueStatus.SENT,now):e);
export const markFailed=(q,id,error,now=Date.now())=>(q||[]).map(e=>e.id===id?transitionQueuedTurn(e,QueueStatus.FAILED,now,error):e);
export const retryTurn=(q,id,now=Date.now())=>(q||[]).map(e=>e.id===id&&[QueueStatus.FAILED,QueueStatus.CANCELLED].includes(e.status)?transitionQueuedTurn(e,QueueStatus.QUEUED,now):e);
export const cancelTurn=(q,id,now=Date.now())=>(q||[]).map(e=>e.id===id&&[QueueStatus.QUEUED,QueueStatus.FAILED].includes(e.status)?transitionQueuedTurn(e,QueueStatus.CANCELLED,now):e);
export const removeQueueForChat=(q,chatId)=>(q||[]).filter(e=>e.chatId!==chatId);
export const cleanCompletedTurns=(q)=>(q||[]).filter(e=>![QueueStatus.SENT,QueueStatus.CANCELLED].includes(e.status));
export const dispatchableQueuedTurns=(q)=>(q||[]).filter(e=>[QueueStatus.QUEUED,QueueStatus.FAILED].includes(e.status)&&!e.providerContextRequired);

export const recoverInterruptedTurns=(q,now=Date.now())=>(q||[]).map(e=>e?.status===QueueStatus.SENDING?{...e,status:QueueStatus.FAILED,updatedAt:now,error:'Delivery was interrupted before completion. Retry when ready.'}:e);
