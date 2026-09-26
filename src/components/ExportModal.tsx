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
  const [activeTab, setActiveTab] = useState<'script' | 'srt' | 'prompts' | 'guide'>('script');

  if (!isOpen) return null;

  const srtContent = generateSRT(segments);

  const scriptMarkdown = `# Сценарий ролика — Студия озвучки (Успешный)\n\n` +
    segments
      .map(
        (s) =>
          `### [${s.startTime}–${s.endTime} сек] (${s.duration}с) — ${s.sceneTitle}\n` +
          `**Озвучка:** «${s.text}»\n` +
          `*Кадр и движение:* ${s.sceneVisual}\n` +
          `*Интонация:* ${s.emotionKey} — ${s.emotionDescription}\n`
      )
      .join('\n\n');

  const allPromptsEn = segments
    .map(
      (s) =>
        `// Scene #${s.id} [${s.startTime}-${s.endTime}s] (${s.duration}s) - ${s.sceneTitle}\n` +
        (s.videoPrompt?.fullPromptEn ||
          `Cinematic 8k video shot of ${s.sceneVisual}, camera movement: ${s.cameraMovement}, 35mm anamorphic lens f/1.8, golden hour dramatic cinematic lighting, photorealistic masterwork.`)
    )
    .join('\n\n');

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPromptsTxt = () => {
    const blob = new Blob([allPromptsEn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'видеопромпты_70_секунд_runway_kling_sora.txt';
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#030a14] rounded-3xl border border-[#33a4d4]/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33a4d4]/15 bg-gradient-to-r from-[#0e2640]/50 to-[#040e1a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#33a4d4]/10 text-[#33a4d4] border border-[#33a4d4]/30 shadow-[0_0_12px_rgba(51,164,212,0.3)]">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#eaf3ff] flex items-center gap-2">
                Экспорт материалов для монтажа
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#33a4d4]/10 text-[#33a4d4] border border-[#33a4d4]/20">
                  70s Master
                </span>
              </h3>
              <p className="text-xs text-[#7b8ea6]">Звуковая дорожка, субтитры и таймлайн-сценарий ролика</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#7b8ea6] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Highlights Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#02060d]/60 border-b border-[#33a4d4]/15">
          <button
            onClick={onDownloadMasterWav}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs sm:text-sm bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] shadow-[0_0_20px_rgba(51,164,212,0.35)] transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Скачать Мастер WAV (70.0 сек)</span>
          </button>

          <button
            onClick={onExportSRT}
            className="flex items-center justify-center gap-2 py-3 px-4 rounded-full font-bold text-xs sm:text-sm bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#eaf3ff] hover:text-[#5fc1e8] border border-[#33a4d4]/25 transition-all active:scale-95 cursor-pointer"
          >
            <Volume2 className="w-4 h-4 text-[#33a4d4]" />
            <span>Скачать файл субтитров (.SRT)</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#33a4d4]/15 px-6 pt-3 gap-4 bg-[#030a14] text-xs">
          <button
            onClick={() => setActiveTab('script')}
            className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'script'
                ? 'border-[#33a4d4] text-[#5fc1e8]'
                : 'border-transparent text-[#7b8ea6] hover:text-[#b6c6da]'
            }`}
          >
            Текстовый сценарий с таймкодами
          </button>
          <button
            onClick={() => setActiveTab('srt')}
            className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'srt'
                ? 'border-[#33a4d4] text-[#5fc1e8]'
                : 'border-transparent text-[#7b8ea6] hover:text-[#b6c6da]'
            }`}
          >
            Субтитры (.SRT)
          </button>
          <button
            onClick={() => setActiveTab('prompts')}
            className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'prompts'
                ? 'border-[#33a4d4] text-[#5fc1e8]'
                : 'border-transparent text-[#7b8ea6] hover:text-[#b6c6da]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#33a4d4]" />
            <span>AI Видеопромпты (Runway / Kling / Sora)</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-3 font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#33a4d4] text-[#5fc1e8]'
                : 'border-transparent text-[#7b8ea6] hover:text-[#b6c6da]'
            }`}
          >
            Инструкция по монтажу
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 text-xs text-[#b6c6da] font-mono space-y-4">
          {activeTab === 'script' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleCopy(scriptMarkdown)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#eaf3ff] hover:text-[#5fc1e8] border border-[#33a4d4]/20 font-sans text-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#33a4d4]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать текст'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#02060d] border border-[#33a4d4]/20 whitespace-pre-wrap font-sans leading-relaxed text-sm text-[#eaf3ff] select-all shadow-inner">
                {scriptMarkdown}
              </pre>
            </div>
          )}

          {activeTab === 'srt' && (
            <div>
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => handleCopy(srtContent)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#eaf3ff] hover:text-[#5fc1e8] border border-[#33a4d4]/20 font-sans text-xs transition-colors cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-[#33a4d4]" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Скопировано!' : 'Копировать SRT'}</span>
                </button>
              </div>
              <pre className="p-4 rounded-2xl bg-[#02060d] border border-[#33a4d4]/20 whitespace-pre-wrap font-mono leading-relaxed text-xs text-[#5fc1e8] select-all shadow-inner">
                {srtContent}
              </pre>
            </div>
          )}

          {activeTab === 'prompts' && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2 font-sans">
                <div className="text-xs text-[#7b8ea6]">
                  Англоязычные промпты для генерации 14 сцен в нейросетях (Runway Gen-3, Kling, Sora, Hailuo, Luma)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadPromptsTxt}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/[0.04] hover:bg-[#33a4d4]/15 text-[#eaf3ff] hover:text-[#5fc1e8] border border-[#33a4d4]/20 text-xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Скачать .txt</span>
                  </button>
                  <button
                    onClick={() => handleCopy(allPromptsEn)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] font-bold text-xs transition-all cursor-pointer shadow-[0_0_12px_rgba(51,164,212,0.35)]"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Скопировано!' : 'Копировать все 14 EN'}</span>
                  </button>
                </div>
              </div>
              <pre className="p-4 rounded-2xl bg-[#02060d] border border-[#33a4d4]/20 whitespace-pre-wrap font-mono leading-relaxed text-xs text-[#5fc1e8] select-all shadow-inner max-h-[50vh] overflow-y-auto">
                {allPromptsEn}
              </pre>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="font-sans space-y-3 text-sm text-[#b6c6da] leading-relaxed">
              <div className="p-5 rounded-2xl bg-[#02060d] border border-[#33a4d4]/20 space-y-3">
                <h4 className="font-bold text-[#eaf3ff] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#33a4d4]" />
                  Как импортировать в видеоредактор:
                </h4>
                <ol className="list-decimal list-inside space-y-2 text-[#b6c6da]">
                  <li>
                    <strong className="text-[#eaf3ff]">Скачайте «Мастер WAV (70с)»:</strong> Файл имеет строго 70.0 секунд длины. Поместите его на звуковую дорожку видеоредактора (CapCut, Premiere, DaVinci, Final Cut) ровно с 00:00:00:00.
                  </li>
                  <li>
                    <strong className="text-[#eaf3ff]">Каждый отрезок озвучки</strong> идеально совпадает с точками смены кадров из вашей таблицы (0-4с, 4-8с, 8-13с, ..., 63-70с).
                  </li>
                  <li>
                    <strong className="text-[#eaf3ff]">Импорт субтитров:</strong> Импортируйте файл <code>.SRT</code> на дорожку субтитров (Captions). Все 14 реплик встанут на нужные секунды автоматически.
                  </li>
                  <li>
                    <strong className="text-[#eaf3ff]">Музыкальное оформление:</strong> В студии встроен динамический фоновый трек с авто-дакингом и звуковыми эффектами (шаги на костылях, вспышки фотографов на Mrs World, аплодисменты при победе в «Миссис Волгоград»).
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#33a4d4]/15 bg-[#02060d]/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.08] text-[#eaf3ff] font-medium text-xs border border-white/[0.08] transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
