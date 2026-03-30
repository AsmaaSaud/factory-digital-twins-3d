// =============================================================
// ExportModal - Export Simulation Results
// Design: Industrial HUD - Neon Factory Control Room
// Supports: CSV, JSON, Summary Report
// =============================================================

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

function exportCSV(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const rows: string[] = [];
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

  // ---- Section 1: Simulation Parameters ----
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

  // ---- Section 2: Live Simulation Results ----
  rows.push('SECTION,METRIC,VALUE,UNIT');
  rows.push(`Live Results,Simulation Time,${simState.time.toFixed(2)},min`);
  rows.push(`Live Results,Total Generated,${simState.totalGenerated},units`);
  rows.push(`Live Results,Total Completed,${simState.totalSinked},units`);
  const throughput = simState.time > 0 ? (simState.totalSinked / (simState.time / 60)).toFixed(2) : '0';
  rows.push(`Live Results,Throughput,${throughput},units/hr`);
  rows.push(`Live Results,Resource Used,${simState.resourceUsed},units`);
  rows.push(`Live Results,Resource Available,${simState.resourceAvailable},units`);
  rows.push('');

  // ---- Section 3: Per-Path Results ----
  rows.push('SECTION,PATH,QUEUE LENGTH,SERVER BUSY,ENTITIES PROCESSED,AVG SERVICE TIME (min)');
  simState.paths.forEach((path, i) => {
    rows.push(`Path Results,${PATH_NAMES[i]},${path.queueLength},${path.serverBusy ? 'YES' : 'NO'},${path.entitiesProcessed},${path.avgServiceTime.toFixed(2)}`);
  });
  rows.push('');

  // ---- Section 4: Throughput History ----
  if (simState.throughputHistory.length > 0) {
    rows.push('SECTION,TIME (min),THROUGHPUT (units/hr),TOTAL QUEUE LENGTH');
    simState.throughputHistory.forEach(h => {
      rows.push(`History,${h.time},${h.throughput},${h.queueTotal}`);
    });
    rows.push('');
  }

  // ---- Section 5: Prediction Results ----
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

  downloadFile(rows.join('\n'), `factory-sim-results-${ts}.csv`, 'text/csv');
}

function exportJSON(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const ts = new Date().toISOString();
  const data = {
    exportedAt: ts,
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
      avgQueueLengths: {
        path1: predictionResult.avgQueueLengths[0],
        path2: predictionResult.avgQueueLengths[1],
        path3: predictionResult.avgQueueLengths[2],
      },
      pathThroughputs: {
        path1: predictionResult.pathThroughputs[0],
        path2: predictionResult.pathThroughputs[1],
        path3: predictionResult.pathThroughputs[2],
      },
      totalThroughput: predictionResult.totalThroughput,
      resourceUtilization: predictionResult.resourceUtilization,
      bottleneck: PATH_NAMES[predictionResult.bottleneck],
    } : null,
  };

  const tsFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(JSON.stringify(data, null, 2), `factory-sim-results-${tsFile}.json`, 'application/json');
}

