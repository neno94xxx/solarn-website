export const CATEGORIES = ['Vodiči', 'Poticaji', 'Savjeti', 'Novosti'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function slugify(value) {
  return String(value).toLocaleLowerCase('hr').replace(/đ/g,'dj').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');
}
function text(value, label, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new Error(`${label}: unesite između ${min} i ${max} znakova.`);
  return value.trim();
}
export function validateArticle(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Članak nije ispravan.');
  const title = text(input.title,'Naslov',3,180);
  const slug = text(input.slug || slugify(title),'URL oznaka',3,100);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('URL oznaka smije sadržavati mala slova bez kvačica, brojeve i crtice.');
  if (!CATEGORIES.includes(input.category)) throw new Error('Odaberite kategoriju.');
  if (!['draft','published'].includes(input.status)) throw new Error('Odaberite valjani status.');
  if (input.cover_image_id !== null && !UUID.test(input.cover_image_id || '')) throw new Error('Odaberite naslovnu sliku.');
  if (input.status === 'published' && !input.cover_image_id) throw new Error('Za objavu dodajte naslovnu sliku.');
  const cover_alt = text(input.cover_alt || '', 'Opis naslovne slike', input.cover_image_id ? 3 : 0, 250);
  if (!Array.isArray(input.blocks) || input.blocks.length > 80) throw new Error('Članak može imati najviše 80 blokova.');
  const ids = new Set();
  const blocks = input.blocks.map(block => {
    if (!block || !UUID.test(block.id || '') || ids.has(block.id)) throw new Error('Blokovi članka nisu ispravni.');
    ids.add(block.id);
    if (block.type === 'heading' || block.type === 'text') return { id:block.id, type:block.type, text:text(block.text,block.type === 'heading' ? 'Podnaslov' : 'Tekst',1,block.type === 'heading' ? 220 : 20000) };
    if (block.type === 'image' && UUID.test(block.mediaId || '')) return { id:block.id,type:'image',mediaId:block.mediaId,alt:text(block.alt,'Opis slike',3,250),caption:text(block.caption || '','Potpis slike',0,500) };
    throw new Error('Dozvoljeni blokovi su podnaslov, tekst i slika.');
  });
  if (input.status === 'published' && !blocks.some(block => block.type === 'text')) throw new Error('Za objavu dodajte barem jedan tekstualni blok.');
  const firstText = blocks.find(block => block.type === 'text')?.text || '';
  const description = text(input.description || firstText.slice(0,200), 'Kratki opis',input.status === 'published' ? 20 : 0,320);
  return { title,slug,category:input.category,description,cover_image_id:input.cover_image_id,cover_alt,blocks,status:input.status };
}
export function referencedMedia(article) {
  return [...new Set([article.cover_image_id,...article.blocks.filter(block=>block.type==='image').map(block=>block.mediaId)].filter(Boolean))];
}
