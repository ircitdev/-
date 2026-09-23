export interface VoiceSegment {
  id: number;
  startTime: number;
  endTime: number;
  duration: number;
  text: string;
  sceneTitle: string;
  sceneVisual: string;
  cameraMovement: string;
  emotionKey: string;
  emotionDescription: string;
  sfx?: string;
  category: 'childhood' | 'motherhood' | 'sport' | 'recovery' | 'triumph' | 'present';
  audioUrl?: string;
  audioDuration?: number;
  status: 'idle' | 'generating' | 'ready' | 'error';
  error?: string;
}

export interface AudioSettings {
  voice: 'Kore' | 'Aoede' | 'Zephyr';
  pace: number; // 0.85 to 1.2
  voiceVolume: number; // 0 to 1
  bgMusicTrack: 'cinematic_piano' | 'inspirational_strings' | 'none';
  bgMusicVolume: number; // 0 to 1
  autoDucking: boolean;
  soundEffects: boolean;
}

export type TimelinePhase = 'childhood' | 'motherhood' | 'sport' | 'recovery' | 'triumph' | 'present';
