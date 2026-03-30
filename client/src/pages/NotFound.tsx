import { useLocation } from 'wouter';

export default function NotFound() {
  const [, setLocation] = useLocation();

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#07090f',
        fontFamily: 'Space Grotesk, system-ui, sans-serif',
        padding: '2rem',
      }}
    >
      <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '72px',
            fontWeight: 800,
            color: 'rgba(0,212,255,0.1)',
            lineHeight: 1,
            letterSpacing: '0.1em',
            marginBottom: '1rem',
          }}
        >
          404
        </div>
        <div
          style={{
            fontFamily: 'Orbitron, sans-serif',
            fontSize: '13px',
            fontWeight: 700,
            color: '#ff3d57',
            letterSpacing: '0.18em',
            marginBottom: '0.75rem',
          }}
        >
          ROUTE NOT FOUND
        </div>
        <div
          style={{ color: '#3a5070', fontSize: '13px', lineHeight: 1.6, marginBottom: '2rem' }}
        >
          The requested simulation route does not exist in this platform.
        </div>
        <button
          onClick={() => setLocation('/')}
          style={{
            padding: '10px 28px',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.3)',
            borderRadius: '4px',
            color: '#00d4ff',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.14em',
            cursor: 'pointer',
          }}
        >
          ← RETURN TO PLATFORM
        </button>
      </div>
    </div>
  );
}
