export interface BeatNote {
  time: number;       // seconds from start
  pitch: number;      // MIDI pitch (60 = C4), controls horizontal position
  duration: number;   // note duration in seconds
  lyric?: string;     // optional lyric text
}

export interface BoardData {
  position: THREE.Vector3;
  rotation: number;   // angle in radians
  width: number;
  height: number;
  note: BeatNote;
  index: number;
}

import type * as THREE from 'three';
