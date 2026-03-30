import { useState } from 'react';
import type { SimParams } from '@/lib/simulationEngine';

// ---- Types ----

interface ControlPanelProps {
  params: SimParams;
  onParamsChange: (params: Partial<SimParams>) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRunPrediction: () => void;
  isRunning: boolean;
  simTime: number;
  pathEnabled: [boolean, boolean, boolean];
  onTogglePath: (idx: number) => void;
}

interface ParamRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  color?: string;
  tooltip?: string;
  onChange: (v: number) => void;
}

// ---- Sub-components ----

function ParamRow({ label, value, min, max, step, unit = '', color = '#00d4ff', tooltip, onChange }: ParamRowProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="mb-3 group">
      <div className="flex justify-between items-center mb-1.5">
        <span
          className="text-xs tracking-wide select-none"
          style={{ color: '#6a7f99', fontFamily: 'Space Grotesk, sans-serif', fontSize: '10px', letterSpacing: '0.06em' }}
          title={tooltip}
        >
          {label}
        </span>
        <span
          className="text-xs font-bold tabular-nums"
          style={{ color, fontFamily: 'Space Mono, monospace', fontSize: '11px' }}
        >
          {value}{unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={e => onChange(parseFloat(e.target.value))}
          style={{ width: '100%', accentColor: color }}
        />
        <div
          className="absolute bottom-0 left-0 h-0.5 rounded pointer-events-none transition-all duration-150"
          style={{ width: `${pct}%`, background: color, opacity: 0.35 }}
        />
      </div>
    </div>
  );
}

// Tabs definition
const TABS = [
  { id: 'paths',   label: 'PATHS'   },
  { id: 'system',  label: 'SYSTEM'  },
  { id: 'routing', label: 'ROUTING' },
] as const;

type TabId = typeof TABS[number]['id'];

// Per-path metadata
const PATH_DEFS = [
  { label: 'PATH 1', lane: 'LEFT LANE',   color: 'var(--cyan)',   mean: 'serviceMean1' as const, std: 'serviceStd1' as const, cap: 'queueMax1' as const },
  { label: 'PATH 2', lane: 'CENTRE LANE', color: 'var(--green)',  mean: 'serviceMean2' as const, std: 'serviceStd2' as const, cap: 'queueMax2' as const },
  { label: 'PATH 3', lane: 'RIGHT LANE',  color: 'var(--orange)', mean: 'serviceMean3' as const, std: 'serviceStd3' as const, cap: 'queueMax3' as const },
];

// ---- Main Component ----

