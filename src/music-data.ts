import { BeatNote } from './types';

// Demo: a simple melody (C major scale up and down with some variation)
export const demoBeats: BeatNote[] = [
  { time: 0.0,  pitch: 60, duration: 0.3, lyric: '恋' },
  { time: 0.5,  pitch: 64, duration: 0.3, lyric: '如' },
  { time: 1.0,  pitch: 67, duration: 0.3 },
  { time: 1.5,  pitch: 72, duration: 0.4, lyric: '海' },
  { time: 2.0,  pitch: 69, duration: 0.3, lyric: '如' },
  { time: 2.5,  pitch: 65, duration: 0.3 },
  { time: 3.0,  pitch: 62, duration: 0.3, lyric: '飘' },
  { time: 3.5,  pitch: 67, duration: 0.4, lyric: '向' },
  { time: 4.0,  pitch: 71, duration: 0.3, lyric: '你' },
  { time: 4.5,  pitch: 64, duration: 0.3 },
  { time: 5.0,  pitch: 60, duration: 0.3, lyric: '去' },
  { time: 5.5,  pitch: 65, duration: 0.4, lyric: '作' },
  { time: 6.0,  pitch: 69, duration: 0.3, lyric: '化' },
  { time: 6.5,  pitch: 72, duration: 0.3 },
  { time: 7.0,  pitch: 67, duration: 0.4, lyric: '化' },
  { time: 7.5,  pitch: 63, duration: 0.3, lyric: '作' },
  { time: 8.0,  pitch: 60, duration: 0.3, lyric: '泥' },
  { time: 8.5,  pitch: 65, duration: 0.3 },
  { time: 9.0,  pitch: 70, duration: 0.4, lyric: '化' },
  { time: 9.5,  pitch: 74, duration: 0.3 },
];
