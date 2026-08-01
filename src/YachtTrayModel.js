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
const COLLISION_FLOOR = { minX: -50, maxX: 50, minZ: -35, maxZ: 52 };
// The actual recessed row is one D6 lower than the temporary top-edge placement.
const KEEP_LAYOUT = { startX: -44, spacing: 22, centerZ: -58 };
const REGION_EPSILON = 0.01;
const FLOOR_NORMAL_THRESHOLD = 0.7;
const CORDUROY_UV_SCALE = 1 / 100;
const MATERIAL_INDEX = { rim: 0, floor: 1, plastic: 2, stair: 3 };
const CORDUROY_TEXTURES = {
  color: 'corduroy-color.png',
  normal: 'corduroy-normal-gl.png',
  roughness: 'corduroy-roughness.png'
};
const PLASTIC_TEXTURES = {
  color: 'soft-plastic-albedo.jpg',
  normal: 'soft-plastic-normal.jpg',
  roughness: 'soft-plastic-roughness.jpg'
};

const TRAY_COLORS = {
  felt: new THREE.Color(0x6a1a2f),
  keep: new THREE.Color(0x7b2945),
  rim: new THREE.Color(0x282828)
};

function getAssetUrl() {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}models/yacht-tray.stl`;
}

function getTextureUrl(filename) {
  const baseUrl = import.meta.env.BASE_URL || '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  return `${normalizedBase}textures/tray/${filename}`;
}

async function loadTextureSet(loader, filenames) {
  const results = await Promise.allSettled(Object.values(filenames).map(filename => loader.loadAsync(getTextureUrl(filename))));
  const textures = results.filter(result => result.status === 'fulfilled').map(result => result.value);
  if (results.some(result => result.status === 'rejected')) {
    textures.forEach(texture => texture.dispose());
    return null;
  }
  textures.forEach(texture => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
  });
  textures[0].colorSpace = THREE.SRGBColorSpace;
  return { textures, maps: { color: textures[0], normal: textures[1], roughness: textures[2] } };
}

function getTrayRegion(x, y, z) {
  const isPlayRegion = x >= PLAY_BOUNDS.minX - REGION_EPSILON
    && x <= PLAY_BOUNDS.maxX + REGION_EPSILON
    && z >= PLAY_BOUNDS.minZ - REGION_EPSILON
    && z <= PLAY_BOUNDS.maxZ + REGION_EPSILON
    && y <= 3 + REGION_EPSILON;
  if (isPlayRegion) return 'play';

  const isKeepRegion = Math.abs(x) <= 55 + REGION_EPSILON
    && z < PLAY_BOUNDS.minZ + REGION_EPSILON
    && z >= -65 - REGION_EPSILON
    && y <= 13 + REGION_EPSILON;
  return isKeepRegion ? 'keep' : 'rim';
}

function getTriangleMaterialIndex(positions, normals, start) {
  const average = getter => (getter(start) + getter(start + 1) + getter(start + 2)) / 3;
  const region = getTrayRegion(
    average(index => positions.getX(index)),
    average(index => positions.getY(index)),
    average(index => positions.getZ(index))
  );
  if (region === 'keep') return MATERIAL_INDEX.stair;
  if (region !== 'play') return MATERIAL_INDEX.rim;
  const normalY = average(index => normals.getY(index));
  return Math.abs(normalY) >= FLOOR_NORMAL_THRESHOLD ? MATERIAL_INDEX.floor : MATERIAL_INDEX.rim;
}

function getProjectedUv(positions, normals, index, materialIndex) {
  const x = positions.getX(index);
  const y = positions.getY(index);
  const z = positions.getZ(index);
  if (materialIndex === MATERIAL_INDEX.floor) return [x * CORDUROY_UV_SCALE, z * CORDUROY_UV_SCALE];
  if (Math.abs(normals.getY(index)) >= FLOOR_NORMAL_THRESHOLD) return [x * CORDUROY_UV_SCALE, z * CORDUROY_UV_SCALE];
  return [
    (Math.abs(normals.getX(index)) > Math.abs(normals.getZ(index)) ? z : x) * CORDUROY_UV_SCALE,
    y * CORDUROY_UV_SCALE
  ];
}

export function prepareCorduroyGeometry(geometry) {
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const triangles = [[], [], [], []];

  for (let start = 0; start < positions.count; start += 3) {
    triangles[getTriangleMaterialIndex(positions, normals, start)].push(start);
  }

  const vertexOrder = triangles.flatMap(starts => starts.flatMap(start => [start, start + 1, start + 2]));
  for (const [name, source] of Object.entries(geometry.attributes)) {
    const values = new source.array.constructor(source.array.length);
    vertexOrder.forEach((sourceIndex, targetIndex) => {
      for (let component = 0; component < source.itemSize; component++) {
        values[targetIndex * source.itemSize + component] = source.array[sourceIndex * source.itemSize + component];
      }
    });
    geometry.setAttribute(name, new THREE.BufferAttribute(values, source.itemSize, source.normalized));
  }

  const uv = new Float32Array(positions.count * 2);
  let targetIndex = 0;
  triangles.forEach((starts, materialIndex) => {
    starts.forEach(start => {
      for (let offset = 0; offset < 3; offset++, targetIndex++) {
        const [u, v] = getProjectedUv(positions, normals, start + offset, materialIndex);
        uv[targetIndex * 2] = u;
        uv[targetIndex * 2 + 1] = v;
      }
    });
  });
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2));

  let groupStart = 0;
  const groups = triangles.map((starts, materialIndex) => {
    const group = { start: groupStart, count: starts.length * 3, materialIndex };
    groupStart += group.count;
    return group;
  });
  geometry.clearGroups();
  geometry.addGroup(0, positions.count, MATERIAL_INDEX.rim);
  geometry.userData.corduroyGroups = groups;
  return groups;
}

export class YachtTrayModel {
  constructor(scene, { onLoad, onError } = {}) {
    this.scene = scene;
    this.onLoad = onLoad;
    this.onError = onError;
    this.mesh = null;
    this.isReady = false;
    this.loadPromise = null;
    this.textures = [];
    this.isDisposed = false;
    this.corduroyMaterials = null;
    this.corduroyEnabled = true;
    this.plasticEnabled = true;
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
    prepareCorduroyGeometry(geometry);

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
      collisionProfile: this.getCollisionProfile(),
      rimTopY: geometry.boundingBox.max.y
    };
    this.scene?.add(this.mesh);
    this.isReady = true;
    this.onLoad?.();
    this.loadCorduroyMaterials();
  }

  applyVertexColors(geometry) {
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colors = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index++) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const region = getTrayRegion(x, y, z);
      const isPlayFloor = region === 'play' && Math.abs(normals.getY(index)) >= FLOOR_NORMAL_THRESHOLD;
      const color = isPlayFloor ? TRAY_COLORS.felt : TRAY_COLORS.rim;
      colors[index * 3] = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  async loadCorduroyMaterials() {
    const loader = new THREE.TextureLoader();
    const [corduroySet, plasticSet] = await Promise.all([
      loadTextureSet(loader, CORDUROY_TEXTURES),
      loadTextureSet(loader, PLASTIC_TEXTURES)
    ]);
    if (this.isDisposed) {
      [corduroySet, plasticSet].filter(Boolean).forEach(set => set.textures.forEach(texture => texture.dispose()));
      return false;
    }
    if (!corduroySet && !plasticSet) {
      console.warn('Tray texture sets failed to load; using vertex colors.');
      return false;
    }

    this.textures = [corduroySet, plasticSet].filter(Boolean).flatMap(set => set.textures);
    const baseMaterial = this.mesh.material;
    const corduroyMaterial = corduroySet
      ? new THREE.MeshStandardMaterial({
        map: corduroySet.maps.color,
        normalMap: corduroySet.maps.normal,
        roughnessMap: corduroySet.maps.roughness,
        roughness: 0.9,
        metalness: 0,
        normalScale: new THREE.Vector2(0.35, 0.35)
      })
      : baseMaterial;
    const plasticMaterial = plasticSet
      ? new THREE.MeshStandardMaterial({
        color: 0x303030,
        map: plasticSet.maps.color,
        normalMap: plasticSet.maps.normal,
        roughnessMap: plasticSet.maps.roughness,
        roughness: 0.32,
        metalness: 0,
        normalScale: new THREE.Vector2(0.2, 0.2)
      })
      : baseMaterial;
    const stairMaterial = plasticSet
      ? new THREE.MeshStandardMaterial({
        color: 0x363636,
        map: plasticSet.maps.color,
        normalMap: plasticSet.maps.normal,
        roughnessMap: plasticSet.maps.roughness,
        roughness: 0.46,
        metalness: 0,
        normalScale: new THREE.Vector2(0.2, 0.2)
      })
      : baseMaterial;
    this.mesh.material = [
      baseMaterial,
      corduroyMaterial,
      plasticMaterial,
      stairMaterial
    ];
    this.corduroyMaterials = this.mesh.material;
    this.applyMaterialGroups();
    return true;
  }

  setCorduroyEnabled(enabled) {
    this.corduroyEnabled = Boolean(enabled);
    this.applyMaterialGroups();
  }

  setPlasticEnabled(enabled) {
    this.plasticEnabled = Boolean(enabled);
    this.applyMaterialGroups();
  }

  applyMaterialGroups() {
    if (!this.mesh) return;
    const groups = this.mesh.geometry.userData.corduroyGroups;
    if (!groups) return;
    this.mesh.geometry.clearGroups();
    if (!this.corduroyMaterials || (!this.corduroyEnabled && !this.plasticEnabled)) {
      this.mesh.geometry.addGroup(0, this.mesh.geometry.getAttribute('position').count, 0);
      return;
    }
    groups.forEach(group => this.mesh.geometry.addGroup(
      group.start,
      group.count,
      group.materialIndex === MATERIAL_INDEX.floor
      ? (this.corduroyEnabled ? MATERIAL_INDEX.floor : MATERIAL_INDEX.rim)
        : (this.plasticEnabled
          ? (group.materialIndex === MATERIAL_INDEX.stair ? MATERIAL_INDEX.stair : MATERIAL_INDEX.plastic)
          : MATERIAL_INDEX.rim)
    ));
  }

  dispose() {
    this.isDisposed = true;
    this.scene?.remove(this.mesh);
    this.mesh?.geometry.dispose();
    const materials = Array.isArray(this.mesh?.material) ? this.mesh.material : [this.mesh?.material];
    new Set(materials.filter(Boolean)).forEach(material => material.dispose());
    this.textures.forEach(texture => texture.dispose());
    this.textures = [];
    this.corduroyMaterials = null;
    this.mesh = null;
    this.isReady = false;
  }

  getSurfacePoint(x, z) {
    this.mesh?.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(new THREE.Vector3(x, 120, z), new THREE.Vector3(0, -1, 0), 0, 240);
    return raycaster.intersectObject(this.mesh, false)[0]?.point ?? null;
  }

  getCollisionProfile() {
    const floorY = this.getSurfacePoint(0, 0)?.y ?? FALLBACK_PLAY_SURFACE_Y;
    const surfaceY = (x, z, fallback = floorY) => this.getSurfacePoint(x, z)?.y ?? fallback;
    const leftRimY = surfaceY(-58, 0, 15);
    const rightRimY = surfaceY(58, 0, 15);
    const frontRimY = surfaceY(0, 58, 15);

    return {
      bounds: { minX: -58, maxX: 58, minZ: COLLISION_FLOOR.minZ, maxZ: 58 },
      floor: { ...COLLISION_FLOOR, y: floorY },
      ramps: [
        { axis: 'x', from: -50, to: -58, fromY: floorY, toY: leftRimY, min: COLLISION_FLOOR.minZ, max: COLLISION_FLOOR.maxZ },
        { axis: 'x', from: 50, to: 58, fromY: floorY, toY: rightRimY, min: COLLISION_FLOOR.minZ, max: COLLISION_FLOOR.maxZ },
        { axis: 'z', from: 52, to: 58, fromY: floorY, toY: frontRimY, min: COLLISION_FLOOR.minX, max: COLLISION_FLOOR.maxX }
      ],
      wallBottoms: { minX: leftRimY, maxX: rightRimY, minZ: floorY, maxZ: frontRimY }
    };
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
    const collisionProfile = this.measuredLayout?.collisionProfile ?? {
      bounds: { minX: -58, maxX: 58, minZ: COLLISION_FLOOR.minZ, maxZ: 58 },
      floor: { ...COLLISION_FLOOR, y: FALLBACK_PLAY_SURFACE_Y },
      ramps: [],
      wallBottoms: { minX: FALLBACK_PLAY_SURFACE_Y, maxX: FALLBACK_PLAY_SURFACE_Y, minZ: FALLBACK_PLAY_SURFACE_Y, maxZ: FALLBACK_PLAY_SURFACE_Y }
    };
    const scaleValue = value => value * scale;
    const keepPoints = measuredKeepPoints.map(point => point.clone().multiplyScalar(scale));
    const playSurfaceY = measuredPlayY * scale;

    return {
      scale,
      playBounds,
      collisionProfile: {
        bounds: Object.fromEntries(Object.entries(collisionProfile.bounds).map(([key, value]) => [key, scaleValue(value)])),
        floor: Object.fromEntries(Object.entries(collisionProfile.floor).map(([key, value]) => [key, scaleValue(value)])),
        ramps: collisionProfile.ramps.map(ramp => Object.fromEntries(Object.entries(ramp).map(([key, value]) => [key, typeof value === 'number' ? scaleValue(value) : value]))),
        wallBottoms: Object.fromEntries(Object.entries(collisionProfile.wallBottoms).map(([key, value]) => [key, scaleValue(value)]))
      },
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
