import type { APIRoute } from 'astro';
import { adminSession } from '../../../lib/server/supabase';
import { json, readJson, sameOrigin } from '../../../lib/server/http';
import { validateArticle, referencedMedia, UUID } from '../../../lib/article-validation.mjs';
import { articles as originals } from '../../../data/articles';
export const prerender=false;
export const GET: APIRoute = async context => {
  try {
    const session=await adminSession(context);
    if(!session.admin||!session.client)return json({error:'Potrebna je administratorska prijava.'},401);
    const id=context.url.searchParams.get('id');
    if(id&&!UUID.test(id))return json({error:'Neispravan identifikator.'},400);
    const query=session.client.from('solar_articles').select('*').order('updated_at',{ascending:false});
    const result=id?await query.eq('id',id).maybeSingle():await query.limit(500);
    if(result.error)return json({error:'Članke nije moguće učitati. Provjerite je li SQL skripta pokrenuta.'},503);
    if(id&&!result.data)return json({error:'Članak ne postoji.'},404);
    return json(id?{article:result.data}:{articles:result.data});
  }catch{return json({error:'Baza trenutačno nije dostupna.'},503);}
};
const save: APIRoute = async context => {
  if(!sameOrigin(context.request))return json({error:'Nedopušten izvor zahtjeva.'},403);
  try {
    const session=await adminSession(context);
    if(!session.admin||!session.client)return json({error:'Prijava je istekla. Ponovno se prijavite; uneseni sadržaj ostaje u obrascu.'},401);
    let payload, article;
    try{payload=await readJson(context.request);article=validateArticle(payload);}catch(error){return json({error:error instanceof Error?error.message:'Neispravan članak.'},400);}
    if(originals.some(item=>item.slug===article.slug))return json({error:'Ova URL oznaka pripada postojećem vodiču. Odaberite drugu.'},409);
    const ids=referencedMedia(article);
    if(ids.length){const media=await session.client.from('solar_media').select('id').in('id',ids);if(media.error||media.data?.length!==ids.length)return json({error:'Jedna od slika nije spremljena. Ponovno je prenesite.'},400);}
    let existing: {published_at:string|null,slug:string}|null=null;
    if(context.request.method==='PATCH'){
      if(!UUID.test(payload.id||'')||typeof payload.updated_at!=='string')return json({error:'Nedostaje spremljena verzija članka.'},400);
      const result=await session.client.from('solar_articles').select('published_at,slug').eq('id',payload.id).maybeSingle();
      if(result.error)return json({error:'Baza trenutačno nije dostupna.'},503);
      if(!result.data)return json({error:'Članak ne postoji.'},404);
      existing=result.data;
      if(existing.published_at && existing.slug!==article.slug)return json({error:'URL objavljenog članka ne može se mijenjati kako postojeće poveznice ne bi prestale raditi.'},400);
    }
    const values={...article,published_at:existing?.published_at || (article.status==='published'?new Date().toISOString():null)};
    const result=context.request.method==='PATCH'
      ? await session.client.from('solar_articles').update(values).eq('id',payload.id).eq('updated_at',payload.updated_at).select('id,slug,status,updated_at').maybeSingle()
      : await session.client.from('solar_articles').insert({...values,author_id:session.user!.id}).select('id,slug,status,updated_at').single();
    if(result.error)return json({error:result.error.code==='23505'?'Članak s ovom URL oznakom već postoji.':'Spremanje nije uspjelo. Vaš sadržaj je ostao u obrascu.'},result.error.code==='23505'?409:503);
    if(!result.data)return json({error:'Članak je u međuvremenu izmijenjen u drugom prozoru. Kopirajte svoje promjene i ponovno učitajte članak.'},409);
    return json({article:result.data},context.request.method==='POST'?201:200);
  }catch{return json({error:'Spremanje trenutačno nije dostupno. Sadržaj je ostao u obrascu.'},503);}
};
export const POST=save;
export const PATCH=save;
