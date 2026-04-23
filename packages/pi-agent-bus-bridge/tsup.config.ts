import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['index.ts'],
  format: ['cjs'],
  clean: true,
  minify: false,
  sourcemap: true,
  dts: true,
  external: [], // All dependencies (including pi-agent-bus-node) should be bundled
  noExternal: ['pi-agent-bus-node'],
  outDir: 'dist',
});
