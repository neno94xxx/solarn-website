import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import sharp from 'sharp';

test('admin HTTP flow: login, authorization, upload, publish, edit conflict and unpublish',async()=>{
  // The fake upstream is isolated to this test process. It never contacts Supabase.
  const upstream='https://solar-fixture.supabase.co';
  process.env.SUPABASE_URL=upstream;
  process.env.SUPABASE_PUBLISHABLE_KEY='sb_publishable_local_test_fixture';
  process.env.ASTRO_NODE_AUTOSTART='disabled';
  const adminId='11111111-1111-4111-8111-111111111111';
  const memberId='22222222-2222-4222-8222-222222222222';
  const articles=[];const media=[];const objects=new Map();const queue=[];let failStorage=false;
  const originalFetch=globalThis.fetch;
  const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
  const user=id=>({id,email:id===adminId?'editor@example.test':'member@example.test',role:'authenticated',aud:'authenticated',created_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{}});
  const token=id=>`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:id,role:'authenticated',aud:'authenticated',iss:upstream+'/auth/v1',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.${Buffer.from('test-signature-only').toString('base64url')}`;
  const identity=headers=>{try{return JSON.parse(Buffer.from((headers.get('authorization')||'').replace('Bearer ','').split('.')[1],'base64url')).sub;}catch{return null;}};
  globalThis.fetch=async(input,init={})=>{
    const url=new URL(input instanceof Request?input.url:String(input));
    if(url.origin!==upstream)return originalFetch(input,init);
    const headers=new Headers(init.headers||(input instanceof Request?input.headers:{}));
    const method=init.method||(input instanceof Request?input.method:'GET');
    let body={};if(typeof init.body==='string'){try{body=JSON.parse(init.body);}catch{}}
    const id=identity(headers);
    if(url.pathname==='/auth/v1/token'){
      if(body.password!=='fixture-password'||!['editor@example.test','member@example.test'].includes(body.email))return response({code:'invalid_credentials',msg:'Invalid login credentials'},400);
      const uid=body.email==='editor@example.test'?adminId:memberId;
      return response({access_token:token(uid),refresh_token:`fixture-refresh-${uid}`,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:user(uid)});
    }
    if(url.pathname==='/auth/v1/user')return id?response(user(id)):response({msg:'Not authenticated'},401);
    if(url.pathname==='/auth/v1/logout')return new Response(null,{status:204});
    if(url.pathname==='/rest/v1/solar_admins')return response(id===adminId?[{user_id:adminId}]:[]);
    if(url.pathname==='/rest/v1/rpc/solar_delete_article'){
      if(id!==adminId)return response({code:'42501'},403);
      const index=articles.findIndex(row=>row.id===body.p_id);if(index<0)return response(false);
      const target=articles[index];if(target.updated_at!==body.p_updated_at)return response({code:'40001'},409);
      articles.splice(index,1);
      const ids=[target.cover_image_id,...target.blocks.filter(b=>b.type==='image').map(b=>b.mediaId)];
      for(const mid of new Set(ids)){
        if(articles.some(row=>row.cover_image_id===mid||row.blocks.some(b=>b.mediaId===mid)))continue;
        const asset=media.find(row=>row.id===mid);if(!asset)continue;
        queue.push(...asset.variants.map(v=>({path:v.path,article_id:body.p_id})));
        media.splice(media.indexOf(asset),1);
      }
      return response(true);
    }
    if(url.pathname.startsWith('/storage/v1/object/solar-articles/')){
      if(id!==adminId)return response({message:'Forbidden'},403);
      objects.set(url.pathname,init.body);return response({Key:url.pathname,Id:randomUUID()});
    }
    if(url.pathname==='/storage/v1/object/solar-articles'&&method==='DELETE'){
      if(failStorage)return response({message:'Temporary Storage failure'},503);
      for(const path of body.prefixes||[])objects.delete('/storage/v1/object/solar-articles/'+path);
      return response([]);
    }
    const collection=url.pathname==='/rest/v1/solar_articles'?articles:url.pathname==='/rest/v1/solar_media'?media:url.pathname==='/rest/v1/solar_storage_cleanup_queue'?queue:null;
    if(!collection)throw new Error(`Unexpected fixture request: ${method} ${url.pathname}`);
    let matches=collection.filter(row=>{
      if(collection===articles&&id!==adminId&&row.status!=='published')return false;
      for(const key of ['id','slug','status','updated_at','path']){const filter=url.searchParams.get(key);if(filter?.startsWith('eq.')&&String(row[key])!==filter.slice(3))return false;if(filter?.startsWith('in.(')&&!filter.slice(4,-1).split(',').map(v=>v.replaceAll('"','')).includes(row[key]))return false;}
      return true;
    });
    if(method==='DELETE'){
      if(id!==adminId)return response({message:'Forbidden'},403);
      for(const row of matches)collection.splice(collection.indexOf(row),1);
      return response(matches);
    }
    if(method==='POST'||method==='PATCH'){
      if(id!==adminId)return response({message:'RLS denied'},403);
      if(method==='POST'){
        if(collection===articles&&articles.some(row=>row.slug===body.slug))return response({code:'23505'},409);
        const row={id:randomUUID(),created_at:new Date().toISOString(),updated_at:new Date().toISOString(),...body};collection.push(row);matches=[row];
      }else{for(const row of matches)Object.assign(row,body,{updated_at:new Date(Date.now()+5).toISOString()});}
    }
    if(url.searchParams.get('order'))matches.sort((a,b)=>new Date(b.published_at||b.updated_at)-new Date(a.published_at||a.updated_at));
    return response(headers.get('accept')?.includes('object+json')?(matches[0]||null):matches,method==='POST'?201:200);
  };
  let server;
  try{
    const {handler}=await import('../dist/server/entry.mjs');
    server=createServer(handler);server.listen(0,'127.0.0.1');await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}`;
    const request=(path,options={})=>originalFetch(base+path,{redirect:'manual',...options});
    const jsonOptions=(body,cookie='',method='POST')=>({method,headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify(body)});
    const unauth=await request('/admin/');assert.equal(unauth.status,303);
    const forged=await request('/api/admin/session/',{...jsonOptions({}),headers:{Origin:'https://wrong.example','Content-Type':'application/json'}});assert.equal(forged.status,403);
    const bad=await request('/api/admin/session/',jsonOptions({email:'editor@example.test',password:'wrong'}));assert.equal(bad.status,401);
    const member=await request('/api/admin/session/',jsonOptions({email:'member@example.test',password:'fixture-password'}));assert.equal(member.status,403);
    const loggedIn=await request('/api/admin/session/',jsonOptions({email:'editor@example.test',password:'fixture-password'}));assert.equal(loggedIn.status,200,await loggedIn.text());
    const setCookies=loggedIn.headers.getSetCookie();assert.ok(setCookies.length);for(const item of setCookies){assert.match(item,/httponly/i);assert.match(item,/samesite=lax/i);}
    const cookie=setCookies.map(item=>item.split(';')[0]).join('; ');
    const dashboard=await request('/admin/',{headers:{Cookie:cookie}});assert.equal(dashboard.status,200);assert.match(await dashboard.text(),/Vaše uredništvo|VAŠE UREDNIŠTVO/);assert.match(dashboard.headers.get('cache-control'),/no-store/);
    const editor=await request('/admin/urednik/',{headers:{Cookie:cookie}});assert.equal(editor.status,200);const editorHtml=await editor.text();assert.equal((editorHtml.match(/id="article-title"/g)||[]).length,1);assert.match(editorHtml,/id="block-images"/);assert.match(editorHtml,/multiple/);
    const badImage=new FormData();badImage.set('image',new Blob(['<svg><script>alert(1)</script></svg>'],{type:'image/svg+xml'}),'bad.svg');assert.equal((await request('/api/admin/media/',{method:'POST',headers:{Origin:base,Cookie:cookie},body:badImage})).status,400);
    const png=await sharp({create:{width:2000,height:1000,channels:3,background:'#335577'}}).png().toBuffer();
    const tooLarge=new FormData();tooLarge.set('image',new Blob([Buffer.alloc(1024*1024+1)],{type:'image/png'}),'too-large.png');
    const rejected=await request('/api/admin/media/',{method:'POST',headers:{Origin:base,Cookie:cookie},body:tooLarge});assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/1 MB/);assert.equal(objects.size,0);
    // Exact 1 MB boundary remains accepted (PNG decoders allow trailing bytes).
    const exactLimit=Buffer.concat([png,Buffer.alloc(1024*1024-png.length)]);
    const imageForm=new FormData();imageForm.set('image',new Blob([exactLimit],{type:'image/png'}),'panels.png');
    const upload=await request('/api/admin/media/',{method:'POST',headers:{Origin:base,Cookie:cookie},body:imageForm});assert.equal(upload.status,201,await upload.clone().text());const asset=(await upload.json()).media;
    assert.equal(asset.width,1600);assert.equal(asset.variants.length,3);assert.equal(objects.size,3);assert.ok(asset.variants.every(item=>item.url.endsWith('.webp')));
    for(const data of objects.values())assert.ok((data.byteLength??data.size)<=100000);
    const article={title:'Testni solarni članak',slug:'testni-solarni-clanak',category:'Novosti',description:'Novi članak o vlastitoj proizvodnji sunčeve energije.',status:'draft',cover_image_id:asset.id,cover_alt:'Solarni paneli na krovu',blocks:[{id:randomUUID(),type:'heading',text:'Podnaslov članka'},{id:randomUUID(),type:'text',text:'Tekst prvog odlomka.\n\n<script>alert(1)</script>'},{id:randomUUID(),type:'image',mediaId:asset.id,alt:'Paneli na suncu',caption:'Fotografija instalacije'},{id:randomUUID(),type:'text',text:'Završni odlomak članka.'}]};
    const created=await request('/api/admin/articles/',jsonOptions(article,cookie));assert.equal(created.status,201,await created.clone().text());let saved=(await created.json()).article;
    assert.equal((await request('/clanci/testni-solarni-clanak/')).status,404);
    const publish=await request('/api/admin/articles/',jsonOptions({...article,...saved,status:'published'},cookie,'PATCH'));assert.equal(publish.status,200,await publish.clone().text());const previous=saved;saved=(await publish.json()).article;
    const publicPage=await request('/clanci/testni-solarni-clanak/');assert.equal(publicPage.status,200);const html=await publicPage.text();assert.match(html,/Testni solarni članak/);assert.match(html,/&lt;script&gt;alert/);assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);assert.match(html,/Article/);assert.match(html,/Fotografija instalacije/);
    const home=await(await request('/')).text();assert.match(home,/testni-solarni-clanak/);
    const sitemap=await(await request('/sitemap-articles.xml')).text();assert.match(sitemap,/testni-solarni-clanak/);
    const stale=await request('/api/admin/articles/',jsonOptions({...article,...previous,status:'published'},cookie,'PATCH'));assert.equal(stale.status,409);
    const duplicate=await request('/api/admin/articles/',jsonOptions({...article,status:'published'},cookie));assert.equal(duplicate.status,409);
    const renamed=await request('/api/admin/articles/',jsonOptions({...article,...saved,slug:'novi-url',status:'published'},cookie,'PATCH'));assert.equal(renamed.status,400);
    const unpublish=await request('/api/admin/articles/',jsonOptions({...article,...saved,status:'draft'},cookie,'PATCH'));assert.equal(unpublish.status,200);
    saved=(await unpublish.json()).article;
    assert.equal((await request('/clanci/testni-solarni-clanak/')).status,404);
    assert.doesNotMatch(await(await request('/sitemap-articles.xml')).text(),/testni-solarni-clanak/);
    const shared=await request('/api/admin/articles/',jsonOptions({...article,slug:'shared-photo-article'},cookie));assert.equal(shared.status,201);const second=(await shared.json()).article;
    assert.equal((await request('/api/admin/articles/',jsonOptions(saved,'','DELETE'))).status,401);
    assert.equal((await request('/api/admin/articles/',{...jsonOptions(saved,cookie,'DELETE'),headers:{Cookie:cookie,Origin:'https://wrong.example','Content-Type':'application/json'}})).status,403);
    assert.equal((await request('/api/admin/articles/',jsonOptions({id:saved.id,updated_at:'2000-01-01T00:00:00Z'},cookie,'DELETE'))).status,409);
    const deleted=await request('/api/admin/articles/',jsonOptions(saved,cookie,'DELETE'));assert.equal(deleted.status,200);assert.equal((await deleted.json()).cleanupPending,false);assert.equal(objects.size,3);assert.equal(media.length,1);
    failStorage=true;
    const partial=await request('/api/admin/articles/',jsonOptions(second,cookie,'DELETE'));assert.equal(partial.status,200);assert.deepEqual(await partial.json(),{deleted:true,cleanupPending:true});assert.equal(articles.length,0);assert.equal(queue.length,3);assert.equal(objects.size,3);
    const retryFailed=await request('/api/admin/articles/',jsonOptions({cleanupOnly:true},cookie,'DELETE'));assert.equal(retryFailed.status,503);assert.equal(queue.length,3);
    failStorage=false;
    const retry=await request('/api/admin/articles/',jsonOptions({cleanupOnly:true},cookie,'DELETE'));assert.equal(retry.status,200);assert.equal((await retry.json()).cleanupPending,false);assert.equal(queue.length,0);assert.equal(objects.size,0);assert.equal(media.length,0);
    assert.equal((await request('/api/admin/articles/',jsonOptions(second,cookie,'DELETE'))).status,200);
    const logout=await request('/api/admin/session/',{method:'DELETE',headers:{Origin:base,Cookie:cookie}});assert.equal(logout.status,200);assert.ok(logout.headers.getSetCookie().some(item=>/Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(item)));
  }finally{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}globalThis.fetch=originalFetch;}
});
