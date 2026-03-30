import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#07090f', fontFamily: 'Space Grotesk, system-ui, sans-serif', padding: '2rem',
        }}>
          <div style={{
            maxWidth: '480px', width: '100%', background: '#0b0e1a',
            border: '1px solid rgba(255,61,87,0.3)', borderRadius: '8px', padding: '2rem',
            boxShadow: '0 0 40px rgba(255,61,87,0.08)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '6px',
                background: 'rgba(255,61,87,0.1)', border: '1px solid rgba(255,61,87,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#ff3d57" strokeWidth="1.5" />
                  <line x1="12" y1="9" x2="12" y2="13" stroke="#ff3d57" strokeWidth="1.5" strokeLinecap="round" />
                  <line x1="12" y1="17" x2="12.01" y2="17" stroke="#ff3d57" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
              <div>
                <div style={{ color: '#ff3d57', fontFamily: 'Orbitron, sans-serif', fontSize: '11px', fontWeight: 700, letterSpacing: '0.14em', marginBottom: '2px' }}>
                  SYSTEM FAULT
                </div>
                <div style={{ color: '#3a5070', fontSize: '11px' }}>An unexpected error occurred in the simulation runtime.</div>
              </div>
            </div>
            <div style={{
              background: '#07090f', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '4px',
              padding: '12px', marginBottom: '1.5rem', fontSize: '11px', color: '#5a7090',
              fontFamily: 'Space Mono, monospace', lineHeight: 1.6, maxHeight: '120px', overflow: 'auto',
            }}>
              {this.state.error?.message || 'Unknown error'}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{
                width: '100%', padding: '10px', background: 'rgba(0,212,255,0.08)',
                border: '1px solid rgba(0,212,255,0.3)', borderRadius: '4px', color: '#00d4ff',
                fontFamily: 'Rajdhani, sans-serif', fontSize: '11px', fontWeight: 700,
                letterSpacing: '0.12em', cursor: 'pointer',
              }}
            >
              ↺  RESTART PLATFORM
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
