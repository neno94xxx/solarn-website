import { createClient } from '@supabase/supabase-js';
import { createServerClient, parseCookieHeader } from '@supabase/ssr';
import type { APIContext } from 'astro';

export function supabaseConfig() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!url || !key || url.includes('vas-novi-projekt') || key.includes('zamijenite')) return null;
  try { if (new URL(url).protocol !== 'https:') return null; } catch { return null; }
  // Server requests also use the public key, so RLS is never bypassed.
  if (key.startsWith('sb_secret_')) return null;
  if (key.startsWith('eyJ')) { try { if (JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role !== 'anon') return null; } catch { return null; } }
  return { url, key };
}
const timeoutFetch: typeof fetch = (input, init) => fetch(input, { ...init, signal: init?.signal ? AbortSignal.any([init.signal,AbortSignal.timeout(12000)]) : AbortSignal.timeout(12000) });
export function publicClient() {
  const config = supabaseConfig();
  return config ? createClient(config.url,config.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:timeoutFetch}}) : null;
}
export function sessionClient(context: Pick<APIContext,'cookies'|'request'|'url'>) {
  const config = supabaseConfig();
  if (!config) return null;
  const cookieMap = new Map(parseCookieHeader(context.request.headers.get('cookie') || '').map(cookie=>[cookie.name,cookie.value || '']));
  return createServerClient(config.url,config.key,{
    global:{fetch:timeoutFetch},
    cookieOptions:{path:'/',httpOnly:true,sameSite:'lax',secure:context.url.protocol==='https:'},
    cookies:{
      getAll:()=>Array.from(cookieMap,([name,value])=>({name,value})),
      setAll:(values)=>{for (const {name,value,options} of values) {cookieMap.set(name,value);context.cookies.set(name,value,{...options,path:'/',httpOnly:true,sameSite:'lax',secure:context.url.protocol==='https:'});}},
    },
  });
}
export async function adminSession(context: Pick<APIContext,'cookies'|'request'|'url'>) {
  const client = sessionClient(context);
  if (!client) return {client:null,user:null,admin:false,configured:false};
  const {data:{user},error} = await client.auth.getUser();
  if (error || !user) return {client,user:null,admin:false,configured:true};
  const {data,error:roleError} = await client.from('solar_admins').select('user_id').eq('user_id',user.id).maybeSingle();
  return {client,user,admin:!roleError && !!data,configured:true};
}
