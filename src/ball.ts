import * as THREE from 'three';
import { BoardData } from './types';

// Pre-compute the ball path as a series of bezier segments between boards
interface PathSegment {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  controlPoint1: THREE.Vector3;
  controlPoint2: THREE.Vector3;
  startTime: number;
  endTime: number;
  boardIndex: number; // board to activate when reaching endPos
}

export class Ball {
  mesh: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: Float32Array;
  trailAlphas: Float32Array;
  trailIndex = 0;
  trailCount = 80;

  path: PathSegment[] = [];
  currentSegment = 0;
  playing = false;
  elapsed = 0;

  private trailGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    // Ball mesh - glowing sphere
    const geo = new THREE.SphereGeometry(0.3, 32, 32);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
      roughness: 0.1,
      metalness: 0.5,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.castShadow = true;
    scene.add(this.mesh);

    // Trail particles
    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailAlphas = new Float32Array(this.trailCount);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trailGeo.setAttribute('alpha', new THREE.BufferAttribute(this.trailAlphas, 1));

    const trailMat = new THREE.PointsMaterial({
      color: 0xc084fc,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.trail = new THREE.Points(this.trailGeo, trailMat);
    scene.add(this.trail);
  }

  buildPath(boards: BoardData[]) {
    this.path = [];
    if (boards.length === 0) return;

    // Starting position: above the first board
    const firstBoard = boards[0];
    const startPos = new THREE.Vector3(
      firstBoard.position.x,
      firstBoard.position.y + 6,
      0
    );

    // First segment: drop to first board
    const cp1 = new THREE.Vector3(startPos.x, startPos.y - 2, 0);
    const cp2 = new THREE.Vector3(firstBoard.position.x, firstBoard.position.y + 2, 0);
    this.path.push({
      startPos: startPos.clone(),
      endPos: firstBoard.position.clone(),
      controlPoint1: cp1,
      controlPoint2: cp2,
      startTime: 0,
      endTime: firstBoard.note.time,
      boardIndex: 0,
    });

    // Segments between boards
    for (let i = 0; i < boards.length - 1; i++) {
      const from = boards[i];
      const to = boards[i + 1];
      const dt = to.note.time - from.note.time;

      // Exit direction based on board angle
      const exitAngle = from.rotation;
      const exitSpeed = 3;
      const exitDir = new THREE.Vector3(
        Math.sin(exitAngle) * exitSpeed,
        -Math.cos(exitAngle) * exitSpeed * 0.5,
        0
      );

      const c1 = new THREE.Vector3(
        from.position.x + exitDir.x,
        from.position.y + exitDir.y - dt * 1.5,
        0
      );

      // Approach from above
      const c2 = new THREE.Vector3(
        to.position.x,
        to.position.y + Math.abs(dt) * 2,
        0
      );

      this.path.push({
        startPos: from.position.clone(),
        endPos: to.position.clone(),
        controlPoint1: c1,
        controlPoint2: c2,
        startTime: from.note.time,
        endTime: to.note.time,
        boardIndex: i + 1,
      });
    }

    // Set initial position
    this.mesh.position.copy(startPos);
    this.currentSegment = 0;
    this.elapsed = 0;

    // Initialize trail
    for (let i = 0; i < this.trailCount; i++) {
      this.trailPositions[i * 3] = startPos.x;
      this.trailPositions[i * 3 + 1] = startPos.y;
      this.trailPositions[i * 3 + 2] = startPos.z;
      this.trailAlphas[i] = 0;
    }
  }

  play() {
    this.playing = true;
    this.elapsed = -0.5; // small delay before start
    this.currentSegment = 0;
  }

  reset(boards: BoardData[]) {
    this.playing = false;
    this.elapsed = 0;
    this.currentSegment = 0;
    this.buildPath(boards);
  }

  update(dt: number): number {
    // Returns board index that was just hit, or -1
    if (!this.playing || this.path.length === 0) return -1;

    this.elapsed += dt;
    let hitBoard = -1;

    // Find current segment
    while (
      this.currentSegment < this.path.length - 1 &&
      this.elapsed >= this.path[this.currentSegment].endTime
    ) {
      hitBoard = this.path[this.currentSegment].boardIndex;
      this.currentSegment++;
    }

    const seg = this.path[this.currentSegment];
    if (!seg) return hitBoard;

    // Check if we just arrived at this segment's end
    if (this.elapsed >= seg.endTime && this.currentSegment === this.path.length - 1) {
      hitBoard = seg.boardIndex;
      this.mesh.position.copy(seg.endPos);
      this.playing = false;
    } else {
      // Interpolate along bezier
      const segDuration = seg.endTime - seg.startTime;
      const t = segDuration > 0
        ? Math.max(0, Math.min(1, (this.elapsed - seg.startTime) / segDuration))
        : 0;

      // Cubic bezier
      const pos = this.cubicBezier(seg.startPos, seg.controlPoint1, seg.controlPoint2, seg.endPos, t);
      this.mesh.position.copy(pos);
    }

    // Update trail
    this.trailPositions[this.trailIndex * 3] = this.mesh.position.x;
    this.trailPositions[this.trailIndex * 3 + 1] = this.mesh.position.y;
    this.trailPositions[this.trailIndex * 3 + 2] = this.mesh.position.z;
    this.trailAlphas[this.trailIndex] = 1.0;
    this.trailIndex = (this.trailIndex + 1) % this.trailCount;

    // Fade trail
    for (let i = 0; i < this.trailCount; i++) {
      this.trailAlphas[i] = Math.max(0, this.trailAlphas[i] - dt * 2);
    }

    this.trailGeo.attributes.position.needsUpdate = true;
    this.trailGeo.attributes.alpha.needsUpdate = true;

    return hitBoard;
  }

  private cubicBezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const u = 1 - t;
    const tt = t * t;
    const uu = u * u;
    const uuu = uu * u;
    const ttt = tt * t;

    const result = new THREE.Vector3();
    result.x = uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x;
    result.y = uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y;
    result.z = uuu * p0.z + 3 * uu * t * p1.z + 3 * u * tt * p2.z + ttt * p3.z;
    return result;
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }
}
