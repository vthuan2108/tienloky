/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { StoreItem, WeeklyChallenge } from './types';

export const STORE_ITEMS: StoreItem[] = [
  {
    id: 'tu_khi_dan',
    name: 'Tụ Khí Đan (Sơ Cấp)',
    description: 'Thần dược khai thông kinh mạch. Khi bế quan tu luyện (Pomodoro) nhận thêm +25% Tu Vi tích lũy.',
    cost: 40,
    type: 'CONSUMABLE',
    effectType: 'POMODORO_XP',
    effectValue: 0.25,
    icon: '🔮'
  },
  {
    id: 'tu_linh_tran',
    name: 'Tụ Linh Trận Pháp',
    description: 'Bảo trận thu thập linh khí tự nhiên. Giúp nhận thụ động +2 Tu Vi mỗi 5 giây khi đang bế quan thiền định.',
    cost: 120,
    type: 'CONSUMABLE', // Keep as consumable for single session activation
    effectType: 'SUCCESS_RATE',
    effectValue: 1,
    icon: '🌀'
  },
  {
    id: 'ho_tam_kinh',
    name: 'Hộ Tâm Kính',
    description: 'Bảo vật phòng thân tối thượng. Bảo vệ đạo tâm khỏi bị tiêu hao Tu Vi nếu chẳng may đột phá thất bại.',
    cost: 80,
    type: 'CONSUMABLE',
    effectType: 'SUCCESS_RATE',
    effectValue: 1.0,
    icon: '🛡️'
  },
  {
    id: 'dao_tam_phu',
    name: 'Đạo Tâm Phù (Bảo Vệ Streak)',
    description: 'Thần phù bảo hộ đạo tâm. Khi sử dụng, lập tức tăng thêm +1 ngày liên tiếp (streak) cho tất cả các thói quen hiện có để giữ vững phong độ tu luyện.',
    cost: 50,
    type: 'CONSUMABLE',
    effectType: 'SUCCESS_RATE',
    effectValue: 1.0,
    icon: '📜'
  },
  {
    id: 'linh_chi_duoc',
    name: 'Linh Chi Đại Bổ Hoàn',
    description: 'Dược lực bồi bổ nguyên khí thâm sâu. Nhận ngay lập tức +100 Tu Vi khi sử dụng.',
    cost: 60,
    type: 'CONSUMABLE',
    effectType: 'INSTANT_XP',
    effectValue: 100,
    icon: '🍄'
  },
  {
    id: 'thanh_tam_phu',
    name: 'Thanh Tâm Phù',
    description: 'Linh phù tịnh hóa tâm cảnh. Trấn áp và hóa giải trạng thái "Tâm Ma Xâm Nhập" trong ngày hôm nay, khôi phục hiệu suất tu luyện 100%.',
    cost: 60,
    type: 'CONSUMABLE',
    effectType: 'SUCCESS_RATE',
    effectValue: 1.0,
    icon: '☯️'
  }
];

export const DEFAULT_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'challenge_meditation',
    title: 'Bế Quan Vượt Giới (Thiền Định 120 phút)',
    targetType: 'MEDITATION_MINUTES',
    targetValue: 120,
    currentValue: 0,
    tuViReward: 150,
    linhThachReward: 100,
    isClaimed: false
  },
  {
    id: 'challenge_tasks',
    title: 'Giải Quyết Tâm Ma (Hoàn thành 10 nhiệm vụ)',
    targetType: 'TASKS_COMPLETED',
    targetValue: 10,
    currentValue: 0,
    tuViReward: 200,
    linhThachReward: 120,
    isClaimed: false
  },
  {
    id: 'challenge_habits',
    title: 'Gìn Giữ Đạo Tâm (Tích lũy 15 lượt thói quen)',
    targetType: 'HABITS_COMPLETED',
    targetValue: 15,
    currentValue: 0,
    tuViReward: 180,
    linhThachReward: 100,
    isClaimed: false
  }
];

export interface RealmInfo {
  name: string;
  subName: string;
  fullName: string;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  xpNeeded: number;
}

export const getRealmInfo = (level: number): RealmInfo => {
  const realms = [
    { name: 'Luyện Khí Kỳ', color: 'text-slate-400', bg: 'bg-slate-950/60', border: 'border-slate-800' },      // levels 1-9
    { name: 'Trúc Cơ Kỳ', color: 'text-blue-400', bg: 'bg-blue-950/20', border: 'border-blue-900/50' },       // levels 10-18
    { name: 'Kim Đan Kỳ', color: 'text-emerald-400', bg: 'bg-emerald-950/20', border: 'border-emerald-900/50' }, // levels 19-27
    { name: 'Nguyên Anh Kỳ', color: 'text-purple-400', bg: 'bg-purple-950/20', border: 'border-purple-900/50' }, // levels 28-36
    { name: 'Hóa Thần Kỳ', color: 'text-amber-400', bg: 'bg-amber-950/20', border: 'border-amber-900/50' },   // levels 37-45
    { name: 'Luyện Hư Kỳ', color: 'text-rose-400', bg: 'bg-rose-950/20', border: 'border-rose-900/50' }        // levels 46-54
  ];

  const realmIndex = Math.min(Math.floor((level - 1) / 9), realms.length - 1);
  const currentRealm = realms[realmIndex];
  const stage = ((level - 1) % 9) + 1;
  const stageWords = ['Sơ Kỳ - Tầng 1', 'Sơ Kỳ - Tầng 2', 'Sơ Kỳ - Tầng 3', 'Trung Kỳ - Tầng 4', 'Trung Kỳ - Tầng 5', 'Trung Kỳ - Tầng 6', 'Hậu Kỳ - Tầng 7', 'Hậu Kỳ - Tầng 8', 'Đại Viên Mãn'];
  const subName = stageWords[stage - 1];

  // Base XP formula: increases with level
  // lvl 1 needs 100 XP, lvl 50 needs around 5000 XP
  const xpNeeded = Math.round(100 * Math.pow(1.08, level - 1));

  return {
    name: currentRealm.name,
    subName,
    fullName: `${currentRealm.name} (${subName})`,
    colorClass: currentRealm.color,
    bgClass: currentRealm.bg,
    borderClass: currentRealm.border,
    xpNeeded
  };
};
