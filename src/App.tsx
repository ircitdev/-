import React, { useState, useEffect, useRef, useCallback } from 'react';
import { INITIAL_SEGMENTS } from './data/segments';
import { VoiceSegment, AudioSettings, VideoPromptDetails } from './types';
import { Header } from './components/Header';
import { VideoVisualizer } from './components/VideoVisualizer';
import { TimelineRuler } from './components/TimelineRuler';
import { AudioConsole } from './components/AudioConsole';
import { SegmentCard } from './components/SegmentCard';
import { ExportModal } from './components/ExportModal';
import { FloatingMiniPlayer } from './components/FloatingMiniPlayer';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { SceneJumpBar } from './components/SceneJumpBar';
import {
  audioBufferToWav,
  createCinematicBackingBuffer,
  playSoundFX,
  generateSRT,
  normalizeAudioVolume,
} from './utils/audioEngine';
import { fitAudioToDuration } from './utils/timeStretch';
import { generateVideoPromptWithGemini } from './utils/videoPromptService';
import { transcribeAudioFile } from './utils/sttService';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  X,
  Command,
  SlidersHorizontal,
} from 'lucide-react';

export default function App() {
  const [segments, setSegments] = useState<VoiceSegment[]>(INITIAL_SEGMENTS);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const duration = 70.0;
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGeneratingAll, setIsGeneratingAll] = useState<boolean>(false);
  const [isSnappingAll, setIsSnappingAll] = useState<boolean>(false);
  const [isGeneratingAllVideoPrompts, setIsGeneratingAllVideoPrompts] = useState<boolean>(false);
  const [playingClipId, setPlayingClipId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unvoiced' | 'ready' | 'prompted'>('all');
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [showFloatingBar, setShowFloatingBar] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [isVideoMuted, setIsVideoMuted] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<AudioSettings>({
    voice: 'Kore',
    pace: 1.0,
    voiceVolume: 0.95,
    bgMusicTrack: 'cinematic_piano',
    bgMusicVolume: 0.35,
    autoDucking: true,
    soundEffects: true,
  });

  // Audio Context & refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgMusicSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bgMusicGainRef = useRef<GainNode | null>(null);
  const activeVoiceAudiosRef = useRef<Map<number, HTMLAudioElement>>(new Map());
  const triggeredSFXRef = useRef<Set<string>>(new Set());
  const spokenSegmentsRef = useRef<Set<number>>(new Set());
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const playbackStartOffsetRef = useRef<number>(0);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  // Find active segment based on currentTime
  const activeSegment =
    segments.find((s) => currentTime >= s.startTime && currentTime < s.endTime) ||
    (currentTime >= duration ? segments[segments.length - 1] : segments[0]);

  // Master Stop / Pause Voice Audio
  const stopAllVoiceAudio = useCallback(() => {
    activeVoiceAudiosRef.current.forEach((audio) => {
      audio.pause();
      audio.currentTime = 0;
    });
    activeVoiceAudiosRef.current.clear();
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    spokenSegmentsRef.current.clear();
    setPlayingClipId(null);
  }, []);

  // Stop background music
  const stopBgMusic = useCallback(() => {
    if (bgMusicSourceRef.current) {
      try {
        bgMusicSourceRef.current.stop();
        bgMusicSourceRef.current.disconnect();
      } catch (e) {}
      bgMusicSourceRef.current = null;
    }
  }, []);

  // Start background music at offset
  const startBgMusic = useCallback(
    (offsetSec: number) => {
      stopBgMusic();
      if (settings.bgMusicTrack === 'none' || settings.bgMusicVolume <= 0) return;

      const ctx = getAudioContext();
      const backingBuffer = createCinematicBackingBuffer(ctx, duration);
      const source = ctx.createBufferSource();
      source.buffer = backingBuffer;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(settings.bgMusicVolume, ctx.currentTime);

      source.connect(gain);
      gain.connect(ctx.destination);

      source.start(0, Math.min(offsetSec, duration));
      bgMusicSourceRef.current = source;
      bgMusicGainRef.current = gain;
    },
    [duration, getAudioContext, settings.bgMusicTrack, settings.bgMusicVolume, stopBgMusic]
  );

  // Play / Pause Master Timeline
  const togglePlay = useCallback(() => {
    const ctx = getAudioContext();

    if (isPlaying) {
      // Pause
      setIsPlaying(false);
      stopAllVoiceAudio();
      stopBgMusic();
      if (videoRef.current) videoRef.current.pause();
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    } else {
      // Play
      let startFrom = currentTime;
      if (startFrom >= duration - 0.2) {
        startFrom = 0;
        setCurrentTime(0);
        triggeredSFXRef.current.clear();
      }

      setIsPlaying(true);
      playbackStartTimeRef.current = ctx.currentTime;
      playbackStartOffsetRef.current = startFrom;

      startBgMusic(startFrom);
      if (videoRef.current) {
        videoRef.current.currentTime = startFrom;
        videoRef.current.play().catch(() => {});
      }
    }
  }, [currentTime, duration, getAudioContext, isPlaying, startBgMusic, stopAllVoiceAudio, stopBgMusic]);

  // Seek timeline to time
  const handleSeek = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(duration, time));
      setCurrentTime(clamped);
      stopAllVoiceAudio();

      if (videoRef.current) {
        videoRef.current.currentTime = clamped;
      }

      if (isPlaying) {
        const ctx = getAudioContext();
        playbackStartTimeRef.current = ctx.currentTime;
        playbackStartOffsetRef.current = clamped;
        startBgMusic(clamped);
      }
    },
    [duration, getAudioContext, isPlaying, startBgMusic, stopAllVoiceAudio]
  );

  // Reset to 0
  const handleReset = useCallback(() => {
    handleSeek(0);
    triggeredSFXRef.current.clear();
  }, [handleSeek]);

  // Skip +- seconds
  const handleSkip = useCallback(
    (delta: number) => {
      handleSeek(currentTime + delta);
    },
    [currentTime, handleSeek]
  );

  // Jump to previous scene
  const handlePrevSegment = useCallback(() => {
    const currentIdx = segments.findIndex(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (currentIdx > 0) {
      handleSeek(segments[currentIdx - 1].startTime);
    } else {
      handleSeek(0);
    }
  }, [currentTime, handleSeek, segments]);

  // Jump to next scene
  const handleNextSegment = useCallback(() => {
    const currentIdx = segments.findIndex(
      (s) => currentTime >= s.startTime && currentTime < s.endTime
    );
    if (currentIdx >= 0 && currentIdx < segments.length - 1) {
      handleSeek(segments[currentIdx + 1].startTime);
    }
  }, [currentTime, handleSeek, segments]);

  // Master Clock Update Loop
  useEffect(() => {
    if (!isPlaying) return;

    const ctx = getAudioContext();

    const loop = () => {
      const elapsed = ctx.currentTime - playbackStartTimeRef.current;
      const newTime = playbackStartOffsetRef.current + elapsed;

      if (newTime >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        stopAllVoiceAudio();
        stopBgMusic();
        if (videoRef.current) videoRef.current.pause();
        return;
      }

      setCurrentTime(newTime);

      // Trigger SFX if enabled
      if (settings.soundEffects) {
        if (newTime >= 37.0 && newTime < 37.5 && !triggeredSFXRef.current.has('crutch')) {
          playSoundFX(ctx, 'crutch', 0.6);
          triggeredSFXRef.current.add('crutch');
        }
        if (newTime >= 41.0 && newTime < 41.5 && !triggeredSFXRef.current.has('applause')) {
          playSoundFX(ctx, 'applause', 0.5);
          triggeredSFXRef.current.add('applause');
        }
        if (newTime >= 46.5 && newTime < 47.0 && !triggeredSFXRef.current.has('shutter1')) {
          playSoundFX(ctx, 'shutter', 0.4);
          triggeredSFXRef.current.add('shutter1');
        }
        if (newTime >= 51.5 && newTime < 52.0 && !triggeredSFXRef.current.has('shutter2')) {
          playSoundFX(ctx, 'shutter', 0.4);
          triggeredSFXRef.current.add('shutter2');
        }
        if (newTime >= 63.0 && newTime < 63.5 && !triggeredSFXRef.current.has('chime')) {
          playSoundFX(ctx, 'chime', 0.45);
          triggeredSFXRef.current.add('chime');
        }
      }

      // Check current active segment voiceover
      const currentSeg = segments.find((s) => newTime >= s.startTime && newTime < s.endTime);

      if (currentSeg) {
        if (
          currentSeg.audioUrl &&
          (currentSeg.audioUrl.startsWith('data:audio') || currentSeg.audioUrl.startsWith('blob:'))
        ) {
          let audio = activeVoiceAudiosRef.current.get(currentSeg.id);
          const segOffset = newTime - currentSeg.startTime;

          if (!audio) {
            audio = new Audio(currentSeg.audioUrl);
            audio.volume = settings.voiceVolume;
            audio.currentTime = segOffset;
            audio.play().catch(() => {});
            activeVoiceAudiosRef.current.set(currentSeg.id, audio);
          }

          // Auto-Ducking
          if (settings.autoDucking && bgMusicGainRef.current) {
            bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume * 0.3, ctx.currentTime, 0.15);
          }
        } else if ('speechSynthesis' in window && !spokenSegmentsRef.current.has(currentSeg.id)) {
          spokenSegmentsRef.current.add(currentSeg.id);
          const u = new SpeechSynthesisUtterance(currentSeg.text);
          u.lang = 'ru-RU';
          u.rate = settings.pace;
          window.speechSynthesis.speak(u);

          if (settings.autoDucking && bgMusicGainRef.current) {
            bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume * 0.3, ctx.currentTime, 0.15);
          }
        }
      } else {
        // Return background music gain to normal
        if (bgMusicGainRef.current) {
          bgMusicGainRef.current.gain.setTargetAtTime(settings.bgMusicVolume, ctx.currentTime, 0.2);
        }
      }

      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [
    duration,
    getAudioContext,
    isPlaying,
    segments,
    settings.autoDucking,
    settings.bgMusicVolume,
    settings.soundEffects,
    settings.voiceVolume,
    stopAllVoiceAudio,
    stopBgMusic,
  ]);

  // Track window scroll to display floating mini controller
  useEffect(() => {
    const handleScroll = () => {
      setShowFloatingBar(window.scrollY > 420);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Generate Single Segment Voice with Gemini TTS
  const generateSegmentAudio = async (id: number) => {
    const target = segments.find((s) => s.id === id);
    if (!target) return;

    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: 'generating', error: undefined } : s))
    );

    try {
      const res = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: target.text,
          voice: settings.voice,
          stylePrompt: `${target.emotionKey}. ${target.emotionDescription}`,
          targetDuration: target.duration,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP error ${res.status}`);
      }

      const data = await res.json();
      if (data.audioUrl) {
        // Step: Normalize audio volume level to -1.0 dBFS for consistent broadcast loudness
        let finalAudioUrl = data.audioUrl;
        let finalDuration = data.duration;
        let normNote = '';

        try {
          const normResult = await normalizeAudioVolume(data.audioUrl, -1.0);
          finalAudioUrl = normResult.normalizedUrl;
          finalDuration = normResult.duration;
          normNote = ` (громкость нормализована: ${normResult.gainApplied}x / -1.0 dBFS)`;
        } catch (normErr) {
          console.warn('Audio normalization step bypassed:', normErr);
        }

        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl: finalAudioUrl,
                  audioDuration: finalDuration,
                }
              : s
          )
        );
        showToast(`Сцена #${id} озвучена${normNote}!`);
      }
    } catch (err: any) {
      console.error('Error generating audio:', err);
      // If server or API key is unavailable, provide instant browser Web Speech synthesis so the user is delighted
      if ('speechSynthesis' in window) {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id
              ? {
                  ...s,
                  status: 'ready',
                  audioUrl: 'webspeech:' + encodeURIComponent(s.text),
                  audioDuration: s.duration,
                }
              : s
          )
        );
        showToast(`Сцена #${id} готова (локальный голосовой движок)`);
      } else {
        setSegments((prev) =>
          prev.map((s) =>
            s.id === id ? { ...s, status: 'error', error: err?.message || 'Ошибка' } : s
          )
        );
        showToast(`Ошибка озвучки: ${err?.message || 'Попробуйте снова'}`);
      }
    }
  };

  // Generate All Segments (1-Click)
  const generateAllSegments = async () => {
    if (isGeneratingAll) return;
    setIsGeneratingAll(true);
    showToast('Запущена генерация озвучки для всех 14 сцен...');

    for (const seg of segments) {
      await generateSegmentAudio(seg.id);
      // Short delay to avoid rate limit spikes
      await new Promise((r) => setTimeout(r, 600));
    }

    setIsGeneratingAll(false);
    showToast('Все 14 сцен успешно озвучены!');
  };

  // Generate All Video Prompts with Gemini AI (1-Click)
  const generateAllVideoPrompts = async () => {
    if (isGeneratingAllVideoPrompts) return;
    setIsGeneratingAllVideoPrompts(true);
    showToast('Запущена генерация видеопромптов для всех 14 сцен через Gemini AI...');

    let count = 0;
    for (const seg of segments) {
      try {
        const promptDetails = await generateVideoPromptWithGemini(seg);
        setSegments((prev) =>
          prev.map((s) => (s.id === seg.id ? { ...s, videoPrompt: promptDetails } : s))
        );
        count++;
      } catch (err) {
        console.warn(`Failed video prompt for scene #${seg.id}:`, err);
      }
      await new Promise((r) => setTimeout(r, 200));
    }

    setIsGeneratingAllVideoPrompts(false);
    showToast(`Готово! Сгенерированы видеопромпты для ${count} сцен.`);
  };

  // Toggle Mute for uploaded video
  const toggleVideoMute = useCallback(() => {
    setIsVideoMuted((prev) => {
      const next = !prev;
      if (videoRef.current) {
        videoRef.current.muted = next;
      }
      showToast(next ? 'Звук видео заглушён (Mute)' : 'Звук видео включён (Unmute)');
      return next;
    });
  }, []);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        handleSkip(e.shiftKey ? -1 : -5);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        handleSkip(e.shiftKey ? 1 : 5);
      } else if (e.key === '[' || e.code === 'BracketLeft') {
        e.preventDefault();
        handlePrevSegment();
      } else if (e.key === ']' || e.code === 'BracketRight') {
        e.preventDefault();
        handleNextSegment();
      } else if (e.code === 'Home') {
        e.preventDefault();
        handleSeek(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        handleSeek(duration);
      } else if (e.key === 'm' || e.key === 'M' || e.key === 'ь' || e.key === 'Ь') {
        e.preventDefault();
        setSettings((prev) => ({
          ...prev,
          voiceVolume: prev.voiceVolume > 0 ? 0 : 0.95,
        }));
      } else if (e.key === 'v' || e.key === 'V' || e.key === 'м' || e.key === 'М') {
        e.preventDefault();
        toggleVideoMute();
      } else if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
      } else if (e.key === 'a' || e.key === 'A' || e.key === 'ф' || e.key === 'Ф') {
        e.preventDefault();
        generateAllSegments();
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') {
        e.preventDefault();
        generateAllVideoPrompts();
      } else if (e.key === 'e' || e.key === 'У' || e.key === 'у' || e.key === 'E') {
        e.preventDefault();
        setIsExportModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    duration,
    generateAllSegments,
    generateAllVideoPrompts,
    handleNextSegment,
    handlePrevSegment,
    handleSeek,
    handleSkip,
    togglePlay,
    toggleVideoMute,
  ]);

  // Play Single Audio Clip
  const playSingleClip = (segment: VoiceSegment) => {
    if (playingClipId === segment.id) {
      stopAllVoiceAudio();
      return;
    }

    stopAllVoiceAudio();
    if (isPlaying) {
      setIsPlaying(false);
      stopBgMusic();
    }

    if (
      segment.audioUrl &&
      (segment.audioUrl.startsWith('data:audio') || segment.audioUrl.startsWith('blob:'))
    ) {
      const audio = new Audio(segment.audioUrl);
      audio.volume = settings.voiceVolume;
      audio.onended = () => setPlayingClipId(null);
      audio.play().catch(() => {});
      activeVoiceAudiosRef.current.set(segment.id, audio);
      setPlayingClipId(segment.id);
    } else if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(segment.text);
      u.lang = 'ru-RU';
      u.rate = settings.pace;
      u.onend = () => setPlayingClipId(null);
      window.speechSynthesis.speak(u);
      setPlayingClipId(segment.id);
    }
  };

  // Update audio for a segment after Web Audio API tempo snapping / stretching
  const handleUpdateSegmentAudio = useCallback(
    (id: number, newAudioUrl: string, newDuration: number) => {
      setSegments((prev) =>
        prev.map((s) =>
          s.id === id
            ? {
                ...s,
                audioUrl: newAudioUrl,
                audioDuration: newDuration,
                status: 'ready',
              }
            : s
        )
      );
      showToast(`Темп сцены #${id} привязан к таймингу (${newDuration.toFixed(1)} сек)`);
    },
    []
  );

  // Batch snap tempo across all ready scenes with audio
  const handleSnapAllTempos = async () => {
    if (isSnappingAll) return;
    const eligible = segments.filter((s) => Boolean(s.audioUrl));
    if (eligible.length === 0) {
      showToast('Сначала сгенерируйте озвучку сцен');
      return;
    }

    setIsSnappingAll(true);
    showToast('Привязываем темп во всех сценах через Web Audio API...');

    let updatedCount = 0;
    for (const seg of eligible) {
      try {
        const res = await fitAudioToDuration(seg.audioUrl!, seg.duration, 'wsola');
        setSegments((prev) =>
          prev.map((s) =>
            s.id === seg.id
              ? {
                  ...s,
                  audioUrl: res.dataUrl,
                  audioDuration: res.newDuration,
                  status: 'ready',
                }
              : s
          )
        );
        updatedCount++;
      } catch (err) {
        console.warn(`Failed to snap tempo for segment #${seg.id}:`, err);
      }
    }

    setIsSnappingAll(false);
    showToast(`Темп синхронизирован в ${updatedCount} сценах!`);
  };

  // Handle uploading custom audio & automatically running Speech-to-Text
  const handleAudioUploadSTT = async (segmentId: number, file: File) => {
    const target = segments.find((s) => s.id === segmentId);
    if (!target) return;

    setSegments((prev) =>
      prev.map((s) => (s.id === segmentId ? { ...s, status: 'generating', error: undefined } : s))
    );
    showToast(`Распознавание речи из «${file.name}» (сцена #${segmentId})...`);

    try {
      const result = await transcribeAudioFile(file, `Сцена #${segmentId}: ${target.sceneTitle}`);
      const recognizedText = result.text.trim() || target.text;

      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId
            ? {
                ...s,
                text: recognizedText,
                audioUrl: result.audioUrl,
                audioDuration: result.duration,
                status: 'ready',
              }
            : s
        )
      );

      if (result.text) {
        showToast(`Текст сцены #${segmentId} распознан: «${result.text}»`);
      } else {
        showToast(`Аудиофайл загружен для сцены #${segmentId} (${result.duration.toFixed(1)}с)`);
      }
    } catch (err: any) {
      console.error('STT upload error:', err);
      setSegments((prev) =>
        prev.map((s) =>
          s.id === segmentId ? { ...s, status: 'error', error: err?.message || 'Ошибка распознавания' } : s
        )
      );
      showToast(`Ошибка распознавания речи: ${err?.message || 'Попробуйте другой аудиофайл'}`);
    }
  };

  // Update text for a segment
  const handleUpdateText = (id: number, newText: string) => {
    setSegments((prev) =>
      prev.map((s) => (s.id === id ? { ...s, text: newText, status: 'idle' } : s))
    );
    showToast(`Текст сцены #${id} обновлён. Нажмите «Озвучить» для записи.`);
  };

  // Update video prompt for a segment generated by Gemini
  const handleUpdateVideoPrompt = useCallback(
    (id: number, prompt: VideoPromptDetails) => {
      setSegments((prev) =>
        prev.map((s) => (s.id === id ? { ...s, videoPrompt: prompt } : s))
      );
      showToast(`Промпт для видео сцены #${id} создан через Gemini!`);
    },
    []
  );

  // Download Single Clip WAV
  const downloadSingleClip = (segment: VoiceSegment) => {
    if (!segment.audioUrl) return;
    const a = document.createElement('a');
    a.href = segment.audioUrl;
    a.download = `scene_${segment.id}_${segment.startTime}-${segment.endTime}s.wav`;
    a.click();
  };

  // Download Master 70.0s Mixed WAV
  const downloadMasterWav = async () => {
    showToast('Подготавливаем мастер-дорожку (70.0 сек)...');
    const ctx = getAudioContext();
    const sampleRate = 24000;
    const totalSamples = Math.floor(sampleRate * duration);
    const masterBuffer = ctx.createBuffer(2, totalSamples, sampleRate);
    const masterLeft = masterBuffer.getChannelData(0);
    const masterRight = masterBuffer.getChannelData(1);

    // 1. Mix background music if enabled
    if (settings.bgMusicTrack !== 'none' && settings.bgMusicVolume > 0) {
      const bgBuffer = createCinematicBackingBuffer(ctx, duration);
      const bgLeft = bgBuffer.getChannelData(0);
      const bgRight = bgBuffer.getChannelData(1);
      const musicVol = settings.bgMusicVolume;

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        // Check if voice is speaking at time t for ducking
        const isVoiceActive = segments.some(
          (s) => t >= s.startTime && t < s.endTime && s.status === 'ready'
        );
        const duckFactor = settings.autoDucking && isVoiceActive ? 0.35 : 1.0;
        masterLeft[i] += bgLeft[i] * musicVol * duckFactor;
        masterRight[i] += bgRight[i] * musicVol * duckFactor;
      }
    }

    // 2. Decode and place each voice segment at its exact start second
    for (const seg of segments) {
      if (
        seg.audioUrl &&
        (seg.audioUrl.startsWith('data:audio') || seg.audioUrl.startsWith('blob:'))
      ) {
        try {
          const res = await fetch(seg.audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const decoded = await ctx.decodeAudioData(arrayBuffer);
          const startSample = Math.floor(seg.startTime * sampleRate);
          const segSamples = decoded.length;
          const voiceVol = settings.voiceVolume;

          const decLeft = decoded.getChannelData(0);
          const decRight = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : decLeft;

          for (let i = 0; i < segSamples; i++) {
            const targetIdx = startSample + i;
            if (targetIdx < totalSamples) {
              masterLeft[targetIdx] += decLeft[i] * voiceVol;
              masterRight[targetIdx] += decRight[i] * voiceVol;
            }
          }
        } catch (e) {
          console.warn('Error decoding segment audio during master mix:', e);
        }
      }
    }

    // 3. Export to WAV blob and trigger download
    const wavBlob = audioBufferToWav(masterBuffer);
    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `озвучка_ролика_70_секунд_мастер_${settings.voice}.wav`;
    a.click();
    showToast('Мастер-дорожка успешно сохранена!');
  };

  // Export Subtitles (.SRT)
  const exportSRT = () => {
    const srt = generateSRT(segments);
    const blob = new Blob([srt], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'субтитры_70_секунд.srt';
    a.click();
    showToast('Файл субтитров .SRT скачан!');
  };

  // Handle Video File Upload
  const handleVideoUpload = (file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    showToast(`Видео «${file.name}» загружено и синхронизировано с таймлайном!`);
  };

  // Filtered segments
  const filteredSegments = segments.filter((s) => {
    // 1. Category filter
    if (selectedCategory !== 'all' && s.category !== selectedCategory) {
      return false;
    }
    // 2. Status filter
    if (statusFilter === 'unvoiced' && s.status === 'ready') return false;
    if (statusFilter === 'ready' && s.status !== 'ready') return false;
    if (statusFilter === 'prompted' && !s.videoPrompt) return false;
    // 3. Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const inText = s.text.toLowerCase().includes(q);
      const inTitle = s.sceneTitle.toLowerCase().includes(q);
      const inVisual = s.sceneVisual.toLowerCase().includes(q);
      const inEmotion = s.emotionKey.toLowerCase().includes(q);
      return inText || inTitle || inVisual || inEmotion;
    }
    return true;
  });

  const readyCount = segments.filter((s) => s.status === 'ready').length;
  const promptsCount = segments.filter((s) => Boolean(s.videoPrompt)).length;

  return (
    <div className="min-h-screen bg-[#030a14] text-[#b6c6da] flex flex-col font-['Onest',system-ui,sans-serif] selection:bg-[#33a4d4]/30 selection:text-white brand-ambient-glow">
      {/* Top Header */}
      <Header
        segments={segments}
        isGeneratingAll={isGeneratingAll}
        onGenerateAll={generateAllSegments}
        onDownloadMasterWav={downloadMasterWav}
        onExportSRT={exportSRT}
        onOpenScriptModal={() => setIsExportModalOpen(true)}
        readyCount={readyCount}
        onSnapAllTempos={handleSnapAllTempos}
        isSnappingAll={isSnappingAll}
        onGenerateAllVideoPrompts={generateAllVideoPrompts}
        isGeneratingAllVideoPrompts={isGeneratingAllVideoPrompts}
        videoPromptsCount={promptsCount}
        onOpenKeyboardShortcuts={() => setIsShortcutsOpen(true)}
      />

      {/* Main Studio Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 space-y-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-16 sm:bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#030a14]/95 text-[#eaf3ff] border border-[#33a4d4]/50 shadow-[0_0_24px_rgba(51,164,212,0.3)] backdrop-blur-xl animate-bounce text-xs sm:text-sm">
            <Sparkles className="w-4 h-4 text-[#33a4d4]" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Cinematic Video Visualizer */}
        <div className="w-full">
          <VideoVisualizer
            currentTime={currentTime}
            duration={duration}
            isPlaying={isPlaying}
            activeSegment={activeSegment}
            onSeek={handleSeek}
            uploadedVideoUrl={uploadedVideoUrl}
            onVideoUpload={handleVideoUpload}
            videoRef={videoRef}
            isVideoMuted={isVideoMuted}
            onToggleVideoMute={toggleVideoMute}
          />
        </div>

        {/* Master Sound Engineering & Transport Audio Console */}
        <div className="w-full">
          <AudioConsole
            isPlaying={isPlaying}
            onTogglePlay={togglePlay}
            onReset={handleReset}
            onSkip={handleSkip}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            settings={settings}
            onUpdateSettings={(newSettings) => setSettings((s) => ({ ...s, ...newSettings }))}
            uploadedVideoUrl={uploadedVideoUrl}
            isVideoMuted={isVideoMuted}
            onToggleVideoMute={toggleVideoMute}
          />
        </div>

        {/* Interactive Master 70-Second Multi-Track Timeline */}
        <div className="w-full">
          <TimelineRuler
            segments={segments}
            currentTime={currentTime}
            duration={duration}
            onSeek={handleSeek}
            activeSegmentId={activeSegment?.id || null}
          />
        </div>

        {/* Visual Scene Quick Navigator Jump Bar */}
        <SceneJumpBar
          segments={segments}
          activeSegmentId={activeSegment?.id || null}
          onSelectScene={(seg) => {
            handleSeek(seg.startTime);
            const el = document.getElementById(`scene-card-${seg.id}`);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }}
        />

        {/* Segment Manager: Header & Filter Bar */}
        <div className="space-y-4 pt-2">
          {/* Section Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#33a4d4]/15 pb-3">
            <div>
              <h2 className="text-lg font-bold text-[#eaf3ff] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#33a4d4]" />
                Сценарный план и реплики ({filteredSegments.length} из 14)
              </h2>
              <p className="text-xs text-[#7b8ea6] mt-0.5">
                Синхронный хронометраж, режиссерские промпты и гибкая настройка реплик
              </p>
            </div>

            {/* Quick Helper Toolbar */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScroll((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer ${
                  autoScroll
                    ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border border-[#33a4d4]/40 shadow-sm'
                    : 'bg-white/[0.04] text-[#7b8ea6] hover:text-[#b6c6da] border border-white/[0.08]'
                }`}
                title="Автоматически скроллить страницу к карточке текущей говорящей сцены"
              >
                <span>Авто-скролл:</span>
                <span className="font-bold">{autoScroll ? 'Вкл' : 'Выкл'}</span>
              </button>

              <button
                onClick={() => setIsShortcutsOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/25 transition-all cursor-pointer"
                title="Горячие клавиши (нажмите ?)"
              >
                <Command className="w-3.5 h-3.5 text-[#33a4d4]" />
                <span className="hidden sm:inline">Клавиши (?)</span>
              </button>
            </div>
          </div>

          {/* Search & Status Filter Strip */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-[#02060d]/70 p-3 rounded-2xl border border-[#33a4d4]/15">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#7b8ea6] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск по тексту реплики, кадру, настроению..."
                className="w-full pl-9 pr-8 py-1.5 bg-[#030a14] border border-[#33a4d4]/25 rounded-xl text-xs text-[#eaf3ff] placeholder-[#7b8ea6] focus:outline-none focus:ring-1 focus:ring-[#33a4d4]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#7b8ea6] hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-[#7b8ea6] mr-1 hidden lg:inline">Статус:</span>
              {[
                { id: 'all' as const, label: 'Все (14)' },
                { id: 'unvoiced' as const, label: `Ожидают (${14 - readyCount})` },
                { id: 'ready' as const, label: `Озвучены (${readyCount})` },
                { id: 'prompted' as const, label: `С AI-промптом (${promptsCount})` },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-[#33a4d4] text-[#04202b] font-bold shadow-[0_0_10px_rgba(51,164,212,0.4)]'
                      : 'bg-white/[0.04] text-[#7b8ea6] hover:text-[#b6c6da] border border-white/[0.08]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Все сюжетные блоки' },
              { id: 'childhood', label: 'Детство (0–8с)' },
              { id: 'motherhood', label: 'Материнство (8–22с)' },
              { id: 'sport', label: 'Спорт & Танец (22–32с)' },
              { id: 'recovery', label: 'Преодоление (32–41с)' },
              { id: 'triumph', label: 'Триумф (41–57с)' },
              { id: 'present', label: 'Мне 50 (57–70с)' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#33a4d4] text-[#04202b] font-bold shadow-[0_0_14px_rgba(51,164,212,0.4)]'
                    : 'bg-white/[0.04] hover:bg-[#33a4d4]/10 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* 14 Cue Cards Grid */}
          {filteredSegments.length === 0 ? (
            <div className="p-8 text-center bg-[#02060d]/60 rounded-2xl border border-white/[0.06] text-xs text-[#7b8ea6] space-y-2">
              <p>По вашему фильтру или поисковому запросу ничего не найдено.</p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setStatusFilter('all');
                }}
                className="px-3.5 py-1.5 rounded-full bg-[#33a4d4] text-[#04202b] font-bold text-xs"
              >
                Сбросить фильтры
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSegments.map((segment) => (
                <SegmentCard
                  key={segment.id}
                  segment={segment}
                  isActive={activeSegment?.id === segment.id}
                  onSeek={handleSeek}
                  onGenerateSingle={generateSegmentAudio}
                  onPlaySingleClip={playSingleClip}
                  isPlayingClip={playingClipId === segment.id}
                  onUpdateText={handleUpdateText}
                  onDownloadClip={downloadSingleClip}
                  onUpdateSegmentAudio={handleUpdateSegmentAudio}
                  onUpdateVideoPrompt={handleUpdateVideoPrompt}
                  masterCurrentTime={currentTime}
                  isMasterPlaying={isPlaying}
                  originalText={INITIAL_SEGMENTS.find((orig) => orig.id === segment.id)?.text}
                  onPrevScene={() => {
                    const prevSeg = segments[Math.max(0, segment.id - 2)];
                    if (prevSeg) handleSeek(prevSeg.startTime);
                  }}
                  onNextScene={() => {
                    const nextSeg = segments[Math.min(segments.length - 1, segment.id)];
                    if (nextSeg) handleSeek(nextSeg.startTime);
                  }}
                  autoScroll={autoScroll}
                  onUploadAudioSTT={handleAudioUploadSTT}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Floating Sticky Mini-Player on scroll */}
      <FloatingMiniPlayer
        isVisible={showFloatingBar}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onSkip={handleSkip}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        activeSegment={activeSegment}
        onPrevSegment={handlePrevSegment}
        onNextSegment={handleNextSegment}
        autoScroll={autoScroll}
        onToggleAutoScroll={() => setAutoScroll((prev) => !prev)}
        onScrollToTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        voiceVolume={settings.voiceVolume}
        onUpdateVolume={(vol) => setSettings((s) => ({ ...s, voiceVolume: vol }))}
        uploadedVideoUrl={uploadedVideoUrl}
        isVideoMuted={isVideoMuted}
        onToggleVideoMute={toggleVideoMute}
      />

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      {/* Brand Style Standard Footer: Alexander Uspeshnyy */}
      <footer className="mt-12 border-t border-[#33a4d4]/15 bg-[#02060d]/80 backdrop-blur-md py-6 px-4 md:px-8 mb-16 sm:mb-0">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7b8ea6]">
          <div className="flex items-center gap-3">
            <a
              href="https://uspeshnyy.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <img
                src="https://storage.googleapis.com/uspeshnyy-projects/uspeshnyy.ru/pages/common/logo.svg"
                alt="Успешный"
                className="w-6 h-7 object-contain drop-shadow-[0_0_10px_rgba(51,164,212,0.6)] group-hover:scale-105 transition-transform"
              />
              <span className="font-bold text-[#eaf3ff] group-hover:text-[#5fc1e8] transition-colors">
                Успешный
              </span>
            </a>
            <span className="text-zinc-600">•</span>
            <span>Архитектор AI-маркетинговых систем</span>
          </div>

          <div className="flex items-center gap-4">
            <a
              href="https://t.me/uspeshnyy"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 rounded-full border border-[#33a4d4]/30 bg-[#33a4d4]/10 text-[#33a4d4] hover:bg-[#33a4d4] hover:text-[#04202b] transition-all font-semibold"
            >
              Telegram @uspeshnyy
            </a>
            <a
              href="https://uspeshnyy.ru"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#33a4d4] transition-colors"
            >
              uspeshnyy.ru
            </a>
          </div>
        </div>
      </footer>

      {/* Export / Script Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        segments={segments}
        onDownloadMasterWav={downloadMasterWav}
        onExportSRT={exportSRT}
      />
    </div>
  );
}
