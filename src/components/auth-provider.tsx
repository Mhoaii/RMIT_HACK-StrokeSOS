'use client';
import { createContext, useContext, type ReactNode, Component, useMemo, useState } from 'react';
import { TideCloakProvider, useTideCloak } from '@tidecloak/nextjs';
import type { TideAdapter } from '@/lib/auth/tidecloakConfig';
import type { Mode, Role } from '@/lib/model';
type Cipher = string | Uint8Array;
export interface AuthBridge {
  mode: Mode; configured: boolean; authenticated: boolean; initializing: boolean;
  identity: string; role: Role; error: string | null;
  login: () => Promise<void>; logout: () => Promise<void>;
  encrypt?: (items: { data: string; tags: string[] }[]) => Promise<Cipher[]>;
  decrypt?: (items: { encrypted: Cipher; tags: string[] }[]) => Promise<Cipher[]>;
  secureFetch?: (url: string, options: RequestInit) => Promise<Response>;
}
const AuthContext = createContext<AuthBridge | null>(null);
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('Auth provider missing'); return value; }

function SimulationProvider({ children, configured, configError }: { children: ReactNode; configured: boolean; configError?: string }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [role, setRole] = useState<Role>('PARAMEDIC');
  const value = useMemo<AuthBridge>(() => ({
    mode: 'simulation', configured, authenticated, initializing: false,
    identity: authenticated ? `${role === 'PARAMEDIC' ? 'Paramedic #992' : role === 'DISPATCHER' ? 'Dispatcher #115' : 'Root admin'} (simulated)` : 'Not authenticated',
    role, error: configError || null,
    login: async () => setAuthenticated(true), logout: async () => setAuthenticated(false),
  }), [authenticated, role, configured, configError]);
  return <AuthContext.Provider value={value}><SimulationRoleContext.Provider value={{ role, setRole }}>{children}</SimulationRoleContext.Provider></AuthContext.Provider>;
}
const SimulationRoleContext = createContext<{ role: Role; setRole: (role: Role) => void } | null>(null);
export function useSimulationRole() { return useContext(SimulationRoleContext); }

function TideBridge({ children }: { children: ReactNode }) {
  const tc = useTideCloak();
  const hasRole = (role: string) => tc.hasRealmRole(role) || tc.hasClientRole(role);
  const role: Role = tc.authenticated && hasRole('EMERGENCY_PARAMEDIC') ? 'PARAMEDIC' : tc.authenticated && hasRole('DISPATCHER') ? 'DISPATCHER' : 'ADMIN';
  const value: AuthBridge = {
    mode: 'tide', configured: true, authenticated: tc.authenticated, initializing: tc.isInitializing,
    identity: tc.authenticated ? String(tc.getValueFromToken('preferred_username') || tc.getValueFromToken('sub') || 'Tide user') : 'Not authenticated',
    role, error: tc.initError?.message || (tc.sessionExpired ? 'Tide session expired. Sign in again.' : null),
    login: tc.login, logout: tc.logout, encrypt: tc.doEncrypt, decrypt: tc.doDecrypt,
    secureFetch: tc.secureFetch,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
class AuthErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(error: Error) { return { error: error.message }; }
  render() { return this.state.error ? <div className="auth-failure"><h1>Tide initialization failed</h1><p>{this.state.error}</p><a href="/?mode=simulation">Open labeled simulation</a></div> : this.props.children; }
}
export function AuthProvider({ children, adapter, configError }: { children: ReactNode; adapter: TideAdapter | null; configError?: string }) {
  // Simulation is an explicit opt-in when a real adapter exists; a failing live SDK never silently falls back.
  const [simulation] = useState(() => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('mode') === 'simulation');
  if (!adapter || simulation) return <SimulationProvider configured={!!adapter} configError={configError}>{children}</SimulationProvider>;
  return <AuthErrorBoundary><TideCloakProvider config={{ ...adapter, useDPoP: { mode: 'strict', alg: 'ES256' } }}><TideBridge>{children}</TideBridge></TideCloakProvider></AuthErrorBoundary>;
}
