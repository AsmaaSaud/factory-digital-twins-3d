import { useState, useRef } from 'react';
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
  // Live resource usage from simulation state
  resourceUsed: number;
  resourceAvailable: number;
}

// ---- SliderInput: slider + editable number box side by side ----

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  color: string;
  tooltip?: string;
  onChange: (v: number) => void;
}

function SliderInput({ label, value, min, max, step, unit = '', color, tooltip, onChange }: SliderInputProps) {
  const [inputVal, setInputVal] = useState<string>('');
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  function commitEdit(raw: string) {
    const n = parseFloat(raw);
    if (!isNaN(n)) {
      // Clamp to allowed range
      const clamped = Math.min(max, Math.max(min, n));
      onChange(clamped);
    }
    setEditing(false);
  }

  return (
    <div className="mb-4">
      {/* Label row */}
      <div className="flex justify-between items-center mb-1.5">
        <span
          title={tooltip}
          style={{
            color: '#6a7f99',
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: '10px',
            letterSpacing: '0.07em',
            userSelect: 'none',
          }}
        >
          {label}
        </span>

        {/* Editable value box */}
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            defaultValue={value}
            min={min}
            max={max}
            step={step}
            autoFocus
            onBlur={e => commitEdit(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitEdit((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') setEditing(false);
            }}
            style={{
              width: '64px',
              padding: '2px 6px',
              background: 'rgba(0,0,0,0.4)',
              border: `1px solid ${color}`,
              borderRadius: '4px',
              color,
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              textAlign: 'right',
              outline: 'none',
            }}
          />
        ) : (
          <button
            onClick={() => { setInputVal(String(value)); setEditing(true); }}
            title="Click to type a value"
            style={{
              padding: '2px 8px',
              background: `${color}12`,
              border: `1px solid ${color}30`,
              borderRadius: '4px',
              color,
              fontFamily: 'Space Mono, monospace',
              fontSize: '11px',
              fontWeight: 700,
              cursor: 'text',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = `${color}80`)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = `${color}30`)}
          >
            {value}{unit}
          </button>
        )}
      </div>

      {/* Slider */}
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
        {/* Progress underline */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: '2px',
            width: `${pct}%`,
            background: color,
            opacity: 0.3,
            borderRadius: '1px',
            pointerEvents: 'none',
            transition: 'width 0.1s',
          }}
        />
      </div>
    </div>
  );
}

// ---- Tabs ----

const TABS = [
  { id: 'paths',   label: 'PATHS'   },
  { id: 'system',  label: 'SYSTEM'  },
  { id: 'routing', label: 'ROUTING' },
] as const;
type TabId = typeof TABS[number]['id'];

// ---- Per-path metadata ----
// Each path maps to:
//   serviceKey  → params.serviceMean1/2/3   (Service Speed in minutes)
//   queueKey    → params.queueMax1/2/3      (Queue Max Capacity)
//   arrivalKey  → params.arrivalRate1/2     (Arrival Rate — shared gen, per-path display)
//
// NOTE: arrivalRate1 & arrivalRate2 are the two generators that feed ALL paths.
// We expose arrivalRate1 on Path 1 and arrivalRate2 on Path 2 as the user-facing
// "arrival rate" knob. Path 3 inherits the combined flow and shows arrivalRate1
// as a read-only reference (both generators feed it equally).
// This matches the JaamSim model: EntityGenerator1 + EntityGenerator2 → Branch1.

