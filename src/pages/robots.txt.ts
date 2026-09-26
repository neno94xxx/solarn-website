import type { APIRoute } from 'astro';
export const GET: APIRoute = ({site}) => new Response(`User-agent: *\nAllow: /\nDisallow: /admin/\nDisallow: /api/admin/\n\nSitemap: ${new URL('sitemap-index.xml',site).href}\nSitemap: ${new URL('sitemap-articles.xml',site).href}\n`,{headers:{'Content-Type':'text/plain; charset=utf-8'}});
