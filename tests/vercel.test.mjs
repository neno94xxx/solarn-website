import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// Run after a local Vercel-target build. Does not deploy or contact Supabase.
process.env.SUPABASE_URL='';
process.env.SUPABASE_PUBLISHABLE_KEY='';
const root=new URL('../.vercel/output/',import.meta.url);
const config=JSON.parse(await readFile(new URL('config.json',root),'utf8'));
const functionRoot=new URL('functions/_render.func/',root);
const runtime=JSON.parse(await readFile(new URL('.vc-config.json',functionRoot),'utf8'));
const {default:handler}=await import(new URL(runtime.handler,functionRoot).href);

test('Vercel output uses Node 24 and routes SSR articles/admin/API to a function',()=>{
  assert.equal(runtime.runtime,'nodejs24.x');
  for(const path of ['/','/clanci/','/clanci/test/','/admin/','/api/admin/media/','/sitemap-articles.xml'])assert.ok(config.routes.some(route=>route.dest==='_render'&&new RegExp(route.src).test(path)),path);
});
test('packaged Vercel function renders public HTML and protects admin',async()=>{
  for(const [path,status] of [['/',200],['/admin/prijava/',200],['/admin/',303],['/clanci/not-found/',404]]){
    const response=await handler.fetch(new Request('https://portal.example.org'+path));
    assert.equal(response.status,status,path);
    if(path==='/')assert.match(await response.text(),/<h1/);
    if(path==='/admin/')assert.equal(response.headers.get('location'),'/admin/prijava/');
  }
  const denied=await handler.fetch(new Request('https://portal.example.org/api/admin/articles/',{method:'DELETE',headers:{origin:'https://portal.example.org','content-type':'application/json'},body:'{}'}));
  assert.equal(denied.status,401);
});
