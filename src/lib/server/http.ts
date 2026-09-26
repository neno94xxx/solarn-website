export function json(data: unknown,status = 200) { return new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}}); }
export function sameOrigin(request: Request) { return request.headers.get('origin') === new URL(request.url).origin; }
export async function readJson(request: Request, limit=250000) {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new Error('Očekivan je JSON zahtjev.');
  const reader=request.body?.getReader(); if(!reader) throw new Error('Zahtjev je prazan.');
  const chunks: Uint8Array[]=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw new Error('Zahtjev je prevelik.');}chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
