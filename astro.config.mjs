import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';
import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }

export default defineConfig({
  site: process.env.SITE_URL || 'https://solarni-portal.example',
  output: 'static',
  // Allow multipart overhead around a single image of at most 1 MB.
  adapter: node({ mode: 'standalone', bodySizeLimit: 2 * 1024 * 1024 }),
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/admin') && !page.includes('/api/') && !page.endsWith('/404/') })],
  devToolbar: { enabled: false },
});
