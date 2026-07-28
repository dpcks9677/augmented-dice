import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';

const SOURCE_SIZE = 155;
const SOURCE_CENTER = { x: 125, y: 110 };
const SOURCE_PLAY_SURFACE_Z = 14;
const TRAY_VIEW_FILL = 0.96;
const FALLBACK_PLAY_SURFACE_Y = -10.283531188964844;
const FALLBACK_KEEP_SURFACE_Y = 13;
const FALLBACK_OUTER_BOUNDS = { minX: -77.5, maxX: 77.5, minZ: -77.5, maxZ: 77.5 };
const SOURCE_LAUNCH_PADDING = 32;
const PLAY_BOUNDS = { minX: -52, maxX: 52, minZ: -35, maxZ: 55 };
// The actual recessed row is one D6 lower than the temporary top-edge placement.
const KEEP_LAYOUT = { startX: -44, spacing: 22, centerZ: -58 };

const TRAY_COLORS = {
  felt: new THREE.Color(0x6a1a2f),
  keep: new THREE.Color(0x7b2945),
  rim: new THREE.Color(0x121212)
};

function getAssetUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}models/yacht-tray.stl`;
}

export class YachtTrayModel {
  constructor(scene, { onLoad, onError } = {}) {
    this.scene = scene;
    this.onLoad = onLoad;
    this.onError = onError;
    this.mesh = null;
    this.isReady = false;
    this.loadPromise = null;
  }

  load() {
    if (this.loadPromise) return this.loadPromise;

    this.loadPromise = new Promise(resolve => {
      new STLLoader().load(
        getAssetUrl(),
        geometry => {
          this.createMesh(geometry);
          resolve(true);
        },
        undefined,
        error => {
          this.onError?.(error);
          resolve(false);
        }
      );
    });
    return this.loadPromise;
  }

  createMesh(geometry) {
    geometry.translate(-SOURCE_CENTER.x, -SOURCE_CENTER.y, -SOURCE_PLAY_SURFACE_Z);
    geometry.rotateX(-Math.PI / 2);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    this.applyVertexColors(geometry);

    this.mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.74,
      metalness: 0.03
    }));
    this.mesh.name = 'yacht-tray';
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.updateMatrixWorld(true);
    this.measuredLayout = {
      playPoint: this.getSurfacePoint(0, 0),
      keepPoints: Array.from({ length: 5 }, (_, index) => {
        const x = KEEP_LAYOUT.startX + index * KEEP_LAYOUT.spacing;
        return this.getSurfacePoint(x, KEEP_LAYOUT.centerZ)
          ?? new THREE.Vector3(x, FALLBACK_KEEP_SURFACE_Y, KEEP_LAYOUT.centerZ);
      }),
      outerBounds: {
        minX: geometry.boundingBox.min.x,
        maxX: geometry.boundingBox.max.x,
        minZ: geometry.boundingBox.min.z,
        maxZ: geometry.boundingBox.max.z
      },
      rimTopY: geometry.boundingBox.max.y
    };
    this.scene.add(this.mesh);
    this.isReady = true;
    this.onLoad?.();
  }

  applyVertexColors(geometry) {
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const isPlaySurface = x >= PLAY_BOUNDS.minX && x <= PLAY_BOUNDS.maxX && z >= PLAY_BOUNDS.minZ && z <= PLAY_BOUNDS.maxZ && y <= 3;
      const isKeepRegion = Math.abs(x) <= 55 && z < PLAY_BOUNDS.minZ && z >= -65 && y <= 13;
      const color = isPlaySurface ? TRAY_COLORS.felt : (isKeepRegion ? TRAY_COLORS.keep : TRAY_COLORS.rim);
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  getSurfacePoint(x, z) {
    this.mesh?.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(x, 120, z), new THREE.Vector3(0, -1, 0), 0, 240);
    return raycaster.intersectObject(this.mesh, false)[0]?.point ?? null;
  }

  // Kept for DiceEngine's state contract. The unmodified STL must not be overlaid.
  setKeepZoneGlow() {}
  update() {}

  resize(viewHeight) {
    if (!this.mesh) return;
    this.mesh.scale.setScalar(this.getScale(viewHeight));
    this.mesh.updateMatrixWorld();
  }
  getLayout(viewHeight) {
    const scale = this.getScale(viewHeight);
    const measuredPlayY = this.measuredLayout?.playPoint?.y ?? FALLBACK_PLAY_SURFACE_Y;
    const measuredKeepPoints = this.measuredLayout?.keepPoints ?? Array.from(
      { length: 5 },
      (_, index) => new THREE.Vector3(
        KEEP_LAYOUT.startX + index * KEEP_LAYOUT.spacing,
        FALLBACK_KEEP_SURFACE_Y,
        KEEP_LAYOUT.centerZ
      )
    );
    const outerBounds = this.measuredLayout?.outerBounds ?? FALLBACK_OUTER_BOUNDS;
    const playBounds = {
      minX: PLAY_BOUNDS.minX * scale,
      maxX: PLAY_BOUNDS.maxX * scale,
      minZ: PLAY_BOUNDS.minZ * scale,
      maxZ: PLAY_BOUNDS.maxZ * scale
    };
    const keepPoints = measuredKeepPoints.map(point => point.clone().multiplyScalar(scale));
    const playSurfaceY = measuredPlayY * scale;

    return {
      scale,
      playBounds,
      outerBounds: {
        minX: outerBounds.minX * scale,
        maxX: outerBounds.maxX * scale,
        minZ: outerBounds.minZ * scale,
        maxZ: outerBounds.maxZ * scale
      },
      playSurfaceY,
      floorY: playSurfaceY,
      rimTopY: (this.measuredLayout?.rimTopY ?? 24) * scale,
      entryEdgeZ: playBounds.maxZ,
      launchOriginZ: (outerBounds.maxZ + SOURCE_LAUNCH_PADDING) * scale,
      activeCenterZ: (((PLAY_BOUNDS.minZ + PLAY_BOUNDS.maxZ) / 2) - 8) * scale,
      keepStartX: KEEP_LAYOUT.startX * scale,
      keepSpacing: KEEP_LAYOUT.spacing * scale,
      keepCenterZ: KEEP_LAYOUT.centerZ * scale,
      keepPoints,
      getKeepDieY: (supportHeight, slotIndex = 0) => {
        const keepSurfaceY = keepPoints[slotIndex]?.y ?? FALLBACK_KEEP_SURFACE_Y * scale;
        return keepSurfaceY + supportHeight + 0.025;
      }
    };
  }

  getScale(viewHeight) { return (viewHeight * TRAY_VIEW_FILL) / SOURCE_SIZE; }
}
