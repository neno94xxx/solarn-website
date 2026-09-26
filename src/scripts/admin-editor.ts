import { slugify, validateArticle } from '../lib/article-validation.mjs';
import type { MediaAsset, ContentBlock } from '../lib/server/articles';

const form=document.querySelector<HTMLFormElement>('#editor-form')!;
const title=document.querySelector<HTMLInputElement>('#article-title')!;
const description=document.querySelector<HTMLTextAreaElement>('#article-description')!;
const slug=document.querySelector<HTMLInputElement>('#article-slug')!;
const category=document.querySelector<HTMLSelectElement>('#article-category')!;
const coverAlt=document.querySelector<HTMLInputElement>('#cover-alt')!;
const blocksContainer=document.querySelector<HTMLElement>('#content-blocks')!;
const status=document.querySelector<HTMLElement>('#editor-status')!;
const error=document.querySelector<HTMLElement>('#editor-error')!;
const media=new Map<string,MediaAsset>();
let blocks:ContentBlock[]=[];
let cover:MediaAsset|null=null;
let articleId:string|null=null;
let updatedAt:string|null=null;
let published=false;
let dirty=false;
let busy=false;
let customSlug=false;

function markDirty(){dirty=true;document.querySelector('#saved-time')!.textContent='Imate nespremljene promjene';}
function showError(message:string){error.textContent=message;error.hidden=false;}
function setBusy(value:boolean,message=''){busy=value;form.querySelectorAll<HTMLInputElement|HTMLTextAreaElement|HTMLButtonElement|HTMLSelectElement>('input,textarea,button,select').forEach(control=>control.disabled=value);status.textContent=message;}
function syncSlug(){document.querySelector('#slug-preview')!.textContent=slug.value||'naslov-vaseg-clanka';}
async function api(path:string,options?:RequestInit){
  const response=await fetch(path,options);let data;
  try{data=await response.json();}catch{throw new Error('Poslužitelj nije odgovorio. Pokušajte ponovno; sadržaj je ostao u obrascu.');}
  if(response.status===401)document.querySelector<HTMLElement>('#reauth-link')!.hidden=false;
  if(!response.ok)throw new Error(data.error||'Zahtjev nije uspio.');
  return data;
}
function previewImage(asset:MediaAsset,alt=''){
  const image=document.createElement('img');const variant=asset.variants.find(item=>item.width>=800)||asset.variants.at(-1)!;
  image.src=variant.url;image.alt=alt;image.width=variant.width;image.height=variant.height;return image;
}
function showCover(){const box=document.querySelector<HTMLElement>('#cover-preview')!;box.replaceChildren();box.hidden=!cover;if(cover){box.append(previewImage(cover,coverAlt.value));document.querySelector('#cover-label')!.textContent='Zamijenite naslovnu sliku';}}
function button(label:string,accessibleName:string,action:()=>void){const element=document.createElement('button');element.type='button';element.textContent=label;element.setAttribute('aria-label',accessibleName);element.addEventListener('click',action);return element;}
function renderBlocks(focusId?:string){
  blocksContainer.replaceChildren();document.querySelector<HTMLElement>('#blocks-empty')!.hidden=blocks.length>0;document.querySelector('#block-count')!.textContent=`${blocks.length} blokova`;
  blocks.forEach((block,index)=>{
    const item=document.createElement('section');item.className='content-block';item.dataset.id=block.id;
    const heading=document.createElement('div');heading.className='block-heading';const label=document.createElement('span');label.textContent=`${String(index+1).padStart(2,'0')} · ${block.type==='heading'?'Podnaslov':block.type==='text'?'Tekst':'Slika'}`;
    const controls=document.createElement('div');controls.className='block-controls';
    const move=(offset:number)=>{const destination=index+offset;if(destination<0||destination>=blocks.length)return;[blocks[index],blocks[destination]]=[blocks[destination],blocks[index]];markDirty();renderBlocks(block.id);};
    const up=button('↑',`Pomakni blok ${index+1} gore`,()=>move(-1));up.disabled=index===0;
    const down=button('↓',`Pomakni blok ${index+1} dolje`,()=>move(1));down.disabled=index===blocks.length-1;
    const remove=button('Ukloni',`Ukloni blok ${index+1}`,()=>{if((block.text||block.mediaId)&&!confirm('Ukloniti ovaj blok iz članka?'))return;blocks.splice(index,1);markDirty();renderBlocks();});remove.className='remove-block';controls.append(up,down,remove);heading.append(label,controls);
    const content=document.createElement('div');content.className='block-content';
    if(block.type==='image'){
      const asset=media.get(block.mediaId!);if(asset)content.append(previewImage(asset,block.alt));
      for(const [key,labelText,placeholder,max] of [['alt','Opis slike','Što se nalazi na fotografiji?',250],['caption','Potpis ispod slike (opcionalno)','Dodatni kontekst ili autor fotografije',500]] as const){const fieldLabel=document.createElement('label');fieldLabel.htmlFor=`${block.id}-${key}`;fieldLabel.textContent=labelText;const input=document.createElement('input');input.id=fieldLabel.htmlFor;input.value=block[key]||'';input.maxLength=max;input.placeholder=placeholder;input.addEventListener('input',()=>{block[key]=input.value;markDirty();});content.append(fieldLabel,input);}
    }else{
      const fieldLabel=document.createElement('label');fieldLabel.htmlFor=`block-${block.id}`;fieldLabel.textContent=block.type==='heading'?'Podnaslov':'Tekst';
      const input=block.type==='heading'?document.createElement('input'):document.createElement('textarea');input.id=fieldLabel.htmlFor;input.value=block.text||'';input.maxLength=block.type==='heading'?220:20000;input.placeholder=block.type==='heading'?'Podnaslov odjeljka…':'Napišite tekst. Praznim retkom odvojite odlomke…';if(input instanceof HTMLTextAreaElement)input.rows=7;input.addEventListener('input',()=>{block.text=input.value;markDirty();});content.append(fieldLabel,input);
    }
    item.append(heading,content);blocksContainer.append(item);
  });
  if(focusId)blocksContainer.querySelector<HTMLElement>(`[data-id="${focusId}"] input,[data-id="${focusId}"] textarea`)?.focus();
}
async function upload(file:File):Promise<MediaAsset>{
  if(file.size>10*1024*1024)throw new Error(`${file.name}: najveća dopuštena veličina je 10 MB.`);
  const body=new FormData();body.append('image',file);const data=await api('/api/admin/media/',{method:'POST',body});media.set(data.media.id,data.media);return data.media;
}
title.addEventListener('input',()=>{if(!customSlug&&!slug.readOnly){slug.value=slugify(title.value);syncSlug();}markDirty();});
slug.addEventListener('input',()=>{customSlug=true;syncSlug();markDirty();});
for(const input of [description,category,coverAlt])input.addEventListener('input',markDirty);
document.querySelector<HTMLInputElement>('#cover-file')!.addEventListener('change',async event=>{
  const input=event.target as HTMLInputElement;const file=input.files?.[0];if(!file||busy)return;
  error.hidden=true;setBusy(true,'Optimiziramo i prenosimo naslovnu sliku…');
  try{cover=await upload(file);showCover();markDirty();status.textContent='Naslovna slika je spremljena.';}
  catch(e){showError(e instanceof Error?e.message:'Slika nije prenesena.');}
  finally{input.value='';setBusy(false);renderBlocks();}
});
document.querySelectorAll<HTMLButtonElement>('[data-add]').forEach(control=>control.addEventListener('click',()=>{
  if(blocks.length>=80){showError('Najviše 80 blokova po članku.');return;}
  const block:ContentBlock={id:crypto.randomUUID(),type:control.dataset.add as 'heading'|'text',text:''};blocks.push(block);markDirty();renderBlocks(block.id);
}));
const fileInput=document.querySelector<HTMLInputElement>('#block-images')!;
document.querySelector('#add-images')!.addEventListener('click',()=>fileInput.click());
fileInput.addEventListener('change',async()=>{
  const files=Array.from(fileInput.files||[]);if(!files.length||busy)return;
  if(files.length+blocks.length>80){showError('Najviše 80 blokova po članku. Odaberite manje slika.');fileInput.value='';return;}
  error.hidden=true;setBusy(true);
  let completed=0;
  try{for(const file of files){status.textContent=`Optimiziramo i prenosimo sliku ${completed+1} od ${files.length}…`;const asset=await upload(file);blocks.push({id:crypto.randomUUID(),type:'image',mediaId:asset.id,alt:'',caption:''});completed++;markDirty();}}
  catch(e){showError(`${e instanceof Error?e.message:'Prijenos nije uspio.'} Spremljeno: ${completed} od ${files.length} slika.`);}
  finally{fileInput.value='';setBusy(false);renderBlocks();}
});
form.addEventListener('submit',async event=>{
  event.preventDefault();if(busy)return;
  const intended=(event.submitter as HTMLButtonElement|null)?.value||'draft';
  if(published&&intended==='draft'&&!confirm('Spremanje nacrta uklonit će ovaj članak s javnog portala. Nastaviti?'))return;
  error.hidden=true;document.querySelector<HTMLElement>('#reauth-link')!.hidden=true;
  try{
    const values=validateArticle({title:title.value,description:description.value,slug:slug.value,category:category.value,cover_image_id:cover?.id||null,cover_alt:coverAlt.value,blocks:blocks.map(({image,...block})=>block),status:intended});
    setBusy(true,intended==='published'?'Objavljujemo članak…':'Spremamo nacrt…');
    const data=await api('/api/admin/articles/',{method:articleId?'PATCH':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...values,id:articleId,updated_at:updatedAt})});
    articleId=data.article.id;updatedAt=data.article.updated_at;published=data.article.status==='published';dirty=false;
    history.replaceState(null,'',`/admin/urednik/?id=${articleId}`);document.querySelector('#editor-heading')!.textContent='Uređivanje članka';
    updatePublication();document.querySelector('#saved-time')!.textContent=`Spremljeno u ${new Intl.DateTimeFormat('hr-HR',{timeStyle:'short'}).format(new Date())}`;
    setBusy(false,published?'Članak je objavljen na portalu.':'Nacrt je spremljen.');renderBlocks();
  }catch(e){showError(e instanceof Error?e.message:'Spremanje nije uspjelo.');setBusy(false);renderBlocks();}
});
function updatePublication(){
  const badge=document.querySelector('#editor-badge')!;badge.className=`admin-badge ${published?'published':'draft'}`;badge.textContent=published?'Objavljeno':'Nacrt';
  document.querySelector('#publish-button')!.textContent=published?'Spremi promjene':'Objavi članak';
  const link=document.querySelector<HTMLAnchorElement>('#view-article')!;link.hidden=!published;link.href=`/clanci/${slug.value}/`;
  if(published)slug.readOnly=true;
}
async function initialize(){
  const id=new URLSearchParams(location.search).get('id');
  if(!id){blocks=[{id:crypto.randomUUID(),type:'text',text:''}];renderBlocks();return;}
  setBusy(true,'Učitavanje članka…');
  try{
    const {article}=await api(`/api/admin/articles/?id=${encodeURIComponent(id)}`);
    const ids=[article.cover_image_id,...article.blocks.filter((block:ContentBlock)=>block.type==='image').map((block:ContentBlock)=>block.mediaId)].filter(Boolean);
    if(ids.length){const response=await api(`/api/admin/media/?ids=${encodeURIComponent([...new Set(ids)].join(','))}`);for(const asset of response.media)media.set(asset.id,asset);}
    articleId=article.id;updatedAt=article.updated_at;published=article.status==='published';title.value=article.title;description.value=article.description;slug.value=article.slug;customSlug=true;slug.readOnly=!!article.published_at;category.value=article.category;coverAlt.value=article.cover_alt;blocks=article.blocks;cover=media.get(article.cover_image_id)||null;
    showCover();syncSlug();updatePublication();document.querySelector('#editor-heading')!.textContent='Uređivanje članka';document.querySelector('#saved-time')!.textContent=`Zadnja izmjena: ${new Intl.DateTimeFormat('hr-HR',{dateStyle:'medium',timeStyle:'short'}).format(new Date(updatedAt!))}`;setBusy(false);renderBlocks();
  }catch(e){showError(e instanceof Error?e.message:'Članak nije učitan.');status.textContent='Osvježite stranicu i pokušajte ponovno.';}
}
window.addEventListener('beforeunload',event=>{if(dirty||busy)event.preventDefault();});
void initialize();
