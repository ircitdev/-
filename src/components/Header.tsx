import React from 'react';
import {
  Sparkles,
  Download,
  FileText,
  Wand2,
  Volume2,
  RefreshCw,
  Sliders,
  ExternalLink,
  Film,
  HelpCircle,
} from 'lucide-react';
import { VoiceSegment } from '../types';

interface HeaderProps {
  segments: VoiceSegment[];
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onDownloadMasterWav: () => void;
  onExportSRT: () => void;
  onOpenScriptModal: () => void;
  readyCount: number;
  onSnapAllTempos?: () => void;
  isSnappingAll?: boolean;
  onGenerateAllVideoPrompts?: () => void;
  isGeneratingAllVideoPrompts?: boolean;
  videoPromptsCount?: number;
  onOpenKeyboardShortcuts?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  segments,
  isGeneratingAll,
  onGenerateAll,
  onDownloadMasterWav,
  onExportSRT,
  onOpenScriptModal,
  readyCount,
  onSnapAllTempos,
  isSnappingAll = false,
  onGenerateAllVideoPrompts,
  isGeneratingAllVideoPrompts = false,
  videoPromptsCount = 0,
  onOpenKeyboardShortcuts,
}) => {
  const totalCount = segments.length;
  const isAllReady = readyCount === totalCount;

  return (
    <header className="sticky top-0 z-40 bg-[#030a14]/90 backdrop-blur-xl border-b border-[#33a4d4]/20 px-4 sm:px-6 lg:px-8 py-3 transition-all shadow-[0_4px_30px_rgba(0,0,0,0.5)] w-full">
      <div className="w-full flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Branding & Logo */}
        <div className="flex items-center gap-3.5">
          {/* Official Uspeshnyy Logo */}
          <a
            href="https://uspeshnyy.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative flex items-center justify-center p-2 rounded-2xl bg-gradient-to-b from-[#143454]/80 to-[#041426]/90 border border-[#33a4d4]/30 hover:border-[#33a4d4] transition-all duration-300 shadow-[0_0_20px_rgba(51,164,212,0.2)] hover:shadow-[0_0_26px_rgba(51,164,212,0.4)]"
            title="Перейти на сайт uspeshnyy.ru"
          >
            <img
              src="https://storage.googleapis.com/uspeshnyy-projects/uspeshnyy.ru/pages/common/logo.svg"
              alt="Успешный"
              className="w-7 h-8 object-contain drop-shadow-[0_0_12px_rgba(51,164,212,0.7)] group-hover:scale-105 transition-transform"
            />
            {/* Live Indicator Dot */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-[#33a4d4] border-2 border-[#030a14] rounded-full shadow-[0_0_8px_#33a4d4]" />
          </a>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="https://uspeshnyy.ru"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs uppercase tracking-[0.14em] font-extrabold text-[#33a4d4] hover:text-[#5fc1e8] transition-colors drop-shadow-[0_0_12px_rgba(51,164,212,0.5)] flex items-center gap-1"
              >
                Успешный
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
              <span className="text-zinc-600">•</span>
              <h1 className="text-base md:text-lg font-bold tracking-tight text-[#eaf3ff] flex items-center gap-2">
                Студия озвучки
              </h1>
              <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#33a4d4]/10 text-[#5fc1e8] border border-[#33a4d4]/30 font-medium">
                AI Voice & Direction
              </span>
            </div>

            <p className="text-xs text-[#7b8ea6] mt-0.5 flex flex-wrap items-center gap-2">
              <span>Хронометраж: <strong className="text-[#eaf3ff] font-semibold">70.0 сек</strong></span>
              <span className="text-zinc-600">•</span>
              <span>14 сюжетных сцен</span>
              <span className="text-zinc-600">•</span>
              <span className="text-[#33a4d4] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#33a4d4] animate-pulse" />
                Готово: {readyCount} из {totalCount}
              </span>
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Generate All Button (Signature .btn-primary) */}
          <button
            onClick={onGenerateAll}
            disabled={isGeneratingAll}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 active:scale-95 ${
              isGeneratingAll
                ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700'
                : 'bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] font-bold shadow-[0_0_20px_rgba(51,164,212,0.35)] hover:shadow-[0_0_28px_rgba(51,164,212,0.55)] cursor-pointer'
            }`}
            title="Сгенерировать озвучку для всех 14 сцен нейросетью Gemini TTS"
          >
            {isGeneratingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-[#04202b]" />
                <span>Озвучиваем ({readyCount}/{totalCount})...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-[#04202b]" />
                <span>Озвучить всё (1-клик)</span>
              </>
            )}
          </button>

          {/* Fit all tempos with Web Audio API WSOLA */}
          {readyCount > 0 && onSnapAllTempos && (
            <button
              onClick={onSnapAllTempos}
              disabled={isSnappingAll || isGeneratingAll}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs md:text-sm font-medium transition-all shadow-sm active:scale-95 border ${
                isSnappingAll
                  ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border-[#33a4d4]/50'
                  : 'bg-white/[0.03] hover:bg-[#33a4d4]/10 text-[#b6c6da] hover:text-[#5fc1e8] border-[#33a4d4]/25 hover:border-[#33a4d4]'
              }`}
              title="Автоматически подогнать темп во всех озвученных сценах под их хронометраж через Web Audio API"
            >
              {isSnappingAll ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#33a4d4]" />
                  <span>Подгонка темпа...</span>
                </>
              ) : (
                <>
                  <Sliders className="w-4 h-4 text-[#33a4d4]" />
                  <span>Привязать темп ({readyCount})</span>
                </>
              )}
            </button>
          )}

          {/* Generate All Video Prompts Button (Gemini AI) */}
          {onGenerateAllVideoPrompts && (
            <button
              onClick={onGenerateAllVideoPrompts}
              disabled={isGeneratingAllVideoPrompts || isGeneratingAll}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs md:text-sm font-semibold transition-all duration-200 active:scale-95 border ${
                isGeneratingAllVideoPrompts
                  ? 'bg-[#33a4d4]/20 text-[#5fc1e8] border-[#33a4d4]/50'
                  : 'bg-[#33a4d4]/10 hover:bg-[#33a4d4]/20 text-[#5fc1e8] hover:text-white border-[#33a4d4]/35 hover:border-[#33a4d4] cursor-pointer'
              }`}
              title="Сгенерировать подробные видеопромпты (камера, свет, оптика, EN-промпт) для всех 14 сцен через Gemini AI"
            >
              {isGeneratingAllVideoPrompts ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-[#33a4d4]" />
                  <span>Промпты ({videoPromptsCount}/14)...</span>
                </>
              ) : (
                <>
                  <Film className="w-4 h-4 text-[#33a4d4]" />
                  <span>
                    {videoPromptsCount === totalCount ? 'Все 14 промптов (AI)' : `Промпты AI (${videoPromptsCount}/${totalCount})`}
                  </span>
                </>
              )}
            </button>
          )}

          {/* Download Master WAV */}
          <button
            onClick={onDownloadMasterWav}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs md:text-sm font-medium bg-white/[0.03] hover:bg-[#33a4d4]/10 text-[#eaf3ff] hover:text-[#5fc1e8] border border-[#33a4d4]/25 hover:border-[#33a4d4] transition-all shadow-sm active:scale-95 cursor-pointer"
            title="Скачать полную 70-секундную мастер-дорожку в формате WAV для монтажа"
          >
            <Download className="w-4 h-4 text-[#33a4d4]" />
            <span className="hidden sm:inline">Мастер WAV (70с)</span>
            <span className="sm:hidden">WAV</span>
          </button>

          {/* Export SRT */}
          <button
            onClick={onExportSRT}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs md:text-sm font-medium bg-white/[0.03] hover:bg-[#33a4d4]/10 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 hover:border-[#33a4d4]/50 transition-all active:scale-95 cursor-pointer"
            title="Скачать файл субтитров .SRT с точными таймкодами"
          >
            <Volume2 className="w-4 h-4 text-[#33a4d4]" />
            <span>.SRT</span>
          </button>

          {/* Script Text */}
          <button
            onClick={onOpenScriptModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs md:text-sm font-medium bg-white/[0.03] hover:bg-[#33a4d4]/10 text-[#b6c6da] hover:text-[#5fc1e8] border border-[#33a4d4]/20 hover:border-[#33a4d4]/50 transition-all active:scale-95 cursor-pointer"
            title="Просмотреть и скопировать весь сценарий с таймкодами и промптами"
          >
            <FileText className="w-4 h-4 text-[#33a4d4]" />
            <span>Сценарий</span>
          </button>

          {/* Keyboard Shortcuts Trigger Button */}
          {onOpenKeyboardShortcuts && (
            <button
              onClick={onOpenKeyboardShortcuts}
              className="p-2 rounded-full bg-white/[0.03] hover:bg-[#33a4d4]/15 text-[#7b8ea6] hover:text-[#5fc1e8] border border-[#33a4d4]/20 hover:border-[#33a4d4]/50 transition-all active:scale-95 cursor-pointer"
              title="Горячие клавиши (нажмите ?)"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
