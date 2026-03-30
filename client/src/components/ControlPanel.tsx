// =============================================================
// ControlPanel - Factory Parameters Control
// Design: Industrial HUD - Neon Factory Control Room
// =============================================================

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
  onChange: (v: number) => void;
}

function ParamRow({ label, value, min, max, step, unit, color = '#00d4ff', onChange }: ParamRowProps) {
  return (
    <div className="mb-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium" style={{ color: '#8899bb', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
          {label}
        </span>
        <span className="text-xs font-mono" style={{ color, fontFamily: 'Share Tech Mono, monospace' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          accentColor: color,
        }}
      />
    </div>
  );
}

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
  const [activeTab, setActiveTab] = useState<'paths' | 'system' | 'routing'>('paths');

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.floor(minutes % 60);
    const s = Math.floor((minutes * 60) % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'paths', label: 'PATHS' },
    { id: 'system', label: 'SYSTEM' },
    { id: 'routing', label: 'ROUTING' },
  ] as const;

  return (
    <div
      className="flex flex-col h-full"
      style={{
        background: 'rgba(10, 14, 26, 0.97)',
        borderLeft: '1px solid #1a2540',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid #1a2540' }}
      >
        <div>
          <div
            className="text-xs font-bold tracking-widest"
            style={{ color: '#8899bb', fontFamily: 'Orbitron, sans-serif' }}
          >
            CONTROL PANEL
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: '#00d4ff', fontFamily: 'Share Tech Mono, monospace', textShadow: '0 0 8px rgba(0,212,255,0.4)' }}
          >
            {formatTime(simTime)}
          </div>
        </div>
        <div
          className="w-2 h-2 rounded-full pulse-dot"
          style={{ background: isRunning ? '#00ff88' : '#ff3366' }}
        />
      </div>

      {/* Control Buttons */}
      <div className="px-4 py-3 flex gap-2" style={{ borderBottom: '1px solid #1a2540' }}>
        <button
          onClick={isRunning ? onPause : onStart}
          className="flex-1 py-2 text-xs font-bold tracking-wider rounded transition-all"
          style={{
            background: isRunning ? 'rgba(255,107,53,0.15)' : 'rgba(0,212,255,0.15)',
            border: `1px solid ${isRunning ? '#ff6b35' : '#00d4ff'}`,
            color: isRunning ? '#ff6b35' : '#00d4ff',
            fontFamily: 'Rajdhani, sans-serif',
            letterSpacing: '0.1em',
          }}
        >
          {isRunning ? '⏸ PAUSE' : '▶ START'}
        </button>
        <button
          onClick={onReset}
          className="px-3 py-2 text-xs font-bold tracking-wider rounded transition-all"
          style={{
            background: 'rgba(255,51,102,0.1)',
            border: '1px solid #ff3366',
            color: '#ff3366',
            fontFamily: 'Rajdhani, sans-serif',
          }}
        >
          ↺ RESET
        </button>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ borderBottom: '1px solid #1a2540' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className="flex-1 py-2 text-xs font-bold tracking-wider transition-all"
            style={{
              fontFamily: 'Rajdhani, sans-serif',
              letterSpacing: '0.08em',
              color: activeTab === tab.id ? '#00d4ff' : '#445566',
              borderBottom: activeTab === tab.id ? '2px solid #00d4ff' : '2px solid transparent',
              background: activeTab === tab.id ? 'rgba(0,212,255,0.05)' : 'transparent',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {activeTab === 'paths' && (
          <div>
            {/* Path 1 */}
            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1 flex items-center gap-2"
                style={{ color: '#00d4ff', borderBottom: '1px solid rgba(0,212,255,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: '#00d4ff', boxShadow: '0 0 6px #00d4ff' }} />
                PATH 1 — LEFT LANE
              </div>
              <ParamRow
                label="SERVICE MEAN (MIN)"
                value={params.serviceMean1}
                min={5} max={60} step={1} unit=" min"
                color="#00d4ff"
                onChange={v => onParamsChange({ serviceMean1: v })}
              />
              <ParamRow
                label="SERVICE STD DEV"
                value={params.serviceStd1}
                min={1} max={15} step={0.5} unit=" min"
                color="#00d4ff"
                onChange={v => onParamsChange({ serviceStd1: v })}
              />
              <ParamRow
                label="QUEUE CAPACITY"
                value={params.queueMax1}
                min={1} max={30} step={1}
                color="#00d4ff"
                onChange={v => onParamsChange({ queueMax1: v })}
              />
            </div>

            {/* Path 2 */}
            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1 flex items-center gap-2"
                style={{ color: '#00ff88', borderBottom: '1px solid rgba(0,255,136,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: '#00ff88', boxShadow: '0 0 6px #00ff88' }} />
                PATH 2 — CENTRE LANE
              </div>
              <ParamRow
                label="SERVICE MEAN (MIN)"
                value={params.serviceMean2}
                min={5} max={60} step={1} unit=" min"
                color="#00ff88"
                onChange={v => onParamsChange({ serviceMean2: v })}
              />
              <ParamRow
                label="SERVICE STD DEV"
                value={params.serviceStd2}
                min={1} max={15} step={0.5} unit=" min"
                color="#00ff88"
                onChange={v => onParamsChange({ serviceStd2: v })}
              />
              <ParamRow
                label="QUEUE CAPACITY"
                value={params.queueMax2}
                min={1} max={30} step={1}
                color="#00ff88"
                onChange={v => onParamsChange({ queueMax2: v })}
              />
            </div>

            {/* Path 3 */}
            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1 flex items-center gap-2"
                style={{ color: '#ff6b35', borderBottom: '1px solid rgba(255,107,53,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: '#ff6b35', boxShadow: '0 0 6px #ff6b35' }} />
                PATH 3 — RIGHT LANE
              </div>
              <ParamRow
                label="SERVICE MEAN (MIN)"
                value={params.serviceMean3}
                min={5} max={60} step={1} unit=" min"
                color="#ff6b35"
                onChange={v => onParamsChange({ serviceMean3: v })}
              />
              <ParamRow
                label="SERVICE STD DEV"
                value={params.serviceStd3}
                min={1} max={15} step={0.5} unit=" min"
                color="#ff6b35"
                onChange={v => onParamsChange({ serviceStd3: v })}
              />
              <ParamRow
                label="QUEUE CAPACITY"
                value={params.queueMax3}
                min={1} max={30} step={1}
                color="#ff6b35"
                onChange={v => onParamsChange({ queueMax3: v })}
              />
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div>
            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1"
                style={{ color: '#ffd700', borderBottom: '1px solid rgba(255,215,0,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                ARRIVAL RATES
              </div>
              <ParamRow
                label="GENERATOR 1 MEAN (MIN)"
                value={params.arrivalRate1}
                min={0.5} max={10} step={0.5} unit=" min"
                color="#ffd700"
                onChange={v => onParamsChange({ arrivalRate1: v })}
              />
              <ParamRow
                label="GENERATOR 2 MEAN (MIN)"
                value={params.arrivalRate2}
                min={0.5} max={10} step={0.5} unit=" min"
                color="#ffd700"
                onChange={v => onParamsChange({ arrivalRate2: v })}
              />
            </div>

            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1"
                style={{ color: '#aa88ff', borderBottom: '1px solid rgba(170,136,255,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                RESOURCE POOL
              </div>
              <ParamRow
                label="CAPACITY"
                value={params.resourceCapacity}
                min={5} max={100} step={5}
                color="#aa88ff"
                onChange={v => onParamsChange({ resourceCapacity: v })}
              />
            </div>

            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1"
                style={{ color: '#88ccff', borderBottom: '1px solid rgba(136,204,255,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                SIMULATION SPEED
              </div>
              <ParamRow
                label="SPEED MULTIPLIER"
                value={params.simSpeed}
                min={1} max={30} step={1} unit="x"
                color="#88ccff"
                onChange={v => onParamsChange({ simSpeed: v })}
              />
            </div>
          </div>
        )}

        {activeTab === 'routing' && (
          <div>
            <div className="mb-4">
              <div
                className="text-xs font-bold mb-2 pb-1"
                style={{ color: '#ff88aa', borderBottom: '1px solid rgba(255,136,170,0.2)', fontFamily: 'Orbitron, sans-serif' }}
              >
                BRANCH ROUTING PROBABILITIES
              </div>
              <div
                className="text-xs mb-3 p-2 rounded"
                style={{ background: 'rgba(255,136,170,0.05)', border: '1px solid rgba(255,136,170,0.15)', color: '#8899bb' }}
              >
                Total must equal 1.0. Adjust path 1 & 2; path 3 auto-calculated.
              </div>
              <ParamRow
                label="PATH 1 PROBABILITY"
                value={params.routeProb1}
                min={0.1} max={0.8} step={0.01}
                color="#00d4ff"
                onChange={v => {
                  const p2 = Math.min(params.routeProb2, 1 - v - 0.1);
                  onParamsChange({ routeProb1: v, routeProb2: p2, routeProb3: Math.max(0.1, 1 - v - p2) });
                }}
              />
              <ParamRow
                label="PATH 2 PROBABILITY"
                value={params.routeProb2}
                min={0.1} max={0.8} step={0.01}
                color="#00ff88"
                onChange={v => {
                  const p1 = Math.min(params.routeProb1, 1 - v - 0.1);
                  onParamsChange({ routeProb2: v, routeProb1: p1, routeProb3: Math.max(0.1, 1 - v - p1) });
                }}
              />
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium" style={{ color: '#8899bb', fontFamily: 'Rajdhani, sans-serif' }}>
                    PATH 3 PROBABILITY (AUTO)
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: '#ff6b35', fontFamily: 'Share Tech Mono, monospace' }}
                  >
                    {(Math.max(0, 1 - params.routeProb1 - params.routeProb2)).toFixed(2)}
                  </span>
                </div>
                <div
                  className="h-1 rounded"
                  style={{
                    background: `linear-gradient(to right, #ff6b35 ${Math.max(0, 1 - params.routeProb1 - params.routeProb2) * 100}%, #1a2540 0%)`,
                  }}
                />
              </div>
            </div>

            {/* Visual distribution */}
            <div
              className="p-3 rounded"
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #1a2540' }}
            >
              <div className="text-xs mb-2" style={{ color: '#8899bb', fontFamily: 'Rajdhani, sans-serif' }}>
                ROUTING DISTRIBUTION
              </div>
              <div className="flex gap-1 h-6 rounded overflow-hidden">
                <div
                  className="transition-all duration-300"
                  style={{ width: `${params.routeProb1 * 100}%`, background: '#00d4ff', opacity: 0.8 }}
                />
                <div
                  className="transition-all duration-300"
                  style={{ width: `${params.routeProb2 * 100}%`, background: '#00ff88', opacity: 0.8 }}
                />
                <div
                  className="transition-all duration-300 flex-1"
                  style={{ background: '#ff6b35', opacity: 0.8 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: '#00d4ff', fontFamily: 'Share Tech Mono' }}>{(params.routeProb1 * 100).toFixed(0)}%</span>
                <span className="text-xs" style={{ color: '#00ff88', fontFamily: 'Share Tech Mono' }}>{(params.routeProb2 * 100).toFixed(0)}%</span>
                <span className="text-xs" style={{ color: '#ff6b35', fontFamily: 'Share Tech Mono' }}>{(Math.max(0, 1 - params.routeProb1 - params.routeProb2) * 100).toFixed(0)}%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Prediction Button */}
      <div className="px-4 py-3" style={{ borderTop: '1px solid #1a2540' }}>
        <button
          onClick={onRunPrediction}
          className="w-full py-3 text-sm font-bold tracking-widest rounded transition-all hover:opacity-90"
          style={{
            background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(0,255,136,0.1))',
            border: '1px solid #00d4ff',
            color: '#00d4ff',
            fontFamily: 'Orbitron, sans-serif',
            letterSpacing: '0.15em',
            boxShadow: '0 0 15px rgba(0,212,255,0.2)',
          }}
        >
          ▶▶ RUN PREDICTION
        </button>
      </div>
    </div>
  );
}
