/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Task, Priority } from '../types';
import {
  Calendar,
  CheckCircle2,
  Circle,
  Trash2,
  AlertCircle,
  CalendarCheck2,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TaskSectionProps {
  tasks: Task[];
  onAddTask: (title: string, priority: Priority, dueDate: string, description?: string) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskSection({
  tasks,
  onAddTask,
  onToggleTask,
  onDeleteTask
}: TaskSectionProps) {
  const localDate = new Date();
  const year = localDate.getFullYear();
  const month = String(localDate.getMonth() + 1).padStart(2, '0');
  const day = String(localDate.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('SO_CAP');
  const [dueDate, setDueDate] = useState(todayStr);
  const [description, setDescription] = useState('');
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);

  const getDifficultyRank = (p: Priority) => {
    switch (p) {
      case 'THAN_CAP': return 4;
      case 'CAO_CAP': return 3;
      case 'TRUNG_CAP': return 2;
      case 'SO_CAP': return 1;
      default: return 0;
    }
  };

  const todayTasks = tasks
    .filter(task => task.dueDate === todayStr)
    .sort((a, b) => {
      if (a.isCompleted !== b.isCompleted) {
        return a.isCompleted ? 1 : -1;
      }
      return getDifficultyRank(b.priority) - getDifficultyRank(a.priority);
    });

  const handleSubmitTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAddTask(title, priority, dueDate, description);
    setTitle('');
    setDescription('');
    setIsAdding(false);
  };

  const getPriorityInfo = (p: Priority) => {
    switch (p) {
      case 'SO_CAP':
        return { label: 'Sơ Cấp', color: 'text-slate-300 border-slate-800 bg-slate-900/40', xp: 15, stones: 10 };
      case 'TRUNG_CAP':
        return { label: 'Trung Cấp', color: 'text-blue-400 border-blue-900/50 bg-blue-950/20', xp: 30, stones: 20 };
      case 'CAO_CAP':
        return { label: 'Địa Cấp', color: 'text-orange-400 border-orange-900/50 bg-orange-950/20', xp: 60, stones: 40 };
      case 'THAN_CAP':
        return { label: 'Thiên Cấp', color: 'text-amber-400 border-amber-500/30 bg-amber-950/10', xp: 120, stones: 80 };
    }
  };

  const getLeftBorderColor = (p: Priority) => {
    switch (p) {
      case 'TRUNG_CAP': return 'border-l-2 border-l-blue-500/70';
      case 'CAO_CAP': return 'border-l-2 border-l-orange-500/70';
      case 'THAN_CAP': return 'border-l-2 border-l-amber-500/70';
      default: return 'border-l-2 border-l-slate-600/40';
    }
  };

  const handleDeleteWithConfirm = (task: Task) => {
    setDeletingTask(task);
  };

  const confirmDeleteTask = () => {
    if (!deletingTask) return;
    onDeleteTask(deletingTask.id);
    setDeletingTask(null);
  };

  return (
    <div className="bg-[#0f141c]/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl flex flex-col h-[520px]" id="task-section">
      {/* Header Panel */}
      <div className="flex items-center justify-between mb-4 shrink-0 border-b border-slate-900 pb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-amber-400 animate-pulse" />
            Nhiệm Vụ Trong Ngày (Tasks)
          </h3>
          <p className="text-[10px] text-slate-500">Mục tiêu rèn luyện trong ngày để bứt phá cảnh giới</p>
        </div>
        
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="text-[10px] bg-slate-950 border border-slate-900 hover:border-amber-800 hover:text-amber-400 px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1"
          id="toggle-add-task-btn"
        >
          <Plus className="w-3 h-3" />
          {isAdding ? 'Hủy' : 'Thêm Nhiệm Vụ'}
        </button>
      </div>

      {/* Form to add task */}
      <AnimatePresence>
        {isAdding && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSubmitTask}
            className="bg-slate-950/60 border border-slate-900 p-3.5 rounded-xl mb-4 space-y-2.5 shrink-0 overflow-hidden"
          >
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Tên Nhiệm Vụ</label>
                <input
                  type="text"
                  required
                  placeholder="VD: Viết Essay Task 2..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Mức Độ</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                  className="w-full bg-slate-950 border border-slate-900 rounded px-1.5 py-1 text-xs text-slate-300 focus:outline-none cursor-pointer"
                >
                  <option value="SO_CAP">Sơ Cấp (Trắng)</option>
                  <option value="TRUNG_CAP">Trung Cấp (Lam)</option>
                  <option value="CAO_CAP">Địa Cấp (Cam)</option>
                  <option value="THAN_CAP">Thiên Cấp (Vàng)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Hạn Hoàn Thành</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold block mb-0.5">Mô tả thêm</label>
                <input
                  type="text"
                  placeholder="Ghi chú chi tiết..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-900 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-slate-950 font-bold text-[10px] py-1.5 rounded transition-all tracking-wider"
            >
              XUẤT SƯ ĐẠI ĐIỂN (+ THÊM NHIỆM VỤ)
            </button>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Task Scroll List */}
      <div className="flex-1 overflow-y-auto pr-1 space-y-2 min-h-0" id="task-list-scroller">
        {todayTasks.length > 0 ? (
          todayTasks.map(task => {
            const info = getPriorityInfo(task.priority);
            return (
              <div
                key={task.id}
                className={`bg-slate-950/40 border border-slate-900 p-3 rounded-xl hover:border-slate-800 transition-all flex items-start gap-3 ${
                  task.isCompleted ? 'opacity-50 select-none' : ''
                } ${getLeftBorderColor(task.priority)}`}
              >
                <button
                  onClick={() => onToggleTask(task.id)}
                  className="text-slate-500 hover:text-amber-400 mt-0.5 cursor-pointer shrink-0"
                >
                  {task.isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-500" />
                  ) : (
                    <Circle className="w-4 h-4" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-xs font-bold text-slate-200 truncate ${task.isCompleted ? 'line-through text-slate-500' : ''}`}>
                      {task.title}
                    </h4>
                    <span className={`text-[8px] border px-1.5 py-0.5 rounded-full font-bold uppercase shrink-0 ${info?.color}`}>
                      {info?.label}
                    </span>
                  </div>

                  {task.description && (
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{task.description}</p>
                  )}

                  <div className="flex items-center justify-between mt-2 text-[9px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-600" />
                      Hạn: {task.dueDate}
                    </span>
                    <span className="text-amber-500/80 font-bold">
                      +{info?.xp} EXP / +{info?.stones} Đá
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDeleteWithConfirm(task)}
                  className="text-slate-600 hover:text-rose-400 p-1 rounded hover:bg-slate-900 cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })
        ) : (
          <div className="text-center py-24 text-slate-600 text-xs flex flex-col items-center gap-2">
            <AlertCircle className="w-5 h-5 text-slate-700" />
            Động phủ nhàn hạ. Chưa có nhiệm vụ nào trong ngày hôm nay!
          </div>
        )}
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deletingTask && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0f141c] border border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="text-center space-y-2">
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20">
                  <Trash2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wide">
                  Xóa Nhiệm Vụ
                </h3>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                  Đạo hữu có chắc chắn muốn xóa Nhiệm Vụ: <span className="text-amber-400 font-bold">"{deletingTask.title}"</span>? Hành động này không thể hoàn tác.
                </p>
              </div>

              <div className="flex gap-2 font-bold text-[10px]">
                <button
                  onClick={() => setDeletingTask(null)}
                  className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 rounded-xl cursor-pointer transition-colors"
                >
                  HỦY BỎ
                </button>
                <button
                  onClick={confirmDeleteTask}
                  className="flex-1 py-2 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-slate-100 rounded-xl cursor-pointer transition-all shadow-lg shadow-rose-500/10"
                >
                  XÁC NHẬN XÓA
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
