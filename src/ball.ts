import * as THREE from 'three';
import { BoardData } from './types';

interface PathSegment {
  startPos: THREE.Vector3;
  endPos: THREE.Vector3;
  cp1: THREE.Vector3;
  cp2: THREE.Vector3;
  startTime: number;
  endTime: number;
  boardIndex: number;
}

export class Ball {
  mesh: THREE.Mesh;
  trail: THREE.Points;
  trailPositions: Float32Array;
  trailIndex = 0;
  trailCount = 80;

  path: PathSegment[] = [];
  currentSegment = -1;
  playing = false;
  elapsed = 0;

  private trailGeo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
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

    // Trail
    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailGeo = new THREE.BufferGeometry();
    this.trailGeo.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));

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

    // We use our own timeline: segment 0 takes 0->0.8s, then each gap is 0.5s
    const LEAD_IN = 0.8;
    const GAP = 0.5;

    const first = boards[0];
    const startPos = new THREE.Vector3(first.position.x, first.position.y + 8, 0);

    // Segment 0: drop onto first board
    this.path.push({
      startPos: startPos.clone(),
      endPos: first.position.clone(),
      cp1: new THREE.Vector3(startPos.x, startPos.y - 3, 0),
      cp2: new THREE.Vector3(first.position.x, first.position.y + 3, 0),
      startTime: 0,
      endTime: LEAD_IN,
      boardIndex: 0,
    });

    // Segments between consecutive boards
    for (let i = 0; i < boards.length - 1; i++) {
      const from = boards[i];
      const to = boards[i + 1];
      const sTime = LEAD_IN + i * GAP;
      const eTime = LEAD_IN + (i + 1) * GAP;

      const dx = to.position.x - from.position.x;
      const dy = to.position.y - from.position.y;

      // Control points: exit along board angle, arrive from above
      const cp1 = new THREE.Vector3(
        from.position.x + dx * 0.3,
        from.position.y + Math.min(dy * 0.2, -1),
        0
      );
      const cp2 = new THREE.Vector3(
        to.position.x - dx * 0.1,
        to.position.y - dy * 0.3 + 2,
        0
      );

      this.path.push({
        startPos: from.position.clone(),
        endPos: to.position.clone(),
        cp1,
        cp2,
        startTime: sTime,
        endTime: eTime,
        boardIndex: i + 1,
      });
    }

    this.mesh.position.copy(startPos);
    this.currentSegment = 0;
    this.elapsed = 0;

    // Init trail
    for (let i = 0; i < this.trailCount; i++) {
      this.trailPositions[i * 3] = startPos.x;
      this.trailPositions[i * 3 + 1] = startPos.y;
      this.trailPositions[i * 3 + 2] = 0;
    }
  }

  getTotalDuration(): number {
    if (this.path.length === 0) return 0;
    return this.path[this.path.length - 1].endTime;
  }

  play() {
    this.playing = true;
    this.elapsed = 0;
    this.currentSegment = 0;
  }

  reset(boards: BoardData[]) {
    this.playing = false;
    this.elapsed = 0;
    this.currentSegment = 0;
    this.buildPath(boards);
  }

  update(dt: number): number {
    if (!this.playing || this.path.length === 0 || dt === 0) return -1;

    this.elapsed += dt;
    let hitBoard = -1;

    // Advance segments
    while (
      this.currentSegment < this.path.length - 1 &&
      this.elapsed >= this.path[this.currentSegment].endTime
    ) {
      hitBoard = this.path[this.currentSegment].boardIndex;
      this.currentSegment++;
    }

    const seg = this.path[this.currentSegment];
    if (!seg) return hitBoard;

    // Last segment finished
    if (this.elapsed >= seg.endTime && this.currentSegment === this.path.length - 1) {
      hitBoard = seg.boardIndex;
      this.mesh.position.copy(seg.endPos);
      this.playing = false;
    } else {
      const duration = seg.endTime - seg.startTime;
      const t = duration > 0
        ? Math.max(0, Math.min(1, (this.elapsed - seg.startTime) / duration))
        : 0;
      const pos = this.bezier(seg.startPos, seg.cp1, seg.cp2, seg.endPos, t);
      this.mesh.position.copy(pos);
    }

    // Update trail
    this.trailPositions[this.trailIndex * 3] = this.mesh.position.x;
    this.trailPositions[this.trailIndex * 3 + 1] = this.mesh.position.y;
    this.trailPositions[this.trailIndex * 3 + 2] = this.mesh.position.z;
    this.trailIndex = (this.trailIndex + 1) % this.trailCount;
    this.trailGeo.attributes.position.needsUpdate = true;

    return hitBoard;
  }

  private bezier(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, t: number): THREE.Vector3 {
    const u = 1 - t;
    return new THREE.Vector3(
      u*u*u*p0.x + 3*u*u*t*p1.x + 3*u*t*t*p2.x + t*t*t*p3.x,
      u*u*u*p0.y + 3*u*u*t*p1.y + 3*u*t*t*p2.y + t*t*t*p3.y,
      u*u*u*p0.z + 3*u*u*t*p1.z + 3*u*t*t*p2.z + t*t*t*p3.z,
    );
  }

  getPosition(): THREE.Vector3 {
    return this.mesh.position;
  }
}
