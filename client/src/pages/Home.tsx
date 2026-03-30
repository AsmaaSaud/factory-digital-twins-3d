// =============================================================
// Home - 3D Factory Digital Twin Main Page
// Design: Industrial Control Room - Neon Factory HUD
// Layout: Header + 3D Scene (center) + Control Panel (right) + Stats (bottom)
// =============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { FactorySimulation, defaultParams, type SimState, type SimParams } from '@/lib/simulationEngine';
import Factory3DScene from '@/components/Factory3DScene';
import ControlPanel from '@/components/ControlPanel';
import StatsPanel, { type PredictionResult } from '@/components/StatsPanel';
import ExportModal from '@/components/ExportModal';

export default function Home() {
  const [params, setParams] = useState<SimParams>({ ...defaultParams });
  const [simState, setSimState] = useState<SimState>(() => {
    const sim = new FactorySimulation(defaultParams);
    return sim.getState();
  });
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
  const [showPrediction, setShowPrediction] = useState(false);
  const [activeView, setActiveView] = useState<'3d' | 'split'>('3d');
  const [showExport, setShowExport] = useState(false);
  const simRef = useRef<FactorySimulation | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [sceneSize, setSceneSize] = useState({ width: 0, height: 0 });

  // Initialize simulation
  useEffect(() => {
    const sim = new FactorySimulation(params);
    simRef.current = sim;
    const unsub = sim.subscribe(state => setSimState({ ...state }));
    return () => {
      unsub();
      sim.pause();
    };
  }, []);

  // Handle param changes
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

  // Resize observer for 3D scene
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

  const formatSimTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m`;
  };

  return (
    <div
      className="flex flex-col"
      style={{
        height: '100vh',
        background: '#0a0e1a',
        overflow: 'hidden',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* ===== HEADER ===== */}
      <header
        className="flex items-center justify-between px-6 py-2 flex-shrink-0"
        style={{
          background: 'rgba(10,14,26,0.98)',
          borderBottom: '1px solid #1a2540',
          height: '52px',
        }}
      >
        {/* Logo + Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid #00d4ff',
                boxShadow: '0 0 10px rgba(0,212,255,0.2)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="#00d4ff" strokeWidth="1.5" fill="none"/>
                <polyline points="9,22 9,12 15,12 15,22" stroke="#00d4ff" strokeWidth="1.5"/>
              </svg>
            </div>
            <div>
              <div
                className="text-sm font-bold tracking-widest"
                style={{ color: '#00d4ff', fontFamily: 'Orbitron, sans-serif', lineHeight: 1.2 }}
              >
                DIGITAL TWIN
              </div>
              <div
                className="text-xs tracking-wider"
                style={{ color: '#445566', fontFamily: 'Rajdhani, sans-serif' }}
              >
                3D FACTORY SIMULATION
              </div>
            </div>
          </div>

          {/* Path indicators */}
          <div className="flex items-center gap-3 ml-4">
            {[
              { label: 'PATH 1', color: '#00d4ff', q: simState.paths[0].queueLength, busy: simState.paths[0].serverBusy },
              { label: 'PATH 2', color: '#00ff88', q: simState.paths[1].queueLength, busy: simState.paths[1].serverBusy },
              { label: 'PATH 3', color: '#ff6b35', q: simState.paths[2].queueLength, busy: simState.paths[2].serverBusy },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: p.color,
                    boxShadow: `0 0 5px ${p.color}`,
                    opacity: p.busy ? 1 : 0.4,
                  }}
                />
                <span className="text-xs" style={{ color: p.color, fontFamily: 'Share Tech Mono', fontSize: '10px' }}>
                  {p.label}
                </span>
                <span className="text-xs" style={{ color: '#445566', fontFamily: 'Share Tech Mono', fontSize: '10px' }}>
                  Q:{p.q}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Center - Sim time */}
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-xs" style={{ color: '#445566', fontFamily: 'Rajdhani', letterSpacing: '0.1em' }}>SIM TIME</div>
            <div
              className="text-base font-bold"
              style={{ color: '#ffd700', fontFamily: 'Share Tech Mono', textShadow: '0 0 8px rgba(255,215,0,0.4)' }}
            >
              {formatSimTime(simState.time)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs" style={{ color: '#445566', fontFamily: 'Rajdhani', letterSpacing: '0.1em' }}>ENTITIES</div>
            <div className="text-base font-bold" style={{ color: '#00ff88', fontFamily: 'Share Tech Mono' }}>
              {simState.totalSinked} / {simState.totalGenerated}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs" style={{ color: '#445566', fontFamily: 'Rajdhani', letterSpacing: '0.1em' }}>RESOURCE</div>
            <div className="text-base font-bold" style={{ color: '#aa88ff', fontFamily: 'Share Tech Mono' }}>
              {simState.resourceUsed} / {params.resourceCapacity}
            </div>
          </div>
        </div>

        {/* Right - Status */}
        <div className="flex items-center gap-3">
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded"
            style={{
              background: simState.running ? 'rgba(0,255,136,0.08)' : 'rgba(255,51,102,0.08)',
              border: `1px solid ${simState.running ? '#00ff88' : '#ff3366'}`,
            }}
          >
            <div
              className="w-2 h-2 rounded-full pulse-dot"
              style={{ background: simState.running ? '#00ff88' : '#ff3366' }}
            />
            <span
              className="text-xs font-bold tracking-wider"
              style={{
                color: simState.running ? '#00ff88' : '#ff3366',
                fontFamily: 'Rajdhani, sans-serif',
                letterSpacing: '0.1em',
              }}
            >
              {simState.running ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className="text-xs px-2 py-1 rounded"
              style={{
                background: 'rgba(0,212,255,0.08)',
                border: '1px solid #1a2540',
                color: '#445566',
                fontFamily: 'Share Tech Mono',
              }}
            >
              {params.simSpeed}x SPEED
            </div>
            <button
              onClick={() => setActiveView(v => v === '3d' ? 'split' : '3d')}
              className="text-xs px-2 py-1 rounded transition-all"
              style={{
                background: activeView === 'split' ? 'rgba(0,212,255,0.15)' : 'rgba(0,212,255,0.05)',
                border: '1px solid #1a2540',
                color: activeView === 'split' ? '#00d4ff' : '#445566',
                fontFamily: 'Rajdhani',
              }}
            >
              {activeView === '3d' ? '⊞ SPLIT' : '⬛ 3D ONLY'}
            </button>
            <button
              onClick={() => setShowExport(true)}
              className="text-xs px-3 py-1 rounded font-bold tracking-wider transition-all hover:opacity-90"
              style={{
                background: 'rgba(0,255,136,0.12)',
                border: '1px solid #00ff88',
                color: '#00ff88',
                fontFamily: 'Rajdhani',
                letterSpacing: '0.08em',
              }}
            >
              ↓ EXPORT
            </button>
          </div>
        </div>
      </header>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex flex-1 overflow-hidden">

        {/* ===== 3D SCENE + STATS (left/center) ===== */}
        <div className="flex flex-col flex-1 overflow-hidden">

          {/* 3D Scene */}
          <div
            ref={containerRef}
            className="flex-1 relative"
            style={{ minHeight: 0 }}
          >
            <Factory3DScene
              simState={simState}
              width={sceneSize.width}
              height={sceneSize.height}
            />

            {/* 3D Overlay Labels */}
            <div
              className="absolute top-3 left-3 pointer-events-none"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              <div
                className="text-xs font-bold tracking-widest px-2 py-1 rounded"
                style={{
                  background: 'rgba(10,14,26,0.7)',
                  border: '1px solid #1a2540',
                  color: '#445566',
                  backdropFilter: 'blur(4px)',
                }}
              >
                3D FACTORY FLOOR — ISOMETRIC VIEW
              </div>
            </div>

            {/* Path labels overlay */}
            <div className="absolute top-3 right-3 flex flex-col gap-1 pointer-events-none">
              {[
                { name: 'PATH 1 — LEFT LANE', color: '#00d4ff', mean: params.serviceMean1 },
                { name: 'PATH 2 — CENTRE LANE', color: '#00ff88', mean: params.serviceMean2 },
                { name: 'PATH 3 — RIGHT LANE', color: '#ff6b35', mean: params.serviceMean3 },
              ].map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 px-2 py-1 rounded text-xs"
                  style={{
                    background: 'rgba(10,14,26,0.8)',
                    border: `1px solid ${p.color}33`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                  <span style={{ color: p.color, fontFamily: 'Rajdhani', letterSpacing: '0.05em' }}>{p.name}</span>
                  <span style={{ color: '#445566', fontFamily: 'Share Tech Mono', fontSize: '10px' }}>
                    μ={p.mean}min
                  </span>
                </div>
              ))}
            </div>

            {/* Factory background image - subtle overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: `url('https://d2xsxph8kpxj0f.cloudfront.net/310519663087850125/4RFvn4pBUquTWRmpQXtVMy/factory-bg-hrFTE9XeCmVBqhpcnMRpbk.webp')`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                opacity: 0.08,
                mixBlendMode: 'screen',
              }}
            />

            {/* Camera hint */}
            <div
              className="absolute bottom-3 left-3 text-xs pointer-events-none"
              style={{
                color: '#334455',
                fontFamily: 'Rajdhani, sans-serif',
                background: 'rgba(10,14,26,0.6)',
                padding: '4px 8px',
                borderRadius: '4px',
              }}
            >
              3D ISOMETRIC VIEW — REAL-TIME SIMULATION
            </div>
          </div>

          {/* Stats Panel (bottom) */}
          <div
            style={{
              height: activeView === 'split' ? '45%' : (showPrediction ? '320px' : '260px'),
              borderTop: '1px solid #1a2540',
              flexShrink: 0,
              transition: 'height 0.3s ease',
              overflow: 'hidden',
            }}
          >
            <StatsPanel simState={simState} predictionResult={predictionResult} />
          </div>
        </div>

        {/* ===== CONTROL PANEL (right) ===== */}
        <div
          style={{
            width: '280px',
            flexShrink: 0,
            borderLeft: '1px solid #1a2540',
          }}
        >
          <ControlPanel
            params={params}
            onParamsChange={handleParamsChange}
            onStart={handleStart}
            onPause={handlePause}
            onReset={handleReset}
            onRunPrediction={handleRunPrediction}
            isRunning={simState.running}
            simTime={simState.time}
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
