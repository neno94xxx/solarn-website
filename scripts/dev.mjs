// Preview the actual static output and rebuild on edits. This also works on
// Windows hosts where native compiler child processes are unavailable.
import { watch } from 'node:fs';
import { Worker } from 'node:worker_threads';
await import('./build-in-process.mjs');
const startServer = () => {
  const worker = new Worker(new URL('./serve-app.mjs',import.meta.url));
  worker.on('error', error => console.error('Server error:', error.message));
  return worker;
};
let server = startServer();
const { build } = await import('astro');
let timer;
let building = false;
let pending = false;
async function rebuild() {
  if (building) { pending = true; return; }
  building = true;
  try { await server.terminate(); await build({}); server=startServer(); console.log('Rebuilt. Refresh the browser to see your changes.'); }
  catch (error) { console.error('Build failed:', error.message); }
  finally { building = false; if (pending) { pending = false; void rebuild(); } }
}
function schedule() { clearTimeout(timer); timer = setTimeout(rebuild, 400); }
for (const directory of ['src', 'public']) watch(directory, {recursive:true}, schedule);
watch('astro.config.mjs', schedule);
console.log('Watching src/ and public/. Refresh the browser after a successful rebuild.');
