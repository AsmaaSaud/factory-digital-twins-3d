// =============================================================
// StatsPanel - Live Statistics & Telemetry
// Design: Industrial HUD - Neon Factory Control Room
// =============================================================

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { SimState } from '@/lib/simulationEngine';

interface StatsPanelProps {
  simState: SimState;
  predictionResult: PredictionResult | null;
}

export interface PredictionResult {
  avgQueueLengths: [number, number, number];
  totalThroughput: number;
  pathThroughputs: [number, number, number];
  resourceUtilization: number;
  bottleneck: number;
}

const PATH_COLORS = ['#00d4ff', '#00ff88', '#ff6b35'];
const PATH_NAMES = ['PATH 1', 'PATH 2', 'PATH 3'];

function MetricCard({ label, value, unit, color, sub }: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="p-3 rounded"
      style={{
        background: 'rgba(13,18,32,0.8)',
        border: `1px solid ${color ? color + '33' : '#1a2540'}`,
      }}
    >
      <div className="text-xs mb-1" style={{ color: '#8899bb', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div
        className="text-xl font-bold"
        style={{
          color: color || '#00d4ff',
          fontFamily: 'Share Tech Mono, monospace',
          textShadow: color ? `0 0 8px ${color}66` : '0 0 8px rgba(0,212,255,0.4)',
        }}
      >
        {value}{unit && <span className="text-sm ml-1" style={{ color: '#8899bb' }}>{unit}</span>}
      </div>
      {sub && <div className="text-xs mt-1" style={{ color: '#556677' }}>{sub}</div>}
    </div>
  );
}

function PathStatusBar({ path, pathIdx, simState }: {
  path: SimState['paths'][0];
  pathIdx: number;
  simState: SimState;
}) {
  const color = PATH_COLORS[pathIdx];
  const queueMax = [simState.paths[0].queueLength, simState.paths[1].queueLength, simState.paths[2].queueLength];
  const maxQ = Math.max(...queueMax, 1);

  return (
    <div
      className="p-3 rounded mb-2"
      style={{
        background: 'rgba(13,18,32,0.8)',
        border: `1px solid ${color}22`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ background: color, boxShadow: `0 0 6px ${color}` }}
          />
          <span className="text-xs font-bold" style={{ color, fontFamily: 'Orbitron, sans-serif', fontSize: '10px' }}>
            {PATH_NAMES[pathIdx]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: '#8899bb', fontFamily: 'Share Tech Mono' }}>
            Q: <span style={{ color }}>{path.queueLength}</span>
          </span>
          <div
            className="px-2 py-0.5 rounded text-xs font-bold"
            style={{
              background: path.serverBusy ? `${color}22` : 'rgba(255,51,102,0.1)',
              border: `1px solid ${path.serverBusy ? color : '#ff3366'}`,
              color: path.serverBusy ? color : '#ff3366',
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '10px',
            }}
          >
            {path.serverBusy ? 'ACTIVE' : 'IDLE'}
          </div>
        </div>
      </div>

      {/* Queue bar */}
      <div className="flex items-center gap-2">
        <span className="text-xs w-12" style={{ color: '#556677', fontFamily: 'Share Tech Mono', fontSize: '10px' }}>QUEUE</span>
        <div className="flex-1 h-2 rounded" style={{ background: '#1a2540' }}>
          <div
            className="h-full rounded transition-all duration-300"
            style={{
              width: `${Math.min(100, (path.queueLength / 10) * 100)}%`,
              background: `linear-gradient(to right, ${color}, ${color}88)`,
              boxShadow: `0 0 4px ${color}66`,
            }}
          />
        </div>
        <span className="text-xs w-8 text-right" style={{ color, fontFamily: 'Share Tech Mono', fontSize: '10px' }}>
          {path.queueLength}
        </span>
      </div>

      {/* Processed */}
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs w-12" style={{ color: '#556677', fontFamily: 'Share Tech Mono', fontSize: '10px' }}>DONE</span>
        <span className="text-xs" style={{ color: '#8899bb', fontFamily: 'Share Tech Mono', fontSize: '11px' }}>
          {path.entitiesProcessed} units
        </span>
        {path.avgServiceTime > 0 && (
          <span className="text-xs ml-auto" style={{ color: '#556677', fontFamily: 'Share Tech Mono', fontSize: '10px' }}>
            avg {path.avgServiceTime.toFixed(1)} min
          </span>
        )}
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div
        className="p-2 rounded text-xs"
        style={{
          background: 'rgba(10,14,26,0.95)',
          border: '1px solid #1a2540',
          fontFamily: 'Share Tech Mono, monospace',
        }}
      >
        <div style={{ color: '#8899bb' }}>t={label}min</div>
        {payload.map((p: any) => (
          <div key={p.dataKey} style={{ color: p.color }}>
            {p.name}: {p.value}
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function StatsPanel({ simState, predictionResult }: StatsPanelProps) {
  const throughputPerHour = simState.time > 0
    ? (simState.totalSinked / (simState.time / 60)).toFixed(1)
    : '0.0';

  const resourcePct = Math.round((simState.resourceUsed / Math.max(1, simState.resourceUsed + simState.resourceAvailable)) * 100);

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'rgba(10,14,26,0.95)', fontFamily: 'Inter, sans-serif' }}
    >
      {/* Top KPIs */}
      <div className="p-3" style={{ borderBottom: '1px solid #1a2540' }}>
        <div
          className="text-xs font-bold mb-2 tracking-widest"
          style={{ color: '#8899bb', fontFamily: 'Orbitron, sans-serif' }}
        >
          LIVE TELEMETRY
        </div>
        <div className="grid grid-cols-4 gap-2">
          <MetricCard
            label="GENERATED"
            value={simState.totalGenerated}
            color="#ffd700"
          />
          <MetricCard
            label="COMPLETED"
            value={simState.totalSinked}
            color="#00ff88"
          />
          <MetricCard
            label="THROUGHPUT"
            value={throughputPerHour}
            unit="/hr"
            color="#00d4ff"
          />
          <MetricCard
            label="RESOURCE"
            value={`${resourcePct}%`}
            color="#aa88ff"
            sub={`${simState.resourceUsed} used`}
          />
        </div>
      </div>

      {/* Telemetry Chart */}
      <div className="p-3" style={{ borderBottom: '1px solid #1a2540' }}>
        <div
          className="text-xs font-bold mb-2 tracking-widest"
          style={{ color: '#8899bb', fontFamily: 'Orbitron, sans-serif' }}
        >
          QUEUE + THROUGHPUT HISTORY
        </div>
        <div style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={simState.throughputHistory} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="time"
                tick={{ fill: '#445566', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: '#445566', fontSize: 9, fontFamily: 'Share Tech Mono' }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="queueTotal"
                stroke="#ff6b35"
                strokeWidth={1.5}
                dot={false}
                name="Queue"
              />
              <Line
                type="monotone"
                dataKey="throughput"
                stroke="#00d4ff"
                strokeWidth={1.5}
                dot={false}
                name="Throughput"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Path Status */}
      <div className="p-3" style={{ borderBottom: '1px solid #1a2540' }}>
        <div
          className="text-xs font-bold mb-2 tracking-widest"
          style={{ color: '#8899bb', fontFamily: 'Orbitron, sans-serif' }}
        >
          PATH STATUS
        </div>
        {simState.paths.map((path, idx) => (
          <PathStatusBar key={idx} path={path} pathIdx={idx} simState={simState} />
        ))}
      </div>

      {/* Prediction Results */}
      {predictionResult && (
        <div className="p-3">
          <div
            className="text-xs font-bold mb-2 tracking-widest flex items-center gap-2"
            style={{ color: '#8899bb', fontFamily: 'Orbitron, sans-serif' }}
          >
            PREDICTION RESULTS
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{
                background: 'rgba(0,212,255,0.1)',
                border: '1px solid #00d4ff',
                color: '#00d4ff',
                fontFamily: 'Rajdhani',
                fontSize: '9px',
              }}
            >
              8H SIM
            </span>
          </div>

          {/* Bottleneck warning */}
          <div
            className="p-2 rounded mb-3 flex items-center gap-2"
            style={{
              background: 'rgba(255,107,53,0.08)',
              border: '1px solid rgba(255,107,53,0.3)',
            }}
          >
            <span style={{ color: '#ff6b35', fontSize: '14px' }}>⚠</span>
            <span className="text-xs" style={{ color: '#ff6b35', fontFamily: 'Rajdhani, sans-serif' }}>
              BOTTLENECK: {PATH_NAMES[predictionResult.bottleneck]} (highest queue)
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {predictionResult.avgQueueLengths.map((q, i) => (
              <div
                key={i}
                className="p-2 rounded text-center"
                style={{
                  background: 'rgba(13,18,32,0.8)',
                  border: `1px solid ${PATH_COLORS[i]}33`,
                }}
              >
                <div className="text-xs mb-1" style={{ color: '#8899bb', fontFamily: 'Rajdhani', fontSize: '9px' }}>
                  {PATH_NAMES[i]}
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: PATH_COLORS[i], fontFamily: 'Share Tech Mono' }}
                >
                  {q}
                </div>
                <div className="text-xs" style={{ color: '#556677', fontSize: '9px' }}>queue</div>
              </div>
            ))}
          </div>

          <div style={{ height: 100 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'P1', value: predictionResult.pathThroughputs[0], fill: '#00d4ff' },
                  { name: 'P2', value: predictionResult.pathThroughputs[1], fill: '#00ff88' },
                  { name: 'P3', value: predictionResult.pathThroughputs[2], fill: '#ff6b35' },
                ]}
                margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fill: '#445566', fontSize: 9, fontFamily: 'Share Tech Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#445566', fontSize: 9, fontFamily: 'Share Tech Mono' }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" name="Units" radius={[2, 2, 0, 0]}>
                  {[0, 1, 2].map(i => (
                    <Cell key={i} fill={PATH_COLORS[i]} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex justify-between">
            <span className="text-xs" style={{ color: '#8899bb', fontFamily: 'Rajdhani' }}>TOTAL THROUGHPUT</span>
            <span className="text-xs font-bold" style={{ color: '#00ff88', fontFamily: 'Share Tech Mono' }}>
              {predictionResult.totalThroughput} units
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs" style={{ color: '#8899bb', fontFamily: 'Rajdhani' }}>RESOURCE UTIL.</span>
            <span className="text-xs font-bold" style={{ color: '#aa88ff', fontFamily: 'Share Tech Mono' }}>
              {predictionResult.resourceUtilization}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
