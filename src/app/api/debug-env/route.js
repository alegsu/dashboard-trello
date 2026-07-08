import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const env = process.env;
  const keys = Object.keys(env).filter(k => k.includes('BLOB') || k.includes('VERCEL'));
  
  const blobEnv = {};
  for (const k of keys) {
    blobEnv[k] = env[k] ? env[k].substring(0, 10) + '...' : undefined;
  }
  
  return NextResponse.json(blobEnv);
}
