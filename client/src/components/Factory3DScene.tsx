// Factory3DScene — Three.js 3D Factory Visualization
// Features: 3 production lines, Orbit Controls, Server Drag & Drop

import { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import type { SimState } from '@/lib/simulationEngine';

export interface ServerPos { x: number; z: number; }

interface Factory3DSceneProps {
  simState: SimState;
  width?: number;
  height?: number;
  serverPositions?: [ServerPos, ServerPos, ServerPos];
  onServerMove?: (pathIdx: number, pos: ServerPos) => void;
  pathEnabled?: [boolean, boolean, boolean];
}

const PATH_COLORS = [0x00d4ff, 0x00ff88, 0xff6b35];
const PATH_Z = [-6, 0, 6];
const DEFAULT_SERVER_X = 4.5;
const DEFAULT_SERVER_Z = 0;   // local Z offset within path group
const SERVER_MIN_X = -1;
const SERVER_MAX_X = 13;
const SERVER_MIN_Z = -3;      // left/right offset within path lane
const SERVER_MAX_Z = 3;

// ---- Minimal Orbit Controls ----
class SimpleOrbitControls {
  camera: THREE.PerspectiveCamera;
  domElement: HTMLElement;
  target = new THREE.Vector3(0, 0, 0);
  enabled = true;

  private _spherical = { theta: 0, phi: Math.PI / 3.5, radius: 36 };
  private _isDragging = false;
  private _isRightDragging = false;
  private _lastMouse = { x: 0, y: 0 };
  private _listeners: (() => void)[] = [];

  minRadius = 8; maxRadius = 80;
  minPhi = 0.15; maxPhi = Math.PI / 2.1;

  constructor(camera: THREE.PerspectiveCamera, domElement: HTMLElement) {
    this.camera = camera;
    this.domElement = domElement;
    this._init();
    this._updateCamera();
  }

  private _init() {
    const onMouseDown = (e: MouseEvent) => {
      if (!this.enabled) return;
      if (e.button === 0) this._isDragging = true;
      if (e.button === 2) this._isRightDragging = true;
      this._lastMouse = { x: e.clientX, y: e.clientY };
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!this.enabled) return;
      const dx = e.clientX - this._lastMouse.x;
      const dy = e.clientY - this._lastMouse.y;
      this._lastMouse = { x: e.clientX, y: e.clientY };
      if (this._isDragging) {
        this._spherical.theta -= dx * 0.008;
        this._spherical.phi = Math.max(this.minPhi, Math.min(this.maxPhi, this._spherical.phi + dy * 0.008));
        this._updateCamera();
      }
      if (this._isRightDragging) {
        const panSpeed = this._spherical.radius * 0.001;
        const right = new THREE.Vector3();
        right.crossVectors(this.camera.getWorldDirection(new THREE.Vector3()), this.camera.up).normalize();
        this.target.addScaledVector(right, -dx * panSpeed);
        this.target.addScaledVector(this.camera.up, dy * panSpeed);
        this._updateCamera();
      }
    };
    const onMouseUp = () => { this._isDragging = false; this._isRightDragging = false; };
    const onWheel = (e: WheelEvent) => {
      if (!this.enabled) return;
      e.preventDefault();
      this._spherical.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this._spherical.radius + e.deltaY * 0.05));
      this._updateCamera();
    };
    const onContextMenu = (e: Event) => e.preventDefault();

    let lastTouchDist = 0, lastTouchX = 0, lastTouchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (!this.enabled) return;
      if (e.touches.length === 1) { lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY; this._isDragging = true; }
      else if (e.touches.length === 2) {
        this._isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.sqrt(dx * dx + dy * dy);
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!this.enabled) return;
      e.preventDefault();
      if (e.touches.length === 1 && this._isDragging) {
        const dx = e.touches[0].clientX - lastTouchX;
        const dy = e.touches[0].clientY - lastTouchY;
        lastTouchX = e.touches[0].clientX; lastTouchY = e.touches[0].clientY;
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
    if (preset === 'top') this._spherical = { theta: 0, phi: 0.16, radius: 40 };
    else if (preset === 'front') this._spherical = { theta: 0, phi: Math.PI / 2.05, radius: 30 };
    else if (preset === 'iso') this._spherical = { theta: Math.PI / 4, phi: Math.PI / 3.5, radius: 36 };
    else if (preset === 'side') this._spherical = { theta: Math.PI / 2, phi: Math.PI / 3, radius: 32 };
    this.target.set(0, 0, 0);
    this._updateCamera();
  }

  dispose() { this._listeners.forEach(fn => fn()); }
}

