import { CLAUDE } from './claude_adapter.mjs'
const ADAPTERS = { CLAUDE };

export function getAdapter(provider) {
  provider = provider.toUpperCase();
  const adapter = ADAPTERS[provider];
  if (!adapter) {
    throw new Error(`Unknown provider: ${provider}`);
  }
  return adapter;
}
