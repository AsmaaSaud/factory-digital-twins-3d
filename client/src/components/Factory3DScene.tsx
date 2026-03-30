// =============================================================
// Factory3DScene - Three.js 3D Factory Visualization
// Design: Industrial Control Room - Neon Factory HUD
// 3 parallel production lines with animated entities
// Camera: Full Orbit Controls (drag=rotate, scroll=zoom, right-drag=pan)
// =============================================================

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { SimState } from '@/lib/simulationEngine';

interface Factory3DSceneProps {
  simState: SimState;
  width?: number;
  height?: number;
  onCameraReset?: () => void;
}

const PATH_COLORS = [0x00d4ff, 0x00ff88, 0xff6b35];
const PATH_Z = [-6, 0, 6];

// ---- Minimal Orbit Controls (no external dep) ----
class SimpleOrbitControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  target = new THREE.Vector3(0, 0, 0);

  private _spherical = { theta: 0, phi: Math.PI / 3.5, radius: 36 };
  private _isDragging = false;
  private _isRightDragging = false;
  private _lastMouse = { x: 0, y: 0 };
  private _listeners: (() => void)[] = [];

  // Limits
  minRadius = 8;
  maxRadius = 80;
  minPhi = 0.15;
  maxPhi = Math.PI / 2.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this._init();
    this._updateCamera();
  }

  private _init() {
    const onMouseDown = (e: MouseEvent) => {
      if (e.button === 0) this._isDragging = true;
      if (e.button === 2) this._isRightDragging = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      this._lastMouse = { x: e.clientX, y: e.clientY };

      if (this._isDragging) {
        this._spherical.theta -= dx * 0.008;
        this._spherical.phi = Math.max(
          this.minPhi,
          Math.min(this.maxPhi, this._spherical.phi + dy * 0.008)
        );
        this._updateCamera();
      }
      if (this._isRightDragging) {
        // Pan
        const panSpeed = this._spherical.radius * 0.001;
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        this.camera.getWorldDirection(new THREE.Vector3());
        right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), this.camera.up).normalize();
        up.copy(this.camera.up);
        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(up, dy * panSpeed);
        this._updateCamera();
      }
    };
    const onMouseUp = () => {
      this._isDragging = false;
      this._isRightDragging = false;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      this._spherical.radius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, this._spherical.radius + e.deltaY * 0.05)
      );
      this._updateCamera();
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    // Touch support
    let lastTouchDist = 0;
    let lastTouchX = 0;
    let lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        this._isDragging = true;
      } else if (e.touches.length === 2) {
        this._isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1 && this._isDragging) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX;
        lastTouchY = e.touches[0].clientY;
        this._spherical.theta -= dx * 0.008;
        this._spherical.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this._spherical.phi + dy * 0.008));
        this._updateCamera();
      } else if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        this._spherical.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this._spherical.radius - (dist - lastTouchDist) * 0.1));
        lastTouchDist = dist;
        this._updateCamera();
      }
    };
    const onTouchEnd = () => { this._isDragging = false; };

    this.domElement.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    this.domElement.addEventListener('wheel', onWheel, { passive: false });
    this.domElement.addEventListener('contextmenu', onContextMenu);
    this.domElement.addEventListener('touchstart', onTouchStart, { passive: false });
    this.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    this.domElement.addEventListener('touchend', onTouchEnd);

    this._listeners = [
      () => this.domElement.removeEventListener('mousedown', onMouseDown),
      () => window.removeEventListener('mousemove', onMouseMove),
      () => window.removeEventListener('mouseup', onMouseUp),
      () => this.domElement.removeEventListener('wheel', onWheel),
      () => this.domElement.removeEventListener('contextmenu', onContextMenu),
      () => this.domElement.removeEventListener('touchstart', onTouchStart),
      () => this.domElement.removeEventListener('touchmove', onTouchMove),
      () => this.domElement.removeEventListener('touchend', onTouchEnd),
    ];
  }

  _updateCamera() {
    const { theta, phi, radius } = this._spherical;
    const x = this.target.x + radius * Math.sin(phi) * Math.sin(theta);
    const y = this.target.y + radius * Math.cos(phi);
    const z = this.target.z + radius * Math.sin(phi) * Math.cos(theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.target);
  }

  resetView() {
    this._spherical = { theta: 0, phi: Math.PI / 3.5, radius: 36 };
    this.target.set(0, 0, 0);
    this._updateCamera();
  }

  setView(preset: 'top' | 'front' | 'iso' | 'side') {
    if (preset === 'top') {
      this._spherical = { theta: 0, phi: 0.16, radius: 40 };
    } else if (preset === 'front') {
      this._spherical = { theta: 0, phi: Math.PI / 2.05, radius: 30 };
    } else if (preset === 'iso') {
      this._spherical = { theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 36 };
    } else if (preset === 'side') {
      this._spherical = { theta: Math.PI / 2, phi: Math.PI / 3, radius: 32 };
    }
    this.target.set(0, 0, 0);
    this._updateCamera();
  }

  dispose() {
    this._listeners.forEach(fn => fn());
  }
}

