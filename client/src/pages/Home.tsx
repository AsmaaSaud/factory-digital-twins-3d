import { useState, useEffect, useRef, useCallback } from 'react';
import { FactorySimulation, defaultParams, type SimState, type SimParams } from '@/lib/simulationEngine';
import Factory3DScene, { type ServerPos } from '@/components/Factory3DScene';
import ControlPanel from '@/components/ControlPanel';
import StatsPanel, { type PredictionResult } from '@/components/StatsPanel';
import ExportModal from '@/components/ExportModal';

const PATH_META = [
  { label: 'PATH 1', lane: 'LEFT',   color: '#00d4ff' },
  { label: 'PATH 2', lane: 'CENTRE', color: '#00e676' },
  { label: 'PATH 3', lane: 'RIGHT',  color: '#ff6d35' },
];

const CAMERA_VIEWS = [
  { id: 'iso',   label: 'ISO'   },
  { id: 'top',   label: 'TOP'   },
  { id: 'front', label: 'FRONT' },
  { id: 'side',  label: 'SIDE'  },
];

export default function Home() {
  const [params, setParams] = useState<SimParams>({ ...defaultParams });
  const [simState, setSimState] = useState<SimState>(() => new FactorySimulation(defaultParams).getState());
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [activeView, setActiveView] = useState<'3d' | 'split'>('3d');
  const [showExport, setShowExport] = useState(false);
  const [serverPositions, setServerPositions] = useState<[ServerPos, ServerPos, ServerPos]>([
    { x: 4.5, z: 0 },
    { x: 4.5, z: 0 },
    { x: 4.5, z: 0 },
  ]);
  const [pathEnabled, setPathEnabled] = useState<[boolean, boolean, boolean]>([true, true, true]);

  const handleTogglePath = useCallback((idx: number) => {
    setPathEnabled(prev => {
      const next: [boolean, boolean, boolean] = [...prev] as [boolean, boolean, boolean];
      // Prevent disabling all paths
      if (next.filter(Boolean).length === 1 && next[idx]) return prev;
      next[idx] = !next[idx];
      simRef.current?.updateParams({ pathEnabled: next });
      return next;
    });
  }, []);

  const simRef = useRef<FactorySimulation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });

  const handleServerMove = useCallback((pathIdx: number, pos: ServerPos) => {
    setServerPositions(prev => {
      const next: [ServerPos, ServerPos, ServerPos] = [...prev] as [ServerPos, ServerPos, ServerPos];
      next[pathIdx] = { x: parseFloat(pos.x.toFixed(2)), z: parseFloat(pos.z.toFixed(2)) };
      return next;
    });
  }, []);

  useEffect(() => {
    const sim = new FactorySimulation(params);
    simRef.current = sim;
    const unsub = sim.subscribe(state => setSimState({ ...state }));
    return () => { unsub(); sim.pause(); };
  }, []);

  const handleParamsChange = useCallback((newParams: Partial<SimParams>) => {
    setParams(prev => {
      const updated = { ...prev, ...newParams };
      simRef.current?.updateParams(updated);
      return updated;
    });
  }, []);

  const handleStart = useCallback(() => simRef.current?.start(), []);
  const handlePause = useCallback(() => simRef.current?.pause(), []);

  const handleReset = useCallback(() => {
    if (simRef.current) {
      simRef.current.pause();
      const sim = new FactorySimulation(params);
      simRef.current = sim;
      sim.subscribe(state => setSimState({ ...state }));
      setSimState(sim.getState());
      setPredictionResult(null);
      setShowPrediction(false);
    }
  }, [params]);

  const handleRunPrediction = useCallback(() => {
    const result = simRef.current?.runPrediction({}, 480);
    if (result) {
      setPredictionResult(result);
      setShowPrediction(true);
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSceneSize({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hh = String(Math.floor(simState.time / 60)).padStart(2, '0');
  const mm = String(Math.floor(simState.time % 60)).padStart(2, '0');
  const throughputPerHour = simState.time > 0
    ? (simState.totalSinked / (simState.time / 60)).toFixed(1)
    : '0.0';

  const statsHeight = activeView === 'split' ? '45%' : (showPrediction ? '460px' : '400px');

  return (
    <div
      className="flex flex-col scanlines"
      style={{ height: '100vh', background: 'var(--surface-0)', overflow: 'hidden' }}
    >
      {/* ── HEADER ── */}
      <header
        className="flex items-center justify-between px-5 flex-shrink-0"
        style={{
          height: '50px',
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--border-dim)',
          zIndex: 20,
        }}
      >
        {/* Brand + Path indicators */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.3)' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#00d4ff" strokeWidth="1.5" fill="none" />
                <polyline points="9,22 9,12 15,12 15,22" stroke="#00d4ff" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <div
                className="font-bold tracking-widest text-glow-cyan"
                style={{ color: 'var(--cyan)', fontFamily: 'Orbitron, sans-serif', fontSize: '12px', lineHeight: 1.2 }}
              >
                FACTORY DIGITAL TWIN
              </div>
              <div style={{ color: '#2a4060', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', letterSpacing: '0.14em' }}>
                3D SIMULATION PLATFORM
              </div>
            </div>
          </div>

          <div className="w-px h-6" style={{ background: 'var(--border-dim)' }} />

          <div className="flex items-center gap-3">
            {PATH_META.map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: p.color,
                    boxShadow: `0 0 5px ${p.color}`,
                    opacity: simState.paths[i].serverBusy ? 1 : 0.35,
                  }}
                />
                <span style={{ color: p.color, fontFamily: 'Space Mono', fontSize: '10px' }}>{p.label}</span>
                <span style={{ color: '#2a4060', fontFamily: 'Space Mono', fontSize: '10px' }}>
                  Q:{simState.paths[i].queueLength}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center KPIs */}
        <div className="flex items-center gap-6">
          {[
            { label: 'SIM TIME',   value: `${hh}h ${mm}m`,                color: '#ffb300' },
            { label: 'COMPLETED',  value: `${simState.totalSinked} / ${simState.totalGenerated}`, color: 'var(--green)' },
            { label: 'THROUGHPUT', value: `${throughputPerHour} /hr`,      color: 'var(--cyan)' },
            { label: 'RESOURCE',   value: `${simState.resourceUsed} / ${params.resourceCapacity}`, color: 'var(--purple)' },
          ].map((k, i) => (
            <div key={i} className="text-center">
              <div style={{ color: '#2a4060', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.1em' }}>{k.label}</div>
              <div className="font-bold tabular-nums" style={{ color: k.color, fontFamily: 'Space Mono', fontSize: '13px' }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded"
            style={{
              background: simState.running ? 'rgba(0,230,118,0.07)' : 'rgba(255,61,87,0.07)',
              border: `1px solid ${simState.running ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,87,0.3)'}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: simState.running ? 'var(--green)' : 'var(--red)', color: simState.running ? 'var(--green)' : 'var(--red)' }}
            />
            <span
              className="font-bold"
              style={{
                color: simState.running ? 'var(--green)' : 'var(--red)',
                fontFamily: 'Rajdhani',
                fontSize: '10px',
                letterSpacing: '0.1em',
              }}
            >
              {simState.running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>

          <div
            className="px-2 py-1 rounded"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)', color: '#3a5070', fontFamily: 'Space Mono', fontSize: '10px' }}
          >
            {params.simSpeed}×
          </div>

          <button
            onClick={() => setActiveView(v => v === '3d' ? 'split' : '3d')}
            className="px-2.5 py-1 rounded transition-all text-xs font-bold"
            style={{
              background: activeView === 'split' ? 'rgba(0,212,255,0.12)' : 'var(--surface-3)',
              border: `1px solid ${activeView === 'split' ? 'rgba(0,212,255,0.35)' : 'var(--border-dim)'}`,
              color: activeView === 'split' ? 'var(--cyan)' : '#3a5070',
              fontFamily: 'Rajdhani',
              fontSize: '10px',
              letterSpacing: '0.08em',
            }}
          >
            {activeView === '3d' ? '⊞ SPLIT VIEW' : '⬛ 3D ONLY'}
          </button>

          <button
            onClick={() => setShowExport(true)}
            className="px-3 py-1 rounded font-bold tracking-wider transition-all"
            style={{
              background: 'rgba(0,230,118,0.08)',
              border: '1px solid rgba(0,230,118,0.35)',
              color: 'var(--green)',
              fontFamily: 'Rajdhani',
              fontSize: '10px',
              letterSpacing: '0.1em',
            }}
          >
            ↓ EXPORT
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* 3D Scene + Stats */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* 3D Scene */}
          <div ref={containerRef} className="flex-1 relative" style={{ minHeight: 0 }}>
            <Factory3DScene
              simState={simState}
              width={sceneSize.width}
              height={sceneSize.height}
              serverPositions={serverPositions}
              onServerMove={handleServerMove}
              pathEnabled={pathEnabled}
            />

            {/* Factory background overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663087850125/4RFvn4pBUquTWRmpQXtVMy/factory-bg-hrFTE9XeCmVBqhpcnMRpbk.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.06,
                mixBlendMode: 'screen',
              }}
            />

            {/* Top-left: Scene label */}
            <div
              className="absolute top-3 left-3 pointer-events-none"
              style={{ zIndex: 5 }}
            >
              <div
                className="px-2.5 py-1 rounded text-xs font-bold tracking-widest"
                style={{
                  background: 'rgba(7,9,15,0.75)',
                  border: '1px solid var(--border-dim)',
                  color: '#2a4060',
                  fontFamily: 'Orbitron, sans-serif',
                  fontSize: '9px',
                  letterSpacing: '0.14em',
                  backdropFilter: 'blur(6px)',
                }}
              >
                3D FACTORY FLOOR — ISOMETRIC VIEW
              </div>
            </div>

            {/* Top-left below label: Server position controls */}
            <div className="absolute top-10 left-3 flex flex-col gap-1" style={{ zIndex: 10 }}>
              {[
                { label: 'S1', color: '#00d4ff' },
                { label: 'S2', color: '#00e676' },
                { label: 'S3', color: '#ff6d35' },
              ].map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded"
                  style={{
                    background: 'rgba(7,9,15,0.85)',
                    border: `1px solid ${s.color}30`,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                  <span style={{ color: s.color, fontFamily: 'Space Mono', fontSize: '10px', minWidth: '14px' }}>{s.label}</span>
                  {/* X axis controls */}
                  <span style={{ color: '#5a7090', fontFamily: 'Space Mono', fontSize: '9px' }}>X={serverPositions[i].x.toFixed(1)}</span>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => handleServerMove(i, { x: Math.max(-1, serverPositions[i].x - 1), z: serverPositions[i].z })}
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color, fontSize: '11px', lineHeight: 1 }}
                    >−</button>
                    <button
                      onClick={() => handleServerMove(i, { x: Math.min(13, serverPositions[i].x + 1), z: serverPositions[i].z })}
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color, fontSize: '11px', lineHeight: 1 }}
                    >+</button>
                  </div>
                  {/* Z axis controls (left/right) */}
                  <span style={{ color: '#5a7090', fontFamily: 'Space Mono', fontSize: '9px' }}>Z={serverPositions[i].z.toFixed(1)}</span>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => handleServerMove(i, { x: serverPositions[i].x, z: Math.max(-3, serverPositions[i].z - 1) })}
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color, fontSize: '10px', lineHeight: 1 }}
                      title="Move left"
                    >◄</button>
                    <button
                      onClick={() => handleServerMove(i, { x: serverPositions[i].x, z: Math.min(3, serverPositions[i].z + 1) })}
                      className="w-4 h-4 rounded flex items-center justify-center"
                      style={{ background: `${s.color}18`, border: `1px solid ${s.color}35`, color: s.color, fontSize: '10px', lineHeight: 1 }}
                      title="Move right"
                    >►</button>
                  </div>
                  <button
                    onClick={() => handleServerMove(i, { x: 4.5, z: 0 })}
                    className="px-1.5 h-4 rounded flex items-center justify-center"
                    style={{ background: 'rgba(255,179,0,0.1)', border: '1px solid rgba(255,179,0,0.3)', color: '#ffb300', fontFamily: 'Space Mono', fontSize: '8px' }}
                  >RST</button>
                </div>
              ))}
            </div>

            {/* Top-right: Path legend */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 pointer-events-none" style={{ zIndex: 5 }}>
              {PATH_META.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2.5 py-1 rounded"
                  style={{
                    background: 'rgba(7,9,15,0.8)',
                    border: `1px solid ${p.color}25`,
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: p.color, fontFamily: 'Rajdhani', fontSize: '10px', letterSpacing: '0.06em' }}>
                    {p.label} — {p.lane} LANE
                  </span>
                  <span style={{ color: '#2a4060', fontFamily: 'Space Mono', fontSize: '9px' }}>
                    μ={[params.serviceMean1, params.serviceMean2, params.serviceMean3][i]}min
                  </span>
                </div>
              ))}
            </div>

            {/* Bottom-left: Camera controls */}
            <div className="absolute bottom-3 left-3 flex flex-col gap-1.5" style={{ zIndex: 10 }}>
              <div className="flex gap-1">
                {CAMERA_VIEWS.map(btn => (
                  <button
                    key={btn.id}
                    onClick={() => window.dispatchEvent(new CustomEvent('factory-camera', { detail: btn.id }))}
                    className="px-2 py-1 rounded transition-all"
                    style={{
                      background: 'rgba(7,9,15,0.85)',
                      border: '1px solid var(--border-dim)',
                      color: 'var(--cyan)',
                      fontFamily: 'Space Mono',
                      fontSize: '9px',
                      backdropFilter: 'blur(6px)',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(0,212,255,0.4)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-dim)'; }}
                  >
                    {btn.label}
                  </button>
                ))}
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('factory-camera', { detail: 'reset' }))}
                  className="px-2 py-1 rounded transition-all"
                  style={{
                    background: 'rgba(255,179,0,0.08)',
                    border: '1px solid rgba(255,179,0,0.3)',
                    color: '#ffb300',
                    fontFamily: 'Space Mono',
                    fontSize: '9px',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  ↺ RESET
                </button>
              </div>
              <div
                className="px-2 py-1 rounded"
                style={{
                  background: 'rgba(7,9,15,0.75)',
                  border: '1px solid var(--border-dim)',
                  color: '#2a4060',
                  fontFamily: 'Space Grotesk',
                  fontSize: '9px',
                  backdropFilter: 'blur(6px)',
                  letterSpacing: '0.04em',
                }}
              >
                DRAG = ROTATE &nbsp;·&nbsp; SCROLL = ZOOM &nbsp;·&nbsp; RIGHT-DRAG = PAN
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div
            style={{
              height: statsHeight,
              borderTop: '1px solid var(--border-dim)',
              flexShrink: 0,
              transition: 'height 0.3s ease',
              overflow: 'hidden',
            }}
          >
            <StatsPanel simState={simState} predictionResult={predictionResult} pathEnabled={pathEnabled} />
          </div>
        </div>

        {/* Control Panel */}
        <div style={{ width: '272px', flexShrink: 0 }}>
          <ControlPanel
            params={params}
            onParamsChange={handleParamsChange}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onRunPrediction={handleRunPrediction}
            isRunning={simState.running}
            simTime={simState.time}
            pathEnabled={pathEnabled}
            onTogglePath={handleTogglePath}
            resourceUsed={simState.resourceUsed}
            resourceAvailable={simState.resourceAvailable}
          />
        </div>
      </div>

      {/* Export Modal */}
      {showExport && (
        <ExportModal
          simState={simState}
          params={params}
          predictionResult={predictionResult}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}
