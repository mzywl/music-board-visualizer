import * as THREE from 'three';
import { BoardData } from './types';

const INACTIVE_COLOR = new THREE.Color(0x1a1a3e);
const GLOW_COLORS = [
  new THREE.Color(0xff6b9d), // pink
  new THREE.Color(0xc084fc), // purple
  new THREE.Color(0x67e8f9), // cyan
  new THREE.Color(0xa3e635), // lime
  new THREE.Color(0xfbbf24), // amber
  new THREE.Color(0xf87171), // red
  new THREE.Color(0x60a5fa), // blue
];

export class Board {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  data: BoardData;
  activated = false;
  glowIntensity = 0;
  targetColor: THREE.Color;
  material: THREE.MeshStandardMaterial;
  glowMaterial: THREE.MeshBasicMaterial;

  constructor(data: BoardData, scene: THREE.Scene) {
    this.data = data;
    this.targetColor = GLOW_COLORS[data.index % GLOW_COLORS.length];

    // Main board mesh
    const geo = new THREE.BoxGeometry(data.width, data.height, 0.8);
    this.material = new THREE.MeshStandardMaterial({
      color: INACTIVE_COLOR,
      roughness: 0.4,
      metalness: 0.3,
      emissive: new THREE.Color(0x000000),
      emissiveIntensity: 0,
    });
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.position.copy(data.position);
    this.mesh.rotation.z = data.rotation;
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    scene.add(this.mesh);

    // Glow plane behind the board
    const glowGeo = new THREE.PlaneGeometry(data.width + 1.2, 1.5);
    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: this.targetColor,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    });
    this.glowMesh = new THREE.Mesh(glowGeo, this.glowMaterial);
    this.glowMesh.position.copy(data.position);
    this.glowMesh.position.z = -0.5;
    this.glowMesh.rotation.z = data.rotation;
    scene.add(this.glowMesh);
  }

  activate() {
    this.activated = true;
    this.glowIntensity = 1.0;
  }

  update(dt: number) {
    if (this.activated) {
      // Fade glow over time
      this.glowIntensity = Math.max(0, this.glowIntensity - dt * 0.4);

      const t = this.glowIntensity;
      this.material.color.copy(INACTIVE_COLOR).lerp(this.targetColor, t);
      this.material.emissive.copy(this.targetColor);
      this.material.emissiveIntensity = t * 0.8;
      this.glowMaterial.opacity = t * 0.5;
    }
  }
}
