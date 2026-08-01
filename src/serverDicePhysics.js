import * as CANNON from 'cannon-es';
import { BOUNDARY_MODES, DiceBoardPhysics } from './DiceBoardPhysics.js';
import { getDieValueFromQuaternion } from './diceFace.js';

export const SERVER_DICE_PHYSICS_VERSION = 1;

const SCALE = 0.25;
const DIE_SIZE = 1.62;
const DIE_HALF_SIZE = DIE_SIZE / 2;
const STEP_SECONDS = 1 / 60;
const MAX_STEPS = 210;
const SAMPLE_EVERY_STEPS = 6;
const STABLE_SPEED_SQ = 0.1;
const STABLE_CHECKS = 3;

const scaleObject = (object) => Object.fromEntries(Object.entries(object).map(([key, value]) => [key, value * SCALE]));
const SERVER_LAYOUT = Object.freeze({
  scale: SCALE,
  playSurfaceY: -10.283531188964844 * SCALE,
  floorY: -10.283531188964844 * SCALE,
  playBounds: scaleObject({ minX: -52, maxX: 52, minZ: -35, maxZ: 55 }),
  outerBounds: scaleObject({ minX: -77.5, maxX: 77.5, minZ: -77.5, maxZ: 77.5 }),
  entryEdgeZ: 55 * SCALE,
  launchOriginZ: (77.5 + 32) * SCALE,
  rimTopY: 24 * SCALE,
  collisionProfile: {
    bounds: scaleObject({ minX: -58, maxX: 58, minZ: -35, maxZ: 58 }),
    floor: scaleObject({ minX: -58, maxX: 58, minZ: -35, maxZ: 58, y: -10.283531188964844 }),
    ramps: [],
    wallBottoms: scaleObject({ minX: -10.283531188964844, maxX: -10.283531188964844, minZ: -10.283531188964844, maxZ: -10.283531188964844 })
  }
});

