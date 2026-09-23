import React from 'react';
import { Sparkles, Download, FileText, Wand2, Volume2, RefreshCw } from 'lucide-react';
import { VoiceSegment } from '../types';

interface HeaderProps {
  segments: VoiceSegment[];
  isGeneratingAll: boolean;
  onGenerateAll: () => void;
  onDownloadMasterWav: () => void;
  onExportSRT: () => void;
  onOpenScriptModal: () => void;
  readyCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  segments,
  isGeneratingAll,
  onGenerateAll,
  onDownloadMasterWav,
  onExportSRT,
  onOpenScriptModal,
  readyCount,
}) => {
  const totalCount = segments.length;
  const isAllReady = readyCount === totalCount;

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 lg:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Branding & Info */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-violet-600 text-white shadow-lg shadow-rose-950/40 ring-1 ring-white/20">
            <Sparkles className="w-5 h-5 text-amber-100 animate-pulse" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 border-2 border-zinc-950 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-lg md:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Студия озвучки 70 сек
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium">
                  Женский голос
                </span>
              </h1>
            </div>
            <p className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
              <span>Хронометраж: <strong className="text-zinc-200">70.0 сек</strong></span>
              <span className="text-zinc-600">•</span>
              <span>14 сюжетных сцен</span>
              <span className="text-zinc-600">•</span>
              <span className="text-emerald-400 font-medium">
                Готово: {readyCount} из {totalCount}
              </span>
            </p>
          </div>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          {/* Generate All Button */}
          <button
            onClick={onGenerateAll}
            disabled={isGeneratingAll}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-md active:scale-95 ${
              isGeneratingAll
                ? 'bg-zinc-800 text-zinc-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-900/30'
            }`}
            title="Сгенерировать озвучку для всех 14 сцен нейросетью Gemini TTS"
          >
            {isGeneratingAll ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-rose-300" />
                <span>Озвучиваем ({readyCount}/{totalCount})...</span>
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4 text-amber-200" />
                <span>Озвучить всё (1-клик)</span>
              </>
            )}
          </button>

          {/* Download Master WAV */}
          <button
            onClick={onDownloadMasterWav}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-700/80 transition-all shadow-sm active:scale-95"
            title="Скачать полную 70-секундную мастер-дорожку в формате WAV для монтажа"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Мастер WAV (70с)</span>
            <span className="sm:hidden">WAV</span>
          </button>

          {/* Export SRT */}
          <button
            onClick={onExportSRT}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all active:scale-95"
            title="Скачать файл субтитров .SRT с точными таймкодами"
          >
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span>.SRT</span>
          </button>

          {/* Script Text */}
          <button
            onClick={onOpenScriptModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs md:text-sm font-medium bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-all active:scale-95"
            title="Просмотреть и скопировать весь сценарий с таймкодами"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Сценарий</span>
          </button>
        </div>
      </div>
    </header>
  );
};
