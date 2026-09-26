import sharp from 'sharp';

// Decimal KB: every stored file is at most 100,000 bytes.
export const MAX_IMAGE_BYTES = 100_000;
export async function optimizeImage(input) {
  const source=sharp(input,{limitInputPixels:30_000_000,animated:false});
  const metadata=await source.metadata();
  if(!['jpeg','png','webp','avif','heif'].includes(metadata.format||'')||(metadata.pages||1)>1)throw new Error('Unsupported image');
  const base=await source.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).raw().toBuffer({resolveWithObject:true});
  const encode=async width=>{
    for(let size=width;size>=1;size=Math.floor(size*0.75)){
      for(const quality of [82,65,45]){
        const output=await sharp(base.data,{raw:{width:base.info.width,height:base.info.height,channels:base.info.channels}}).resize({width:size,withoutEnlargement:true}).webp({quality,alphaQuality:quality,effort:4}).toBuffer({resolveWithObject:true});
        if(output.data.length<=MAX_IMAGE_BYTES)return output;
      }
      if(size<=64)break;
    }
    throw new Error('Image cannot fit the 100 KB limit');
  };
  const largest=await encode(base.info.width);
  const outputs=[];
  for(const width of [...new Set([Math.min(400,largest.info.width),Math.min(800,largest.info.width),largest.info.width])]){
    const output=width===largest.info.width?largest:await encode(width);
    if(!outputs.some(item=>item.info.width===output.info.width))outputs.push(output);
  }
  return outputs.sort((a,b)=>a.info.width-b.info.width);
}
