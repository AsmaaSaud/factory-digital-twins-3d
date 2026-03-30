import { useState } from 'react';
import type { SimState, SimParams } from '@/lib/simulationEngine';
import type { PredictionResult } from './StatsPanel';

interface ExportModalProps {
  simState: SimState;
  params: SimParams;
  predictionResult: PredictionResult | null;
  onClose: () => void;
}

const PATH_NAMES = ['PATH 1 (Left Lane)', 'PATH 2 (Centre Lane)', 'PATH 3 (Right Lane)'];

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function buildTimestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function exportCSV(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const rows: string[] = [];

  rows.push('SECTION,PARAMETER,VALUE,UNIT');
  rows.push(`Parameters,Arrival Rate Gen1,${params.arrivalRate1},min`);
  rows.push(`Parameters,Arrival Rate Gen2,${params.arrivalRate2},min`);
  rows.push(`Parameters,Service Mean Path1,${params.serviceMean1},min`);
  rows.push(`Parameters,Service StdDev Path1,${params.serviceStd1},min`);
  rows.push(`Parameters,Service Mean Path2,${params.serviceMean2},min`);
  rows.push(`Parameters,Service StdDev Path2,${params.serviceStd2},min`);
  rows.push(`Parameters,Service Mean Path3,${params.serviceMean3},min`);
  rows.push(`Parameters,Service StdDev Path3,${params.serviceStd3},min`);
  rows.push(`Parameters,Queue Capacity Path1,${params.queueMax1},units`);
  rows.push(`Parameters,Queue Capacity Path2,${params.queueMax2},units`);
  rows.push(`Parameters,Queue Capacity Path3,${params.queueMax3},units`);
  rows.push(`Parameters,Resource Pool Capacity,${params.resourceCapacity},units`);
  rows.push(`Parameters,Route Probability Path1,${(params.routeProb1 * 100).toFixed(1)},%`);
  rows.push(`Parameters,Route Probability Path2,${(params.routeProb2 * 100).toFixed(1)},%`);
  rows.push(`Parameters,Route Probability Path3,${(Math.max(0, 1 - params.routeProb1 - params.routeProb2) * 100).toFixed(1)},%`);
  rows.push('');

  rows.push('SECTION,METRIC,VALUE,UNIT');
  rows.push(`Live Results,Simulation Time,${simState.time.toFixed(2)},min`);
  rows.push(`Live Results,Total Generated,${simState.totalGenerated},units`);
  rows.push(`Live Results,Total Completed,${simState.totalSinked},units`);
  const throughput = simState.time > 0 ? (simState.totalSinked / (simState.time / 60)).toFixed(2) : '0';
  rows.push(`Live Results,Throughput,${throughput},units/hr`);
  rows.push(`Live Results,Resource Used,${simState.resourceUsed},units`);
  rows.push(`Live Results,Resource Available,${simState.resourceAvailable},units`);
  rows.push('');

  rows.push('SECTION,PATH,QUEUE LENGTH,SERVER BUSY,ENTITIES PROCESSED,AVG SERVICE TIME (min)');
  simState.paths.forEach((path, i) => {
    rows.push(`Path Results,${PATH_NAMES[i]},${path.queueLength},${path.serverBusy ? 'YES' : 'NO'},${path.entitiesProcessed},${path.avgServiceTime.toFixed(2)}`);
  });
  rows.push('');

  if (simState.throughputHistory.length > 0) {
    rows.push('SECTION,TIME (min),THROUGHPUT (units/hr),TOTAL QUEUE LENGTH');
    simState.throughputHistory.forEach(h => {
      rows.push(`History,${h.time},${h.throughput},${h.queueTotal}`);
    });
    rows.push('');
  }

  if (predictionResult) {
    rows.push('SECTION,METRIC,PATH 1,PATH 2,PATH 3');
    rows.push(`Prediction,Avg Queue Length,${predictionResult.avgQueueLengths[0]},${predictionResult.avgQueueLengths[1]},${predictionResult.avgQueueLengths[2]}`);
    rows.push(`Prediction,Units Processed,${predictionResult.pathThroughputs[0]},${predictionResult.pathThroughputs[1]},${predictionResult.pathThroughputs[2]}`);
    rows.push('');
    rows.push('SECTION,METRIC,VALUE,UNIT');
    rows.push(`Prediction,Total Throughput (8h),${predictionResult.totalThroughput},units`);
    rows.push(`Prediction,Resource Utilization,${predictionResult.resourceUtilization},%`);
    rows.push(`Prediction,Bottleneck Path,${PATH_NAMES[predictionResult.bottleneck]},`);
  }

  downloadFile(rows.join('\n'), `factory-sim-${buildTimestamp()}.csv`, 'text/csv');
}

