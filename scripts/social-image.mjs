import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
await sharp(fileURLToPath(new URL('../src/assets/solar-landscape.jpg',import.meta.url))).resize(1200,630,{fit:'cover'}).jpeg({quality:80,mozjpeg:true}).toFile('public/social-card.jpg');
