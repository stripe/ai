import {defineConfig} from 'tsup';

export default defineConfig([
  // Provider build
  {
    entry: {
      'provider/index': 'provider/index.ts',
      'provider/stripe-provider': 'provider/stripe-provider.ts',
      'provider/stripe-language-model': 'provider/stripe-language-model.ts',
      'provider/stripe-language-model-v3': 'provider/stripe-language-model-v3.ts',
      'provider/utils': 'provider/utils.ts',
      'provider/utils-v3': 'provider/utils-v3.ts',
      'provider/types': 'provider/types.ts',
    },
    outDir: 'dist',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    clean: true,
    splitting: false,
    external: ['@ai-sdk/provider', '@ai-sdk/provider-utils', 'stripe', 'zod'],
    platform: 'node',
    target: 'es2022',
    tsconfig: 'provider/tsconfig.build.json',
    outExtension({format}) {
      return {
        js: format === 'cjs' ? '.js' : '.mjs',
      };
    },
  },
  // Meter build
  {
    entry: {
      'meter/index': 'meter/index.ts',
      'meter/wrapperV2': 'meter/wrapperV2.ts',
      'meter/wrapperV3': 'meter/wrapperV3.ts',
      'meter/meter-event-logging': 'meter/meter-event-logging.ts',
      'meter/meter-event-types': 'meter/meter-event-types.ts',
      'meter/types': 'meter/types.ts',
      'meter/utils': 'meter/utils.ts',
    },
    outDir: 'dist',
    format: ['cjs', 'esm'],
    dts: true,
    sourcemap: true,
    splitting: false,
    external: ['@ai-sdk/provider', 'stripe'],
    platform: 'node',
    target: 'es2022',
    tsconfig: 'meter/tsconfig.json',
    outExtension({format}) {
      return {
        js: format === 'cjs' ? '.js' : '.mjs',
      };
    },
  },
]);