function exportJSON(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const data = {
    exportedAt: new Date().toISOString(),
    simulationTime: simState.time,
    parameters: {
      arrivalRates: { gen1: params.arrivalRate1, gen2: params.arrivalRate2 },
      serviceTimes: {
        path1: { mean: params.serviceMean1, std: params.serviceStd1 },
        path2: { mean: params.serviceMean2, std: params.serviceStd2 },
        path3: { mean: params.serviceMean3, std: params.serviceStd3 },
      },
      queueCapacities: { path1: params.queueMax1, path2: params.queueMax2, path3: params.queueMax3 },
      resourceCapacity: params.resourceCapacity,
      routingProbabilities: {
        path1: params.routeProb1,
        path2: params.routeProb2,
        path3: Math.max(0, 1 - params.routeProb1 - params.routeProb2),
      },
    },
    liveResults: {
      totalGenerated: simState.totalGenerated,
      totalCompleted: simState.totalSinked,
      throughputPerHour: simState.time > 0 ? simState.totalSinked / (simState.time / 60) : 0,
      resourceUsed: simState.resourceUsed,
      resourceAvailable: simState.resourceAvailable,
    },
    pathResults: simState.paths.map((p, i) => ({
      path: PATH_NAMES[i],
      queueLength: p.queueLength,
      serverBusy: p.serverBusy,
      entitiesProcessed: p.entitiesProcessed,
      avgServiceTime: p.avgServiceTime,
    })),
    throughputHistory: simState.throughputHistory,
    predictionResults: predictionResult ? {
      avgQueueLengths: { path1: predictionResult.avgQueueLengths[0], path2: predictionResult.avgQueueLengths[1], path3: predictionResult.avgQueueLengths[2] },
      pathThroughputs: { path1: predictionResult.pathThroughputs[0], path2: predictionResult.pathThroughputs[1], path3: predictionResult.pathThroughputs[2] },
      totalThroughput: predictionResult.totalThroughput,
      resourceUtilization: predictionResult.resourceUtilization,
      bottleneck: PATH_NAMES[predictionResult.bottleneck],
    } : null,
  };

  downloadFile(JSON.stringify(data, null, 2), `factory-sim-${buildTimestamp()}.json`, 'application/json');
}

