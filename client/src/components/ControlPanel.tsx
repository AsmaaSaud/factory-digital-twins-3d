import { useState } from 'react';
import type { SimParams } from '@/lib/simulationEngine';

interface ControlPanelProps {
  params: SimParams;
  onParamsChange: (params: Partial<SimParams>) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onRunPrediction: () => void;
  isRunning: boolean;
  simTime: number;
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

function SectionHeader({ label, color }: { label: string; color: string }) {
  return (
    <div
      className="flex items-center gap-2 mb-3 pb-1.5"
      style={{ borderBottom: `1px solid ${color}22` }}
    >
      <div className="w-1 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
      <span
        className="text-xs font-bold tracking-widest"
        style={{ color, fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.12em' }}
      >
        {label}
      </span>
    </div>
  );
}

const TABS = [
  { id: 'paths',   label: 'PATHS'   },
  { id: 'system',  label: 'SYSTEM'  },
  { id: 'routing', label: 'ROUTING' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ControlPanel({
  params,
  onParamsChange,
  onStart,
  onPause,
  onReset,
  onRunPrediction,
  isRunning,
  simTime,
}: ControlPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('paths');

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

      {/* Tabs */}
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

        {activeTab === 'paths' && (
          <div className="fade-in-up">
            {[
              { label: 'PATH 1 — LEFT LANE',   color: 'var(--cyan)',   mean: 'serviceMean1' as const, std: 'serviceStd1' as const, cap: 'queueMax1' as const },
              { label: 'PATH 2 — CENTRE LANE', color: 'var(--green)',  mean: 'serviceMean2' as const, std: 'serviceStd2' as const, cap: 'queueMax2' as const },
              { label: 'PATH 3 — RIGHT LANE',  color: 'var(--orange)', mean: 'serviceMean3' as const, std: 'serviceStd3' as const, cap: 'queueMax3' as const },
            ].map((path, i) => (
              <div key={i} className="mb-5">
                <SectionHeader label={path.label} color={path.color} />
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
            ))}
          </div>
        )}

        {activeTab === 'system' && (
          <div className="fade-in-up">
            <div className="mb-5">
              <SectionHeader label="ARRIVAL RATES" color="var(--amber)" />
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
              <SectionHeader label="RESOURCE POOL" color="var(--purple)" />
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
              <SectionHeader label="SIMULATION SPEED" color="#88ccff" />
              <ParamRow
                label="SPEED MULTIPLIER"
                value={params.simSpeed}
                min={1} max={30} step={1} unit="×"
                color="#88ccff"
                tooltip="Real-time simulation speed factor"
                onChange={v => onParamsChange({ simSpeed: v })}
              />
              <div
                className="grid grid-cols-5 gap-1 mt-2"
              >
                {[1, 5, 10, 20, 30].map(s => (
                  <button
                    key={s}
                    onClick={() => onParamsChange({ simSpeed: s })}
                    className="py-1 rounded text-xs font-bold transition-all"
                    style={{
                      background: params.simSpeed === s ? 'rgba(136,204,255,0.2)' : 'var(--surface-3)',
                      border: `1px solid ${params.simSpeed === s ? 'rgba(136,204,255,0.5)' : 'var(--border-dim)'}`,
                      color: params.simSpeed === s ? '#88ccff' : '#3a5070',
                      fontFamily: 'Space Mono',
                      fontSize: '10px',
                    }}
                  >
                    {s}×
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'routing' && (
          <div className="fade-in-up">
            <SectionHeader label="BRANCH ROUTING" color="#ff88aa" />

            <div
              className="text-xs p-2.5 rounded mb-4"
              style={{ background: 'rgba(255,136,170,0.05)', border: '1px solid rgba(255,136,170,0.15)', color: '#6a7f99', fontFamily: 'Space Grotesk', lineHeight: 1.6 }}
            >
              Adjust P1 &amp; P2 — P3 is auto-calculated to maintain Σ = 1.0
            </div>

            <ParamRow
              label="PATH 1 PROBABILITY"
              value={params.routeProb1}
              min={0.1} max={0.8} step={0.01}
              color="var(--cyan)"
              onChange={v => {
                const p2 = Math.min(params.routeProb2, 1 - v - 0.1);
                onParamsChange({ routeProb1: v, routeProb2: p2, routeProb3: Math.max(0.1, 1 - v - p2) });
              }}
            />
            <ParamRow
              label="PATH 2 PROBABILITY"
              value={params.routeProb2}
              min={0.1} max={0.8} step={0.01}
              color="var(--green)"
              onChange={v => {
                const p1 = Math.min(params.routeProb1, 1 - v - 0.1);
                onParamsChange({ routeProb2: v, routeProb1: p1, routeProb3: Math.max(0.1, 1 - v - p1) });
              }}
            />

            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-xs tracking-wide" style={{ color: '#6a7f99', fontFamily: 'Space Grotesk', fontSize: '10px', letterSpacing: '0.06em' }}>
                  PATH 3 PROBABILITY (AUTO)
                </span>
                <span className="text-xs font-bold" style={{ color: 'var(--orange)', fontFamily: 'Space Mono', fontSize: '11px' }}>
                  {p3Prob.toFixed(2)}
                </span>
              </div>
              <div className="h-0.5 rounded" style={{ background: `linear-gradient(to right, var(--orange) ${p3Prob * 100}%, var(--surface-4) 0%)` }} />
            </div>

            {/* Visual distribution bar */}
            <div className="p-3 rounded" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}>
              <div className="text-xs mb-2" style={{ color: '#3a5070', fontFamily: 'Rajdhani', letterSpacing: '0.08em', fontSize: '10px' }}>
                ROUTING DISTRIBUTION
              </div>
              <div className="flex h-5 rounded overflow-hidden gap-px">
                {[
                  { prob: params.routeProb1, color: 'var(--cyan)' },
                  { prob: params.routeProb2, color: 'var(--green)' },
                  { prob: p3Prob,             color: 'var(--orange)' },
                ].map((seg, i) => (
                  <div
                    key={i}
                    className="transition-all duration-300 flex items-center justify-center"
                    style={{ width: `${seg.prob * 100}%`, background: seg.color, opacity: 0.75 }}
                  >
                    {seg.prob > 0.15 && (
                      <span style={{ color: '#07090f', fontFamily: 'Space Mono', fontSize: '9px', fontWeight: 700 }}>
                        {(seg.prob * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-1.5">
                {[
                  { label: 'P1', color: 'var(--cyan)',   val: params.routeProb1 },
                  { label: 'P2', color: 'var(--green)',  val: params.routeProb2 },
                  { label: 'P3', color: 'var(--orange)', val: p3Prob },
                ].map((p, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                    <span style={{ color: p.color, fontFamily: 'Space Mono', fontSize: '9px' }}>
                      {p.label} {(p.val * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prediction Button */}
      <div className="px-4 py-4" style={{ borderTop: '1px solid var(--border-dim)' }}>
        <button
          onClick={onRunPrediction}
          className="w-full py-3 text-xs font-bold tracking-widest rounded transition-all"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.12) 0%, rgba(0,230,118,0.08) 100%)',
            border: '1px solid rgba(0,212,255,0.35)',
            color: 'var(--cyan)',
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '0.15em',
            boxShadow: '0 0 20px rgba(0,212,255,0.08), inset 0 1px 0 rgba(0,212,255,0.1)',
            fontSize: '10px',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 30px rgba(0,212,255,0.2), inset 0 1px 0 rgba(0,212,255,0.15)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 20px rgba(0,212,255,0.08), inset 0 1px 0 rgba(0,212,255,0.1)'; }}
        >
          ▶▶  RUN PREDICTION (8H)
        </button>
      </div>
    </div>
  );
}