export default function Factory3DScene({ simState, width, height, serverPositions, onServerMove, pathEnabled }: Factory3DSceneProps) {
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
    serverGroups: THREE.Group[];   // draggable server groups
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    clock: any;
    raycaster: THREE.Raycaster;
    dragState: {
      active: boolean;
      pathIdx: number;
      startMouseX: number;
      startServerX: number;
      dragPlane: THREE.Plane;
    } | null;
  } | null>(null);

  const onServerMoveRef = useRef(onServerMove);
  useEffect(() => { onServerMoveRef.current = onServerMove; }, [onServerMove]);

  const serverPositionsRef = useRef(serverPositions);
  useEffect(() => { serverPositionsRef.current = serverPositions; }, [serverPositions]);

  const pathEnabledRef = useRef(pathEnabled);
  useEffect(() => { pathEnabledRef.current = pathEnabled; }, [pathEnabled]);

  const buildScene = useCallback(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const w = mount.clientWidth || 800;
    const h = mount.clientHeight || 500;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setClearColor(0x07090f, 1);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0e1a, 0.015);

    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 200);
    camera.position.set(0, 22, 28);
    camera.lookAt(0, 0, 0);

    const controls = new SimpleOrbitControls(camera, renderer.domElement);
    const raycaster = new THREE.Raycaster();

    // Lighting
    scene.add(new THREE.AmbientLight(0x1a2540, 2));
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 20),
      new THREE.MeshStandardMaterial({ color: 0x0d1525, roughness: 0.9, metalness: 0.1 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    scene.add(floor);
    const gridHelper = new THREE.GridHelper(40, 20, 0x1e2d4a, 0x1a2540);
    gridHelper.position.y = -0.49;
    scene.add(gridHelper);
    const backWall = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 8),
      new THREE.MeshStandardMaterial({ color: 0x0d1525, roughness: 1 })
    );
    backWall.position.set(0, 3.5, -10);
    scene.add(backWall);

    // === PATH GROUPS ===
    const pathGroups: THREE.Group[] = [];
    const serverGlows: THREE.PointLight[] = [];
    const serverGroups: THREE.Group[] = [];

    PATH_Z.forEach((z, pathIdx) => {
      const group = new THREE.Group();
      group.position.z = z;
      scene.add(group);
      pathGroups.push(group);

      const color = PATH_COLORS[pathIdx];
      const colorHex = new THREE.Color(color);
      const initPos = serverPositionsRef.current?.[pathIdx] ?? { x: DEFAULT_SERVER_X, z: DEFAULT_SERVER_Z };

      buildConveyor(group, -14, -4, 0, colorHex, 0.3);
      buildStation(group, -2, 0, color, 'Q' + (pathIdx + 1), 0.8, 0.8, 0.6);
      buildStation(group, 1, 0, color, 'SZ', 0.8, 0.8, 0.6);

      // Server as draggable group — supports X (along path) and Z (across path)
      const serverGroup = new THREE.Group();
      serverGroup.position.set(initPos.x, 0, initPos.z);
      serverGroup.userData = { pathIdx, isDraggable: true };
      buildMachineInGroup(serverGroup, 0, 0, color, pathIdx + 1);
      group.add(serverGroup);
      serverGroups.push(serverGroup);

      buildConveyor(group, 7, 14, 0, colorHex, 0.3);
      buildStation(group, 14.5, 0, color, 'R' + (pathIdx + 1), 0.8, 0.8, 0.6);

      const glow = new THREE.PointLight(color, 0, 4);
      glow.position.set(initPos.x, 1.5, initPos.z);
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const clock = new (THREE as any).Clock();
    const entityMeshes = new Map<string, THREE.Mesh>();

    // === DRAG & DROP for Server ===
    let dragState: typeof sceneRef.current extends null ? never : NonNullable<typeof sceneRef.current>['dragState'] = null;

    // Collect all draggable meshes for hit testing
    const getDraggableMeshes = () => {
      const meshes: THREE.Mesh[] = [];
      serverGroups.forEach(sg => {
        sg.traverse(child => { if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh); });
      });
      return meshes;
    };

    const getMouseNDC = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      return new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const onDragMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const ndc = getMouseNDC(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(getDraggableMeshes(), false);
      if (hits.length === 0) return;

      // Find which server group was hit
      let hitServerGroup: THREE.Group | null = null;
      let hitPathIdx = -1;
      for (const sg of serverGroups) {
        let found = false;
        sg.traverse(child => { if (child === hits[0].object) found = true; });
        if (found) { hitServerGroup = sg; hitPathIdx = sg.userData.pathIdx; break; }
      }
      if (!hitServerGroup || hitPathIdx < 0) return;

      // Disable orbit controls while dragging
      controls.enabled = false;
      e.stopPropagation();

      // Drag plane: horizontal plane at y=0 in world space
      const dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      dragState = {
        active: true,
        pathIdx: hitPathIdx,
        startMouseX: e.clientX,
        startServerX: hitServerGroup.position.x,
        dragPlane,
      };

      // Highlight
      hitServerGroup.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.8;
        }
      });

      if (sceneRef.current) sceneRef.current.dragState = dragState;
    };

    const onDragMouseMove = (e: MouseEvent) => {
      if (!dragState?.active) return;
      const ndc = getMouseNDC(e);
      raycaster.setFromCamera(ndc, camera);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(dragState.dragPlane, intersect);

      // Project to X and Z axes (drag freely in the horizontal plane)
      const pathGroup = pathGroups[dragState.pathIdx];
      const localX = intersect.x - pathGroup.position.x;
      const localZ = intersect.z - pathGroup.position.z;
      const clampedX = Math.max(SERVER_MIN_X, Math.min(SERVER_MAX_X, localX));
      const clampedZ = Math.max(SERVER_MIN_Z, Math.min(SERVER_MAX_Z, localZ));

      const sg = serverGroups[dragState.pathIdx];
      sg.position.x = clampedX;
      sg.position.z = clampedZ;
      serverGlows[dragState.pathIdx].position.x = clampedX;
      serverGlows[dragState.pathIdx].position.z = clampedZ;

      // Update cursor
      renderer.domElement.style.cursor = 'grabbing';
    };

    const onDragMouseUp = (e: MouseEvent) => {
      if (!dragState?.active) return;
      const sg = serverGroups[dragState.pathIdx];
      const finalX = sg.position.x;

      // Reset highlight
      sg.traverse(child => {
        if ((child as THREE.Mesh).isMesh) {
          ((child as THREE.Mesh).material as THREE.MeshStandardMaterial).emissiveIntensity = 0.2;
        }
      });

      controls.enabled = true;
      renderer.domElement.style.cursor = 'grab';

      // Notify parent with both X and Z
      onServerMoveRef.current?.(dragState.pathIdx, { x: finalX, z: sg.position.z });
      dragState = null;
      if (sceneRef.current) sceneRef.current.dragState = null;
    };

    // Hover effect
    const onMouseMoveHover = (e: MouseEvent) => {
      if (dragState?.active) return;
      const ndc = getMouseNDC(e);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(getDraggableMeshes(), false);
      renderer.domElement.style.cursor = hits.length > 0 ? 'pointer' : 'grab';
    };

    renderer.domElement.addEventListener('mousedown', onDragMouseDown);
    window.addEventListener('mousemove', onDragMouseMove);
    window.addEventListener('mouseup', onDragMouseUp);
    renderer.domElement.addEventListener('mousemove', onMouseMoveHover);

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsed = clock.getElapsedTime();
      pathGroups.forEach((group, idx) => {
        group.position.y = Math.sin(elapsed * 0.5 + idx) * 0.02;
      });
      // Rotate server indicator lights
      serverGroups.forEach((sg, idx) => {
        sg.traverse(child => {
          if (child.userData.isIndicator) child.rotation.y += 0.03;
        });
      });
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = {
      renderer, scene, camera, controls, animId, entityMeshes,
      pathGroups, serverGlows, serverGroups, clock, raycaster, dragState: null,
    };

    // Cleanup drag listeners on dispose
    const origDispose = controls.dispose.bind(controls);
    controls.dispose = () => {
      origDispose();
      renderer.domElement.removeEventListener('mousedown', onDragMouseDown);
      window.removeEventListener('mousemove', onDragMouseMove);
      window.removeEventListener('mouseup', onDragMouseUp);
      renderer.domElement.removeEventListener('mousemove', onMouseMoveHover);
    };
  }, []);

  // Sync server positions (X and Z) from props
  useEffect(() => {
    if (!sceneRef.current || !serverPositions) return;
    const { serverGroups, serverGlows } = sceneRef.current;
    serverPositions.forEach((pos, i) => {
      if (serverGroups[i]) {
        serverGroups[i].position.x = pos.x;
        serverGroups[i].position.z = pos.z;
        serverGlows[i].position.x = pos.x;
        serverGlows[i].position.z = pos.z;
      }
    });
  }, [serverPositions]);

  // Dim/restore path groups when enabled state changes
  useEffect(() => {
    if (!sceneRef.current || !pathEnabled) return;
    const { pathGroups, serverGlows } = sceneRef.current;
    pathEnabled.forEach((enabled, i) => {
      const group = pathGroups[i];
      if (!group) return;
      // Traverse all meshes and lines in the path group
      group.traverse(child => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && mesh.material) {
          const mat = mesh.material as THREE.MeshStandardMaterial;
          mat.opacity = enabled ? 1.0 : 0.12;
          mat.transparent = !enabled;
        }
        const line = child as THREE.LineSegments;
        if (line.isLine && line.material) {
          const mat = line.material as THREE.LineBasicMaterial;
          mat.opacity = enabled ? 1.0 : 0.08;
          mat.transparent = !enabled;
        }
      });
      // Dim the server glow
      if (serverGlows[i]) {
        serverGlows[i].intensity = enabled ? serverGlows[i].intensity : 0;
      }
    });
  }, [pathEnabled]);

  // Camera preset buttons handler
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
    const { scene, entityMeshes, serverGlows, serverGroups } = sceneRef.current;

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
      const serverX = serverGroups[pathIdx]?.position.x ?? DEFAULT_SERVER_X;

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
        else if (entity.stage === 'server') { x = serverX; y = 0.5 + entity.progress * 0.3; }
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
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(length, 0.15, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x1a2540, roughness: 0.8, metalness: 0.3 })
  );
  belt.position.set(xStart + length / 2, yOffset - 0.3, 0);
  belt.receiveShadow = true;
  group.add(belt);

  const railMat = new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.8 });
  [-0.6, 0.6].forEach(zOff => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(length, 0.1, 0.08), railMat);
    rail.position.set(xStart + length / 2, yOffset - 0.22, zOff);
    group.add(rail);
  });

  const rollerCount = Math.floor(length / 1.5);
  for (let i = 0; i <= rollerCount; i++) {
    const roller = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.8, roughness: 0.2 })
    );
    roller.rotation.x = Math.PI / 2;
    roller.position.set(xStart + (i / rollerCount) * length, yOffset - 0.25, 0);
    group.add(roller);
  }
}

