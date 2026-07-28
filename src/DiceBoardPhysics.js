import * as CANNON from 'cannon-es';

export const BOUNDARY_MODES = Object.freeze({
  NORMAL: 'normal',
  INGRESS: 'ingress',
  FLIP: 'flip'
});

const BOARD_THICKNESS = 4;
const WALL_THICKNESS = 4;
const NORMAL_WALL_HEIGHT = 22;
const NORMAL_CEILING_GAP = 20;
const INGRESS_WALL_HEIGHT = 30;
const FLIP_WALL_HEIGHT = 250;
const FLIP_CEILING_GAP = 110;
const CEILING_THICKNESS = 10;
const RUNWAY_END_PADDING = 4;

export class DiceBoardPhysics {
  constructor(world) {
    this.world = world;
    this.bodies = [];
    this.floorBody = null;
    this.mode = BOUNDARY_MODES.NORMAL;
    this.layout = null;
  }

  configure(layout, mode = this.mode) {
    if (!layout) return;

    this.clear();
    this.layout = layout;
    this.mode = mode;
    this.floorBody = this.createHorizontalPlate(
      layout.playBounds.minX,
      layout.playBounds.maxX,
      layout.playBounds.minZ,
      layout.playBounds.maxZ,
      layout.playSurfaceY,
      BOARD_THICKNESS
    );

    if (mode === BOUNDARY_MODES.INGRESS) {
      this.configureIngress(layout);
    } else if (mode === BOUNDARY_MODES.FLIP) {
      this.configureClosed(layout, FLIP_WALL_HEIGHT, FLIP_CEILING_GAP);
    } else {
      this.configureClosed(layout, NORMAL_WALL_HEIGHT, NORMAL_CEILING_GAP);
    }
  }

  configureClosed(layout, wallHeight, ceilingGap) {
    const { minX, maxX, minZ, maxZ } = layout.playBounds;
    this.createPerimeterWalls(minX, maxX, minZ, maxZ, layout.playSurfaceY, wallHeight);
    this.createCeiling(minX, maxX, minZ, maxZ, layout.playSurfaceY + ceilingGap);
  }

  configureIngress(layout) {
    const { minX, maxX, minZ, maxZ } = layout.playBounds;
    const runwayEndZ = Math.max(layout.launchOriginZ + RUNWAY_END_PADDING, maxZ + RUNWAY_END_PADDING);

    this.createHorizontalPlate(
      minX,
      maxX,
      maxZ,
      runwayEndZ,
      layout.playSurfaceY,
      BOARD_THICKNESS
    );

    const fullDepth = runwayEndZ - minZ;
    const centerZ = (minZ + runwayEndZ) / 2;
    const fullWidth = maxX - minX;
    const wallY = layout.playSurfaceY + INGRESS_WALL_HEIGHT / 2;

    this.createStaticBox(
      new CANNON.Vec3((fullWidth + WALL_THICKNESS * 2) / 2, INGRESS_WALL_HEIGHT / 2, WALL_THICKNESS / 2),
      new CANNON.Vec3((minX + maxX) / 2, wallY, minZ - WALL_THICKNESS / 2)
    );
    this.createStaticBox(
      new CANNON.Vec3((fullWidth + WALL_THICKNESS * 2) / 2, INGRESS_WALL_HEIGHT / 2, WALL_THICKNESS / 2),
      new CANNON.Vec3((minX + maxX) / 2, wallY, runwayEndZ + WALL_THICKNESS / 2)
    );
    this.createStaticBox(
      new CANNON.Vec3(WALL_THICKNESS / 2, INGRESS_WALL_HEIGHT / 2, fullDepth / 2 + WALL_THICKNESS),
      new CANNON.Vec3(minX - WALL_THICKNESS / 2, wallY, centerZ)
    );
    this.createStaticBox(
      new CANNON.Vec3(WALL_THICKNESS / 2, INGRESS_WALL_HEIGHT / 2, fullDepth / 2 + WALL_THICKNESS),
      new CANNON.Vec3(maxX + WALL_THICKNESS / 2, wallY, centerZ)
    );
  }

  createPerimeterWalls(minX, maxX, minZ, maxZ, floorY, wallHeight) {
    const fullWidth = maxX - minX;
    const fullDepth = maxZ - minZ;
    const centerX = (minX + maxX) / 2;
    const centerZ = (minZ + maxZ) / 2;
    const wallY = floorY + wallHeight / 2;

    this.createStaticBox(
      new CANNON.Vec3((fullWidth + WALL_THICKNESS * 2) / 2, wallHeight / 2, WALL_THICKNESS / 2),
      new CANNON.Vec3(centerX, wallY, minZ - WALL_THICKNESS / 2)
    );
    this.createStaticBox(
      new CANNON.Vec3((fullWidth + WALL_THICKNESS * 2) / 2, wallHeight / 2, WALL_THICKNESS / 2),
      new CANNON.Vec3(centerX, wallY, maxZ + WALL_THICKNESS / 2)
    );
    this.createStaticBox(
      new CANNON.Vec3(WALL_THICKNESS / 2, wallHeight / 2, fullDepth / 2 + WALL_THICKNESS),
      new CANNON.Vec3(minX - WALL_THICKNESS / 2, wallY, centerZ)
    );
    this.createStaticBox(
      new CANNON.Vec3(WALL_THICKNESS / 2, wallHeight / 2, fullDepth / 2 + WALL_THICKNESS),
      new CANNON.Vec3(maxX + WALL_THICKNESS / 2, wallY, centerZ)
    );
  }

  createCeiling(minX, maxX, minZ, maxZ, bottomY) {
    this.createStaticBox(
      new CANNON.Vec3((maxX - minX) / 2, CEILING_THICKNESS / 2, (maxZ - minZ) / 2),
      new CANNON.Vec3(
        (minX + maxX) / 2,
        bottomY + CEILING_THICKNESS / 2,
        (minZ + maxZ) / 2
      )
    );
  }

  createHorizontalPlate(minX, maxX, minZ, maxZ, topY, thickness) {
    return this.createStaticBox(
      new CANNON.Vec3((maxX - minX) / 2, thickness / 2, (maxZ - minZ) / 2),
      new CANNON.Vec3((minX + maxX) / 2, topY - thickness / 2, (minZ + maxZ) / 2)
    );
  }

  createStaticBox(halfExtents, position) {
    const body = new CANNON.Body({ mass: 0, shape: new CANNON.Box(halfExtents) });
    body.position.copy(position);
    this.world.addBody(body);
    this.bodies.push(body);
    return body;
  }

  clear() {
    this.bodies.forEach(body => this.world.removeBody(body));
    this.bodies = [];
    this.floorBody = null;
  }
}