const PATH_DEFS = [
  {
    label: 'PATH 1', lane: 'LEFT LANE',
    color: 'var(--cyan)',
    serviceKey: 'serviceMean1' as const,
    queueKey:   'queueMax1'    as const,
    arrivalKey: 'arrivalRate1' as const,
  },
  {
    label: 'PATH 2', lane: 'CENTRE LANE',
    color: 'var(--green)',
    serviceKey: 'serviceMean2' as const,
    queueKey:   'queueMax2'    as const,
    arrivalKey: 'arrivalRate2' as const,
  },
  {
    label: 'PATH 3', lane: 'RIGHT LANE',
    color: 'var(--orange)',
    serviceKey: 'serviceMean3' as const,
    queueKey:   'queueMax3'    as const,
    arrivalKey: 'arrivalRate1' as const, // same combined feed
  },
] as const;

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
  resourceUsed,
  resourceAvailable,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paths');

  // Format elapsed sim time as HH:MM:SS
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
      {/* ── Clock + Status ── */}
      <div className="px-4 pt-4 pb-3 flex items-start justify-between" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <div>
          <div style={{ color: '#3a5070', fontFamily: 'Rajdhani, sans-serif', fontSize: '10px', letterSpacing: '0.12em', marginBottom: '4px' }}>
            CONTROL PANEL
          </div>
          <div
            className="text-glow-cyan"
            style={{ color: 'var(--cyan)', fontFamily: 'Space Mono, monospace', fontSize: '24px', fontWeight: 700, letterSpacing: '0.04em' }}
          >
            {timeStr}
          </div>
          <div style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px', marginTop: '2px' }}>
            SIM ELAPSED
          </div>
        </div>
        <div style={{ marginTop: '4px' }}>
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded"
            style={{
              background: isRunning ? 'rgba(0,230,118,0.08)' : 'rgba(255,61,87,0.08)',
              border: `1px solid ${isRunning ? 'rgba(0,230,118,0.3)' : 'rgba(255,61,87,0.3)'}`,
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full pulse-dot"
              style={{ background: isRunning ? 'var(--green)' : 'var(--red)' }}
            />
            <span style={{
              color: isRunning ? 'var(--green)' : 'var(--red)',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
            }}>
              {isRunning ? 'RUNNING' : 'STOPPED'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <button
          onClick={isRunning ? onPause : onStart}
          className="flex-1 py-2.5 rounded transition-all"
          style={{
            background: isRunning
              ? 'linear-gradient(135deg, rgba(255,179,0,0.12), rgba(255,107,53,0.08))'
              : 'linear-gradient(135deg, rgba(0,212,255,0.15), rgba(0,230,118,0.08))',
            border: `1px solid ${isRunning ? 'rgba(255,179,0,0.4)' : 'rgba(0,212,255,0.4)'}`,
            color: isRunning ? 'var(--amber)' : 'var(--cyan)',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            boxShadow: isRunning ? '0 0 12px rgba(255,179,0,0.1)' : '0 0 12px rgba(0,212,255,0.1)',
          }}
        >
          {isRunning ? '⏸  PAUSE' : '▶  START'}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2.5 rounded transition-all"
          style={{
            background: 'rgba(255,61,87,0.08)',
            border: '1px solid rgba(255,61,87,0.3)',
            color: 'var(--red)',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
          }}
        >
          ↺ RESET
        </button>
      </div>

      {/* ── Tab Bar ── */}
      <div className="flex" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2.5 transition-all"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.1em',
              color: activeTab === tab.id ? 'var(--cyan)' : '#3a5070',
              borderBottom: activeTab === tab.id ? '2px solid var(--cyan)' : '2px solid transparent',
              background: activeTab === tab.id ? 'rgba(0,212,255,0.04)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* PATHS tab — 3 sliders per line: Service Speed, Queue Capacity, Arrival Rate */}
        {activeTab === 'paths' && (
          <div className="fade-in-up">
            {PATH_DEFS.map((path, i) => {
              const active = pathEnabled[i];
              return (
                <div
                  key={i}
                  className="mb-4 rounded"
                  style={{
                    padding: '12px',
                    background: active ? 'rgba(255,255,255,0.02)' : 'rgba(255,61,87,0.02)',
                    border: `1px solid ${active ? path.color + '20' : 'rgba(255,61,87,0.15)'}`,
                    transition: 'all 0.25s',
                  }}
                >
                  {/* Path header with toggle */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        style={{
                          width: '3px',
                          height: '16px',
                          borderRadius: '2px',
                          background: active ? path.color : '#1e2d40',
                          boxShadow: active ? `0 0 6px ${path.color}` : 'none',
                          transition: 'all 0.2s',
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ color: active ? path.color : '#2a3a5a', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em', transition: 'color 0.2s' }}>
                          {path.label}
                        </div>
                        <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '8px', letterSpacing: '0.08em' }}>
                          {path.lane}
                        </div>
                      </div>
                    </div>

                    {/* Toggle switch */}
                    <button
                      onClick={() => onTogglePath(i)}
                      title={active ? 'Disable production line' : 'Enable production line'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '4px 9px',
                        borderRadius: '4px',
                        background: active ? `${path.color}15` : 'rgba(255,61,87,0.08)',
                        border: `1px solid ${active ? path.color + '40' : 'rgba(255,61,87,0.3)'}`,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Track */}
                      <div style={{
                        width: '26px', height: '13px', borderRadius: '7px', position: 'relative',
                        background: active ? path.color : 'rgba(255,61,87,0.35)',
                        transition: 'background 0.2s', flexShrink: 0,
                      }}>
                        {/* Thumb */}
                        <div style={{
                          position: 'absolute', top: '2.5px',
                          left: active ? '15px' : '2.5px',
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: '#fff',
                          transition: 'left 0.2s',
                          boxShadow: active ? `0 0 4px ${path.color}` : 'none',
                        }} />
                      </div>
                      <span style={{
                        fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', fontWeight: 700,
                        letterSpacing: '0.1em', minWidth: '28px',
                        color: active ? path.color : '#ff3d57',
                      }}>
                        {active ? 'ACTIVE' : 'OFF'}
                      </span>
                    </button>
                  </div>

                  {/* Three sliders — dimmed when path is disabled */}
                  <div style={{ opacity: active ? 1 : 0.25, pointerEvents: active ? 'auto' : 'none', transition: 'opacity 0.25s' }}>

                    {/* 1. Service Speed (serviceMean) — mean processing time */}
                    <SliderInput
                      label="S1 SERVICE SPEED"
                      value={params[path.serviceKey]}
                      min={1} max={120} step={1} unit=" min"
                      color={path.color}
                      tooltip="Mean processing time per unit at Server (Normal distribution)"
                      onChange={v => onParamsChange({ [path.serviceKey]: v })}
                    />

                    {/* 2. Queue Max Capacity */}
                    <SliderInput
                      label="QUEUE MAX CAPACITY"
                      value={params[path.queueKey]}
                      min={1} max={50} step={1} unit=" units"
                      color={path.color}
                      tooltip="Maximum number of entities waiting in queue before blocking"
                      onChange={v => onParamsChange({ [path.queueKey]: v })}
                    />

                    {/* 3. Arrival Rate — inter-arrival time in minutes */}
                    <SliderInput
                      label="ARRIVAL RATE"
                      value={i < 2 ? params[path.arrivalKey] : params.arrivalRate1}
                      min={0.5} max={20} step={0.5} unit=" min"
                      color={path.color}
                      tooltip="Mean inter-arrival time between entities (Exponential distribution)"
                      onChange={v => {
                        // Path 1 → arrivalRate1, Path 2 → arrivalRate2
                        // Path 3 shares both generators — changing it updates arrivalRate1
                        if (i === 0) onParamsChange({ arrivalRate1: v });
                        else if (i === 1) onParamsChange({ arrivalRate2: v });
                        else onParamsChange({ arrivalRate1: v, arrivalRate2: v });
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* SYSTEM tab — resource pool and simulation speed */}
        {activeTab === 'system' && (
          <div className="fade-in-up">
            {/* Resource Pool */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: '1px solid rgba(179,136,255,0.22)' }}>
                <div style={{ width: '3px', height: '12px', borderRadius: '2px', background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)' }} />
                <span style={{ color: 'var(--purple)', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  RESOURCE POOL
                </span>
              </div>
              <SliderInput
                label="POOL CAPACITY"
                value={params.resourceCapacity}
                min={5} max={100} step={5} unit=" units"
                color="var(--purple)"
                tooltip="Shared resource pool capacity (Resource1 — all paths draw from this)"
                onChange={v => onParamsChange({ resourceCapacity: v })}
              />
                <div className="p-2.5 rounded" style={{ background: 'rgba(179,136,255,0.05)', border: '1px solid rgba(179,136,255,0.15)' }}>
                <div className="flex justify-between mb-1">
                  <span style={{ color: '#6a7f99', fontFamily: 'Space Grotesk', fontSize: '10px' }}>ALLOCATED</span>
                  <span style={{ color: 'var(--purple)', fontFamily: 'Space Mono', fontSize: '11px' }}>
                    {resourceUsed} / {params.resourceCapacity}
                  </span>
                </div>
                <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-4)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${params.resourceCapacity > 0 ? Math.round((resourceUsed / params.resourceCapacity) * 100) : 0}%`,
                    height: '100%',
                    background: resourceUsed / params.resourceCapacity > 0.85 ? 'var(--red)' : 'var(--purple)',
                    opacity: 0.7,
                    borderRadius: '3px',
                    transition: 'width 0.3s, background 0.3s',
                  }} />
                </div>
                <div style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>
                  {resourceAvailable} units available
                </div>
              </div>
            </div>

            {/* Simulation Speed */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: '1px solid rgba(136,204,255,0.22)' }}>
                <div style={{ width: '3px', height: '12px', borderRadius: '2px', background: '#88ccff', boxShadow: '0 0 6px #88ccff' }} />
                <span style={{ color: '#88ccff', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                  SIMULATION SPEED
                </span>
              </div>
              <SliderInput
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
                    className="flex-1 py-1 rounded transition-all"
                    style={{
                      background: params.simSpeed === s ? 'rgba(136,204,255,0.15)' : 'var(--surface-3)',
                      border: `1px solid ${params.simSpeed === s ? 'rgba(136,204,255,0.4)' : 'var(--border-dim)'}`,
                      color: params.simSpeed === s ? '#88ccff' : '#3a5070',
                      fontFamily: 'Space Mono', fontSize: '9px', fontWeight: 700,
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ROUTING tab — branch probability distribution */}
        {activeTab === 'routing' && (() => {
          // Compute effective probabilities: disabled paths get 0, enabled paths share 100%
          const rawProbs = [params.routeProb1, params.routeProb2, p3Prob];
          const effectiveProbs = rawProbs.map((p, i) => pathEnabled[i] ? p : 0);
          const effectiveTotal = effectiveProbs.reduce((a, b) => a + b, 0) || 1;
          const normalizedProbs = effectiveProbs.map(p => p / effectiveTotal);

          const PATH_COLORS_R = ['var(--cyan)', 'var(--green)', 'var(--orange)'];
          const PATH_LABELS_R = ['PATH 1', 'PATH 2', 'PATH 3'];
          const PATH_KEYS_R = [
            { key: 'routeProb1' as const, otherKey: 'routeProb2' as const },
            { key: 'routeProb2' as const, otherKey: 'routeProb1' as const },
          ];

          return (
            <div className="fade-in-up">
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-3 pb-1.5" style={{ borderBottom: '1px solid rgba(0,212,255,0.22)' }}>
                  <div style={{ width: '3px', height: '12px', borderRadius: '2px', background: 'var(--cyan)', boxShadow: '0 0 6px var(--cyan)' }} />
                  <span style={{ color: 'var(--cyan)', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}>
                    BRANCH ROUTING
                  </span>
                </div>

                {/* PATH 1 */}
                {pathEnabled[0] ? (
                  <SliderInput
                    label="PATH 1 PROBABILITY"
                    value={params.routeProb1}
                    min={0} max={1} step={0.01}
                    color="var(--cyan)"
                    tooltip="Fraction of entities routed to Path 1 (Left Lane)"
                    onChange={v => onParamsChange({ routeProb1: Math.min(v, 1 - params.routeProb2) })}
                  />
                ) : (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>PATH 1 PROBABILITY</span>
                      <span style={{ color: 'var(--red)', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>OFF — 0%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-4)', opacity: 0.3 }} />
                    <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>Path disabled — no entities routed</div>
                  </div>
                )}

                {/* PATH 2 */}
                {pathEnabled[1] ? (
                  <SliderInput
                    label="PATH 2 PROBABILITY"
                    value={params.routeProb2}
                    min={0} max={1} step={0.01}
                    color="var(--green)"
                    tooltip="Fraction of entities routed to Path 2 (Centre Lane)"
                    onChange={v => onParamsChange({ routeProb2: Math.min(v, 1 - params.routeProb1) })}
                  />
                ) : (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>PATH 2 PROBABILITY</span>
                      <span style={{ color: 'var(--red)', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>OFF — 0%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-4)', opacity: 0.3 }} />
                    <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>Path disabled — no entities routed</div>
                  </div>
                )}

                {/* PATH 3 — always auto-derived, but shows OFF if disabled */}
                {pathEnabled[2] ? (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ color: '#6a7f99', fontFamily: 'Space Grotesk', fontSize: '10px', letterSpacing: '0.07em' }}>PATH 3 PROBABILITY</span>
                      <span style={{ color: 'var(--orange)', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>
                        {p3Prob.toFixed(2)}
                      </span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-4)', overflow: 'hidden' }}>
                      <div style={{ width: `${p3Prob * 100}%`, height: '100%', background: 'var(--orange)', opacity: 0.6, borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>Auto-calculated: 1 − P1 − P2</div>
                  </div>
                ) : (
                  <div className="mb-4">
                    <div className="flex justify-between items-center mb-1.5">
                      <span style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>PATH 3 PROBABILITY</span>
                      <span style={{ color: 'var(--red)', fontFamily: 'Space Mono', fontSize: '11px', fontWeight: 700 }}>OFF — 0%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '3px', background: 'var(--surface-4)', opacity: 0.3 }} />
                    <div style={{ color: '#2a3a5a', fontFamily: 'Space Grotesk', fontSize: '9px', marginTop: '4px' }}>Path disabled — no entities routed</div>
                  </div>
                )}

                {/* Distribution bar — shows only enabled paths */}
                <div className="p-3 rounded" style={{ background: 'var(--surface-3)', border: '1px solid var(--border-dim)' }}>
                  <div style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.1em', marginBottom: '8px' }}>
                    EFFECTIVE ROUTING DISTRIBUTION
                  </div>
                  <div className="flex h-5 rounded overflow-hidden gap-0.5">
                    {normalizedProbs.map((prob, i) => (
                      pathEnabled[i] && prob > 0 ? (
                        <div
                          key={i}
                          className="flex items-center justify-center rounded"
                          style={{
                            width: `${prob * 100}%`,
                            background: PATH_COLORS_R[i],
                            opacity: 0.75,
                            fontFamily: 'Space Mono',
                            fontSize: '8px',
                            fontWeight: 700,
                            color: '#07090f',
                            overflow: 'hidden',
                            transition: 'width 0.3s',
                          }}
                        >
                          {prob > 0.1 ? `P${i + 1}` : ''}
                        </div>
                      ) : null
                    ))}
                  </div>
                  <div className="flex justify-between mt-1">
                    {normalizedProbs.map((prob, i) => (
                      <span key={i} style={{ color: pathEnabled[i] ? PATH_COLORS_R[i] : 'var(--red)', fontFamily: 'Space Mono', fontSize: '9px' }}>
                        {pathEnabled[i] ? `${Math.round(prob * 100)}%` : 'OFF'}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      {/* ── Run Prediction ── */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid var(--border-dim)' }}>
        <button
          onClick={onRunPrediction}
          className="w-full py-2.5 rounded transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(179,136,255,0.15), rgba(0,212,255,0.08))',
            border: '1px solid rgba(179,136,255,0.4)',
            color: 'var(--purple)',
            fontFamily: 'Rajdhani, sans-serif',
            fontSize: '12px',
            fontWeight: 700,
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