function buildStation(group: THREE.Group, x: number, yOffset: number, color: number, label: string, w: number, d: number, h: number) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const box = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: new THREE.Color(color), emissiveIntensity: 0.15, roughness: 0.4, metalness: 0.6 }));
  box.position.set(x, yOffset + h / 2, 0);
  box.castShadow = true;
  group.add(box);
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color }));
  wireframe.position.copy(box.position);
  group.add(wireframe);
}

// Build machine INSIDE a group (position relative to group origin)
function buildMachineInGroup(group: THREE.Group, x: number, yOffset: number, color: number, pathNum: number) {
  const bodyGeo = new THREE.BoxGeometry(1.8, 1.4, 1.8);
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: new THREE.Color(color), emissiveIntensity: 0.2, roughness: 0.3, metalness: 0.7 });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.set(x, yOffset + 0.7, 0);
  body.castShadow = true;
  group.add(body);

  // Indicator light on top
  const lightGeo = new THREE.SphereGeometry(0.15, 8, 8);
  const lightMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 1 });
  const light = new THREE.Mesh(lightGeo, lightMat);
  light.position.set(x, yOffset + 1.55, 0);
  light.userData.isIndicator = true;
  group.add(light);

  // Wireframe edges
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo), new THREE.LineBasicMaterial({ color }));
  wireframe.position.copy(body.position);
  group.add(wireframe);

  // Pipe detail
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a3a5a, metalness: 0.9, roughness: 0.1 })
  );
  pipe.rotation.z = Math.PI / 2;
  pipe.position.set(x, yOffset + 1.1, 0.7);
  group.add(pipe);

  // Drag handle ring (visual indicator)
  const ringGeo = new THREE.TorusGeometry(1.1, 0.05, 8, 24);
  const ringMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(color), emissive: new THREE.Color(color), emissiveIntensity: 0.6, transparent: true, opacity: 0.5 });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.set(x, yOffset + 0.05, 0);
  ring.rotation.x = Math.PI / 2;
  group.add(ring);
}

