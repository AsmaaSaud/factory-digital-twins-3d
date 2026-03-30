import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import type { SimState } from '@/lib/simulationEngine';

interface StatsPanelProps {
  simState: SimState;
  predictionResult: PredictionResult | null;
  pathEnabled: [boolean, boolean, boolean];
}

export interface PredictionResult {
  avgQueueLengths: [number, number, number];
  totalThroughput: number;
  pathThroughputs: [number, number, number];
  resourceUtilization: number;
  bottleneck: number;
}

const PATH_COLORS = ['var(--cyan)', 'var(--green)', 'var(--orange)'];
const PATH_HEX    = ['#00d4ff', '#00e676', '#ff6d35'];
const PATH_NAMES  = ['PATH 1', 'PATH 2', 'PATH 3'];

function KpiCard({ label, value, unit, color, sub }: {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  sub?: string;
}) {
  return (
    <div
      className="p-2.5 rounded flex flex-col justify-between"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${color ? color + '28' : 'var(--border-dim)'}`,
        minHeight: '62px',
      }}
    >
      <div className="text-xs mb-1 tracking-wide" style={{ color: '#4a6070', fontFamily: 'Rajdhani, sans-serif', fontSize: '9px', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div>
        <span
          className="text-lg font-bold tabular-nums"
          style={{ color: color || 'var(--cyan)', fontFamily: 'Space Mono, monospace', lineHeight: 1 }}
        >
          {value}
        </span>
        {unit && (
          <span className="text-xs ml-1" style={{ color: '#4a6070', fontFamily: 'Space Grotesk' }}>{unit}</span>
        )}
      </div>
      {sub && <div className="text-xs mt-0.5" style={{ color: '#3a5070', fontSize: '9px', fontFamily: 'Space Grotesk' }}>{sub}</div>}
    </div>
  );
}

function PathRow({ path, pathIdx, enabled }: { path: SimState['paths'][0]; pathIdx: number; enabled: boolean }) {
  const color = PATH_HEX[pathIdx];
  const queuePct = Math.min(100, (path.queueLength / 10) * 100);

  // Determine badge: OFF if disabled, ACTIVE if server busy, IDLE otherwise
  const badge = !enabled ? { label: 'OFF', bg: 'rgba(255,61,87,0.1)', border: 'rgba(255,61,87,0.4)', fg: 'var(--red)' }
    : path.serverBusy ? { label: 'ACTIVE', bg: `${color}18`, border: `${color}50`, fg: color }
    : { label: 'IDLE', bg: 'rgba(58,80,112,0.15)', border: 'rgba(58,80,112,0.35)', fg: '#3a5070' };

  return (
    <div
      className="p-2.5 rounded mb-2"
      style={{
        background: enabled ? 'var(--surface-2)' : 'rgba(255,61,87,0.03)',
        border: `1px solid ${enabled ? color + '18' : 'rgba(255,61,87,0.12)'}`,
        opacity: enabled ? 1 : 0.6,
        transition: 'all 0.25s',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: enabled ? color : '#ff3d57', boxShadow: enabled ? `0 0 5px ${color}` : 'none' }} />
          <span className="text-xs font-bold" style={{ color: enabled ? color : '#ff3d57', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.1em' }}>
            {PATH_NAMES[pathIdx]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums" style={{ color: '#5a7090', fontFamily: 'Space Mono', fontSize: '10px' }}>
            Q: <span style={{ color: enabled ? color : '#3a5070' }}>{path.queueLength}</span>
          </span>
          <div
            className="px-1.5 py-0.5 rounded text-xs font-bold"
            style={{
              background: badge.bg,
              border: `1px solid ${badge.border}`,
              color: badge.fg,
              fontFamily: 'Rajdhani, sans-serif',
              fontSize: '9px',
              letterSpacing: '0.08em',
            }}
          >
            {badge.label}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs w-10" style={{ color: '#3a5070', fontFamily: 'Space Mono', fontSize: '9px' }}>QUEUE</span>
        <div className="flex-1 h-1.5 rounded overflow-hidden" style={{ background: 'var(--surface-4)' }}>
          <div
            className="h-full rounded transition-all duration-500"
            style={{ width: `${queuePct}%`, background: `linear-gradient(to right, ${color}, ${color}88)`, boxShadow: `0 0 4px ${color}55` }}
          />
        </div>
        <span className="text-xs w-5 text-right tabular-nums" style={{ color, fontFamily: 'Space Mono', fontSize: '9px' }}>
          {path.queueLength}
        </span>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '9px' }}>
          {path.entitiesProcessed} units processed
        </span>
        {path.avgServiceTime > 0 && (
          <span className="text-xs" style={{ color: '#3a5070', fontFamily: 'Space Mono', fontSize: '9px' }}>
            avg {path.avgServiceTime.toFixed(1)} min
          </span>
        )}
      </div>
    </div>
  );
}

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="p-2 rounded text-xs"
      style={{ background: 'rgba(7,9,15,0.97)', border: '1px solid var(--border-subtle)', fontFamily: 'Space Mono, monospace' }}
    >
      <div style={{ color: '#5a7090', marginBottom: 4 }}>t = {label} min</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(1) : p.value}
        </div>
      ))}
    </div>
  );
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-xs font-bold tracking-widest mb-2"
      style={{ color: '#3a5070', fontFamily: 'Orbitron, sans-serif', fontSize: '9px', letterSpacing: '0.14em' }}
    >
      {children}
    </div>
  );
}

export default function StatsPanel({ simState, predictionResult, pathEnabled }: StatsPanelProps) {
  const throughputPerHour = simState.time > 0
    ? (simState.totalSinked / (simState.time / 60)).toFixed(1)
    : '0.0';

  const resourceTotal = simState.resourceUsed + simState.resourceAvailable;
  const resourcePct = resourceTotal > 0
    ? Math.round((simState.resourceUsed / resourceTotal) * 100)
    : 0;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: 'var(--surface-1)' }}
    >
      {/* KPI Row */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <SectionLabel>LIVE TELEMETRY</SectionLabel>
        <div className="grid grid-cols-4 gap-2">
          <KpiCard label="GENERATED"  value={simState.totalGenerated}   color="#ffb300" />
          <KpiCard label="COMPLETED"  value={simState.totalSinked}      color="var(--green)" />
          <KpiCard label="THROUGHPUT" value={throughputPerHour} unit="/hr" color="var(--cyan)" />
          <KpiCard label="RESOURCE"   value={`${resourcePct}%`} sub={`${simState.resourceUsed} in use`} color="var(--purple)" />
        </div>
      </div>

      {/* Live Telemetry Chart — single large chart, two lines, dual Y-axis */}
      <div
        className="px-3 pt-3 pb-3"
        style={{
          borderBottom: '1px solid var(--border-dim)',
          background: 'linear-gradient(180deg, rgba(0,18,40,0.6) 0%, rgba(0,10,25,0.4) 100%)',
        }}
      >
        {/* Header row */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--cyan)', fontSize: '11px' }}>⬡</span>
            <SectionLabel>LIVE TELEMETRY</SectionLabel>
          </div>
          <div className="flex items-center gap-1">
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{
                background: simState.running ? 'var(--green)' : '#3a5070',
                boxShadow: simState.running ? '0 0 6px var(--green)' : 'none',
                animation: simState.running ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
              }}
            />
            <span style={{ color: simState.running ? 'var(--green)' : '#3a5070', fontFamily: 'Space Mono', fontSize: '9px', letterSpacing: '0.08em' }}>
              {simState.running ? 'LIVE' : 'PAUSED'}
            </span>
          </div>
        </div>

        {/* Main dual-axis chart */}
        <div
          style={{
            height: 160,
            background: 'rgba(0,12,30,0.55)',
            border: '1px solid rgba(0,212,255,0.1)',
            borderRadius: '4px',
            padding: '6px 4px 2px 0',
            position: 'relative',
          }}
        >
          {simState.throughputHistory.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center"
              style={{ color: '#1a3050', fontFamily: 'Space Mono', fontSize: '10px', letterSpacing: '0.1em', pointerEvents: 'none' }}
            >
              AWAITING DATA…
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={simState.throughputHistory} margin={{ top: 8, right: 40, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradQ" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#00d4ff" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradTp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="#ffb300" stopOpacity={0.18} />
                  <stop offset="100%" stopColor="#ffb300" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 6"
                stroke="rgba(0,180,255,0.07)"
                vertical={false}
              />

              <XAxis
                dataKey="time"
                tick={{ fill: '#2a4060', fontSize: 8, fontFamily: 'Space Mono' }}
                tickLine={false}
                axisLine={{ stroke: 'rgba(0,212,255,0.12)' }}
                tickFormatter={(v) => {
                  const h = Math.floor(v / 60);
                  const m = Math.floor(v % 60);
                  return `${h}:${String(m).padStart(2,'0')}`;
                }}
                interval="preserveStartEnd"
                minTickGap={40}
              />

              {/* Left Y — Queue Length */}
              <YAxis
                yAxisId="queue"
                orientation="left"
                tick={{ fill: '#00d4ff', fontSize: 8, fontFamily: 'Space Mono' }}
                tickLine={false}
                axisLine={false}
                width={26}
              />

              {/* Right Y — Throughput /hr */}
              <YAxis
                yAxisId="tp"
                orientation="right"
                tick={{ fill: '#ffb300', fontSize: 8, fontFamily: 'Space Mono' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />

              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const h = Math.floor(Number(label) / 60);
                  const m = Math.floor(Number(label) % 60);
                  const qEntry = payload.find((p: any) => p.dataKey === 'queueTotal');
                  const tpEntry = payload.find((p: any) => p.dataKey === 'throughput');
                  return (
                    <div style={{
                      background: 'rgba(4,10,22,0.97)',
                      border: '1px solid rgba(0,212,255,0.3)',
                      borderRadius: '4px',
                      padding: '8px 12px',
                      fontFamily: 'Space Mono',
                      fontSize: '10px',
                      minWidth: '140px',
                    }}>
                      <div style={{ color: '#3a6080', marginBottom: '6px', fontSize: '9px' }}>
                        {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')} sim-time
                      </div>
                      {qEntry && (
                        <div className="flex items-center justify-between gap-4" style={{ marginBottom: '3px' }}>
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 20, height: 2, background: '#00d4ff', borderRadius: 1 }} />
                            <span style={{ color: '#5a8090' }}>Queue Length</span>
                          </div>
                          <span style={{ color: '#00d4ff', fontWeight: 'bold' }}>{qEntry.value}</span>
                        </div>
                      )}
                      {tpEntry && (
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-1.5">
                            <div style={{ width: 20, height: 2, background: '#ffb300', borderRadius: 1 }} />
                            <span style={{ color: '#7a6030' }}>Throughput /hr</span>
                          </div>
                          <span style={{ color: '#ffb300', fontWeight: 'bold' }}>{tpEntry.value}</span>
                        </div>
                      )}
                    </div>
                  );
                }}
                cursor={{ stroke: 'rgba(0,212,255,0.2)', strokeWidth: 1, strokeDasharray: '3 3' }}
              />

              {/* Queue Length line with area fill */}
              <Area
                yAxisId="queue"
                type="monotoneX"
                dataKey="queueTotal"
                stroke="#00d4ff"
                strokeWidth={2}
                fill="url(#gradQ)"
                dot={false}
                activeDot={{ r: 3, fill: '#00d4ff', stroke: 'rgba(0,212,255,0.4)', strokeWidth: 4 }}
                name="Queue Length"
                isAnimationActive={false}
              />

              {/* Throughput /hr line with area fill */}
              <Area
                yAxisId="tp"
                type="monotoneX"
                dataKey="throughput"
                stroke="#ffb300"
                strokeWidth={2}
                fill="url(#gradTp)"
                dot={false}
                activeDot={{ r: 3, fill: '#ffb300', stroke: 'rgba(255,179,0,0.4)', strokeWidth: 4 }}
                name="Throughput /hr"
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 mt-2 justify-center">
          {[
            { label: 'Queue Length', color: '#00d4ff' },
            { label: 'Throughput /hr', color: '#ffb300' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <svg width="22" height="8" viewBox="0 0 22 8">
                <line x1="0" y1="4" x2="22" y2="4" stroke={l.color} strokeWidth="2" />
                <circle cx="11" cy="4" r="2.5" fill={l.color} />
              </svg>
              <span style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '9px', letterSpacing: '0.05em' }}>{l.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Path Status */}
      <div className="p-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
        <SectionLabel>PRODUCTION LINE STATUS</SectionLabel>
        {simState.paths.map((path, idx) => (
          <PathRow key={idx} path={path} pathIdx={idx} enabled={pathEnabled[idx]} />
        ))}
      </div>

      {/* Prediction Results */}
      {predictionResult && (
        <div className="p-3 fade-in-up">
          <div className="flex items-center gap-2 mb-3">
            <SectionLabel>PREDICTION RESULTS</SectionLabel>
            <div
              className="px-2 py-0.5 rounded"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)', color: 'var(--cyan)', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.1em', marginTop: '-2px' }}
            >
              8H FORECAST
            </div>
          </div>

          <div
            className="p-2.5 rounded mb-3 flex items-center gap-2"
            style={{ background: 'rgba(255,61,87,0.06)', border: '1px solid rgba(255,61,87,0.25)' }}
          >
            <span style={{ color: 'var(--red)', fontSize: '13px' }}>⚠</span>
            <span className="text-xs" style={{ color: 'var(--red)', fontFamily: 'Space Grotesk', lineHeight: 1.4 }}>
              <strong>BOTTLENECK:</strong> {PATH_NAMES[predictionResult.bottleneck]} — highest average queue
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            {predictionResult.avgQueueLengths.map((q, i) => (
              <div
                key={i}
                className="p-2 rounded text-center"
                style={{ background: 'var(--surface-2)', border: `1px solid ${PATH_HEX[i]}28` }}
              >
                <div className="text-xs mb-1" style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.06em' }}>
                  {PATH_NAMES[i]}
                </div>
                <div className="text-xl font-bold tabular-nums" style={{ color: PATH_HEX[i], fontFamily: 'Space Mono' }}>
                  {q}
                </div>
                <div className="text-xs" style={{ color: '#3a5070', fontSize: '9px' }}>avg queue</div>
              </div>
            ))}
          </div>

          <div style={{ height: 90 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'P1', value: predictionResult.pathThroughputs[0] },
                  { name: 'P2', value: predictionResult.pathThroughputs[1] },
                  { name: 'P3', value: predictionResult.pathThroughputs[2] },
                ]}
                margin={{ top: 4, right: 4, left: -22, bottom: 0 }}
              >
                <XAxis dataKey="name" tick={{ fill: '#2a3f55', fontSize: 8, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#2a3f55', fontSize: 8, fontFamily: 'Space Mono' }} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Units" radius={[2, 2, 0, 0]}>
                  {[0, 1, 2].map(i => <Cell key={i} fill={PATH_HEX[i]} fillOpacity={0.75} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div
            className="mt-3 p-2.5 rounded grid grid-cols-2 gap-2"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-dim)' }}
          >
            <div>
              <div className="text-xs mb-0.5" style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.06em' }}>TOTAL THROUGHPUT</div>
              <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--green)', fontFamily: 'Space Mono' }}>
                {predictionResult.totalThroughput} units
              </div>
            </div>
            <div>
              <div className="text-xs mb-0.5" style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.06em' }}>RESOURCE UTIL.</div>
              <div className="text-sm font-bold tabular-nums" style={{ color: 'var(--purple)', fontFamily: 'Space Mono' }}>
                {predictionResult.resourceUtilization}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
