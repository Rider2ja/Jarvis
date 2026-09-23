import {NextResponse} from 'next/server'; import {readJson} from '@/lib/store';
export async function GET(){const t=await readJson<any>('google-token.json',{});return NextResponse.json({connected:Boolean(t.refresh_token||t.access_token)});}