function exportSummaryReport(simState: SimState, params: SimParams, predictionResult: PredictionResult | null) {
  const ts = new Date().toLocaleString();
  const throughput = simState.time > 0 ? (simState.totalSinked / (simState.time / 60)).toFixed(2) : '0';
  const simHours = Math.floor(simState.time / 60);
  const simMins = Math.floor(simState.time % 60);

  let report = `
================================================================================
         3D FACTORY DIGITAL TWIN - SIMULATION SUMMARY REPORT
================================================================================
Generated: ${ts}
Simulation Time: ${simHours}h ${simMins}m

--------------------------------------------------------------------------------
SIMULATION PARAMETERS
--------------------------------------------------------------------------------
Arrival Rates:
  Generator 1 (Exponential Mean):  ${params.arrivalRate1} min
  Generator 2 (Exponential Mean):  ${params.arrivalRate2} min

Service Times (Normal Distribution):
  PATH 1 (Left Lane):    Mean = ${params.serviceMean1} min,  StdDev = ${params.serviceStd1} min
  PATH 2 (Centre Lane):  Mean = ${params.serviceMean2} min,  StdDev = ${params.serviceStd2} min
  PATH 3 (Right Lane):   Mean = ${params.serviceMean3} min,  StdDev = ${params.serviceStd3} min

Queue Capacities:
  PATH 1: ${params.queueMax1}  |  PATH 2: ${params.queueMax2}  |  PATH 3: ${params.queueMax3}

Routing Probabilities:
  PATH 1: ${(params.routeProb1 * 100).toFixed(1)}%  |  PATH 2: ${(params.routeProb2 * 100).toFixed(1)}%  |  PATH 3: ${(Math.max(0, 1 - params.routeProb1 - params.routeProb2) * 100).toFixed(1)}%

Shared Resource Pool Capacity: ${params.resourceCapacity} units

--------------------------------------------------------------------------------
LIVE SIMULATION RESULTS
--------------------------------------------------------------------------------
  Total Entities Generated:  ${simState.totalGenerated}
  Total Entities Completed:  ${simState.totalSinked}
  Throughput:                ${throughput} units/hr
  Resource Currently Used:   ${simState.resourceUsed} / ${params.resourceCapacity}

Per-Path Performance:
  PATH 1 | Queue: ${simState.paths[0].queueLength.toString().padStart(3)} | Server: ${simState.paths[0].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[0].entitiesProcessed} | Avg Service: ${simState.paths[0].avgServiceTime.toFixed(1)} min
  PATH 2 | Queue: ${simState.paths[1].queueLength.toString().padStart(3)} | Server: ${simState.paths[1].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[1].entitiesProcessed} | Avg Service: ${simState.paths[1].avgServiceTime.toFixed(1)} min
  PATH 3 | Queue: ${simState.paths[2].queueLength.toString().padStart(3)} | Server: ${simState.paths[2].serverBusy ? 'BUSY' : 'IDLE'} | Processed: ${simState.paths[2].entitiesProcessed} | Avg Service: ${simState.paths[2].avgServiceTime.toFixed(1)} min
`;

  if (predictionResult) {
    report += `
--------------------------------------------------------------------------------
PREDICTIVE SIMULATION RESULTS (8-Hour Forecast)
--------------------------------------------------------------------------------
  Total Throughput (8h):     ${predictionResult.totalThroughput} units
  Resource Utilization:      ${predictionResult.resourceUtilization}%
  Identified Bottleneck:     ${PATH_NAMES[predictionResult.bottleneck]}

Per-Path Forecast:
  PATH 1 | Avg Queue: ${predictionResult.avgQueueLengths[0].toString().padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[0]}
  PATH 2 | Avg Queue: ${predictionResult.avgQueueLengths[1].toString().padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[1]}
  PATH 3 | Avg Queue: ${predictionResult.avgQueueLengths[2].toString().padStart(3)} | Units Processed: ${predictionResult.pathThroughputs[2]}
`;
  }

  report += `
================================================================================
  Generated by: 3D Factory Digital Twin Platform
  Based on JaamSim 3-Path Factory Model (simvc2.cfg)
================================================================================
`;

  const tsFile = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadFile(report.trim(), `factory-sim-report-${tsFile}.txt`, 'text/plain');
}

