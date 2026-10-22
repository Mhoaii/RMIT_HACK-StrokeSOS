import { AuthProvider } from '@/components/auth-provider';
import Dashboard from '@/components/dashboard';
import { loadTideConfig } from '@/lib/auth/tidecloakConfig';
export const dynamic = 'force-dynamic';
export default function Home() {
  let adapter = null, configError;
  try { adapter = loadTideConfig(); } catch (error) { configError = error instanceof Error ? error.message : 'Invalid adapter'; }
  return <AuthProvider adapter={adapter} configError={configError}><Dashboard /></AuthProvider>;
}
