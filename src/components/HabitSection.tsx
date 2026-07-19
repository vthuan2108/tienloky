/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Habit } from '../types';
import { CalendarCheck, Trash2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface HabitSectionProps {
  habits: Habit[];
  onAddHabit: (title: string, description?: string) => void;
  onToggleHabitDay: (id: string, date: string) => void;
  onDeleteHabit: (id: string) => void;
}

export default function HabitSection({ habits, onAddHabit, onToggleHabitDay, onDeleteHabit }: HabitSectionProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  // Weekly offset to show different weeks if needed, default to current week
  const getWeekDays = () => {
    const days = [];
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    // Start on Monday
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + mondayOffset + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayLabel = d.toLocaleDateString('vi-VN', { weekday: 'short' });
      days.push({
        dateStr,
        dayLabel,
        isToday: dateStr === today.toISOString().split('T')[0],
        dayNum: d.getDate()
      });
    }
    return days;
  };

  const weekDays = getWeekDays();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddHabit(title, description);
    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  return (
    <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col h-[560px]" id="habit-section">
      <div className="flex items-center justify-between mb-4 shrink-0">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
          <CalendarCheck className="w-4 h-4 text-emerald-400" />
          Nhật Khóa Thói Quen
        </h3>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] bg-slate-900 border border-slate-800 hover:border-emerald-800 hover:text-emerald-400 px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer"
          id="toggle-add-habit-btn"
        >
          {isAdding ? 'Hủy' : '+ Thêm'}
        </button>
      </div>

      {/* Form adding habit */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmit}
            className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl mb-4 space-y-2 shrink-0 overflow-hidden text-xs"
          >
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Tên Thói Quen Luyện Tập</label>
              <input
                type="text"
                required
                placeholder="VD: Luyện phát âm IPA, Chép chính tả..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Mục Tiêu / Chú thích</label>
              <input
                type="text"
                placeholder="VD: 15 phút mỗi ngày lúc sáng sớm..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold text-[10px] py-1 rounded transition-all"
            >
              THIẾT LẬP THÓI QUEN (+15 EXP NHẬN MỖI LẦN)
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Habits List */}
      <div className="flex-1 space-y-4 overflow-y-auto pr-1 min-h-0" id="habit-list-container">
        {habits.length > 0 ? (
          habits.map(habit => {
            return (
              <div
                key={habit.id}
                className="bg-slate-950/30 border border-slate-900 p-3 rounded-xl hover:border-slate-800/80 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-200 truncate">
                        {habit.title}
                      </h4>
                      {habit.streak > 0 && (
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md font-bold font-mono flex items-center gap-0.5" title={`${habit.streak} ngày liên tiếp`}>
                          🔥 {habit.streak} ngày
                        </span>
                      )}
                    </div>
                    {habit.description && (
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{habit.description}</p>
                    )}
                  </div>

                  <button
                    onClick={() => onDeleteHabit(habit.id)}
                    className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer shrink-0"
                    title="Xóa thói quen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Weekly Circular Buttons Checkboxes */}
                <div className="grid grid-cols-7 gap-0.5 bg-slate-950/40 p-1.5 rounded-xl border border-slate-900/80">
                  {weekDays.map(day => {
                    const isCompleted = !!habit.history[day.dateStr];
                    return (
                      <div key={day.dateStr} className="flex flex-col items-center gap-0.5">
                        <button
                          onClick={() => onToggleHabitDay(habit.id, day.dateStr)}
                          className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all cursor-pointer border text-[8px] sm:text-[9px] font-mono font-bold ${
                            isCompleted
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/15'
                              : day.isToday
                              ? 'bg-amber-500/10 border-amber-500/60 text-amber-400'
                              : 'bg-slate-900/40 border-slate-800/80 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          {isCompleted ? '✓' : day.dayNum}
                        </button>
                        <span className={`text-[7px] uppercase tracking-wider font-sans font-medium ${
                          day.isToday ? 'text-amber-400 font-bold' : 'text-slate-500'
                        }`}>
                          {day.dayLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-24 text-slate-600 text-xs flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-700" />
            Nhật khóa trống trơn. Hãy thêm thói quen tốt để tinh tiến!
          </div>
        )}
      </div>
    </div>
  );
}