export default function ExportModal({ simState, params, predictionResult, onClose }: ExportModalProps) {
  const [exported, setExported] = useState<string | null>(null);

  const handleExport = (type: 'csv' | 'json' | 'report') => {
    if (type === 'csv') exportCSV(simState, params, predictionResult);
    else if (type === 'json') exportJSON(simState, params, predictionResult);
    else exportSummaryReport(simState, params, predictionResult);
    setExported(type.toUpperCase());
    setTimeout(() => setExported(null), 2000);
  };

  const throughput = simState.time > 0
    ? (simState.totalSinked / (simState.time / 60)).toFixed(1)
    : '0.0';

  const exportOptions = [
    {
      type: 'csv' as const,
      icon: '📊',
      title: 'CSV Spreadsheet',
      desc: 'Parameters + Live Results + History + Prediction',
      color: '#00ff88',
      ext: '.csv',
    },
    {
      type: 'json' as const,
      icon: '{ }',
      title: 'JSON Data',
      desc: 'Full structured data for developers / API integration',
      color: '#00d4ff',
      ext: '.json',
    },
    {
      type: 'report' as const,
      icon: '📄',
      title: 'Summary Report',
      desc: 'Human-readable text report with all metrics',
      color: '#ffd700',
      ext: '.txt',
    },
  ];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="rounded-lg w-full max-w-md mx-4"
        style={{
          background: '#0d1220',
          border: '1px solid #1a2540',
          boxShadow: '0 0 40px rgba(0,212,255,0.15)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid #1a2540' }}
        >
          <div>
            <div
              className="text-sm font-bold tracking-widest"
              style={{ color: '#00d4ff', fontFamily: 'Orbitron, sans-serif' }}
            >
              EXPORT RESULTS
            </div>
            <div className="text-xs mt-0.5" style={{ color: '#445566', fontFamily: 'Rajdhani' }}>
              Choose export format
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-sm transition-all"
            style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid #ff3366', color: '#ff3366' }}
          >
            ✕
          </button>
        </div>

        {/* Quick Stats */}
        <div className="px-5 py-3 grid grid-cols-3 gap-2" style={{ borderBottom: '1px solid #1a2540' }}>
          {[
            { label: 'GENERATED', value: simState.totalGenerated, color: '#ffd700' },
            { label: 'COMPLETED', value: simState.totalSinked, color: '#00ff88' },
            { label: 'THROUGHPUT', value: `${throughput}/hr`, color: '#00d4ff' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-xs" style={{ color: '#445566', fontFamily: 'Rajdhani', fontSize: '10px' }}>{s.label}</div>
              <div className="text-base font-bold" style={{ color: s.color, fontFamily: 'Share Tech Mono' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Export Options */}
        <div className="p-5 flex flex-col gap-3">
          {exportOptions.map(opt => (
            <button
              key={opt.type}
              onClick={() => handleExport(opt.type)}
              className="flex items-center gap-4 p-4 rounded text-left transition-all hover:opacity-90"
              style={{
                background: exported === opt.type.toUpperCase()
                  ? `${opt.color}22`
                  : 'rgba(13,18,32,0.8)',
                border: `1px solid ${exported === opt.type.toUpperCase() ? opt.color : '#1a2540'}`,
                boxShadow: exported === opt.type.toUpperCase() ? `0 0 12px ${opt.color}33` : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                className="w-10 h-10 rounded flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: `${opt.color}15`,
                  border: `1px solid ${opt.color}44`,
                  color: opt.color,
                  fontFamily: 'Share Tech Mono',
                  fontSize: opt.type === 'json' ? '10px' : '18px',
                }}
              >
                {opt.icon}
              </div>
              <div className="flex-1">
                <div
                  className="text-sm font-bold flex items-center gap-2"
                  style={{ color: opt.color, fontFamily: 'Rajdhani, sans-serif' }}
                >
                  {opt.title}
                  <span
                    className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: `${opt.color}15`,
                      border: `1px solid ${opt.color}44`,
                      color: opt.color,
                      fontFamily: 'Share Tech Mono',
                      fontSize: '10px',
                    }}
                  >
                    {opt.ext}
                  </span>
                  {exported === opt.type.toUpperCase() && (
                    <span className="text-xs" style={{ color: '#00ff88' }}>✓ Downloaded!</span>
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: '#556677', fontFamily: 'Inter' }}>
                  {opt.desc}
                </div>
              </div>
              <div style={{ color: opt.color, opacity: 0.6 }}>↓</div>
            </button>
          ))}
        </div>

        {/* Footer note */}
        <div
          className="px-5 py-3 text-xs"
          style={{
            borderTop: '1px solid #1a2540',
            color: '#334455',
            fontFamily: 'Rajdhani',
          }}
        >
          {predictionResult
            ? '✓ Prediction results included in export'
            : '⚠ Run Prediction first to include forecast data'}
        </div>
      </div>
    </div>
  );
}
