import React from 'react';
import { X, Command, Play, FastForward, Rewind, SkipBack, SkipForward, Volume2, Sparkles, Wand2, Download } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    {
      category: 'Управление воспроизведением',
      items: [
        { keys: ['Пробел'], label: 'Воспроизведение / Пауза мастера' },
        { keys: ['←', '→'], label: 'Перемотка назад / вперёд на 5 сек' },
        { keys: ['Shift', '← / →'], label: 'Точная перемотка на 1 сек' },
        { keys: ['Home', 'End'], label: 'Переход в начало (0с) / финал (70с)' },
        { keys: ['M'], label: 'Быстрое включение / выключение голоса' },
        { keys: ['V'], label: 'Заглушить / включить звук загруженного видео (Mute)' },
      ],
    },
    {
      category: 'Навигация по сценам',
      items: [
        { keys: ['['], label: 'Перейти к предыдущей сцене' },
        { keys: [']'], label: 'Перейти к следующей сцене' },
        { keys: ['1-9'], label: 'Быстрый переход к сценам 1–9' },
      ],
    },
    {
      category: 'Быстрые действия студии',
      items: [
        { keys: ['A'], label: 'Озвучить все 14 сцен (Gemini TTS)' },
        { keys: ['P'], label: 'Сгенерировать все видеопромпты (AI)' },
        { keys: ['E'], label: 'Открыть окно экспорта материалов' },
        { keys: ['?'], label: 'Показать эту справку по горячим клавишам' },
      ],
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-2xl bg-[#030a14] rounded-3xl border border-[#33a4d4]/30 shadow-[0_20px_60px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#33a4d4]/15 bg-gradient-to-r from-[#0e2640]/50 to-[#040e1a]/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#33a4d4]/10 text-[#33a4d4] border border-[#33a4d4]/30 shadow-[0_0_12px_rgba(51,164,212,0.3)]">
              <Command className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#eaf3ff] flex items-center gap-2">
                Горячие клавиши студии
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#33a4d4]/10 text-[#5fc1e8] border border-[#33a4d4]/20">
                  Pro Workflow
                </span>
              </h3>
              <p className="text-xs text-[#7b8ea6]">Управляйте озвучкой и монтажом без мыши для максимальной скорости</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#7b8ea6] hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
          {shortcuts.map((group, idx) => (
            <div key={idx} className="space-y-2">
              <h4 className="text-xs uppercase tracking-wider text-[#33a4d4] font-bold">
                {group.category}
              </h4>
              <div className="space-y-1.5">
                {group.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[#02060d]/70 border border-white/[0.04] text-xs hover:border-[#33a4d4]/30 transition-colors"
                  >
                    <span className="text-[#b6c6da]">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, ki) => (
                        <kbd
                          key={ki}
                          className="px-2 py-1 rounded-lg bg-[#0e2640]/80 text-[#eaf3ff] border border-[#33a4d4]/30 font-mono text-[11px] font-semibold shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#02060d]/80 border-t border-[#33a4d4]/15 flex items-center justify-between text-xs text-[#7b8ea6]">
          <span>Клавиши активны, когда курсор не находится в поле ввода текста.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-full bg-[#33a4d4] hover:bg-[#5fc1e8] text-[#04202b] font-bold transition-all cursor-pointer"
          >
            Понятно
          </button>
        </div>
      </div>
    </div>
  );
};
