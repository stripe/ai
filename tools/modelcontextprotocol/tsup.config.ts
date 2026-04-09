import {defineConfig} from 'tsup';
import pkg from './package.json';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['cjs'],
  target: 'es2022',
  platform: 'node',
  splitting: false,
  clean: true,
  define: {
    'process.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
});
