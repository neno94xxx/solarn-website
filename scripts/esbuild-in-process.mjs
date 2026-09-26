// Same esbuild compiler, run as WebAssembly when the host cannot spawn processes.
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import * as compiler from 'esbuild-wasm/esm/browser.js';
const require = createRequire(import.meta.url);
globalThis.self = { crypto, performance, TextEncoder, TextDecoder, WebAssembly, Uint8Array, ArrayBuffer, console, setTimeout, clearTimeout };
await compiler.initialize({
  wasmModule: await WebAssembly.compile(await readFile(require.resolve('esbuild-wasm/esbuild.wasm'))),
  worker: false,
});
export const transform = compiler.transform;
export const build = compiler.build;
export const version = compiler.version;
export default compiler;
