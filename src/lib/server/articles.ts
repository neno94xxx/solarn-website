import type { ImageMetadata } from 'astro';
import { articles as originals } from '../../data/articles';
import { publicClient, supabaseConfig } from './supabase';
export interface MediaAsset { id:string; width:number; height:number; variants:{url:string;path:string;width:number;height:number}[]; }
export interface ContentBlock { id:string;type:'heading'|'text'|'image';text?:string;mediaId?:string;alt?:string;caption?:string;image?:MediaAsset; }
export interface PortalArticle {
  id?:string;slug:string;title:string;description:string;category:string;date:string;dateLabel:string;read:number;
  image:ImageMetadata|MediaAsset;alt:string;sections?:string[][];blocks?:ContentBlock[];source?:string;sourceLabel?:string;updated_at?:string;
}
export const originalArticles:PortalArticle[]=originals;
export class ArticlesUnavailable extends Error {}
const fields='id,slug,title,description,category,published_at,updated_at,cover_image_id,cover_alt,blocks';
function mediaAsset(row:any):MediaAsset {
  return {id:row.id,width:row.width,height:row.height,variants:row.variants.map((variant:any)=>({...variant,url:`${supabaseConfig()!.url}/storage/v1/object/public/solar-articles/${variant.path}`}))};
}
async function convert(rows:any[]):Promise<PortalArticle[]> {
  if(!rows.length)return [];
  const ids=[...new Set(rows.flatMap(row=>[row.cover_image_id,...row.blocks.filter((block:ContentBlock)=>block.type==='image').map((block:ContentBlock)=>block.mediaId)]).filter(Boolean))];
  const {data,error}=await publicClient()!.from('solar_media').select('id,width,height,variants').in('id',ids);
  if(error)throw new ArticlesUnavailable('Media unavailable');
  const assets=new Map((data||[]).map(row=>[row.id,mediaAsset(row)]));
  return rows.map(row=>{
    const date=row.published_at;
    const words=row.blocks.map((block:ContentBlock)=>block.text||'').join(' ').split(/\s+/).length;
    return {...row,date,dateLabel:new Intl.DateTimeFormat('hr-HR',{day:'numeric',month:'long',year:'numeric',timeZone:'Europe/Zagreb'}).format(new Date(date)),read:Math.max(1,Math.ceil(words/200)),image:assets.get(row.cover_image_id)||originals[0].image,alt:row.cover_alt,blocks:row.blocks.map((block:ContentBlock)=>({...block,image:block.mediaId?assets.get(block.mediaId):undefined}))};
  });
}
export async function publishedArticles():Promise<PortalArticle[]> {
  const client=publicClient();if(!client)return originalArticles;
  const {data,error}=await client.from('solar_articles').select(fields).eq('status','published').order('published_at',{ascending:false}).limit(500);
  if(error)throw new ArticlesUnavailable('Articles unavailable');
  const fresh=await convert(data||[]);
  // Newly published database articles precede the bundled example guides.
  return [...fresh,...originalArticles.filter(item=>!fresh.some(article=>article.slug===item.slug))];
}
export async function publishedArticle(slug:string):Promise<PortalArticle|null> {
  const original=originalArticles.find(article=>article.slug===slug);if(original)return original;
  const client=publicClient();if(!client)return null;
  const {data,error}=await client.from('solar_articles').select(fields).eq('status','published').eq('slug',slug).maybeSingle();
  if(error)throw new ArticlesUnavailable('Article unavailable');
  return data?(await convert([data]))[0]:null;
}
