// Optional build entrypoint for hosts that prohibit spawning native child processes.
import { registerHooks } from 'node:module';
process.env.ASTRO_TELEMETRY_DISABLED = '1';
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === 'esbuild') return {url:new URL('./esbuild-in-process.mjs',import.meta.url).href,shortCircuit:true};
    return nextResolve(specifier, context);
  },
});
const { build } = await import('astro');
await build({});