function createRandom(seed) {
  let state = 2166136261;
  for (const char of String(seed)) state = Math.imul(state ^ char.charCodeAt(0), 16777619) >>> 0;
  return () => {
    state = (Math.imul(state || 1, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function supportHeight(config) {
  return config.type === 'octahedron' ? 1.125 : DIE_HALF_SIZE;
}

function createShape(config) {
  if (config.type !== 'octahedron') return new CANNON.Box(new CANNON.Vec3(DIE_HALF_SIZE, DIE_HALF_SIZE, DIE_HALF_SIZE));
  const radius = 1.125;
  return new CANNON.ConvexPolyhedron({
    vertices: [
      new CANNON.Vec3(radius, 0, 0), new CANNON.Vec3(-radius, 0, 0),
      new CANNON.Vec3(0, radius, 0), new CANNON.Vec3(0, -radius, 0),
      new CANNON.Vec3(0, 0, radius), new CANNON.Vec3(0, 0, -radius)
    ],
    faces: [[0, 2, 4], [0, 4, 3], [0, 3, 5], [0, 5, 2], [1, 4, 2], [1, 3, 4], [1, 5, 3], [1, 2, 5]]
  });
}

function createLaunch(config, index, count, random, gravity) {
  const height = supportHeight(config);
  const centerIndex = index - (count - 1) / 2;
  const rowOffset = index % 2;
  const startX = centerIndex * 2 + (random() - 0.5) * 0.18;
  const startZ = SERVER_LAYOUT.launchOriginZ + rowOffset * 2;
  const startY = SERVER_LAYOUT.playSurfaceY + height + 1.4 + rowOffset * 0.25;
  const targetX = Math.max(SERVER_LAYOUT.playBounds.minX + height, Math.min(SERVER_LAYOUT.playBounds.maxX - height, centerIndex * 1.15 + (random() - 0.5) * 0.65));
  const targetZ = (SERVER_LAYOUT.playBounds.minZ + SERVER_LAYOUT.playBounds.maxZ) / 2 + (random() - 0.5) * 1.1;
  const landingY = SERVER_LAYOUT.playSurfaceY + height + 0.12;
  const travelTime = 0.31 + random() * 0.05 + rowOffset * 0.02;
  const velocityZ = (targetZ - startZ) / travelTime;
  const rimTime = Math.max(0.01, (SERVER_LAYOUT.outerBounds.maxZ - startZ) / velocityZ);
  const landingVelocityY = (landingY - startY + 0.5 * gravity * travelTime ** 2) / travelTime;
  const rimClearanceY = SERVER_LAYOUT.rimTopY + height + 0.3;
  const rimVelocityY = (rimClearanceY - startY + 0.5 * gravity * rimTime ** 2) / rimTime;
  return {
    position: new CANNON.Vec3(startX, startY, startZ),
    velocity: new CANNON.Vec3((targetX - startX) / travelTime, Math.max(landingVelocityY, rimVelocityY), velocityZ),
    angularVelocity: new CANNON.Vec3((random() - 0.5) * 36, (random() - 0.5) * 36, (random() - 0.5) * 36),
    targetZ
  };
}

function frame(body, t) {
  return [t, body.position.x, body.position.y, body.position.z, body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w]
    .map((value, index) => index === 0 ? value : Math.round(value * 100000) / 100000);
}

export function simulateServerRoll({ seed, dice, mode = 'normal' }) {
  if (!seed || !Array.isArray(dice) || dice.length < 1 || dice.length > 6) throw new Error('INVALID_SERVER_ROLL_INPUT');
  const random = createRandom(seed);
  const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -72, 0) });
  world.broadphase = new CANNON.NaiveBroadphase();
  world.allowSleep = true;
  world.quatNormalizeSkip = 0;
  world.solver.iterations = 7;
  const material = new CANNON.Material('default');
  world.defaultMaterial = material;
  world.addContactMaterial(new CANNON.ContactMaterial(material, material, { friction: 0.62, restitution: 0.16 }));
  const board = new DiceBoardPhysics(world);
  const isFlip = mode === 'flip';
  board.configure(SERVER_LAYOUT, isFlip ? BOUNDARY_MODES.FLIP : BOUNDARY_MODES.INGRESS);

  const hits = [];
  let simulatedTimeMs = 0;
  const bodies = dice.map((config, index) => {
    const launch = isFlip
      ? {
          position: new CANNON.Vec3(
            Number.isFinite(Number(config.finalPosition?.x)) ? Number(config.finalPosition.x) : (index - (dice.length - 1) / 2) * 2,
            Number.isFinite(Number(config.finalPosition?.y)) ? Number(config.finalPosition.y) : SERVER_LAYOUT.floorY + supportHeight(config),
            Number.isFinite(Number(config.finalPosition?.z)) ? Number(config.finalPosition.z) : 0
          ),
          velocity: new CANNON.Vec3((random() - 0.5) * 8, 55 + random() * 10, (random() - 0.5) * 8),
          angularVelocity: new CANNON.Vec3((random() - 0.5) * 90, (random() - 0.5) * 90, (random() - 0.5) * 90),
          targetZ: null
        }
      : createLaunch(config, index, dice.length, random, 72);
    const body = new CANNON.Body({ mass: config.type === 'heavy' ? 3 : 1, shape: createShape(config), material });
    body.linearDamping = 0.14;
    body.angularDamping = 0.28;
    body.position.copy(launch.position);
    if (isFlip && config.finalQuaternion) body.quaternion.set(config.finalQuaternion.x, config.finalQuaternion.y, config.finalQuaternion.z, config.finalQuaternion.w);
    else body.quaternion.setFromEuler(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    body.velocity.copy(launch.velocity);
    body.angularVelocity.copy(launch.angularVelocity);
    body.userData = { targetZ: launch.targetZ, reachedTarget: false, stableChecks: 0 };
    body.addEventListener('collide', (event) => {
      const strength = Math.abs(event.contact.getImpactVelocityAlongNormal());
      if (strength <= 2 || simulatedTimeMs - (body.userData.lastHitAt ?? -Infinity) < 70) return;
      body.userData.lastHitAt = simulatedTimeMs;
      hits.push([Math.round(simulatedTimeMs), Math.round(strength * 100) / 100]);
    });
    world.addBody(body);
    return body;
  });
  const trajectories = dice.map(() => []);
  let ingress = !isFlip;
  let settled = false;
  let step = 0;

  const maxSteps = isFlip ? 240 : MAX_STEPS;
  for (step = 0; step < maxSteps; step++) {
    simulatedTimeMs = (step + 1) * STEP_SECONDS * 1000;
    world.step(STEP_SECONDS);
    bodies.forEach((body) => {
      if (Number.isFinite(body.userData.targetZ) && !body.userData.reachedTarget && body.velocity.z < 0 && body.position.z <= body.userData.targetZ) {
        body.velocity.x *= 0.18;
        body.velocity.z *= 0.1;
        body.userData.reachedTarget = true;
      }
    });
    if (ingress && bodies.every((body, index) => body.position.z <= SERVER_LAYOUT.entryEdgeZ - supportHeight(dice[index]) - 0.1)) {
      board.configure(SERVER_LAYOUT, BOUNDARY_MODES.NORMAL);
      ingress = false;
    }
    if (step % SAMPLE_EVERY_STEPS === 0) bodies.forEach((body, index) => trajectories[index].push(frame(body, step * STEP_SECONDS * 1000)));
    settled = bodies.every((body) => {
      const stable = body.velocity.lengthSquared() < STABLE_SPEED_SQ && body.angularVelocity.lengthSquared() < STABLE_SPEED_SQ;
      body.userData.stableChecks = stable ? body.userData.stableChecks + 1 : 0;
      return body.userData.stableChecks >= STABLE_CHECKS;
    });
    if (settled) break;
  }

  if (!settled) {
    const speeds = bodies.map((body) => [body.position.x, body.position.y, body.position.z, body.velocity.lengthSquared(), body.angularVelocity.lengthSquared()]);
    throw new Error(`SERVER_ROLL_DID_NOT_SETTLE:${JSON.stringify(speeds)}`);
  }
  const durationMs = Math.round((step + 1) * STEP_SECONDS * 1000);
  return {
    physicsVersion: SERVER_DICE_PHYSICS_VERSION,
    seed: String(seed),
    durationMs,
    scale: SCALE,
    floorY: SERVER_LAYOUT.floorY,
    hits,
    dice: dice.map((config, index) => {
      const body = bodies[index];
      const finalFrame = frame(body, durationMs);
      if (trajectories[index].at(-1)?.[0] !== durationMs) trajectories[index].push(finalFrame);
      return { id: config.id, type: config.type, promotionLevel: config.promotionLevel || 0, value: getDieValueFromQuaternion(body.quaternion, config), frames: trajectories[index], finalTransform: finalFrame.slice(1) };
    })
  };
}
