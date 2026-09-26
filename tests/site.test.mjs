import {test} from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:4321';
const paths=['/','/clanci/','/clanci/solarni-paneli-za-obiteljsku-kucu/','/solarni-kalkulator/','/solarna-energija/','/poticaji/','/o-portalu/','/cesta-pitanja/','/privatnost/','/pristupacnost/'];
const pages=new Map();
test('public HTML has Croatian language, unique metadata, one H1 and structured data',async()=>{
  const titles=new Set();
  for(const path of paths){const response=await fetch(base+path);assert.equal(response.status,200,path);const html=await response.text();pages.set(path,html);assert.match(html,/<html lang="hr">/);assert.equal((html.match(/<h1(?:\s|>)/g)||[]).length,1,path);assert.match(html,/<meta name="description" content="[^"]{40,}"/);assert.match(html,/<link rel="canonical" href="(?:https:\/\/|http:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?\/)/);const title=html.match(/<title>(.*?)<\/title>/s)[1];assert.ok(!titles.has(title));titles.add(title);for(const [,json] of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs))assert.ok(JSON.parse(json)['@type']);}
});
test('public links, CSS, scripts and representative optimized images return successfully',async()=>{
  const urls=new Set();
  for(const html of pages.values())for(const [,url] of html.matchAll(/(?:href|src)="(\/[^"#]*)(?:#[^"]*)?"/g))urls.add(url.replace(/&amp;/g,'&'));
  for(const url of urls){const response=await fetch(base+url,{method:'HEAD'});assert.equal(response.status,200,url);}
  assert.ok(urls.has('/solarni-kalkulator/'));assert.ok(urls.has('/favicon.svg'));assert.ok([...urls].some(url=>url.startsWith('/_image')||url.startsWith('/_astro/')));
  const home=pages.get('/');assert.match(home,/fetchpriority="high"/);assert.match(home,/type="image\/avif"/);assert.match(home,/type="image\/webp"/);
});
test('robots, static sitemap and dynamic article sitemap include expected routes',async()=>{
  const robots=await(await fetch(base+'/robots.txt')).text();assert.match(robots,/Disallow: \/admin\//);assert.match(robots,/sitemap-articles.xml/);
  const dynamic=await(await fetch(base+'/sitemap-articles.xml')).text();assert.match(dynamic,/clanci\/solarni-paneli/);assert.doesNotMatch(dynamic,/\/admin\//);
  const index=await fetch(base+'/sitemap-index.xml');assert.equal(index.status,200);
  const missing=await fetch(base+'/clanci/nepostojeci-clanak/');assert.equal(missing.status,404);assert.match(await missing.text(),/noindex/);
});
test('admin and write endpoints require verified authentication and same-origin requests',async()=>{
  for(const path of ['/admin/','/admin/urednik/']){const response=await fetch(base+path,{redirect:'manual'});assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/admin/prijava/');assert.match(response.headers.get('cache-control'),/no-store/);}
  const login=await fetch(base+'/admin/prijava/');assert.equal(login.status,200);assert.match(login.headers.get('x-robots-tag'),/noindex/);assert.match(login.headers.get('cache-control'),/no-store/);
  for(const path of ['/api/admin/articles/','/api/admin/media/']){const response=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,401);}
  const forged=await fetch(base+'/api/admin/session/',{method:'POST',headers:{Origin:'https://attacker.example','Content-Type':'application/json'},body:'{}'});assert.equal(forged.status,403);
});
