import * as THREE from 'three';

export class ParticleExplosion {
  particles: THREE.Points;
  velocities: THREE.Vector3[] = [];
  lifetimes: Float32Array;
  positions: Float32Array;
  count = 30;
  alive = false;
  age = 0;
  maxAge = 1.0;
  private geo: THREE.BufferGeometry;

  constructor(scene: THREE.Scene) {
    this.positions = new Float32Array(this.count * 3);
    this.lifetimes = new Float32Array(this.count);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.15,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(this.geo, mat);
    this.particles.visible = false;
    scene.add(this.particles);
  }

  emit(position: THREE.Vector3, color: THREE.Color) {
    this.alive = true;
    this.age = 0;
    this.particles.visible = true;
    (this.particles.material as THREE.PointsMaterial).color.copy(color);
    this.velocities = [];

    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] = position.x;
      this.positions[i * 3 + 1] = position.y;
      this.positions[i * 3 + 2] = position.z;
      this.lifetimes[i] = 1.0;

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.velocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        Math.sin(angle) * speed,
        (Math.random() - 0.5) * 2,
      ));
    }
    this.geo.attributes.position.needsUpdate = true;
  }

  update(dt: number) {
    if (!this.alive) return;
    this.age += dt;

    if (this.age >= this.maxAge) {
      this.alive = false;
      this.particles.visible = false;
      return;
    }

    for (let i = 0; i < this.count; i++) {
      this.positions[i * 3] += this.velocities[i].x * dt;
      this.positions[i * 3 + 1] += this.velocities[i].y * dt;
      this.positions[i * 3 + 2] += this.velocities[i].z * dt;
      // Slow down
      this.velocities[i].multiplyScalar(0.96);
    }

    const opacity = 1 - this.age / this.maxAge;
    (this.particles.material as THREE.PointsMaterial).opacity = opacity * 0.8;
    this.geo.attributes.position.needsUpdate = true;
  }
}

// Pool of particle explosions
export class EffectsManager {
  pool: ParticleExplosion[] = [];
  scene: THREE.Scene;

  constructor(scene: THREE.Scene, poolSize = 10) {
    this.scene = scene;
    for (let i = 0; i < poolSize; i++) {
      this.pool.push(new ParticleExplosion(scene));
    }
  }

  emit(position: THREE.Vector3, color: THREE.Color) {
    const p = this.pool.find(p => !p.alive);
    if (p) p.emit(position, color);
  }

  update(dt: number) {
    for (const p of this.pool) {
      p.update(dt);
    }
  }
}
