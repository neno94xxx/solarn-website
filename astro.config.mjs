import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import vercel from '@astrojs/vercel';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

const onVercel = process.env.VERCEL === '1';
const site = process.env.SITE_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : 'https://solarni-portal.example');
if (onVercel && (new URL(site).protocol !== 'https:' || new URL(site).hostname.endsWith('.example') || ['localhost','127.0.0.1','[::1]'].includes(new URL(site).hostname))) {
  throw new Error('Na Vercelu postavite SITE_URL na javnu HTTPS domenu ili omogucite VERCEL_PROJECT_PRODUCTION_URL. Ne koristite localhost.');
}

export default defineConfig({
  site,
  output: 'static',
  // Allow multipart overhead around a single image of at most 1 MB.
  adapter: onVercel ? vercel({ maxDuration: 60 }) : node({ mode: 'standalone', bodySizeLimit: 2 * 1024 * 1024 }),
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !page.includes('/api/') && !page.endsWith('/404/') })],
  devToolbar: { enabled: false },
});
