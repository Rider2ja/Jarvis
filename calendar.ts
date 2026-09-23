import { google, getGoogleClient } from './google';
export async function calendarList(days=7){
  const auth=await getGoogleClient(); const calendar=google.calendar({version:'v3',auth});
  const now=new Date(); const end=new Date(now.getTime()+days*86400000);
  const r=await calendar.events.list({calendarId:'primary',timeMin:now.toISOString(),timeMax:end.toISOString(),singleEvents:true,orderBy:'startTime',maxResults:50});
  return (r.data.items||[]).map(e=>({id:e.id,summary:e.summary,start:e.start?.dateTime||e.start?.date,end:e.end?.dateTime||e.end?.date,description:e.description||'',location:e.location||''}));
}
export async function calendarCreate(summary:string,start:string,end:string,description=''){ const auth=await getGoogleClient(); const calendar=google.calendar({version:'v3',auth}); const r=await calendar.events.insert({calendarId:'primary',requestBody:{summary,description,start:{dateTime:start},end:{dateTime:end}}}); return r.data; }