function buildGenerator(scene: THREE.Scene, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.8, 0.8, 1.2, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a2540, emissive: 0x334466, emissiveIntensity: 0.3, roughness: 0.3, metalness: 0.8 })
  );
  mesh.position.set(x, y + 0.6, z);
  mesh.castShadow = true;
  scene.add(mesh);
  const glowLight = new THREE.PointLight(0x4488ff, 1.5, 5);
  glowLight.position.set(x, y + 1.5, z);
  scene.add(glowLight);
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.9, 0.06, 8, 24),
    new THREE.MeshStandardMaterial({ color: 0x00d4ff, emissive: 0x00d4ff, emissiveIntensity: 0.8 })
  );
  ring.position.set(x, y + 0.6, z);
  scene.add(ring);
}

function buildBranch(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.OctahedronGeometry(0.7);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x1a3060, emissive: 0x2244aa, emissiveIntensity: 0.5, roughness: 0.2, metalness: 0.9 }));
  mesh.position.set(x, y + 0.7, z);
  mesh.rotation.y = Math.PI / 4;
  scene.add(mesh);
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0x4488ff }));
  wireframe.position.copy(mesh.position);
  wireframe.rotation.copy(mesh.rotation);
  scene.add(wireframe);
}

function buildSink(scene: THREE.Scene, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.6, 0.8, 1.0, 12),
    new THREE.MeshStandardMaterial({ color: 0x1a1040, emissive: 0xff3366, emissiveIntensity: 0.4, roughness: 0.3, metalness: 0.7 })
  );
  mesh.position.set(x, y + 0.5, z);
  scene.add(mesh);
  const glowLight = new THREE.PointLight(0xff3366, 1.5, 5);
  glowLight.position.set(x, y + 1.5, z);
  scene.add(glowLight);
}

function buildResourcePool(scene: THREE.Scene, x: number, y: number, z: number) {
  const geo = new THREE.BoxGeometry(3, 0.8, 1.5);
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0d1a2e, emissive: 0xffd700, emissiveIntensity: 0.2, roughness: 0.4, metalness: 0.6 }));
  mesh.position.set(x, y + 0.4, z);
  scene.add(mesh);
  const wireframe = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: 0xffd700 }));
  wireframe.position.copy(mesh.position);
  scene.add(wireframe);
  const glowLight = new THREE.PointLight(0xffd700, 0.8, 6);
  glowLight.position.set(x, y + 2, z);
  scene.add(glowLight);
}