function exportSummaryReport(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const throughput = simState.time > 0 ? (simState.totalSinked / (simState.time / 60)).toFixed(2) : '0';
  const hh = Math.floor(simState.time / 60);
  const mm = Math.floor(simState.time % 60);

  let report = `
================================================================================
         3D FACTORY DIGITAL TWIN — SIMULATION SUMMARY REPORT
================================================================================
Generated : ${new Date().toLocaleString()}
Sim Time  : ${hh}h ${mm}m

--------------------------------------------------------------------------------
SIMULATION PARAMETERS
--------------------------------------------------------------------------------
Arrival Rates:
  Generator 1 (Exp. Mean):  ${params.arrivalRate1} min
  Generator 2 (Exp. Mean):  ${params.arrivalRate2} min

Service Times (Normal Distribution):
  PATH 1 (Left Lane)  :  Mean = ${params.serviceMean1} min,  StdDev = ${params.serviceStd1} min
  PATH 2 (Centre Lane):  Mean = ${params.serviceMean2} min,  StdDev = ${params.serviceStd2} min
  PATH 3 (Right Lane) :  Mean = ${params.serviceMean3} min,  StdDev = ${params.serviceStd3} min

Queue Capacities:
  PATH 1: ${params.queueMax1}  |  PATH 2: ${params.queueMax2}  |  PATH 3: ${params.queueMax3}

Routing Probabilities:
  PATH 1: ${(params.routeProb1 * 100).toFixed(1)}%  |  PATH 2: ${(params.routeProb2 * 100).toFixed(1)}%  |  PATH 3: ${(Math.max(0, 1 - params.routeProb1 - params.routeProb2) * 100).toFixed(1)}%

Shared Resource Pool Capacity: ${params.resourceCapacity} units

--------------------------------------------------------------------------------
LIVE SIMULATION RESULTS
--------------------------------------------------------------------------------
  Total Entities Generated : ${simState.totalGenerated}
  Total Entities Completed : ${simState.totalSinked}
  Throughput               : ${throughput} units/hr
  Resource Currently Used  : ${simState.resourceUsed} / ${params.resourceCapacity}

Per-Path Performance:
  PATH 1 | Queue: ${String(simState.paths[0].queueLength).padStart(3)} | Server: ${simState.paths[0].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[0].entitiesProcessed} | Avg Service: ${simState.paths[0].avgServiceTime.toFixed(1)} min
  PATH 2 | Queue: ${String(simState.paths[1].queueLength).padStart(3)} | Server: ${simState.paths[1].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[1].entitiesProcessed} | Avg Service: ${simState.paths[1].avgServiceTime.toFixed(1)} min
  PATH 3 | Queue: ${String(simState.paths[2].queueLength).padStart(3)} | Server: ${simState.paths[2].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[2].entitiesProcessed} | Avg Service: ${simState.paths[2].avgServiceTime.toFixed(1)} min
`;

  if (predictionResult) {
    report += `
--------------------------------------------------------------------------------
PREDICTIVE SIMULATION RESULTS (8-Hour Forecast)
--------------------------------------------------------------------------------
  Total Throughput (8h)  : ${predictionResult.totalThroughput} units
  Resource Utilization   : ${predictionResult.resourceUtilization}%
  Identified Bottleneck  : ${PATH_NAMES[predictionResult.bottleneck]}

Per-Path Forecast:
  PATH 1 | Avg Queue: ${String(predictionResult.avgQueueLengths[0]).padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[0]}
  PATH 2 | Avg Queue: ${String(predictionResult.avgQueueLengths[1]).padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[1]}
  PATH 3 | Avg Queue: ${String(predictionResult.avgQueueLengths[2]).padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[2]}
`;
  }

  report += `
================================================================================
  Generated by: Factory Digital Twin — 3D Simulation Platform
  Model: JaamSim 3-Path Factory (simvc2.cfg)
================================================================================
`;

  downloadFile(report.trim(), `factory-sim-report-${buildTimestamp()}.txt`, 'text/plain');
}