export default function ControlPanel({
  params,
  onParamsChange,
  onStart,
  onPause,
  onReset,
  onRunPrediction,
  isRunning,
  simTime,
  pathEnabled,
  onTogglePath,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paths');

  // Format sim time as HH:MM:SS
  const hh = String(Math.floor(simTime / 60)).padStart(2, '0');
  const mm = String(Math.floor(simTime % 60)).padStart(2, '0');
  const ss = String(Math.floor((simTime * 60) % 60)).padStart(2, '0');
  const timeStr = `${hh}:${mm}:${ss}`;

  const p3Prob = Math.max(0, 1 - params.routeProb1 - params.routeProb2);

  return (
    <div
      className="flex flex-col h-full"
      style={{ background: 'var(--surface-1)', borderLeft: '1px solid var(--border-dim)' }}
    >
      {/* Clock + Status */}
      <div
        className="px-4 pt-4 pb-3 flex items-start justify-between"
        style={{ borderBottom: '1px solid var(--border-dim)' }}
      >
        <div>
          <div
            className="text-xs tracking-widest mb-1"
            style={{ color: '#3a5070', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.12em' }}
          >
            CONTROL PANEL
          </div>
          <div
            className="text-2xl font-bold tabular-nums text-glow-cyan"
            style={{ color: 'var(--cyan)', fontFamily: 'Space Mono, monospace', letterSpacing: '0.04em' }}
          >
            {timeStr}
          </div>
          <div className="text-xs mt-0.5" style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>
            SIM ELAPSED
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 mt-1">
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{
              background: isRunning ? 'rgba(0,230,118,0.08)' : 'rgba(255,61,87,0.08)',
              border: `1px solid ${isRunning ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,87,0.3)'}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ color: isRunning ? 'var(--green)' : 'var(--red)', background: isRunning ? 'var(--green)' : 'var(--red)' }}
            />
            <span
              className="text-xs font-bold"
              style={{
                color: isRunning ? 'var(--green)' : 'var(--red)',
                fontFamily: 'Rajdhani, sans-serif',
                fontSize: '10px',
                letterSpacing: '0.1em',
              }}
            >
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <button
          onClick={isRunning ? onPause : onStart}
          className="flex-1 py-2.5 text-xs font-bold tracking-wider rounded transition-all"
          style={{
            background: isRunning
              ? 'linear-gradient(135deg, rgba(255,179,0,0.12), rgba(255,107,53,0.08))'
              : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,230,118,0.08))',
            border: `1px solid ${isRunning ? 'rgba(255,179,0,0.4)' : 'rgba(0,212,255,0.4)'}`,
            color: isRunning ? 'var(--amber)' : 'var(--cyan)',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.12em',
            boxShadow: isRunning
              ? '0 0 12px rgba(255,179,0,0.1)'
              : '0 0 12px rgba(0,212,255,0.1)',
          }}
        >
          {isRunning ? '⏸  PAUSE' : '▶  START'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2.5 text-xs font-bold tracking-wider rounded transition-all hud-tooltip"
          data-tip="Reset simulation"
          style={{
            background: 'rgba(255,61,87,0.08)',
            border: '1px solid rgba(255,61,87,0.3)',
            color: 'var(--red)',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.1em',
          }}
        >
          ↺ RESET
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 text-xs font-bold tracking-wider transition-all"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.1em',
              color: activeTab === tab.id ? 'var(--cyan)' : '#3a5070',
              borderBottom: activeTab === tab.id ? '2px solid var(--cyan)' : '2px solid transparent',
              background: activeTab === tab.id ? 'rgba(0,212,255,0.04)' : 'transparent',
              fontSize: '10px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* PATHS tab — per-line service params with enable/disable toggle */}
        {activeTab === 'paths' && (
          <div className="fade-in-up">
            {PATH_DEFS.map((path, i) => {
              const active = pathEnabled[i];
              return (
                <div
                  key={i}
                  className="mb-5 rounded"
                  style={{
                    padding: '10px',
                    background: active ? 'transparent' : 'rgba(255,61,87,0.03)',
                    border: `1px solid ${active ? path.color + '18' : 'rgba(255,61,87,0.12)'}`,
                    transition: 'all 0.25s',
                  }}
                >
                  {/* Path header row with toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-1 h-3 rounded-full"
                        style={{
                          background: active ? path.color : '#2a3a5a',
                          boxShadow: active ? `0 0 6px ${path.color}` : 'none',
                          transition: 'all 0.2s',
                        }}
                      />
                      <div>
                        <span
                          style={{
                            color: active ? path.color : '#2a3a5a',
                            fontFamily: 'Orbitron, sans-serif',
                            fontSize: '9px',
                            letterSpacing: '0.12em',
                            transition: 'color 0.2s',
                            display: 'block',
                          }}
                        >
                          {path.label}
                        </span>
                        <span
                          style={{
                            color: active ? '#3a5070' : '#1e2d40',
                            fontFamily: 'Space Grotesk, sans-serif',
                            fontSize: '8px',
                            letterSpacing: '0.08em',
                          }}
                        >
                          {path.lane}
                        </span>
                      </div>
                    </div>

                    {/* Toggle switch — enable or disable this production line */}
                    <button
                      onClick={() => onTogglePath(i)}
                      title={active ? 'Disable this production line' : 'Enable this production line'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 9px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: active ? `${path.color}15` : 'rgba(255,61,87,0.08)',
                        border: `1px solid ${active ? path.color + '40' : 'rgba(255,61,87,0.3)'}`,
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Toggle track */}
                      <div
                        style={{
                          width: '26px',
                          height: '13px',
                          borderRadius: '7px',
                          position: 'relative',
                          background: active ? path.color : 'rgba(255,61,87,0.35)',
                          transition: 'background 0.2s',
                          flexShrink: 0,
                        }}
                      >
                        {/* Toggle thumb */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '2.5px',
                            left: active ? '15px' : '2.5px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: '#ffffff',
                            transition: 'left 0.2s',
                            boxShadow: active ? `0 0 4px ${path.color}` : 'none',
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontFamily: 'Rajdhani, sans-serif',
                          fontSize: '9px',
                          fontWeight: 700,
                          letterSpacing: '0.1em',
                          color: active ? path.color : '#ff3d57',
                          minWidth: '28px',
                        }}
                      >
                        {active ? 'ACTIVE' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Param sliders — dimmed when path is disabled */}
                  <div
                    style={{
                      opacity: active ? 1 : 0.3,
                      pointerEvents: active ? 'auto' : 'none',
                      transition: 'opacity 0.25s',
                    }}
                  >
                    <ParamRow
                      label="SERVICE MEAN"
                      value={params[path.mean]}
                      min={5} max={60} step={1} unit=" min"
                      color={path.color}
                      tooltip="Mean processing time per unit (Normal distribution)"
                      onChange={v => onParamsChange({ [path.mean]: v })}
                    />
                    <ParamRow
                      label="STD DEVIATION"
                      value={params[path.std]}
                      min={1} max={15} step={0.5} unit=" min"
                      color={path.color}
                      tooltip="Variability in service time"
                      onChange={v => onParamsChange({ [path.std]: v })}
                    />
                    <ParamRow
                      label="QUEUE CAPACITY"
                      value={params[path.cap]}
                      min={1} max={30} step={1} unit=" units"
                      color={path.color}
                      tooltip="Maximum entities waiting in queue"
                      onChange={v => onParamsChange({ [path.cap]: v })}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SYSTEM tab — arrival rates, resource pool, sim speed */}
        {activeTab === 'system' && (
          <div className="fade-in-up">
            <div className="mb-5">
              <div
                className="flex items-center gap-2 mb-3 pb-1.5"
                style={{ borderBottom: '1px solid rgba(255,179,0,0.22)' }}
              >
                <div className="w-1 h-3 rounded-full" style={{ background: 'var(--amber)', boxShadow: '0 0 6px var(--amber)' }} />
                <span style={{ color: 'var(--amber)', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  ARRIVAL RATES
                </span>
              </div>
              <ParamRow
                label="GENERATOR 1 MEAN"
                value={params.arrivalRate1}
                min={0.5} max={10} step={0.5} unit=" min"
                color="var(--amber)"
                tooltip="Inter-arrival time for Generator 1 (Exponential)"
                onChange={v => onParamsChange({ arrivalRate1: v })}
              />
              <ParamRow
                label="GENERATOR 2 MEAN"
                value={params.arrivalRate2}
                min={0.5} max={10} step={0.5} unit=" min"
                color="var(--amber)"
                tooltip="Inter-arrival time for Generator 2 (Exponential)"
                onChange={v => onParamsChange({ arrivalRate2: v })}
              />
            </div>

            <div className="mb-5">
              <div
                className="flex items-center gap-2 mb-3 pb-1.5"
                style={{ borderBottom: '1px solid rgba(179,136,255,0.22)' }}
              >
                <div className="w-1 h-3 rounded-full" style={{ background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)' }} />
                <span style={{ color: 'var(--purple)', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  RESOURCE POOL
                </span>
              </div>
              <ParamRow
                label="POOL CAPACITY"
                value={params.resourceCapacity}
                min={5} max={100} step={5} unit=" units"
                color="var(--purple)"
                tooltip="Shared resource pool capacity (Resource1)"
                onChange={v => onParamsChange({ resourceCapacity: v })}
              />
              <div
                className="mt-2 p-2.5 rounded text-xs"
                style={{ background: 'rgba(179,136,255,0.05)', border: '1px solid rgba(179,136,255,0.15)' }}
              >
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#6a7f99', fontFamily: 'Space Grotesk' }}>ALLOCATED</span>
                  <span style={{ color: 'var(--purple)', fontFamily: 'Space Mono' }}>
                    {Math.round(params.resourceCapacity * 0.6)} / {params.resourceCapacity}
                  </span>
                </div>
                <div className="h-1.5 rounded overflow-hidden" style={{ background: 'var(--surface-4)' }}>
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: '60%', background: 'var(--purple)', opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>

            <div className="mb-5">
              <div
                className="flex items-center gap-2 mb-3 pb-1.5"
                style={{ borderBottom: '1px solid rgba(136,204,255,0.22)' }}
              >
                <div className="w-1 h-3 rounded-full" style={{ background: '#88ccff', boxShadow: '0 0 6px #88ccff' }} />
                <span style={{ color: '#88ccff', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  SIMULATION SPEED
                </span>
              </div>
              <ParamRow
                label="SPEED MULTIPLIER"
                value={params.simSpeed}
                min={1} max={30} step={1} unit="×"
                color="#88ccff"
                tooltip="1 real second = N sim minutes"
                onChange={v => onParamsChange({ simSpeed: v })}
              />
              <div className="flex gap-1 mt-1">
                {[1, 5, 10, 20].map(s => (
                  <button
                    key={s}
                    onClick={() => onParamsChange({ simSpeed: s })}
                    className="flex-1 py-1 rounded text-xs font-bold transition-all"
                    style={{
                      background: params.simSpeed === s ? 'rgba(136,204,255,0.15)' : 'var(--surface-3)',
                      border: `1px solid ${params.simSpeed === s ? 'rgba(136,204,255,0.4)' : 'var(--border-dim)'}`,
                      color: params.simSpeed === s ? '#88ccff' : '#3a5070',
                      fontFamily: 'Space Mono',
                      fontSize: '9px',
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROUTING tab — path probability distribution */}
        {activeTab === 'routing' && (
          <div className="fade-in-up">
            <div className="mb-5">
              <div
                className="flex items-center gap-2 mb-3 pb-1.5"
                style={{ borderBottom: '1px solid rgba(0,212,255,0.22)' }}
              >
                <div className="w-1 h-3 rounded-full" style={{ background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
                <span style={{ color: 'var(--cyan)', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  BRANCH ROUTING
                </span>
              </div>
              <ParamRow
                label="PATH 1 PROBABILITY"
                value={params.routeProb1}
                min={0} max={1} step={0.01} unit=""
                color="var(--cyan)"
                tooltip="Fraction of entities routed to Path 1"
                onChange={v => onParamsChange({ routeProb1: Math.min(v, 1 - params.routeProb2) })}
              />
              <ParamRow
                label="PATH 2 PROBABILITY"
                value={params.routeProb2}
                min={0} max={1} step={0.01} unit=""
                color="var(--green)"
                tooltip="Fraction of entities routed to Path 2"
                onChange={v => onParamsChange({ routeProb2: Math.min(v, 1 - params.routeProb1) })}
              />

              {/* Path 3 is derived automatically */}
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1.5">
                  <span style={{ color: '#6a7f99', fontFamily: 'Space Grotesk', fontSize: '10px', letterSpacing: '0.06em' }}>
                    PATH 3 PROBABILITY
                  </span>
                  <span style={{ color: 'var(--orange)', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>
                    {p3Prob.toFixed(2)}
                  </span>
                </div>
                <div className="h-1.5 rounded overflow-hidden" style={{ background: 'var(--surface-4)' }}>
                  <div
                    className="h-full rounded"
                    style={{ width: `${p3Prob * 100}%`, background: 'var(--orange)', opacity: 0.6 }}
                  />
                </div>
                <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>
                  Auto-calculated: 1 − P1 − P2
                </div>
              </div>

              {/* Visual distribution bar */}
              <div className="mt-4 p-3 rounded" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
                <div style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '8px' }}>
                  ROUTING DISTRIBUTION
                </div>
                <div className="flex h-4 rounded overflow-hidden gap-0.5">
                  {[
                    { prob: params.routeProb1, color: 'var(--cyan)',   label: 'P1' },
                    { prob: params.routeProb2, color: 'var(--green)',  label: 'P2' },
                    { prob: p3Prob,            color: 'var(--orange)', label: 'P3' },
                  ].map((seg, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-center text-xs font-bold rounded"
                      style={{
                        width: `${seg.prob * 100}%`,
                        background: seg.color,
                        opacity: 0.75,
                        fontFamily: 'Space Mono',
                        fontSize: '8px',
                        color: '#07090f',
                        minWidth: seg.prob > 0.05 ? undefined : '0px',
                        overflow: 'hidden',
                        transition: 'width 0.3s',
                      }}
                    >
                      {seg.prob > 0.08 ? seg.label : ''}
                    </div>
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  {[
                    { v: params.routeProb1, c: 'var(--cyan)'   },
                    { v: params.routeProb2, c: 'var(--green)'  },
                    { v: p3Prob,            c: 'var(--orange)' },
                  ].map((s, i) => (
                    <span key={i} style={{ color: s.c, fontFamily: 'Space Mono', fontSize: '9px' }}>
                      {Math.round(s.v * 100)}%
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Run Prediction button */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
        <button
          onClick={onRunPrediction}
          className="w-full py-2.5 text-xs font-bold tracking-wider rounded transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(179,136,255,0.15), rgba(0,212,255,0.08))',
            border: '1px solid rgba(179,136,255,0.4)',
            color: 'var(--purple)',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.12em',
            boxShadow: '0 0 12px rgba(179,136,255,0.08)',
          }}
        >
          ▷ RUN PREDICTION (8h)
        </button>
      </div>
    </div>
  );
}
