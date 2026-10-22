import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export interface TideAdapter extends Record<string, unknown> {
  realm: string; 'auth-server-url': string; resource: string;
  jwk: { keys: Record<string, unknown>[] }; vendorId: string; homeOrkUrl: string;
}
export function loadTideConfig(): TideAdapter | null {
  const file = join(process.cwd(), 'data', 'tidecloak.json');
  const raw = process.env.CLIENT_ADAPTER || (existsSync(file) ? readFileSync(file, 'utf8') : '');
  if (!raw) return null;
  const config = JSON.parse(raw) as TideAdapter;
  if (!config.jwk?.keys?.length || !config.vendorId || !config.homeOrkUrl || !config.realm || !config.resource || !config['auth-server-url']) {
    throw new Error('Incomplete Tide adapter. Export the real Tide adapter with jwk, vendorId and homeOrkUrl from your licensed realm.');
  }
  // A browser public-client adapter may contain public verification keys, never credentials.
  if (config.credentials || config['client-secret'] || config['public-client'] === false) throw new Error('Use a public-client adapter without client secrets.');
  return config;
}
