import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs'],
  clean: true,
  minify: false,
  sourcemap: true,
  dts: true,
  // Pi core packages must remain external — Pi provides them at runtime.
  // Do NOT bundle @mariozechner/pi-coding-agent or typebox (bundling jiti
  // breaks __dirname scope resolution and causes path errors on load).
  external: ['@mariozechner/pi-coding-agent', 'typebox'],
  // Our own packages get inlined so the extension is self-contained.
  noExternal: ['pi-agent-bus-node'],
  outDir: 'dist',
});