export default function Factory3DScene({ simState, width, height }: Factory3DSceneProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: SimpleOrbitControls;
    animId: number;
    entityMeshes: Map<string, THREE.Mesh>;
    pathGroups: THREE.Group[];
    serverGlows: THREE.PointLight[];
    clock: THREE.Clock;
  } | null>(null);

  const buildScene = useCallback(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 500;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x0a0e1a, 1);
    mount.appendChild(renderer.domElement);

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, 22, 28);
    camera.lookAt(0, 0, 0);

    // Orbit Controls
    const controls = new SimpleOrbitControls(camera, renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2540, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // === FACTORY FLOOR ===
    const floorGeo = new THREE.PlaneGeometry(40, 20);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x0d1525, roughness: 0.9, metalness: 0.1 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);

    const gridHelper = new THREE.GridHelper(40, 20, 0x1e2d4a, 0x1a2540);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x0d1525, roughness: 1 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(40, 8), wallMat);
    backWall.position.set(0, 3.5, -10);
    scene.add(backWall);

    // === PATH GROUPS ===
    const pathGroups: THREE.Group[] = [];
    const serverGlows: THREE.PointLight[] = [];

    PATH_Z.forEach((z, pathIdx) => {
      const group = new THREE.Group();
      group.position.z = z;
      scene.add(group);
      pathGroups.push(group);

      const color = PATH_COLORS[pathIdx];
      const colorHex = new THREE.Color(color);

      buildConveyor(group, -14, -4, 0, colorHex, 0.3);
      buildStation(group, -2, 0, color, 'Q' + (pathIdx + 1), 0.8, 0.8, 0.6);
      buildStation(group, 1, 0, color, 'SZ', 0.8, 0.8, 0.6);
      buildMachine(group, 4.5, 0, color, pathIdx + 1);
      buildConveyor(group, 7, 14, 0, colorHex, 0.3);
      buildStation(group, 14.5, 0, color, 'R' + (pathIdx + 1), 0.8, 0.8, 0.6);

      const glow = new THREE.PointLight(color, 0, 4);
      glow.position.set(4.5, 1.5, 0);
      group.add(glow);
      serverGlows.push(glow);
    });

    buildGenerator(scene, -17, 0, 0);
    buildBranch(scene, -15.5, 0, 0);
    buildSink(scene, 17, 0, 0);
    buildResourcePool(scene, 0, 0, -8);

    for (let i = -12; i <= 12; i += 6) {
      const ceilingLight = new THREE.PointLight(0x334466, 0.5, 15);
      ceilingLight.position.set(i, 8, 0);
      scene.add(ceilingLight);
    }

    const clock = new THREE.Clock();
    const entityMeshes = new Map<string, THREE.Mesh>();

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      pathGroups.forEach((group, idx) => {
        group.position.y = Math.sin(elapsed * 0.5 + idx) * 0.02;
      });
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, controls, animId, entityMeshes, pathGroups, serverGlows, clock };
  }, []);

  // Camera preset buttons handler (exposed via DOM events)
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (!sceneRef.current) return;
      const { controls } = sceneRef.current;
      if (e.detail === 'reset') controls.resetView();
      else controls.setView(e.detail);
    };
    window.addEventListener('factory-camera' as any, handler as any);
    return () => window.removeEventListener('factory-camera' as any, handler as any);
  }, []);

  // Update scene based on simState
  useEffect(() => {
    if (!sceneRef.current) return;
    const { scene, entityMeshes, serverGlows } = sceneRef.current;

    simState.paths.forEach((path, idx) => {
      if (serverGlows[idx]) {
        const targetIntensity = path.serverBusy ? 3 : 0.2;
        serverGlows[idx].intensity += (targetIntensity - serverGlows[idx].intensity) * 0.1;
      }
    });

    const currentEntityIds = new Set<string>();

    simState.paths.forEach((path, pathIdx) => {
      const z = PATH_Z[pathIdx];
      const color = new THREE.Color(PATH_COLORS[pathIdx]);

      path.conveyorEntities.forEach(entity => {
        currentEntityIds.add(entity.id);
        let mesh = entityMeshes.get(entity.id);
        if (!mesh) {
          const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
          const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.7 });
          mesh = new THREE.Mesh(geo, mat);
          mesh.castShadow = true;
          scene.add(mesh);
          entityMeshes.set(entity.id, mesh);
        }
        let x = 0, y = 0.1;
        if (entity.stage === 'in') x = -14 + entity.progress * 10;
        else if (entity.stage === 'server') { x = 4.5; y = 0.5 + entity.progress * 0.3; }
        else if (entity.stage === 'out') x = 7 + entity.progress * 7;
        mesh.position.set(x, y, z);
        mesh.rotation.y += 0.02;
        mesh.visible = true;
      });

      path.waitingEntities.forEach(entity => {
        currentEntityIds.add(entity.id);
        let mesh = entityMeshes.get(entity.id);
        if (!mesh) {
          const geo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
          const mat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.2, roughness: 0.5, metalness: 0.5 });
          mesh = new THREE.Mesh(geo, mat);
          scene.add(mesh);
          entityMeshes.set(entity.id, mesh);
        }
        const queueX = -2 + (entity.position % 3) * 0.5;
        const queueY = 0.1 + Math.floor(entity.position / 3) * 0.5;
        mesh.position.set(queueX, queueY, z + (entity.position % 2) * 0.3 - 0.15);
        mesh.visible = true;
      });
    });

    entityMeshes.forEach((mesh, id) => {
      if (!currentEntityIds.has(id)) {
        scene.remove(mesh);
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        entityMeshes.delete(id);
      }
    });
  }, [simState]);

  // Handle resize
  useEffect(() => {
    if (!sceneRef.current || !mountRef.current) return;
    const { renderer, camera } = sceneRef.current;
    const w = mountRef.current.clientWidth;
    const h = mountRef.current.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }, [width, height]);

  useEffect(() => {
    buildScene();
    return () => {
      if (sceneRef.current) {
        cancelAnimationFrame(sceneRef.current.animId);
        sceneRef.current.controls.dispose();
        sceneRef.current.renderer.dispose();
        if (mountRef.current && sceneRef.current.renderer.domElement.parentNode === mountRef.current) {
          mountRef.current.removeChild(sceneRef.current.renderer.domElement);
        }
        sceneRef.current = null;
      }
    };
  }, [buildScene]);

  return (
    <div ref={mountRef} style={{ width: '100%', height: '100%', position: 'relative', cursor: 'grab' }} />
  );
}

