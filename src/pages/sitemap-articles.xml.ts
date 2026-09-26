import type { APIRoute } from 'astro';
import { publishedArticles } from '../lib/server/articles';
export const prerender=false;
const escape=(value:string)=>value.replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]!));
export const GET:APIRoute=async ({site})=>{
  try{const articles=await publishedArticles();return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['/','/clanci/'].map(path=>`<url><loc>${escape(new URL(path,site).href)}</loc></url>`).join('')}${articles.map(article=>`<url><loc>${escape(new URL(`/clanci/${article.slug}/`,site).href)}</loc><lastmod>${new Date(article.updated_at||article.date).toISOString()}</lastmod></url>`).join('')}</urlset>`,{headers:{'Content-Type':'application/xml; charset=utf-8','Cache-Control':'public, max-age=0, must-revalidate'}});}
  catch{return new Response('Sitemap temporarily unavailable',{status:503,headers:{'Retry-After':'60','Cache-Control':'no-store'}});}
};
