import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

// Local, in-memory Postgres. These fixtures model Supabase's built-in schemas;
// they do not connect to, create users in, or mutate a real Supabase project.
test('setup SQL: repeatable migration and real Postgres RLS protects articles and storage',async()=>{
  const db=await PGlite.create();
  const admin='11111111-1111-4111-8111-111111111111';
  const member='22222222-2222-4222-8222-222222222222';
  const media='33333333-3333-4333-8333-333333333333';
  const draft='44444444-4444-4444-8444-444444444444';
  try{
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key,email text);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,delete on storage.objects to anon,authenticated;
      insert into auth.users values ('${admin}','ferdinand.nodilo@yahoo.com'),('${member}','member@example.test');`);
    const setup=await readFile(new URL('../supabase-setup.txt',import.meta.url),'utf8');
    await db.exec(setup);await db.exec(setup);
    const migration=await readFile(new URL('../supabase-update-delete-articles.txt',import.meta.url),'utf8');
    await db.exec(migration);await db.exec(migration);
    assert.equal(Number((await db.query("select file_size_limit from storage.buckets where id='solar-articles'")).rows[0].file_size_limit),100000);
    async function role(name,id=''){await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec(`set role ${name}`);}
    await role('authenticated',admin);
    assert.equal((await db.query('select public.is_solar_admin() as admin')).rows[0].admin,true);
    await db.query('insert into public.solar_media(id,owner_id,variants,width,height,original_name) values ($1,$2,$3,800,500,$4)',[media,admin,JSON.stringify([{path:`${admin}/${media}/800.webp`,width:800,height:500}]),'panels.jpg']);
    const blocks=JSON.stringify([{id:draft,type:'text',text:'Tekst o vlastitoj proizvodnji energije.'}]);
    await db.query('insert into public.solar_articles(id,title,slug,category,blocks) values ($1,$2,$3,$4,$5)',[draft,'Nacrt članka','nacrt-clanka','Vodiči',blocks]);
    await db.query('insert into public.solar_articles(title,slug,description,category,cover_image_id,cover_alt,blocks,status,published_at) values ($1,$2,$3,$4,$5,$6,$7,$8,now())',['Objavljeni članak','objavljeni-clanak','Opis objavljenog članka za javnu naslovnicu.','Vodiči',media,'Paneli na krovu kuće',blocks,'published']);
    await db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['solar-articles',`${admin}/${media}/800.webp`]);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['another-bucket',`${admin}/forbidden.webp`]));
    await role('anon');
    assert.equal((await db.query('select title from public.solar_articles')).rows.length,1);
    assert.equal((await db.query('select id from public.solar_media')).rows.length,1);
    await assert.rejects(db.query("insert into public.solar_articles(title,slug,category) values ('Intruder','intruder','Vodiči')"));
    await assert.rejects(db.query('select * from public.solar_admins'));
    await assert.rejects(db.query('select public.solar_delete_article($1,now())',[draft]));
    await assert.rejects(db.query('select * from public.solar_storage_cleanup_queue'));
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['solar-articles','anon/image.webp']));
    await role('authenticated',member);
    assert.equal((await db.query('select * from public.solar_admins')).rows.length,0);
    await assert.rejects(db.query('select public.solar_delete_article($1,now())',[draft]));
    assert.equal((await db.query('select title from public.solar_articles')).rows.length,1);
    await assert.rejects(db.query('insert into public.solar_admins(user_id) values ($1)',[member]));
    await assert.rejects(db.query("insert into public.solar_articles(title,slug,category) values ('Intruder','intruder','Vodiči')"));
    assert.equal((await db.query("update public.solar_articles set title='Hacked' returning id")).rows.length,0);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values ($1,$2)',['solar-articles',`${member}/image.webp`]));
    await role('authenticated',admin);
    assert.equal((await db.query('select * from public.solar_articles')).rows.length,2);
    await assert.rejects(db.query('update public.solar_articles set blocks=$1 where id=$2',[JSON.stringify([{id:draft,type:'title',text:'Second title'}]),draft]));
    await db.query("update public.solar_articles set status='draft' where slug='objavljeni-clanak'");
    await role('anon');
    assert.equal((await db.query('select * from public.solar_articles')).rows.length,0);
    assert.equal((await db.query('select * from public.solar_media')).rows.length,0);
    await role('authenticated',admin);
    // Shared cover/body images survive until the last attached article is deleted.
    await db.query('update public.solar_articles set blocks=$1 where id=$2',[JSON.stringify([{id:media,type:'image',mediaId:media,alt:'Solarni paneli'}]),draft]);
    const published=(await db.query("select * from public.solar_articles where slug='objavljeni-clanak'")).rows[0];
    await assert.rejects(db.query('select public.solar_delete_article($1,$2)',[published.id,'2000-01-01T00:00:00Z']));
    assert.equal((await db.query('select public.solar_delete_article($1,$2) as deleted',[published.id,published.updated_at])).rows[0].deleted,true);
    assert.equal((await db.query('select * from public.solar_media')).rows.length,1);
    assert.equal((await db.query('select * from public.solar_storage_cleanup_queue')).rows.length,0);
    // Retain historical attachments, even after removing an image from the body.
    await db.query('update public.solar_articles set blocks=$1 where id=$2',[blocks,draft]);
    const last=(await db.query('select * from public.solar_articles where id=$1',[draft])).rows[0];
    await db.query('select public.solar_delete_article($1,$2)',[draft,last.updated_at]);
    assert.equal((await db.query('select * from public.solar_articles')).rows.length,0);
    assert.equal((await db.query('select * from public.solar_media')).rows.length,0);
    assert.equal((await db.query('select * from public.solar_storage_cleanup_queue')).rows.length,1);
    // SQL leaves physical Storage removal to the authenticated API.
    assert.equal((await db.query('select * from storage.objects')).rows.length,1);
    assert.equal((await db.query('select public.solar_delete_article($1,$2) as deleted',[draft,last.updated_at])).rows[0].deleted,false);
    await assert.rejects(db.query('insert into public.solar_articles(title,slug,category,blocks) values ($1,$2,$3,$4)',['Missing image','missing-image','Novosti',JSON.stringify([{id:media,type:'image',mediaId:media,alt:'Solarni paneli'}])]));
    await db.query("delete from storage.objects where bucket_id='solar-articles'");
    assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  }finally{await db.close();}
});
