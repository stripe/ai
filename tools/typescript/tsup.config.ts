import {defineConfig} from 'tsup';
import pkg from './package.json';

const sharedConfig = {
  define: {
    'process.env.PACKAGE_VERSION': JSON.stringify(pkg.version),
  },
};

export default defineConfig([
  {
    entry: ['src/langchain/index.ts'],
    outDir: 'langchain',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    ...sharedConfig,
  },
  {
    entry: ['src/ai-sdk/index.ts'],
    outDir: 'ai-sdk',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    ...sharedConfig,
  },
  {
    entry: ['src/modelcontextprotocol/index.ts'],
    outDir: 'modelcontextprotocol',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    ...sharedConfig,
  },
  {
    entry: ['src/openai/index.ts'],
    outDir: 'openai',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    ...sharedConfig,
  },
  {
    entry: ['src/customer-billing/index.ts'],
    outDir: 'customer-billing',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    ...sharedConfig,
  },
]);
