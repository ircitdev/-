import React, { useState } from 'react';
import { X, Copy, Check, Download, FileText, Film, Volume2, Sparkles } from 'lucide-react';
import { VoiceSegment } from '../types';
import { generateSRT, formatTimeDisplay } from '../utils/audioEngine';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  segments: VoiceSegment[];
  onDownloadMasterWav: () => void;
  onExportSRT: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  segments,
  onDownloadMasterWav,
  onExportSRT,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'srt' | 'guide'>('script');

  if (!isOpen) return null;

  const srtContent = generateSRT(segments);

  const scriptMarkdown = `# Сценарий ролика (70 секунд) — Женский голос\n\n` +
    segments
      .map(
        (s) =>
          `### [${s.startTime}–${s.endTime} сек] (${s.duration}с) — ${s.sceneTitle}\n` +
          `**Озвучка:** «${s.text}»\n` +
          `*Кадр и движение:* ${s.sceneVisual}\n` +
          `*Интонация:* ${s.emotionKey} — ${s.emotionDescription}\n`
      )
      .join('\n\n');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-zinc-950 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Экспорт материалов для монтажа</h3>
              <p className="text-xs text-zinc-400">Звуковая дорожка, субтитры и таймлайн-сценарий ролика (70с)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-zinc-900/40 border-b border-zinc-800/80">
          <button
            onClick={onDownloadMasterWav}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg transition-all active:scale-95"
          >
            <Download className="w-4 h-4" />
            <span>Скачать Мастер WAV (70.0 сек)</span>
          </button>

          <button
            onClick={onExportSRT}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700 transition-all active:scale-95"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>Скачать файл субтитров (.SRT)</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-zinc-800 px-6 pt-3 gap-3 bg-zinc-900/20 text-xs">
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-3 font-semibold border-b-2 transition-all ${
              activeTab === 'script'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Текстовый сценарий с таймкодами
          </button>
          <button
            onClick={() => setActiveTab('srt')}
            className={`pb-3 font-semibold border-b-2 transition-all ${
              activeTab === 'srt'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Субтитры (.SRT)
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 font-semibold border-b-2 transition-all ${
              activeTab === 'guide'
                ? 'border-rose-500 text-rose-400'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Инструкция по монтажу
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-zinc-300 font-mono space-y-4">
          {activeTab === 'script' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleCopy(scriptMarkdown)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-sans text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать текст'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 whitespace-pre-wrap font-sans leading-relaxed text-sm text-zinc-200 select-all">
                {scriptMarkdown}
              </pre>
            </div>
          )}

          {activeTab === 'srt' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleCopy(srtContent)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-sans text-xs transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать SRT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 whitespace-pre-wrap font-mono leading-relaxed text-xs text-emerald-400/90 select-all">
                {srtContent}
              </pre>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="font-sans space-y-3 text-sm text-zinc-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3">
                <h4 className="font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Как импортировать в видеоредактор:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-zinc-300">
                  <li>
                    <strong>Скачайте «Мастер WAV (70с)»:</strong> Файл имеет строго 70.0 секунд длины. Поместите его на звуковую дорожку видеоредактора (CapCut, Premiere, DaVinci, Final Cut) ровно с 00:00:00:00.
                  </li>
                  <li>
                    <strong>Каждый отрезок озвучки</strong> идеально совпадает с точками смены кадров из вашей таблицы (0-4с, 4-8с, 8-13с, ..., 63-70с).
                  </li>
                  <li>
                    <strong>Импорт субтитров:</strong> Импортируйте файл <code>.SRT</code> на дорожку субтитров (Captions). Все 14 реплик встанут на нужные секунды автоматически.
                  </li>
                  <li>
                    <strong>Музыкальное оформление:</strong> В студии встроен динамический фоновый трек с авто-дакингом и звуковыми эффектами (шаги на костылях, вспышки фотографов на Mrs World, аплодисменты при победе в «Миссис Волгоград»).
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-zinc-800 bg-zinc-900/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs transition-colors"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
