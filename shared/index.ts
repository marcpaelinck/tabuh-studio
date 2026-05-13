export type Pitch = 'a' | 'e' | 'i' | 'o' | 'u';
export type Octave = 'lower' | 'middle' | 'upper';
export type StrokeType = 'open' | 'mute' | 'damped';

export interface NoteObject {
  pitch: Pitch;
  octave: Octave;
  stroke: StrokeType;
  pattern?: string;
  duration: number;
}