// ============ Helper builders ============

function buildConveyor(group: THREE.Group, xStart: number, xEnd: number, yOffset: number, color: THREE.Color, opacity: number) {
  const length = xEnd - xStart;
  const beltGeo = new THREE.BoxGeometry(length, 0.15, 1.2);
  const beltMat = new THREE.MeshStandardMaterial({ color: 0x1a2540, roughness: 0.8, metalness: 0.3 });
  const belt = new THREE.Mesh(beltGeo, beltMat);
  belt.position.set(xStart + length / 2, yOffset - 0.3, 0);
  belt.receiveShadow = true;
  group.add(belt);

  const railGeo = new THREE.BoxGeometry(length, 0.1, 0.08);
  const railMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 });
  [-0.6, 0.6].forEach(zOff => {
    const rail = new THREE.Mesh(railGeo, railMat);
    rail.position.set(xStart + length / 2, yOffset - 0.22, zOff);
    group.add(rail);
  });

  const rollerCount = Math.floor(length / 1.5);
  for (let i = 0; i <= rollerCount; i++) {
    const rollerGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8);
    const rollerMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.8, roughness: 0.2 });
    const roller = new THREE.Mesh(rollerGeo, rollerMat);
    roller.rotation.x = Math.PI / 2;
    roller.position.set(xStart + (i / rollerCount) * length, yOffset - 0.25, 0);
    group.add(roller);
  }
}

