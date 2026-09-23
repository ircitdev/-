import React, { useState } from 'react';
import { Play, Pause, RefreshCw, Download, Sparkles, Wand2, Edit3, Check, Volume2, Camera } from 'lucide-react';
import { VoiceSegment } from '../types';

interface SegmentCardProps {
  segment: VoiceSegment;
  isActive: boolean;
  onSeek: (time: number) => void;
  onGenerateSingle: (id: number) => void;
  onPlaySingleClip: (segment: VoiceSegment) => void;
  isPlayingClip: boolean;
  onUpdateText: (id: number, newText: string) => void;
  onDownloadClip: (segment: VoiceSegment) => void;
}

export const SegmentCard: React.FC<SegmentCardProps> = ({
  segment,
  isActive,
  onSeek,
  onGenerateSingle,
  onPlaySingleClip,
  isPlayingClip,
  onUpdateText,
  onDownloadClip,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [textVal, setTextVal] = useState(segment.text);

  const handleSaveText = () => {
    onUpdateText(segment.id, textVal);
    setIsEditing(false);
  };

  const getCategoryTheme = (cat: VoiceSegment['category']) => {
    switch (cat) {
      case 'childhood':
        return {
          bg: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
          badge: 'Детство',
        };
      case 'motherhood':
        return {
          bg: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
          badge: 'Материнство',
        };
      case 'sport':
        return {
          bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300',
          badge: 'Спорт & Танец',
        };
      case 'recovery':
        return {
          bg: 'bg-slate-400/10 border-slate-400/30 text-slate-300',
          badge: 'Испытание & Воля',
        };
      case 'triumph':
        return {
          bg: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300',
          badge: 'Триумф & Подиум',
        };
      case 'present':
      default:
        return {
          bg: 'bg-fuchsia-500/10 border-fuchsia-500/30 text-fuchsia-300',
          badge: 'Мне 50 & Будущее',
        };
    }
  };

  const theme = getCategoryTheme(segment.category);

  return (
    <div
      className={`rounded-2xl p-4 transition-all border ${
        isActive
          ? 'bg-zinc-900 border-rose-500 shadow-xl shadow-rose-950/20 ring-1 ring-rose-500/40'
          : 'bg-zinc-950/80 hover:bg-zinc-900/90 border-zinc-800/80 shadow-md'
      }`}
    >
      {/* Top Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2">
          {/* Seek jump button */}
          <button
            onClick={() => onSeek(segment.startTime)}
            className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-900/50 text-zinc-200 hover:text-rose-200 border border-zinc-700 transition-colors flex items-center gap-1.5"
            title="Перейти к этой секунде на таймлайне"
          >
            <span>{segment.startTime}–{segment.endTime} сек</span>
            <span className="text-[10px] text-zinc-400">({segment.duration}с)</span>
          </button>

          <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${theme.bg}`}>
            {theme.badge}
          </span>
        </div>

        {/* Status Badge */}
        <div className="flex items-center gap-1.5">
          {segment.status === 'generating' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Озвучивание...
            </span>
          )}
          {segment.status === 'ready' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <Volume2 className="w-3 h-3 text-emerald-400" />
              Готово
            </span>
          )}
          {segment.status === 'idle' && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-zinc-800 text-zinc-400 border border-zinc-700">
              Ожидает озвучки
            </span>
          )}
        </div>
      </div>

      {/* Voiceover Text Content */}
      <div className="my-2.5">
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={textVal}
              onChange={(e) => setTextVal(e.target.value)}
              rows={2}
              className="w-full bg-zinc-900 border border-rose-500/60 rounded-xl p-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setTextVal(segment.text);
                  setIsEditing(false);
                }}
                className="px-2.5 py-1 text-xs rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              >
                Отмена
              </button>
              <button
                onClick={handleSaveText}
                className="px-3 py-1 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-1"
              >
                <Check className="w-3 h-3" />
                Сохранить
              </button>
            </div>
          </div>
        ) : (
          <div className="group relative">
            <p className="text-sm md:text-base font-semibold text-white tracking-normal leading-relaxed pr-8">
              <span className="text-rose-400 font-serif mr-1">«</span>
              {segment.text}
              <span className="text-rose-400 font-serif ml-1">»</span>
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-0 right-0 p-1 text-zinc-500 hover:text-zinc-200 opacity-60 hover:opacity-100 transition-opacity"
              title="Редактировать текст реплики"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Video & Camera Direction Box */}
      <div className="mt-2 text-xs bg-zinc-900/60 rounded-xl p-2.5 border border-zinc-800/60 space-y-1">
        <p className="text-zinc-300 font-light leading-snug">
          <strong className="text-zinc-400 font-normal">Кадр: </strong>
          {segment.sceneVisual}
        </p>
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-zinc-400">
          <span className="inline-flex items-center gap-1 text-amber-300/90">
            <Camera className="w-3 h-3 text-amber-400" />
            {segment.cameraMovement}
          </span>
          <span className="text-zinc-600">•</span>
          <span className="text-rose-300">
            <strong>Интонация:</strong> {segment.emotionKey} ({segment.emotionDescription})
          </span>
        </div>
      </div>

      {/* Bottom Action Buttons */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-800/60">
        <div className="flex items-center gap-2">
          {/* Play individual audio clip */}
          <button
            onClick={() => onPlaySingleClip(segment)}
            disabled={segment.status === 'generating'}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white transition-colors"
            title="Прослушать эту реплику отдельно"
          >
            {isPlayingClip ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>Стоп</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current text-emerald-400" />
                <span>Слушать</span>
              </>
            )}
          </button>

          {/* Download clip WAV */}
          {segment.audioUrl && (
            <button
              onClick={() => onDownloadClip(segment)}
              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors"
              title="Скачать аудио этой реплики (.wav)"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Generate with Gemini TTS */}
        <button
          onClick={() => onGenerateSingle(segment.id)}
          disabled={segment.status === 'generating'}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-gradient-to-r from-rose-600/90 to-amber-600/90 hover:from-rose-500 hover:to-amber-500 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
          title="Сгенерировать озвучку реплики женским голосом через Gemini"
        >
          {segment.status === 'generating' ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Генерация...</span>
            </>
          ) : (
            <>
              <Wand2 className="w-3.5 h-3.5 text-amber-200" />
              <span>{segment.status === 'ready' ? 'Переозвучить' : 'Озвучить (AI)'}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
