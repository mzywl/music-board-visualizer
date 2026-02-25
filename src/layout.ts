import * as THREE from 'three';
import { BeatNote, BoardData } from './types';

// Map MIDI pitch to X position: pitch 60 = center, each semitone = 1.2 units
const PITCH_CENTER = 66;
const PITCH_SCALE = 1.2;
// Time to Y position: each second = -8 units (downward)
const TIME_SCALE = -8;
const BOARD_WIDTH_BASE = 2.5;
const BOARD_HEIGHT = 0.3;
const BOARD_DEPTH = 0.6;

export function generateLayout(beats: BeatNote[]): BoardData[] {
  const boards: BoardData[] = [];

  for (let i = 0; i < beats.length; i++) {
    const note = beats[i];
    const x = (note.pitch - PITCH_CENTER) * PITCH_SCALE;
    const y = note.time * TIME_SCALE;
    const z = 0;

    // Calculate board angle: tilt toward next board's direction
    let angle = 0;
    if (i < beats.length - 1) {
      const nextNote = beats[i + 1];
      const nextX = (nextNote.pitch - PITCH_CENTER) * PITCH_SCALE;
      const dx = nextX - x;
      // Tilt the board so the ball rolls toward the next one
      angle = Math.atan2(dx, 2) * 0.6; // dampen the angle
    }

    // Vary board width slightly based on duration
    const width = BOARD_WIDTH_BASE + note.duration * 1.5;

    boards.push({
      position: new THREE.Vector3(x, y, z),
      rotation: angle,
      width,
      height: BOARD_HEIGHT,
      note,
      index: i,
    });
  }

  return boards;
}

export { TIME_SCALE, PITCH_CENTER, PITCH_SCALE };
