import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import { optimizeImage,MAX_IMAGE_BYTES } from '../src/lib/server/image-optimization.mjs';

test('noisy photographs and transparent images fit 100 KB for every variant',async()=>{
  for(const channels of [3,4]){
    const input=await sharp(randomBytes(1600*1000*channels),{raw:{width:1600,height:1000,channels}}).png().toBuffer();
    const outputs=await optimizeImage(input);
    assert.ok(outputs.length>=1&&outputs.length<=3);
    for(const {data,info} of outputs){assert.ok(data.length<=MAX_IMAGE_BYTES);assert.equal(info.format,'webp');assert.ok(info.width<=1600);assert.equal((await sharp(data).metadata()).width,info.width);}
  }
});
test('tiny images remain valid, invalid formats are rejected',async()=>{
  const input=await sharp({create:{width:1,height:1,channels:3,background:'white'}}).png().toBuffer();
  assert.equal((await optimizeImage(input))[0].info.width,1);
  await assert.rejects(optimizeImage(Buffer.from('<svg width="10" height="10"></svg>')));
  await assert.rejects(optimizeImage(Buffer.from('invalid image')));
});
