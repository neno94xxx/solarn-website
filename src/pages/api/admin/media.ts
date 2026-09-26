import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { randomUUID } from 'node:crypto';
import { adminSession, supabaseConfig } from '../../../lib/server/supabase';
import { json, sameOrigin } from '../../../lib/server/http';
import { UUID } from '../../../lib/article-validation.mjs';
export const prerender=false;
export const GET: APIRoute = async context => {
  try{
    const session=await adminSession(context);
    if(!session.admin||!session.client)return json({error:'Potrebna je prijava.'},401);
    const ids=(context.url.searchParams.get('ids')||'').split(',').filter(Boolean);
    if(ids.length>81||ids.some(id=>!UUID.test(id)))return json({error:'Neispravne slike.'},400);
    if(!ids.length)return json({media:[]});
    const result=await session.client.from('solar_media').select('*').in('id',ids);
    if(result.error)return json({error:'Slike se ne mogu učitati.'},503);
    return json({media:result.data.map(item=>({...item,variants:item.variants.map((variant:{path:string;width:number;height:number})=>({...variant,url:`${supabaseConfig()!.url}/storage/v1/object/public/solar-articles/${variant.path}`}))}))});
  }catch{return json({error:'Slike trenutačno nisu dostupne.'},503);}
};
export const POST: APIRoute = async context => {
  if(!sameOrigin(context.request))return json({error:'Nedopušten izvor zahtjeva.'},403);
  try{
    const session=await adminSession(context);
    if(!session.admin||!session.client)return json({error:'Prijava je istekla. Ponovno se prijavite prije prijenosa slike.'},401);
    if(Number(context.request.headers.get('content-length')||0)>11*1024*1024)return json({error:'Slika smije imati najviše 10 MB.'},413);
    const form=await context.request.formData();const file=form.get('image');
    if(!(file instanceof File)||!file.size||file.size>10*1024*1024)return json({error:'Odaberite sliku do 10 MB.'},400);
    const input=Buffer.from(await file.arrayBuffer());
    let base;
    try{const decoded=sharp(input,{limitInputPixels:30000000,animated:false});const meta=await decoded.metadata();if(!['jpeg','png','webp','avif','heif'].includes(meta.format||'')||(meta.pages||1)>1)throw new Error();base=await decoded.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});}
    catch{return json({error:'Slika nije podržana ili je prevelike rezolucije. Koristite JPG, PNG, WebP ili AVIF do 30 megapiksela.'},400);}
    const id=randomUUID();const variants:{path:string;width:number;height:number}[]=[];
    const widths=[...new Set([Math.min(400,base.info.width),Math.min(800,base.info.width),base.info.width])];
    const uploaded:string[]=[];
    try{
      for(const width of widths){const output=await sharp(base.data).resize({width,withoutEnlargement:true}).webp({quality:80}).toBuffer({resolveWithObject:true});const path=`${session.user!.id}/${id}/${width}.webp`;const result=await session.client.storage.from('solar-articles').upload(path,output.data,{contentType:'image/webp',cacheControl:'31536000',upsert:false});if(result.error)throw new Error();uploaded.push(path);variants.push({path,width:output.info.width,height:output.info.height});}
      const media={id,owner_id:session.user!.id,variants,width:base.info.width,height:base.info.height,original_name:file.name.slice(0,255)};
      const result=await session.client.from('solar_media').insert(media);
      if(result.error)throw new Error();
      return json({media:{...media,variants:variants.map(variant=>({...variant,url:`${supabaseConfig()!.url}/storage/v1/object/public/solar-articles/${variant.path}`}))}},201);
    }catch{if(uploaded.length)await session.client.storage.from('solar-articles').remove(uploaded);return json({error:'Prijenos nije uspio. Provjerite je li SQL skripta kreirala Storage i pristupna pravila.'},503);}
  }catch{return json({error:'Prijenos slike nije uspio. Pokušajte ponovno.'},503);}
};
