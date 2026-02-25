import * as THREE from 'three';
import { BoardData } from './types';

interface LyricSprite {
  mesh: THREE.Sprite;
  targetOpacity: number;
  currentOpacity: number;
}

export class LyricsManager {
  sprites: Map<number, LyricSprite> = new Map();
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  createLyrics(boards: BoardData[]) {
    // Clean up old sprites
    for (const [, sprite] of this.sprites) {
      this.scene.remove(sprite.mesh);
    }
    this.sprites.clear();

    for (const board of boards) {
      if (!board.note.lyric) continue;

      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 128;
      const ctx = canvas.getContext('2d')!;

      ctx.clearRect(0, 0, 256, 128);
      ctx.font = 'bold 64px "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Glow effect
      ctx.shadowColor = '#c084fc';
      ctx.shadowBlur = 20;
      ctx.fillStyle = '#ffffff';
      ctx.fillText(board.note.lyric, 128, 64);

      const texture = new THREE.CanvasTexture(canvas);
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(
        board.position.x + board.width * 0.8,
        board.position.y + 0.8,
        0.5
      );
      sprite.scale.set(2, 1, 1);
      this.scene.add(sprite);

      this.sprites.set(board.index, {
        mesh: sprite,
        targetOpacity: 0,
        currentOpacity: 0,
      });
    }
  }

  activate(boardIndex: number) {
    const sprite = this.sprites.get(boardIndex);
    if (sprite) {
      sprite.targetOpacity = 1.0;
    }
  }

  update(dt: number) {
    for (const [, sprite] of this.sprites) {
      // Fade in quickly, fade out slowly
      if (sprite.targetOpacity > sprite.currentOpacity) {
        sprite.currentOpacity = Math.min(1, sprite.currentOpacity + dt * 4);
      } else {
        sprite.currentOpacity = Math.max(0, sprite.currentOpacity - dt * 0.3);
        sprite.targetOpacity = Math.max(0, sprite.targetOpacity - dt * 0.3);
      }
      (sprite.mesh.material as THREE.SpriteMaterial).opacity = sprite.currentOpacity;
    }
  }

  reset() {
    for (const [, sprite] of this.sprites) {
      sprite.targetOpacity = 0;
      sprite.currentOpacity = 0;
      (sprite.mesh.material as THREE.SpriteMaterial).opacity = 0;
    }
  }
}
