// Factory Simulation Engine
// Based on 3-Path JaamSim model (simvc2.cfg)

export interface SimParams {
  // Arrival rates (mean inter-arrival time in minutes)
  arrivalRate1: number;  // ExponentialDistribution1 mean
  arrivalRate2: number;  // ExponentialDistribution2 mean
  // Service times (mean in minutes)
  serviceMean1: number;  // Path 1 - NormalDistribution1 mean (default 20)
  serviceStd1: number;   // Path 1 std dev (default 4)
  serviceMean2: number;  // Path 2 - NormalDistribution2 mean (default 15)
  serviceStd2: number;   // Path 2 std dev (default 3)
  serviceMean3: number;  // Path 3 - NormalDistribution3 mean (default 18)
  serviceStd3: number;   // Path 3 std dev (default 3)
  // Queue capacities
  queueMax1: number;     // max 10
  queueMax2: number;
  queueMax3: number;
  // Resource pool
  resourceCapacity: number; // default 40
  // Routing probabilities
  routeProb1: number;   // 0.33
  routeProb2: number;   // 0.33
  routeProb3: number;   // 0.34
  // Simulation speed
  simSpeed: number;     // multiplier
  // Path enable/disable
  pathEnabled: [boolean, boolean, boolean];
}

export interface PathState {
  queueLength: number;
  serverBusy: boolean;
  serverUtilization: number;
  entitiesProcessed: number;
  avgServiceTime: number;
  conveyorEntities: ConveyorEntity[];
  waitingEntities: WaitingEntity[];
}

export interface ConveyorEntity {
  id: string;
  progress: number; // 0-1 along conveyor
  stage: 'in' | 'queue' | 'server' | 'out';
  color: string;
}

export interface WaitingEntity {
  id: string;
  position: number; // position in queue
}

export interface SimState {
  time: number; // minutes
  running: boolean;
  paths: [PathState, PathState, PathState];
  totalGenerated: number;
  totalSinked: number;
  resourceUsed: number;
  resourceAvailable: number;
  throughputHistory: { time: number; throughput: number; queueTotal: number; q0: number; q1: number; q2: number }[];
  pathThroughput: [number, number, number];
}

function normalRandom(mean: number, std: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0, mean + std * z);
}

function exponentialRandom(mean: number): number {
  return -mean * Math.log(Math.random());
}

// Internal entity for simulation
interface SimEntity {
  id: string;
  path: 0 | 1 | 2;
  stage: 'conveyor_in' | 'queue' | 'seize' | 'server' | 'conveyor_out' | 'release' | 'sink';
  arrivalTime: number;
  serviceStart?: number;
  serviceEnd?: number;
  conveyorProgress: number;
  conveyorSpeed: number;
}

export class FactorySimulation {
  params: SimParams;
  private state: SimState;
  private entities: SimEntity[] = [];
  private nextEntityId = 0;
  private nextArrival1 = 0;
  private nextArrival2 = 0;
  private serverFinish: [number, number, number] = [0, 0, 0];
  private serverEntity: [string | null, string | null, string | null] = [null, null, null];
  private historyInterval = 0;
  private listeners: ((state: SimState) => void)[] = [];
  private animFrame: number | null = null;
  private lastRealTime = 0;
  private simTimeAccum = 0;

  constructor(params: SimParams) {
    this.params = { ...params };
    this.state = this.initState();
    this.nextArrival1 = exponentialRandom(params.arrivalRate1);
    this.nextArrival2 = exponentialRandom(params.arrivalRate2);
  }

  private initState(): SimState {
    return {
      time: 0,
      running: false,
      paths: [
        this.emptyPath(),
        this.emptyPath(),
        this.emptyPath(),
      ],
      totalGenerated: 0,
      totalSinked: 0,
      resourceUsed: 0,
      resourceAvailable: this.params.resourceCapacity,
      throughputHistory: [],
      pathThroughput: [0, 0, 0],
    };
  }

  private emptyPath(): PathState {
    return {
      queueLength: 0,
      serverBusy: false,
      serverUtilization: 0,
      entitiesProcessed: 0,
      avgServiceTime: 0,
      conveyorEntities: [],
      waitingEntities: [],
    };
  }

