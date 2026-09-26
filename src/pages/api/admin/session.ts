import type { APIRoute } from 'astro';
import { adminSession, sessionClient } from '../../../lib/server/supabase';
import { json, readJson, sameOrigin } from '../../../lib/server/http';
export const prerender=false;
export const GET: APIRoute = async context => {
  try {const session=await adminSession(context);return json({authenticated:session.admin,email:session.admin?session.user!.email:null,configured:session.configured},session.admin?200:401);}
  catch{return json({error:'Provjera prijave trenutačno nije dostupna.'},503);}
};
export const POST: APIRoute = async context => {
  if(!sameOrigin(context.request))return json({error:'Nedopušten izvor zahtjeva.'},403);
  const client=sessionClient(context);
  if(!client)return json({error:'Prvo povežite novi Supabase projekt u .env datoteci.'},503);
  try{
    const {email,password}=await readJson(context.request,4096);
    if(typeof email!=='string'||typeof password!=='string'||email.length>254||password.length>256||!email.trim()||!password)return json({error:'Unesite e-mail adresu i lozinku.'},400);
    const {data,error}=await client.auth.signInWithPassword({email:email.trim(),password});
    if(error||!data.user)return json({error:'Prijava nije uspjela. Provjerite podatke ili pokušajte kasnije.'},401);
    const role=await client.from('solar_admins').select('user_id').eq('user_id',data.user.id).maybeSingle();
    if(role.error||!role.data){await client.auth.signOut({scope:'local'});return json({error:role.error?'Baza nije spremna. Pokrenite SQL skriptu za Solarni portal.':'Ovaj račun nema administratorski pristup.'},403);}
    return json({ok:true});
  }catch{return json({error:'Prijava trenutačno nije dostupna. Pokušajte ponovno.'},503);}
};
export const DELETE: APIRoute = async context => {
  if(!sameOrigin(context.request))return json({error:'Nedopušten izvor zahtjeva.'},403);
  const client=sessionClient(context);
  if(client){try{await client.auth.signOut({scope:'local'});}catch{/* Local cookies are cleared below even during a network outage. */}}
  for(const cookie of (context.request.headers.get('cookie')||'').split(';')){const name=cookie.split('=')[0].trim();if(name.startsWith('sb-'))context.cookies.delete(name,{path:'/'});}
  return json({ok:true});
};
