
export interface Track {
  id: string;
  name: string;
  artist: string;
  album: string;
  duration: number;
  url: string;
  file: File;
  addedAt: number;
}

export interface PlayerState {
  isPlaying: boolean;
  currentTrackIndex: number;
  volume: number;
  isMuted: boolean;
  progress: number;
  shuffle: boolean;
  repeat: 'none' | 'one' | 'all';
}