function buildStation(group: THREE.Group, x: number, yOffset: number, color: number, label: string, w: number, d: number, h: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: new THREE.Color(color), emissiveIntensity: 0.15, roughness: 0.4, metalness: 0.6 });
  const box = new THREE.Mesh(geo, mat);
  box.position.set(x, yOffset + h / 2, 0);
  box.castShadow = true;
  group.add(box);
  const edges = new THREE.EdgesGeometry(geo);
  const lineMat = new THREE.LineBasicMaterial({ color, linewidth: 1 });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.copy(box.position);
  group.add(wireframe);
}

function buildMachine(group: THREE.Group, x: number, yOffset: number, color: number, pathNum: number) {
  const bodyGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: new THREE.Color(color), emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(x, yOffset + 0.7, 0);
  body.castShadow = true;
  group.add(body);

  const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 1 });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(x, yOffset + 1.55, 0);
  group.add(light);

  const edges = new THREE.EdgesGeometry(bodyGeo);
  const lineMat = new THREE.LineBasicMaterial({ color });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.copy(body.position);
  group.add(wireframe);

  const pipeGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
  const pipeMat = new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.9, roughness: 0.1 });
  const pipe = new THREE.Mesh(pipeGeo, pipeMat);
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(x, yOffset + 1.1, 0.7);
  group.add(pipe);
}

function buildGenerator(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a2540, emissive: 0x334466, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.8 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.6, z);
  mesh.castShadow = true;
  scene.add(mesh);
  const glowLight = new THREE.PointLight(0x4488ff, 1.5, 5);
  glowLight.position.set(x, y + 1.5, z);
  scene.add(glowLight);
  const ringGeo = new THREE.TorusGeometry(0.9, 0.06, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.8 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, y + 0.6, z);
  scene.add(ring);
}

function buildBranch(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.OctahedronGeometry(0.7);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a3060, emissive: 0x2244aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.9 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.7, z);
  mesh.rotation.y = Math.PI / 4;
  scene.add(mesh);
  const edges = new THREE.EdgesGeometry(geo);
  const lineMat = new THREE.LineBasicMaterial({ color: 0x4488ff });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.copy(mesh.position);
  wireframe.rotation.copy(mesh.rotation);
  scene.add(wireframe);
}

function buildSink(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.CylinderGeometry(0.6, 0.8, 1.0, 12);
  const mat = new THREE.MeshStandardMaterial({ color: 0x1a1040, emissive: 0xff3366, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.7 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.5, z);
  scene.add(mesh);
  const glowLight = new THREE.PointLight(0xff3366, 1.5, 5);
  glowLight.position.set(x, y + 1.5, z);
  scene.add(glowLight);
}

function buildResourcePool(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(3, 0.8, 1.5);
  const mat = new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: 0xffd700, emissiveIntensity: 0.2, roughness: 0.4, metalness: 0.6 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y + 0.4, z);
  scene.add(mesh);
  const edges = new THREE.EdgesGeometry(geo);
  const lineMat = new THREE.LineBasicMaterial({ color: 0xffd700 });
  const wireframe = new THREE.LineSegments(edges, lineMat);
  wireframe.position.copy(mesh.position);
  scene.add(wireframe);
  const glowLight = new THREE.PointLight(0xffd700, 0.8, 6);
  glowLight.position.set(x, y + 2, z);
  scene.add(glowLight);
}