export default function ExportModal({ simState, params, predictionResult, onClose }: ExportModalProps) {
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = (type: 'csv' | 'json' | 'report') => {
    if (type === 'csv') exportCSV(simState, params, predictionResult);
    else if (type === 'json') exportJSON(simState, params, predictionResult);
    else exportSummaryReport(simState, params, predictionResult);
    setExported(type.toUpperCase());
    setTimeout(() => setExported(null), 2500);
  };

  const throughput = simState.time > 0
    ? (simState.totalSinked / (simState.time / 60)).toFixed(1)
    : '0.0';

  const exportOptions = [
    {
      type: 'csv' as const,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="#00e676" strokeWidth="1.5" />
          <path d="M3 9h18M3 15h18M9 3v18" stroke="#00e676" strokeWidth="1.5" />
        </svg>
      ),
      title: 'CSV Spreadsheet',
      desc: 'Parameters · Live Results · History · Prediction',
      color: '#00e676',
      ext: '.csv',
    },
    {
      type: 'json' as const,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M7 8C5.9 8 5 8.9 5 10v1c0 1.1-.9 2-2 2 1.1 0 2 .9 2 2v1c0 1.1.9 2 2 2" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M17 8c1.1 0 2 .9 2 2v1c0 1.1.9 2 2 2-1.1 0-2 .9-2 2v1c0 1.1-.9 2-2 2" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      ),
      title: 'JSON Data',
      desc: 'Structured data for API integration or JaamSim',
      color: '#00d4ff',
      ext: '.json',
    },
    {
      type: 'report' as const,
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" stroke="#ffb300" strokeWidth="1.5" />
          <polyline points="14,2 14,8 20,8" stroke="#ffb300" strokeWidth="1.5" />
          <line x1="8" y1="13" x2="16" y2="13" stroke="#ffb300" strokeWidth="1.5" />
          <line x1="8" y1="17" x2="13" y2="17" stroke="#ffb300" strokeWidth="1.5" />
        </svg>
      ),
      title: 'Summary Report',
      desc: 'Human-readable text report with all metrics',
      color: '#ffb300',
      ext: '.txt',
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg w-full max-w-md mx-4 fade-in-up"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-subtle)',
          boxShadow: '0 0 60px rgba(0,212,255,0.12), 0 24px 48px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-dim)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: 'rgba(0,212,255,0.08)', border: '1px solid rgba(0,212,255,0.25)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" stroke="#00d4ff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-widest" style={{ color: 'var(--cyan)', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}>
                EXPORT RESULTS
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>
                Select output format
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center transition-all"
            style={{ background: 'rgba(255,61,87,0.08)', border: '1px solid rgba(255,61,87,0.3)', color: 'var(--red)', fontSize: '12px' }}
          >
            ✕
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-5 py-3 grid grid-cols-3 gap-3" style={{ borderBottom: '1px solid var(--border-dim)' }}>
          {[
            { label: 'GENERATED',  value: simState.totalGenerated, color: '#ffb300' },
            { label: 'COMPLETED',  value: simState.totalSinked,    color: 'var(--green)' },
            { label: 'THROUGHPUT', value: `${throughput}/hr`,      color: 'var(--cyan)' },
          ].map((s, i) => (
            <div key={i} className="text-center p-2 rounded" style={{ background: 'var(--surface-2)' }}>
              <div className="text-xs mb-1" style={{ color: '#3a5070', fontFamily: 'Rajdhani', fontSize: '9px', letterSpacing: '0.08em' }}>{s.label}</div>
              <div className="text-base font-bold tabular-nums" style={{ color: s.color, fontFamily: 'Space Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Export Options */}
        <div className="p-5 flex flex-col gap-2.5">
          {exportOptions.map(opt => {
            const isExported = exported === opt.type.toUpperCase();
            return (
              <button
                key={opt.type}
                onClick={() => handleExport(opt.type)}
                className="flex items-center gap-4 p-4 rounded text-left transition-all"
                style={{
                  background: isExported
                    ? `${opt.color}14`
                    : 'var(--surface-2)',
                  border: `1px solid ${isExported ? opt.color + '60' : 'var(--border-dim)'}`,
                  boxShadow: isExported ? `0 0 16px ${opt.color}18` : 'none',
                }}
                onMouseEnter={e => {
                  if (!isExported) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = opt.color + '40';
                    (e.currentTarget as HTMLButtonElement).style.background = `${opt.color}08`;
                  }
                }}
                onMouseLeave={e => {
                  if (!isExported) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-dim)';
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-2)';
                  }
                }}
              >
                <div
                  className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                  style={{ background: `${opt.color}10`, border: `1px solid ${opt.color}30` }}
                >
                  {isExported ? (
                    <span style={{ color: opt.color, fontSize: '16px' }}>✓</span>
                  ) : opt.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold" style={{ color: isExported ? opt.color : '#8899bb', fontFamily: 'Space Grotesk' }}>
                      {isExported ? 'Downloaded!' : opt.title}
                    </span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded"
                      style={{ background: `${opt.color}15`, color: opt.color, fontFamily: 'Space Mono', fontSize: '9px', border: `1px solid ${opt.color}30` }}
                    >
                      {opt.ext}
                    </span>
                  </div>
                  <div className="text-xs" style={{ color: '#3a5070', fontFamily: 'Space Grotesk', fontSize: '10px' }}>
                    {opt.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!predictionResult && (
          <div
            className="mx-5 mb-5 p-3 rounded flex items-start gap-2"
            style={{ background: 'rgba(255,179,0,0.05)', border: '1px solid rgba(255,179,0,0.2)' }}
          >
            <span style={{ color: '#ffb300', fontSize: '12px', marginTop: '1px' }}>ℹ</span>
            <span className="text-xs" style={{ color: '#6a7f99', fontFamily: 'Space Grotesk', lineHeight: 1.5 }}>
              Run <strong style={{ color: '#ffb300' }}>RUN PREDICTION</strong> first to include 8-hour forecast data in the export.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
