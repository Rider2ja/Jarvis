import { google } from 'googleapis';
import { config } from './config';
import { readJson, writeJson } from './store';

const scopes = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar'
];

type Token = {access_token?:string; refresh_token?:string; scope?:string; token_type?:string; expiry_date?:number};
export function googleOAuth(){
  return new google.auth.OAuth2(config.googleClientId, config.googleClientSecret, config.googleRedirectUri);
}
export function googleAuthUrl(){
  return googleOAuth().generateAuthUrl({access_type:'offline',prompt:'consent',scope:scopes});
}
export async function getGoogleClient(){
  const token = await readJson<Token>('google-token.json',{});
  if(!token.access_token && !token.refresh_token) throw new Error('GOOGLE_NOT_CONNECTED');
  const auth=googleOAuth(); auth.setCredentials(token);
  auth.on('tokens', async t => { await writeJson('google-token.json',{...token,...t}); });
  return auth;
}
export async function saveGoogleTokens(tokens:Token){ await writeJson('google-token.json',tokens); }
export { google };