  subscribe(listener: (state: SimState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private emit() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  getState(): SimState {
    return { ...this.state };
  }

  updateParams(params: Partial<SimParams>) {
    this.params = { ...this.params, ...params };
    this.state.resourceAvailable = this.params.resourceCapacity - this.state.resourceUsed;
  }

  start() {
    if (this.state.running) return;
    this.state.running = true;
    this.lastRealTime = performance.now();
    this.loop();
  }

  pause() {
    this.state.running = false;
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  reset() {
    this.pause();
    this.entities = [];
    this.nextEntityId = 0;
    this.nextArrival1 = exponentialRandom(this.params.arrivalRate1);
    this.nextArrival2 = exponentialRandom(this.params.arrivalRate2);
    this.serverFinish = [0, 0, 0];
    this.serverEntity = [null, null, null];
    this.historyInterval = 0;
    this.simTimeAccum = 0;
    this.state = this.initState();
    this.emit();
  }

  private loop() {
    if (!this.state.running) return;
    const now = performance.now();
    const realDelta = (now - this.lastRealTime) / 1000; // seconds
    this.lastRealTime = now;

    // sim speed: 1 real second = simSpeed minutes
    const simDelta = realDelta * this.params.simSpeed;
    this.simTimeAccum += simDelta;

    // Step simulation
    this.step(simDelta);

    this.animFrame = requestAnimationFrame(() => this.loop());
  }

  step(dt: number) {
    const t = this.state.time + dt;
    this.state.time = t;

    // Generate entities
    while (this.nextArrival1 <= t) {
      this.generateEntity(this.nextArrival1);
      this.nextArrival1 += exponentialRandom(this.params.arrivalRate1);
    }
    while (this.nextArrival2 <= t) {
      this.generateEntity(this.nextArrival2);
      this.nextArrival2 += exponentialRandom(this.params.arrivalRate2);
    }

    // Process server completions
    for (let p = 0; p < 3; p++) {
      if (this.serverEntity[p] !== null && this.serverFinish[p] <= t) {
        this.completeService(p as 0|1|2);
      }
    }

    // Try to start service for queued entities
    for (let p = 0; p < 3; p++) {
      this.tryStartService(p as 0|1|2);
    }

    // Update entity positions
    this.updateEntities(dt);

    // Update state
    this.updateStateFromEntities();

    // Record history every 0.5 sim-minutes
    this.historyInterval += dt;
    if (this.historyInterval >= 0.5) {
      this.historyInterval = 0;
      const totalQ = this.state.paths.reduce((s, p) => s + p.queueLength, 0);
      const throughput = this.state.totalSinked / Math.max(t / 60, 0.001);
      this.state.throughputHistory.push({
        time: Math.round(t),
        throughput: Math.round(throughput * 10) / 10,
        queueTotal: totalQ,
        q0: this.state.paths[0].queueLength,
        q1: this.state.paths[1].queueLength,
        q2: this.state.paths[2].queueLength,
      });
      if (this.state.throughputHistory.length > 120) {
        this.state.throughputHistory.shift();
      }
    }

    this.emit();
  }

  private generateEntity(time: number) {
    const enabled = this.params.pathEnabled;
    const enabledCount = enabled.filter(Boolean).length;
    if (enabledCount === 0) return;

    // Redistribute routing among enabled paths
    const probs = [this.params.routeProb1, this.params.routeProb2, this.params.routeProb3];
    const activeProbs = probs.map((p, i) => enabled[i] ? p : 0);
    const total = activeProbs.reduce((a, b) => a + b, 0) || 1;
    const norm = activeProbs.map(p => p / total);

    const r = Math.random();
    let path: 0 | 1 | 2 = 0;
    let acc = 0;
    for (let i = 0; i < 3; i++) {
      acc += norm[i];
      if (r < acc) { path = i as 0|1|2; break; }
    }
    if (!enabled[path]) return;

    const entity: SimEntity = {
      id: `e${this.nextEntityId++}`,
      path,
      stage: 'conveyor_in',
      arrivalTime: time,
      conveyorProgress: 0,
      conveyorSpeed: 0.4 + Math.random() * 0.2, // normalized speed
    };
    this.entities.push(entity);
    this.state.totalGenerated++;
  }

  private tryStartService(path: 0|1|2) {
    if (this.serverEntity[path] !== null) return;
    
    // Find queued entity for this path
    const queued = this.entities.filter(e => e.path === path && e.stage === 'queue');
    if (queued.length === 0) return;

    // Check resource
    if (this.state.resourceUsed >= this.params.resourceCapacity) return;

    const entity = queued[0];
    entity.stage = 'server';
    this.serverEntity[path] = entity.id;
    this.state.resourceUsed++;
    this.state.resourceAvailable = this.params.resourceCapacity - this.state.resourceUsed;

    const means = [this.params.serviceMean1, this.params.serviceMean2, this.params.serviceMean3];
    const stds = [this.params.serviceStd1, this.params.serviceStd2, this.params.serviceStd3];
    const serviceTime = normalRandom(means[path], stds[path]);
    entity.serviceStart = this.state.time;
    entity.serviceEnd = this.state.time + serviceTime;
    this.serverFinish[path] = entity.serviceEnd;
  }

  private completeService(path: 0|1|2) {
    const entityId = this.serverEntity[path];
    if (!entityId) return;
    const entity = this.entities.find(e => e.id === entityId);
    if (!entity) return;

    entity.stage = 'conveyor_out';
    entity.conveyorProgress = 0;
    this.serverEntity[path] = null;
    this.state.resourceUsed = Math.max(0, this.state.resourceUsed - 1);
    this.state.resourceAvailable = this.params.resourceCapacity - this.state.resourceUsed;
    this.state.paths[path].entitiesProcessed++;

    // Update avg service time
    const st = entity.serviceEnd! - entity.serviceStart!;
    const n = this.state.paths[path].entitiesProcessed;
    this.state.paths[path].avgServiceTime =
      (this.state.paths[path].avgServiceTime * (n - 1) + st) / n;
  }

  private updateEntities(dt: number) {
    const toRemove: string[] = [];

    for (const entity of this.entities) {
      if (entity.stage === 'conveyor_in') {
        entity.conveyorProgress += entity.conveyorSpeed * dt;
        if (entity.conveyorProgress >= 1) {
          // Check queue capacity
          const queueMax = [this.params.queueMax1, this.params.queueMax2, this.params.queueMax3];
          const currentQ = this.entities.filter(e => e.path === entity.path && e.stage === 'queue').length;
          if (currentQ < queueMax[entity.path]) {
            entity.stage = 'queue';
            entity.conveyorProgress = 0;
          } else {
            // Queue full - wait at conveyor end
            entity.conveyorProgress = 0.99;
          }
        }
      } else if (entity.stage === 'conveyor_out') {
        entity.conveyorProgress += entity.conveyorSpeed * dt;
        if (entity.conveyorProgress >= 1) {
          entity.stage = 'sink';
          toRemove.push(entity.id);
          this.state.totalSinked++;
          this.state.pathThroughput[entity.path]++;
        }
      }
    }

    this.entities = this.entities.filter(e => !toRemove.includes(e.id));
  }

  private updateStateFromEntities() {
    for (let p = 0; p < 3; p++) {
      const pathEntities = this.entities.filter(e => e.path === p);
      const queueEntities = pathEntities.filter(e => e.stage === 'queue');
      const conveyorInEntities = pathEntities.filter(e => e.stage === 'conveyor_in');
      const conveyorOutEntities = pathEntities.filter(e => e.stage === 'conveyor_out');
      const serverEntity = pathEntities.find(e => e.stage === 'server');

      this.state.paths[p].queueLength = queueEntities.length;
      this.state.paths[p].serverBusy = serverEntity !== undefined;

      // Conveyor entities for 3D visualization
      this.state.paths[p].conveyorEntities = [
        ...conveyorInEntities.map(e => ({
          id: e.id,
          progress: e.conveyorProgress,
          stage: 'in' as const,
          color: ['#00d4ff', '#00ff88', '#ff6b35'][p],
        })),
        ...conveyorOutEntities.map(e => ({
          id: e.id,
          progress: e.conveyorProgress,
          stage: 'out' as const,
          color: ['#00d4ff', '#00ff88', '#ff6b35'][p],
        })),
        ...(serverEntity ? [{
          id: serverEntity.id,
          progress: serverEntity.serviceEnd && serverEntity.serviceStart
            ? (this.state.time - serverEntity.serviceStart) / (serverEntity.serviceEnd - serverEntity.serviceStart)
            : 0,
          stage: 'server' as const,
          color: ['#00d4ff', '#00ff88', '#ff6b35'][p],
        }] : []),
      ];

      this.state.paths[p].waitingEntities = queueEntities.map((e, i) => ({
        id: e.id,
        position: i,
      }));

      // Utilization
      const totalTime = this.state.time;
      if (totalTime > 0) {
        const means = [this.params.serviceMean1, this.params.serviceMean2, this.params.serviceMean3];
        const arrivalRate = 1 / ((this.params.arrivalRate1 + this.params.arrivalRate2) / 2);
        const utilization = Math.min(0.99, (arrivalRate * means[p]) / 3);
        this.state.paths[p].serverUtilization = Math.round(utilization * 100);
      }
    }
  }

  // Run prediction with different params
  runPrediction(newParams: Partial<SimParams>, durationMinutes = 480): {
    avgQueueLengths: [number, number, number];
    totalThroughput: number;
    pathThroughputs: [number, number, number];
    resourceUtilization: number;
    bottleneck: number;
  } {
    const params = { ...this.params, ...newParams };
    const sim = new FactorySimulation(params);
    
    // Fast-forward simulation
    const steps = 2000;
    const dt = durationMinutes / steps;
    for (let i = 0; i < steps; i++) {
      sim['step'](dt);
    }

    const s = sim.getState();
    const avgQ: [number, number, number] = [
      s.paths[0].queueLength,
      s.paths[1].queueLength,
      s.paths[2].queueLength,
    ];
    const bottleneck = avgQ.indexOf(Math.max(...avgQ));

    return {
      avgQueueLengths: avgQ,
      totalThroughput: s.totalSinked,
      pathThroughputs: s.pathThroughput,
      resourceUtilization: Math.round((s.resourceUsed / params.resourceCapacity) * 100),
      bottleneck,
    };
  }
}

export const defaultParams: SimParams = {
  arrivalRate1: 2,
  arrivalRate2: 2,
  serviceMean1: 20,
  serviceStd1: 4,
  serviceMean2: 15,
  serviceStd2: 3,
  serviceMean3: 18,
  serviceStd3: 3,
  queueMax1: 10,
  queueMax2: 10,
  queueMax3: 10,
  resourceCapacity: 40,
  routeProb1: 0.33,
  routeProb2: 0.33,
  routeProb3: 0.34,
  simSpeed: 5,
  pathEnabled: [true, true, true],
};
