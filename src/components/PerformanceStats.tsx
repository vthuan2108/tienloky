/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { WeeklyChallenge, DailyLog, Task, TodoItem } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Trophy, Award, TrendingUp, Plus, CheckCircle, Compass, Trash2, RefreshCw, Lock, Crown } from 'lucide-react';
import { getRealmInfo } from '../data';

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

interface PerformanceStatsProps {
  challenges: WeeklyChallenge[];
  dailyLogs: DailyLog[];
  onClaimChallenge: (id: string) => void;
  onAddChallenge?: (title: string, targetValue: number, tuViReward: number, linhThachReward: number) => void;
  onProgressChallenge?: (id: string, amount: number) => void;
  onDeleteChallenge?: (id: string) => void;
  tasks: Task[];
  todoItems: TodoItem[];
  currentUser: any;
  leaderboard: any[];
  isFetchingLeaderboard: boolean;
  onRefreshLeaderboard: () => void;
}

export default function PerformanceStats({
  challenges,
  dailyLogs,
  onClaimChallenge,
  onAddChallenge,
  onProgressChallenge,
  onDeleteChallenge,
  tasks,
  todoItems,
  currentUser,
  leaderboard,
  isFetchingLeaderboard,
  onRefreshLeaderboard
}: PerformanceStatsProps) {
  const [activeSubTab, setActiveSubTab] = useState<'STATS' | 'LEADERBOARD'>('STATS');
  const [isAddingChallenge, setIsAddingChallenge] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTarget, setNewTarget] = useState(10);
  const [newTuVi, setNewTuVi] = useState(100);
  const [newLinhThach, setNewLinhThach] = useState(50);

  // Generate 30 days of data ending today for the 1-month meditation line/area chart
  const last30DaysData = [];
  const today = new Date();
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = getLocalDateString(d);
    const realLog = dailyLogs.find(log => log.date === dateStr);
    
    if (realLog) {
      last30DaysData.push({
        date: dateStr,
        meditationMinutes: realLog.meditationMinutes,
        tuViGained: realLog.tuViGained,
        tasksCompleted: realLog.tasksCompleted,
        formattedDate: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
      });
    } else {
      const isLogEmpty = dailyLogs.length === 0;
      // Deterministic fallback mock pattern to make the monthly chart beautiful on first run
      const seedVal = isLogEmpty 
        ? Math.max(0, Math.round(Math.sin((29 - i) * 0.4) * 8 + 15 + ((29 - i) % 4))) 
        : 0;
      last30DaysData.push({
        date: dateStr,
        meditationMinutes: seedVal,
        tuViGained: seedVal * 10,
        tasksCompleted: isLogEmpty ? ((29 - i) % 5 === 0 ? 1 : 0) : 0,
        formattedDate: d.toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric' })
      });
    }
  }

  // Task calculations
  const totalTasks = tasks ? tasks.length : 0;
  const completedTasks = tasks ? tasks.filter(t => t.isCompleted).length : 0;
  const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Todo calculations
  const totalTodos = todoItems ? todoItems.length : 0;
  const completedTodos = todoItems ? todoItems.filter(t => t.isCompleted).length : 0;

  // Overall calculations
  const totalItems = totalTasks + totalTodos;
  const completedItems = completedTasks + completedTodos;
  const overallRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate current month's đại nguyện (todoItems) completion rate
  const localToday = new Date();
  const todayStr = getLocalDateString(localToday);
  const currentYearMonth = todayStr.slice(0, 7); // YYYY-MM
  const monthlyTodos = todoItems ? todoItems.filter(todo => {
    const todoDate = todo.dueDate || todo.createdAt.split('T')[0];
    return todoDate.startsWith(currentYearMonth) && todoDate <= todayStr;
  }) : [];

  const totalMonthlyTodos = monthlyTodos.length;
  const completedMonthlyTodos = monthlyTodos.filter(t => t.isCompleted).length;
  const pendingMonthlyTodos = totalMonthlyTodos - completedMonthlyTodos;
  const monthlyCompletionRate = totalMonthlyTodos > 0 ? Math.round((completedMonthlyTodos / totalMonthlyTodos) * 100) : 0;

  const monthlyPieData = totalMonthlyTodos > 0
    ? [
        { name: 'Đại Nguyện Hoàn Thành', value: completedMonthlyTodos, color: '#10b981' },
        { name: 'Đại Nguyện Chưa Hoàn Thành', value: pendingMonthlyTodos, color: '#f43f5e' }
      ]
    : [
        { name: 'Chưa có đại nguyện tháng này', value: 1, color: '#475569' }
      ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    if (onAddChallenge) {
      onAddChallenge(newTitle.trim(), newTarget, newTuVi, newLinhThach);
      setNewTitle('');
      setIsAddingChallenge(false);
    }
  };

  return (
    <div className="space-y-6" id="performance-stats">
      {/* Sub Tab Switcher */}
      <div className="flex border-b border-slate-900 pb-px text-xs font-bold gap-2">
        <button
          onClick={() => setActiveSubTab('STATS')}
          className={`py-2 px-4 transition-all border-b-2 font-bold cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'STATS'
              ? 'border-amber-500 text-amber-500 bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          📊 Đạo Nhãn Thống Kê
        </button>
        <button
          onClick={() => {
            setActiveSubTab('LEADERBOARD');
            onRefreshLeaderboard();
          }}
          className={`py-2 px-4 transition-all border-b-2 font-bold cursor-pointer flex items-center gap-1.5 ${
            activeSubTab === 'LEADERBOARD'
              ? 'border-amber-500 text-amber-500 bg-amber-950/10'
              : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          ⚔️ Đại Đạo Phong Thần Bảng
        </button>
      </div>

      {activeSubTab === 'STATS' ? (
        <>
          {/* Tỷ Lệ Hoàn Thành Nhiệm Vụ Dashboard */}
          <div className="bg-[#0f141c]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
              <Compass className="w-5 h-5 text-amber-500" />
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">Đạo Nhãn Thông Tuệ - Thống Kê Đắc Đạo</h3>
                <p className="text-[10px] text-slate-500">Chiêm nghiệm tỷ lệ hoàn thành đạo tâm, vượt qua kiếp nạn trì hoãn.</p>
              </div>
            </div>

            <div className="flex justify-center">
              {/* Task Progress Card */}
              <div className="bg-slate-950/40 border border-slate-900/60 rounded-xl p-4 flex items-center gap-4 max-w-md w-full">
                <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="32" cy="32" r="28" stroke="#1e293b" strokeWidth="4.5" fill="transparent" />
                    <circle
                      cx="32"
                      cy="32"
                      r="28"
                      stroke="#a855f7"
                      strokeWidth="4.5"
                      fill="transparent"
                      strokeDasharray={175.9}
                      strokeDashoffset={175.9 - (175.9 * taskCompletionRate) / 100}
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-sm font-black text-slate-100 font-mono">{taskCompletionRate}%</span>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-wide">Tông Môn Nhiệm Vụ</h4>
                  <p className="text-[10px] text-slate-400 mt-1">Đã chém trừ <strong className="text-slate-200 font-mono">{completedTasks}/{totalTasks}</strong> chướng ngại trong Lịch Trình.</p>
                </div>
              </div>
            </div>

            {/* Motivation bar */}
            <div className="bg-slate-950/60 border border-slate-900 p-3 rounded-xl flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-slate-300">
                  {overallRate >= 80 
                    ? "Tông môn hân hoan! Đạo hạnh của đạo hữu cực kỳ kiên định, tâm ma khó lòng xâm lấn."
                    : overallRate >= 50 
                    ? "Khá lắm! Tiến độ tu hành đạt mức trung bình, hãy giữ vững đạo tâm để sớm đột phá đại cảnh giới."
                    : "Cảnh báo! Đạo hữu đang có biểu hiện trì hoãn, hãy bế quan thiền định ngay để chấn hưng tiên phong."}
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-mono hidden md:inline">Đạo Nhãn Thống Kê v2.0</span>
            </div>
          </div>

          {/* Challenges Section */}
          <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">Lôi Kiếp Tuần Hoàn (Weekly Challenges)</h3>
              </div>
              {onAddChallenge && (
                <button
                  onClick={() => setIsAddingChallenge(!isAddingChallenge)}
                  className="flex items-center gap-1 px-3 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded-lg text-xs font-semibold cursor-pointer transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tự Thêm Thử Thách
                </button>
              )}
            </div>

            {isAddingChallenge && (
              <form onSubmit={handleSubmit} className="bg-slate-950/50 border border-slate-800 p-4 rounded-xl mb-5 space-y-3">
                <h4 className="text-xs font-bold text-slate-200">Khai mở thử thách tu hành mới</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 mb-1">Tên thử thách / nhiệm vụ</label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={e => setNewTitle(e.target.value)}
                      placeholder="Ví dụ: Đọc hết 5 đề Cam 18, Giải 10 câu thuật toán..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Mục tiêu (Số lần)</label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={newTarget}
                        onChange={e => setNewTarget(parseInt(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Thưởng Tu Vi</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newTuVi}
                        onChange={e => setNewTuVi(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500 mb-1">Linh Thạch</label>
                      <input
                        type="number"
                        min="0"
                        required
                        value={newLinhThach}
                        onChange={e => setNewLinhThach(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end gap-2 text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingChallenge(false)}
                    className="px-3 py-1 border border-slate-800 text-slate-400 hover:text-slate-300 hover:bg-slate-900 rounded-md cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-amber-500 text-slate-950 font-bold rounded-md hover:bg-amber-600 cursor-pointer"
                  >
                    Xác Nhận Thêm
                  </button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {challenges.map(challenge => {
                const isCompleted = challenge.currentValue >= challenge.targetValue;
                const percentage = Math.min(Math.round((challenge.currentValue / challenge.targetValue) * 100), 100);

                return (
                  <div
                    key={challenge.id}
                    className={`bg-slate-950/40 border p-4 rounded-xl flex flex-col justify-between transition-all ${
                      challenge.isClaimed
                        ? 'border-emerald-950/40 opacity-60'
                        : isCompleted
                        ? 'border-amber-500/40 bg-amber-950/5'
                        : 'border-slate-900'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="text-xs font-bold text-slate-200 leading-snug">{challenge.title}</h4>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {challenge.isClaimed && (
                            <span className="text-[8px] bg-emerald-950 text-emerald-400 border border-emerald-900 px-1.5 py-0.5 rounded-full font-bold uppercase">
                              ĐÃ NHẬN
                            </span>
                          )}
                          {onDeleteChallenge && (
                            <button
                              onClick={() => {
                                onDeleteChallenge(challenge.id);
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded transition-colors cursor-pointer"
                              title="Xóa thử thách"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress info */}
                      <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono">
                        <span>Tiến độ:</span>
                        <div className="flex items-center gap-1.5">
                          <span>
                            {challenge.currentValue} / {challenge.targetValue} ({percentage}%)
                          </span>
                          {!isCompleted && !challenge.isClaimed && onProgressChallenge && (
                            <button
                              onClick={() => onProgressChallenge(challenge.id, 1)}
                              className="px-1.5 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/25 rounded text-[8px] font-bold cursor-pointer transition-all"
                              title="Tăng tiến độ thêm 1 đơn vị"
                            >
                              +1
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isCompleted ? 'bg-amber-500' : 'bg-indigo-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-900 flex justify-between items-center">
                      <div className="text-[9px] font-mono text-slate-500">
                        Phần thưởng: <strong className="text-amber-500 font-bold">+{challenge.tuViReward}t</strong> / +{challenge.linhThachReward}đ
                      </div>

                      {!challenge.isClaimed && (
                        <button
                          onClick={() => onClaimChallenge(challenge.id)}
                          disabled={!isCompleted}
                          className={`px-3 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                            isCompleted
                              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 animate-pulse'
                              : 'bg-slate-900 text-slate-500 border border-slate-950 cursor-not-allowed'
                          }`}
                        >
                          {isCompleted ? 'NHẬN QUÀ' : 'CHƯA ĐẠT'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Productivity Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1-Month Meditation Line Chart */}
            <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Đường Thời Gian Bế Quan Thiền Định (30 Ngày)</h4>
              </div>

              <div className="h-60 text-[10px] font-mono">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={last30DaysData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="formattedDate" stroke="#64748b" />
                    <YAxis stroke="#64748b" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ fontWeight: 'bold', color: '#94a3b8' }}
                    />
                    <Legend iconSize={8} />
                    <Line type="monotone" dataKey="meditationMinutes" name="Thời Gian Bế Quan (Phút)" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Monthly Đại Nguyện Completion Pie Chart */}
            <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Tỉ Lệ Đại Nguyện Hoàn Thành Trong Tháng</h4>
              </div>

              <div className="h-60 text-[10px] font-mono flex items-center justify-center relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={monthlyPieData}
                      cx="50%"
                      cy="45%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {monthlyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0a0d14', borderColor: '#1e293b', borderRadius: '12px' }}
                    />
                    <Legend iconSize={8} layout="horizontal" verticalAlign="bottom" align="center" />
                  </PieChart>
                </ResponsiveContainer>
                {totalMonthlyTodos > 0 && (
                  <div className="absolute top-[40%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none">
                    <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">Hoàn Thành</span>
                    <span className="text-xl font-mono font-black text-emerald-400">{monthlyCompletionRate}%</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Render Leaderboard */
        <div className="bg-[#0f141c]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <div>
                <h3 className="text-sm font-black text-slate-100 uppercase tracking-wider">⚔️ Đại Đạo Phong Thần Bảng</h3>
                <p className="text-[10px] text-slate-500">Nơi vinh danh các đạo hữu có đạo tâm kiên định, tu vi võng lượng.</p>
              </div>
            </div>
            <button
              onClick={onRefreshLeaderboard}
              disabled={isFetchingLeaderboard}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-300 hover:text-slate-100 hover:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isFetchingLeaderboard ? 'animate-spin' : ''}`} />
              CẬP NHẬT
            </button>
          </div>

          {!currentUser ? (
            <div className="bg-slate-950/60 border border-slate-900 p-8 rounded-xl flex flex-col items-center justify-center text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-500">
                <Lock className="w-5 h-5 text-amber-500/60" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-300">Đạo Tâm Chưa Kết Nối Đám Mây</h4>
                <p className="text-[10px] text-slate-500 max-w-[260px] leading-relaxed">
                  Đạo hữu cần đăng nhập Google ở góc phải Header chính để đưa tên mình lên bảng phong thần tông môn!
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/40 text-slate-500 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3">Hạng</th>
                    <th className="py-2 px-3">Đạo Hiệu</th>
                    <th className="py-2 px-3">Cảnh Giới</th>
                    <th className="py-2 px-3 text-right">Tổng Tu Vi</th>
                    <th className="py-2 px-3 text-right">Chuỗi Bế Quan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-900/60 text-slate-300">
                  {leaderboard.length > 0 ? (
                    leaderboard.map((user, idx) => {
                      const isMe = currentUser && user.uid === currentUser.uid;
                      const realmInfo = getRealmInfo(user.level);
                      const rank = idx + 1;

                      return (
                        <tr
                          key={user.uid}
                          className={`hover:bg-slate-950/40 transition-colors ${
                            isMe ? 'bg-amber-950/10 text-amber-400 font-bold border-l-2 border-l-amber-500' : ''
                          }`}
                        >
                          <td className="py-3 px-3 flex items-center gap-1.5">
                            {rank === 1 ? (
                              <Crown className="w-4 h-4 text-amber-400 fill-amber-400/20 animate-bounce" />
                            ) : rank === 2 ? (
                              <span className="text-lg">🥈</span>
                            ) : rank === 3 ? (
                              <span className="text-lg">🥉</span>
                            ) : (
                              <span className="text-slate-500 font-mono pl-1">{rank}</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            <span className={isMe ? 'text-amber-400 font-extrabold' : 'text-slate-200 font-medium'}>
                              {user.userName} {isMe && <span className="text-[8px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-1 py-0.5 rounded-full ml-1 font-bold animate-pulse">Ta</span>}
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`text-[10px] border px-2 py-0.5 rounded-full font-bold ${realmInfo.colorClass} ${realmInfo.bgClass} ${realmInfo.borderClass}`}>
                              {realmInfo.fullName}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-400">
                            {user.totalExp.toLocaleString()} Exp
                          </td>
                          <td className="py-3 px-3 text-right text-orange-400 font-bold">
                            {user.currentStreak > 0 ? `🔥 ${user.currentStreak} ngày` : '0 ngày'}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500 italic">
                        Đang học đòi thần tiên tranh chấp phong thần...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
