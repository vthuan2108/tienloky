/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, TimeBlock } from '../types';
import {
  CheckCircle2,
  Circle,
  Trash2,
  Clock,
  Bell,
  BellOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface DailyScheduleProps {
  tasks: Task[];
  timeBlocks: TimeBlock[];
  onAddTimeBlock: (title: string, startHour: number, startMinute: number, durationMinutes: number, date: string, taskId?: string) => void;
  onDeleteTimeBlock: (id: string) => void;
  onToggleTimeBlock: (id: string) => void;
  notificationPermission: 'default' | 'granted' | 'denied';
  onRequestNotificationPermission: () => void;
}

export default function DailySchedule({
  tasks,
  timeBlocks,
  onAddTimeBlock,
  onDeleteTimeBlock,
  onToggleTimeBlock,
  notificationPermission,
  onRequestNotificationPermission
}: DailyScheduleProps) {
  const [isAddingBlock, setIsAddingBlock] = useState(false);
  const [blockTitle, setBlockTitle] = useState('');
  const [blockHour, setBlockHour] = useState(8);
  const [blockMinute, setBlockMinute] = useState(0);
  const [blockDuration, setBlockDuration] = useState(60);
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0]);
  const [associatedTaskId, setAssociatedTaskId] = useState<string>('');

  // Timeline Hours list (5 AM to 11 PM)
  const hours = Array.from({ length: 19 }, (_, i) => i + 5);
  const currentHour = new Date().getHours();

  // Find blocks for active date
  const activeBlocks = timeBlocks.filter(b => b.date === blockDate);

  const handleAddCustomBlock = (e: React.FormEvent) => {
    e.preventDefault();
    
    let titleToUse = blockTitle.trim();
    let selectedTaskId: string | undefined = undefined;

    if (associatedTaskId) {
      const foundTask = tasks.find(t => t.id === associatedTaskId);
      if (foundTask) {
        titleToUse = foundTask.title;
        selectedTaskId = foundTask.id;
      }
    }

    if (!titleToUse) return;

    onAddTimeBlock(titleToUse, blockHour, blockMinute, blockDuration, blockDate, selectedTaskId);
    setBlockTitle('');
    setAssociatedTaskId('');
    setIsAddingBlock(false);
  };

  // Remaining active tasks for scheduler association
  const activeTasks = tasks.filter(t => !t.isCompleted);

  return (
    <div className="bg-[#0f141c]/80 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col h-[520px]" id="daily-schedule-meditation">
      {/* Header Panel */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-xs font-bold text-slate-100 flex items-center gap-2 uppercase tracking-wider">
            <Clock className="w-4 h-4 text-amber-500 animate-pulse" />
            Lập Lịch Tu Luyện (Timeline)
          </h3>
          <p className="text-[9px] text-slate-500">Phân bổ thời gian ngưng tụ linh lực hằng ngày</p>
        </div>

        <button
          onClick={() => setIsAddingBlock(!isAddingBlock)}
          className="text-[9px] bg-slate-950 border border-slate-900 hover:border-amber-800 hover:text-amber-400 px-2 py-1 rounded-lg font-bold transition-all cursor-pointer"
        >
          {isAddingBlock ? 'Hủy' : '+ Lập Lịch'}
        </button>
      </div>

      {/* Date Selector & Notifications Toggle */}
      <div className="flex items-center justify-between bg-slate-950/60 p-2 rounded-xl mb-3 border border-slate-900 shrink-0 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[8px] text-slate-500 uppercase tracking-widest font-black">Lịch:</span>
          <input
            type="date"
            value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px] text-slate-300 focus:outline-none"
          />
        </div>

        {/* Notification Permission toggle */}
        <button
          onClick={onRequestNotificationPermission}
          className={`text-[8px] font-bold py-1 px-2 rounded flex items-center gap-1 transition-colors cursor-pointer ${
            notificationPermission === 'granted'
              ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-amber-400'
          }`}
          title="Nhắc nhở tới giờ tu luyện"
        >
          {notificationPermission === 'granted' ? (
            <>
              <Bell className="w-2.5 h-2.5 text-emerald-400 animate-bounce" />
              Chuông bật
            </>
          ) : (
            <>
              <BellOff className="w-2.5 h-2.5 text-slate-500" />
              Chuông tắt
            </>
          )}
        </button>
      </div>

      {/* Block form overlay */}
      <AnimatePresence>
        {isAddingBlock && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleAddCustomBlock}
            className="bg-slate-950/90 border border-slate-900 p-3 rounded-xl mb-3 space-y-2.5 shrink-0 overflow-hidden text-xs"
          >
            {activeTasks.length > 0 && (
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Liên kết Tông Môn Nhiệm Vụ (Tùy chọn)</label>
                <select
                  value={associatedTaskId}
                  onChange={(e) => {
                    setAssociatedTaskId(e.target.value);
                    const t = activeTasks.find(x => x.id === e.target.value);
                    if (t) setBlockTitle(t.title);
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
                >
                  <option value="">-- Chọn nhiệm vụ cần bế quan --</option>
                  {activeTasks.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
            )}

            {!associatedTaskId && (
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Tiêu đề khung giờ</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Luyện Writing, Nghe IELTS Cam..."
                  value={blockTitle}
                  onChange={(e) => setBlockTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Giờ bắt đầu</label>
                <select
                  value={blockHour}
                  onChange={(e) => setBlockHour(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px] text-slate-300"
                >
                  {hours.map(h => (
                    <option key={h} value={h}>{h.toString().padStart(2, '0')}:00</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Phút</label>
                <select
                  value={blockMinute}
                  onChange={(e) => setBlockMinute(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1.5 py-0.5 text-[10px]"
                >
                  <option value={0}>00</option>
                  <option value={30}>30</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-slate-500 block mb-0.5">Thời lượng</label>
                <select
                  value={blockDuration}
                  onChange={(e) => setBlockDuration(parseInt(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-1 py-0.5 text-[10px]"
                >
                  <option value={30}>30p</option>
                  <option value={60}>60p</option>
                  <option value={90}>90p</option>
                  <option value={120}>120p</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 text-slate-950 font-bold text-[10px] py-1.5 rounded transition-all"
            >
              THIẾT LẬP THỜI GIAN TRẬN
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Hourly Timeline list */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-1 min-h-0 border-t border-slate-900/60 pt-1.5" id="timeline-hours-scroller">
        {hours.map(hour => {
          const hourBlocks = activeBlocks.filter(b => b.startHour === hour);
          const isCurrent = currentHour === hour;

          return (
            <div
              key={hour}
              className={`group min-h-10 border-b border-slate-900/40 p-1 flex gap-2 rounded-lg transition-all ${
                isCurrent ? 'bg-amber-500/5 border-l-2 border-l-amber-500/60' : 'hover:bg-slate-950/10'
              }`}
            >
              {/* Time label column */}
              <div className="w-10 text-[9px] font-mono text-slate-500 flex flex-col justify-between shrink-0 select-none">
                <span className={`font-semibold ${isCurrent ? 'text-amber-400' : ''}`}>
                  {hour.toString().padStart(2, '0')}:00
                </span>
                <span className="text-[7px] text-slate-600">
                  {(hour + 1).toString().padStart(2, '0')}:00
                </span>
              </div>

              {/* Block detail content space */}
              <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
                {hourBlocks.length > 0 ? (
                  hourBlocks.map(block => (
                    <div
                      key={block.id}
                      className={`border px-2 py-1 rounded-lg flex items-center justify-between gap-1.5 shadow transition-all ${
                        block.isCompleted
                          ? 'bg-emerald-950/10 border-emerald-900/30 opacity-60'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1 flex items-center gap-1.5">
                        <button
                          onClick={() => onToggleTimeBlock(block.id)}
                          className="text-slate-500 hover:text-emerald-400 shrink-0 cursor-pointer"
                        >
                          {block.isCompleted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Circle className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <span className={`text-[10px] font-bold truncate text-slate-200 ${
                          block.isCompleted ? 'line-through text-slate-500' : ''
                        }`}>
                          {block.title}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 opacity-100 group-hover:opacity-100 transition-opacity">
                        <span className="text-[7px] font-mono bg-slate-900 text-slate-500 px-1 rounded">
                          {block.durationMinutes}p
                        </span>
                        <button
                          onClick={() => onDeleteTimeBlock(block.id)}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                          title="Xóa kế hoạch"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <span className="text-[8px] text-slate-700 italic select-none">
                    Trống lịch
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
