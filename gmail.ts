import { google, getGoogleClient } from './google';

function decode(data?:string){ if(!data) return ''; return Buffer.from(data.replace(/-/g,'+').replace(/_/g,'/'),'base64').toString('utf8'); }
function header(headers:any[]|undefined,name:string){ return headers?.find(h=>h.name?.toLowerCase()===name.toLowerCase())?.value || ''; }
function bodyFromPart(part:any):string{
  if(part?.mimeType==='text/plain' && part.body?.data) return decode(part.body.data);
  for(const p of part?.parts||[]) { const b=bodyFromPart(p); if(b) return b; }
  if(part?.body?.data) return decode(part.body.data);
  return '';
}
export async function gmailSearch(q:string,max=10){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.messages.list({userId:'me',q,maxResults:max});
  const msgs=[] as any[];
  for(const m of r.data.messages||[]) {
    const x=await gmail.users.messages.get({userId:'me',id:m.id!,format:'full'});
    const p=x.data.payload; msgs.push({id:m.id,threadId:m.threadId,from:header(p?.headers,'From'),to:header(p?.headers,'To'),subject:header(p?.headers,'Subject'),date:header(p?.headers,'Date'),snippet:x.data.snippet||'',body:bodyFromPart(p)});
  }
  return msgs;
}
export async function gmailRead(id:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const x=await gmail.users.messages.get({userId:'me',id,format:'full'}); const p=x.data.payload;
  return {id,threadId:x.data.threadId,from:header(p?.headers,'From'),to:header(p?.headers,'To'),subject:header(p?.headers,'Subject'),date:header(p?.headers,'Date'),body:bodyFromPart(p),snippet:x.data.snippet||''};
}
function rawEmail(to:string,subject:string,body:string,replyToId?:string){
  const lines=[`To: ${to}`,`Subject: ${subject}`]; if(replyToId) lines.push(`In-Reply-To: ${replyToId}`); lines.push('Content-Type: text/plain; charset="UTF-8"','',body);
  return Buffer.from(lines.join('\r\n')).toString('base64url');
}
export async function gmailSend(to:string,subject:string,body:string,replyToId?:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.messages.send({userId:'me',requestBody:{raw:rawEmail(to,subject,body,replyToId)}}); return r.data;
}
export async function gmailDraft(to:string,subject:string,body:string){
  const auth=await getGoogleClient(); const gmail=google.gmail({version:'v1',auth});
  const r=await gmail.users.drafts.create({userId:'me',requestBody:{message:{raw:rawEmail(to,subject,body)}}}); return r.data;
}
