import { loadEnvFile } from 'node:process';
try { loadEnvFile('.env'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
process.env.HOST ||= '127.0.0.1';
process.env.PORT ||= '4321';
await import('../dist/server/entry.mjs');
