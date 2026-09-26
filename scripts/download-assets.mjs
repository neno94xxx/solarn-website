import { writeFile, mkdir } from 'node:fs/promises';
const assets = [
  ['solar-landscape.jpg','photo-1508514177221-188b1cf16e9d',1600],
  ['installation.jpg','photo-1621905251189-08b45d6a269e',1000],
  ['solar-panels.jpg','photo-1497440001374-f26997328c1b',1000],
];
await mkdir(new URL('../src/assets/',import.meta.url),{recursive:true});
await Promise.all(assets.map(async ([file,id,width])=>{
  const response = await fetch(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`,{signal:AbortSignal.timeout(45000)});
  if(!response.ok)throw new Error(`Image request failed: ${response.status}`);
  await writeFile(new URL(`../src/assets/${file}`,import.meta.url),Buffer.from(await response.arrayBuffer()));
  console.log(`Downloaded ${file}`);
}));
