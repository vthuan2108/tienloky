/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Task,
  Habit,
  StoreItem,
  WeeklyChallenge,
  CultivationState,
  DailyLog,
  IeltsTestLog,
  IeltsTargets,
  TimeBlock,
  Priority,
  TodoItem,
  CultivationManual,
  CultivationNote
} from './types';
import { DEFAULT_CHALLENGES, getRealmInfo } from './data';
import CultivationHeader from './components/CultivationHeader';
import MeditationTimer from './components/MeditationTimer';
import TaskSection from './components/TaskSection';
import HabitSection from './components/HabitSection';
import TreasureStore from './components/TreasureStore';
import PerformanceStats from './components/PerformanceStats';
import IeltsMockTestLog from './components/IeltsMockTestLog';
import StreakGrid from './components/StreakGrid';
import TodoSection from './components/TodoSection';
import ForbiddenNotes from './components/ForbiddenNotes';
import DailyRituals from './components/DailyRituals';
import CultivationManualsSection from './components/CultivationManualsSection';
import { initAuth, googleSignIn, logout as firebaseLogout } from './lib/firebase';
import { saveUserDataToCloud, loadUserDataFromCloud } from './lib/firestoreSync';
import { User } from 'firebase/auth';
import {
  Download,
  Flame,
  LogOut,
  Upload,
  CheckCircle,
  Compass as CompassIcon,
  ListTodo,
  Sparkles,
  Lock,
  BookOpen,
  Scroll,
  LogIn,
  Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function App() {
  // --- STATE SYSTEM ---
  const [userName, setUserName] = useState<string>(() => {
    return localStorage.getItem('tlk_username') || 'Tiêu Đạo Hữu';
  });

  const [planningCompletedDate, setPlanningCompletedDate] = useState<string>(() => {
    return localStorage.getItem('tlk_planning_completed_date') || '';
  });

  const [reflectionCompletedDate, setReflectionCompletedDate] = useState<string>(() => {
    return localStorage.getItem('tlk_reflection_completed_date') || '';
  });

  const [activeTab, setActiveTab] = useState<string>(() => {
    return localStorage.getItem('tlk_active_tab') || 'MEDITATION';
  });

  const [isFocusMode, setIsFocusMode] = useState<boolean>(() => {
    return localStorage.getItem('tlk_is_focus_mode') === 'true';
  });

  const [todoItems, setTodoItems] = useState<TodoItem[]>(() => {
    const savedTodos = localStorage.getItem('tlk_todos');
    const savedTasks = localStorage.getItem('tlk_tasks');
    
    let parsedTodos: TodoItem[] = [];
    if (savedTodos) {
      try { 
        parsedTodos = JSON.parse(savedTodos); 
        parsedTodos = parsedTodos.map(todo => ({
          ...todo,
          createdAt: todo.createdAt || new Date().toISOString()
        }));
      } catch (e) {}
    }
    
    let parsedTasks: Task[] = [];
    if (savedTasks) {
      try { parsedTasks = JSON.parse(savedTasks); } catch (e) {}
    }
    
    if (parsedTodos.length > 0) {
      // If there are saved tasks that aren't represented in todos by title, merge them in!
      const todoTitles = new Set(parsedTodos.map(t => t.title.toLowerCase().trim()));
      parsedTasks.forEach(task => {
        const cleanedTitle = task.title.toLowerCase().trim();
        if (!todoTitles.has(cleanedTitle)) {
          let type: 'DAY' | 'WEEK' | 'MONTH' = 'DAY';
          if (task.priority === 'CAO_CAP') type = 'WEEK';
          else if (task.priority === 'THAN_CAP') type = 'MONTH';
          
          parsedTodos.push({
            id: task.id,
            title: task.title,
            type,
            isCompleted: task.isCompleted,
            createdAt: task.createdAt || new Date().toISOString(),
            completedAt: task.completedAt,
            tuViReward: task.tuViReward,
            linhThachReward: task.linhThachReward,
            dueDate: task.dueDate
          });
          todoTitles.add(cleanedTitle);
        }
      });
      return parsedTodos;
    }
    
    if (parsedTasks.length > 0) {
      return parsedTasks.map(task => {
        let type: 'DAY' | 'WEEK' | 'MONTH' = 'DAY';
        if (task.priority === 'CAO_CAP') type = 'WEEK';
        else if (task.priority === 'THAN_CAP') type = 'MONTH';
        return {
          id: task.id,
          title: task.title,
          type,
          isCompleted: task.isCompleted,
          createdAt: task.createdAt || new Date().toISOString(),
          completedAt: task.completedAt,
          tuViReward: task.tuViReward,
          linhThachReward: task.linhThachReward,
          dueDate: task.dueDate
        };
      });
    }

    return [
      {
        id: 'todo_def_1',
        title: 'Bế quan nghe chép chính tả IELTS Section 2',
        type: 'DAY',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        tuViReward: 15,
        linhThachReward: 5,
        dueDate: getLocalDateString()
      },
      {
        id: 'todo_def_2',
        title: 'Luyện 1 Đề Cam 19 full Reading & phân tích đáp án',
        type: 'WEEK',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        tuViReward: 45,
        linhThachReward: 15,
        dueDate: getLocalDateString()
      },
      {
        id: 'todo_def_3',
        title: 'Hoàn thành bứt phá mục tiêu IELTS Overall tăng 0.5 band',
        type: 'MONTH',
        isCompleted: false,
        createdAt: new Date().toISOString(),
        tuViReward: 120,
        linhThachReward: 40,
        dueDate: getLocalDateString()
      }
    ];
  });

  const [cultState, setCultState] = useState<CultivationState>(() => {
    const saved = localStorage.getItem('tlk_cult_state');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return {
      totalExp: 0,
      currentExp: 0,
      level: 1,
      linhThach: 100,
      spiritStonesEarned: 100,
      meditationMinutes: 0,
      tasksCompletedCount: 0,
      habitsCompletedCount: 0,
      shieldActive: false,
      inventory: [],
      unlockedRealms: ['Luyện Khí Kỳ']
    };
  });

  const tasks: Task[] = todoItems
    .map(todo => {
      let priority: Priority = 'SO_CAP';
      if (todo.tuViReward >= 120) priority = 'THAN_CAP';
      else if (todo.tuViReward >= 60) priority = 'CAO_CAP';
      else if (todo.tuViReward >= 30) priority = 'TRUNG_CAP';

      return {
        id: todo.id,
        title: todo.title,
        description: todo.type === 'WEEK' ? 'Đại Nguyện Hàng Tuần' : todo.type === 'MONTH' ? 'Đại Nguyện Hàng Tháng' : 'Đại Nguyện Hằng Ngày',
        priority,
        isCompleted: todo.isCompleted,
        dueDate: todo.dueDate || getLocalDateString(new Date(todo.createdAt)),
        createdAt: todo.createdAt,
        completedAt: todo.completedAt,
        tuViReward: todo.tuViReward,
        linhThachReward: todo.linhThachReward
      };
    });

  const [habits, setHabits] = useState<Habit[]>(() => {
    const saved = localStorage.getItem('tlk_habits');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      {
        id: 'default_habit_1',
        title: 'Tập phát âm IPA chuẩn IELTS Speaking',
        description: 'Luyện 15 phút gương mặt & cơ miệng',
        createdAt: new Date().toISOString(),
        streak: 0,
        history: {}
      },
      {
        id: 'default_habit_2',
        title: 'Viết nhật ký Tiếng Anh',
        description: 'Viết 5 câu kể về ngày hôm nay',
        createdAt: new Date().toISOString(),
        streak: 0,
        history: {}
      }
    ];
  });

  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>(() => {
    const saved = localStorage.getItem('tlk_timeblocks');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [ieltsLogs, setIeltsLogs] = useState<IeltsTestLog[]>(() => {
    const saved = localStorage.getItem('tlk_ielts_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      {
        id: 'log_initial',
        testName: 'IELTS Cambridge 18 Test 1 (Luyện Tập)',
        listening: 6.5,
        reading: 7.0,
        writing: 6.0,
        speaking: 6.5,
        overall: 6.5,
        date: getLocalDateString(),
        notes: 'Cần trau dồi bài thi viết nhiều hơn.'
      }
    ];
  });

  const [ieltsTargets, setIeltsTargets] = useState<IeltsTargets>(() => {
    const saved = localStorage.getItem('tlk_ielts_targets');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return { listening: 7.0, reading: 7.0, writing: 6.5, speaking: 6.5, overall: 7.0 };
  });

  const [camBooksList, setCamBooksList] = useState<number[]>(() => {
    const saved = localStorage.getItem('tlk_cam_books_list');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [19, 18, 17, 16, 15];
  });

  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>(() => {
    const saved = localStorage.getItem('tlk_daily_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [];
  });

  const [challenges, setChallenges] = useState<WeeklyChallenge[]>(() => {
    const saved = localStorage.getItem('tlk_challenges');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return DEFAULT_CHALLENGES;
  });

  const [manuals, setManuals] = useState<CultivationManual[]>(() => {
    const saved = localStorage.getItem('tlk_manuals');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      {
        id: 'manual_initial',
        name: 'Thái Cổ Thần Quyết - Luyện IELTS Reading',
        category: 'Ngoại Ngữ',
        tier: 'THIEN',
        stages: [
          { id: 'stage_init_1', title: 'Tầng 1: Lĩnh hội kỹ nghệ Skimming & Scanning', isCompleted: true, tuViReward: 35 },
          { id: 'stage_init_2', title: 'Tầng 2: Vượt ải Multiple Choice & Matching Headings', isCompleted: false, tuViReward: 35 },
          { id: 'stage_init_3', title: 'Tầng 3: Đoạt cơ duyên True/False/Not Given', isCompleted: false, tuViReward: 35 }
        ],
        status: 'DANG_TU_LUYEN',
        createdAt: getLocalDateString()
      }
    ];
  });

  const [notes, setNotes] = useState<CultivationNote[]>(() => {
    const saved = localStorage.getItem('tlk_forbidden_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { /* fallback */ }
    }
    return [
      {
        id: 'welcome_note_1',
        title: 'Bí Kíp Tu Tiên Vô Song',
        content: 'Chào mừng Đạo hữu đến với Cấm Địa Tông Môn. Nơi đây dùng để lưu trữ các mật thư, công pháp và bí kíp tu luyện riêng tư.\n\n- Ấn nút ghim để Trấn điện mật thư lên đầu trang.\n- Thay đổi linh lực màu sắc của mật tịch theo các phẩm cấp.\n- Tìm kiếm dễ dàng bằng Thần Nhãn Tìm Kiếm.\n- Nhấp trực tiếp vào mật tịch để tinh sửa.',
        isPinned: true,
        color: 'indigo',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
    ];
  });

  useEffect(() => {
    localStorage.setItem('tlk_forbidden_notes', JSON.stringify(notes));
  }, [notes]);

  // --- GOOGLE LOGIN & CLOUD SYNC STATES ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  // Focus mode task focus state
  const [focusSelectedTaskId, setFocusSelectedTaskId] = useState<string>('');

  // --- SAVE SYSTEM SYNC ---
  useEffect(() => {
    localStorage.setItem('tlk_username', userName);
  }, [userName]);

  useEffect(() => {
    localStorage.setItem('tlk_planning_completed_date', planningCompletedDate);
  }, [planningCompletedDate]);

  useEffect(() => {
    localStorage.setItem('tlk_reflection_completed_date', reflectionCompletedDate);
  }, [reflectionCompletedDate]);

  useEffect(() => {
    localStorage.setItem('tlk_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('tlk_is_focus_mode', isFocusMode ? 'true' : 'false');
  }, [isFocusMode]);

  useEffect(() => {
    localStorage.setItem('tlk_cult_state', JSON.stringify(cultState));
  }, [cultState]);

  useEffect(() => {
    localStorage.setItem('tlk_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('tlk_habits', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('tlk_timeblocks', JSON.stringify(timeBlocks));
  }, [timeBlocks]);

  useEffect(() => {
    localStorage.setItem('tlk_ielts_logs', JSON.stringify(ieltsLogs));
  }, [ieltsLogs]);

  useEffect(() => {
    localStorage.setItem('tlk_ielts_targets', JSON.stringify(ieltsTargets));
  }, [ieltsTargets]);

  useEffect(() => {
    localStorage.setItem('tlk_cam_books_list', JSON.stringify(camBooksList));
  }, [camBooksList]);

  useEffect(() => {
    localStorage.setItem('tlk_daily_logs', JSON.stringify(dailyLogs));
  }, [dailyLogs]);

  useEffect(() => {
    localStorage.setItem('tlk_challenges', JSON.stringify(challenges));
  }, [challenges]);

  useEffect(() => {
    localStorage.setItem('tlk_manuals', JSON.stringify(manuals));
  }, [manuals]);

  useEffect(() => {
    localStorage.setItem('tlk_todos', JSON.stringify(todoItems));
  }, [todoItems]);

  // --- GOOGLE AUTH & CLOUD SYNC EFFECTS ---
  const handleAuthSuccess = async (user: User) => {
    setCurrentUser(user);
    setIsCloudSyncing(true);
    try {
      const cloudData = await loadUserDataFromCloud(user.uid);
      if (cloudData) {
        if (confirm(`✨ PHÁT HIỆN ĐẠO QUẢ TRÊN ĐÁM MÂY!\n\nChào mừng Đạo hữu ${cloudData.userName} quay trở lại.\nĐạo hữu có muốn đồng bộ tiến trình tu luyện mới nhất từ đám mây xuống trình duyệt này không?`)) {
          setUserName(cloudData.userName);
          setPlanningCompletedDate(cloudData.planningCompletedDate);
          setReflectionCompletedDate(cloudData.reflectionCompletedDate);
          setTodoItems(cloudData.todoItems || []);
          setHabits(cloudData.habits || []);
          setCultState(cloudData.cultState);
          setDailyLogs(cloudData.dailyLogs || []);
          setIeltsLogs(cloudData.ieltsLogs || []);
          setIeltsTargets(cloudData.ieltsTargets);
          setCamBooksList(cloudData.camBooksList || []);
          setManuals(cloudData.manuals || []);
          setNotes(cloudData.notes || []);
          
          localStorage.setItem('tlk_username', cloudData.userName);
          localStorage.setItem('tlk_planning_completed_date', cloudData.planningCompletedDate);
          localStorage.setItem('tlk_reflection_completed_date', cloudData.reflectionCompletedDate);
          localStorage.setItem('tlk_todos', JSON.stringify(cloudData.todoItems || []));
          localStorage.setItem('tlk_habits', JSON.stringify(cloudData.habits || []));
          localStorage.setItem('tlk_cult_state', JSON.stringify(cloudData.cultState));
          localStorage.setItem('tlk_daily_logs', JSON.stringify(cloudData.dailyLogs || []));
          localStorage.setItem('tlk_ielts_logs', JSON.stringify(cloudData.ieltsLogs || []));
          localStorage.setItem('tlk_ielts_targets', JSON.stringify(cloudData.ieltsTargets));
          localStorage.setItem('tlk_cam_books_list', JSON.stringify(cloudData.camBooksList || []));
          localStorage.setItem('tlk_manuals', JSON.stringify(cloudData.manuals || []));
          localStorage.setItem('tlk_forbidden_notes', JSON.stringify(cloudData.notes || []));
          
          alert('✨ Đồng bộ đạo quả thành công!');
        }
      } else {
        // Initial upload of current local state
        const localData = {
          userName,
          planningCompletedDate,
          reflectionCompletedDate,
          todoItems,
          tasks: [],
          habits,
          challenges,
          cultState,
          dailyLogs,
          ieltsLogs,
          ieltsTargets,
          camBooksList,
          manuals,
          notes,
        };
        await saveUserDataToCloud(user.uid, localData);
      }
    } catch (error) {
      console.error('Error loading user data from cloud:', error);
    } finally {
      setIsCloudSyncing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, _token) => {
        await handleAuthSuccess(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  // Debounced auto-sync to cloud when states change
  useEffect(() => {
    if (!currentUser) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        const dataToSave = {
          userName,
          planningCompletedDate,
          reflectionCompletedDate,
          todoItems,
          tasks: [],
          habits,
          challenges,
          cultState,
          dailyLogs,
          ieltsLogs,
          ieltsTargets,
          camBooksList,
          manuals,
          notes,
        };
        await saveUserDataToCloud(currentUser.uid, dataToSave);
        console.log('☁️ Auto-synced data to Firebase Firestore');
      } catch (e) {
        console.error('Auto-sync failed:', e);
      }
    }, 3000);
    
    return () => clearTimeout(timeoutId);
  }, [
    currentUser,
    userName,
    planningCompletedDate,
    reflectionCompletedDate,
    todoItems,
    habits,
    challenges,
    cultState,
    dailyLogs,
    ieltsLogs,
    ieltsTargets,
    camBooksList,
    manuals,
    notes,
  ]);

  // --- CULTIVATION CORE ACTIONS ---

  const checkTamMaActive = (): boolean => {
    const today = getLocalDateString();
    
    // 1. Check if there are overdue tasks by 2 or more days
    const hasOverdue2Days = todoItems.some(todo => {
      if (todo.isCompleted) return false;
      
      const dueDateStr = todo.dueDate || (todo.createdAt ? todo.createdAt.split('T')[0] : today);
      if (!dueDateStr) return false;

      try {
        const timeDiff = new Date(today).getTime() - new Date(dueDateStr).getTime();
        if (isNaN(timeDiff)) return false;
        const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        return daysDiff >= 2;
      } catch (e) {
        return false;
      }
    });

    if (hasOverdue2Days) return true;

    // 2. Check if there has been no activity for 3 or more days
    const activeLogs = dailyLogs.filter(log => log.meditationMinutes > 0 || log.tasksCompleted > 0);
    if (activeLogs.length > 0) {
      const sortedActive = activeLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const latestActiveDate = sortedActive[0].date;
      const timeDiff = new Date(today).getTime() - new Date(latestActiveDate).getTime();
      const daysSinceLastActive = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
      if (daysSinceLastActive >= 3) {
        return true;
      }
    }
    return false;
  };

  const addExp = (amount: number, stones: number) => {
    const today = getLocalDateString();
    const isTamMa = checkTamMaActive() && cultState.tamMaSuppressedDate !== today;
    const adjustedAmount = isTamMa && amount > 0 ? Math.round(amount * 0.7) : amount;

    setCultState(prev => {
      const newCurrentExp = Math.max(0, prev.currentExp + adjustedAmount);
      const newTotalExp = Math.max(0, prev.totalExp + adjustedAmount);
      const newLinhThach = Math.max(0, prev.linhThach + stones);
      const newStonesEarned = Math.max(0, prev.spiritStonesEarned + stones);

      // Log stats inside daily logs
      updateDailyLog(adjustedAmount, 0, 0);

      return {
        ...prev,
        currentExp: newCurrentExp,
        totalExp: newTotalExp,
        linhThach: newLinhThach,
        spiritStonesEarned: newStonesEarned
      };
    });
  };

  const updateDailyLog = (tuViGained: number, minutesMeditation: number, tasksDone: number) => {
    const today = getLocalDateString();
    setDailyLogs(prev => {
      const existing = prev.find(l => l.date === today);
      if (existing) {
        return prev.map(l => l.date === today ? {
          ...l,
          tuViGained: Math.max(0, l.tuViGained + tuViGained),
          meditationMinutes: Math.max(0, l.meditationMinutes + minutesMeditation),
          tasksCompleted: Math.max(0, l.tasksCompleted + tasksDone)
        } : l);
      } else {
        return [...prev, {
          date: today,
          tuViGained: Math.max(0, tuViGained),
          meditationMinutes: Math.max(0, minutesMeditation),
          tasksCompleted: Math.max(0, tasksDone)
        }];
      }
    });
  };

  const updateChallengeValue = (type: WeeklyChallenge['targetType'], increment: number) => {
    setChallenges(prev => {
      return prev.map(ch => {
        if (ch.targetType === type && !ch.isClaimed) {
          return {
            ...ch,
            currentValue: ch.currentValue + increment
          };
        }
        return ch;
      });
    });
  };

  // --- BREAKTHROUGH SYSTEM ---
  const handleBreakthrough = (success: boolean) => {
    const realmInfo = getRealmInfo(cultState.level);
    const xpNeeded = realmInfo.xpNeeded;

    if (success) {
      setCultState(prev => {
        const nextLevel = prev.level + 1;
        const remainingExp = Math.max(prev.currentExp - xpNeeded, 0);
        const unlockedRealms = [...prev.unlockedRealms];
        const nextRealmInfo = getRealmInfo(nextLevel);
        
        if (!unlockedRealms.includes(nextRealmInfo.name)) {
          unlockedRealms.push(nextRealmInfo.name);
        }

        return {
          ...prev,
          level: nextLevel,
          currentExp: remainingExp,
          unlockedRealms
        };
      });
    } else {
      // Failed breakthrough
      setCultState(prev => {
        if (prev.shieldActive) {
          // Protected by Ho Tam Kinh shield
          return {
            ...prev,
            shieldActive: false // consume shield
          };
        } else {
          // Lose 10% of xpNeeded as a penalty
          const penalty = Math.round(xpNeeded * 0.1);
          const newExp = Math.max(prev.currentExp - penalty, 0);
          return {
            ...prev,
            currentExp: newExp
          };
        }
      });
    }
  };

  // --- COMPONENT HANDLERS ---

  // Tasks
  const handleAddTask = (title: string, priority: Priority, dueDate: string, _desc?: string) => {
    // All tasks are daily tasks (type: 'DAY')
    let tuViReward = 15;
    let linhThachReward = 10;
    if (priority === 'TRUNG_CAP') {
      tuViReward = 30;
      linhThachReward = 20;
    } else if (priority === 'CAO_CAP') {
      tuViReward = 60;
      linhThachReward = 40;
    } else if (priority === 'THAN_CAP') {
      tuViReward = 120;
      linhThachReward = 80;
    }

    const newTodo: TodoItem = {
      id: `todo_${Date.now()}`,
      title,
      type: 'DAY',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      tuViReward,
      linhThachReward,
      dueDate: dueDate || getLocalDateString()
    };
    setTodoItems(prev => [newTodo, ...prev]);
  };

  const handleToggleTask = (id: string) => {
    handleToggleTodo(id);
  };

  const handleDeleteTask = (id: string) => {
    handleDeleteTodo(id);
  };

  // Habits
  const handleAddHabit = (title: string, description?: string) => {
    const newHabit: Habit = {
      id: `habit_${Date.now()}`,
      title,
      description,
      createdAt: new Date().toISOString(),
      streak: 0,
      history: {}
    };
    setHabits(prev => [newHabit, ...prev]);
  };

  const calculateHabitStreak = (history: Record<string, boolean>): number => {
    const activeDays = Object.keys(history).filter(d => history[d]);
    if (activeDays.length === 0) return 0;

    const sortedDates = Array.from(new Set(activeDays))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const todayDateStr = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = yesterdayDate.toISOString().split('T')[0];

    // If the latest completed date is neither today nor yesterday, streak is broken
    if (sortedDates[0] !== todayDateStr && sortedDates[0] !== yesterdayDateStr) {
      return 0;
    }

    let streak = 0;
    let currentDateToCheck = new Date(sortedDates[0]);

    for (let i = 0; i < sortedDates.length; i++) {
      const logDate = new Date(sortedDates[i]);
      const diffTime = Math.abs(currentDateToCheck.getTime() - logDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        streak++;
      } else if (diffDays === 1) {
        streak++;
        currentDateToCheck = logDate;
      } else {
        break;
      }
    }
    return streak;
  };

  const healCultivationGaps = () => {
    setDailyLogs(prev => {
      if (!prev || prev.length === 0) return prev;
      
      const activeDays = prev
        .filter(log => log.meditationMinutes > 0 || log.tasksCompleted > 0)
        .map(log => log.date);
        
      if (activeDays.length === 0) return prev;
      
      const sortedDates = Array.from(new Set(activeDays))
        .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
        
      const firstDate = new Date(sortedDates[0]);
      const today = new Date();
      const todayStr = getLocalDateString(today);
      
      const newLogs = [...prev];
      
      let curr = new Date(firstDate);
      while (getLocalDateString(curr) <= todayStr) {
        const dateStr = getLocalDateString(curr);
        const existing = newLogs.find(l => l.date === dateStr);
        if (!existing) {
          newLogs.push({
            date: dateStr,
            tuViGained: 0,
            meditationMinutes: 1, // mark as active with 1 minute bế quan
            tasksCompleted: 0
          });
        } else if (existing.meditationMinutes === 0 && existing.tasksCompleted === 0) {
          existing.meditationMinutes = 1; // activate
        }
        curr.setDate(curr.getDate() + 1);
      }
      return newLogs;
    });
  };

  const healHabitGaps = (h: Habit): Habit => {
    const dates = Object.keys(h.history).filter(d => h.history[d]);
    if (dates.length === 0) return h;
    
    const sorted = dates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const firstDate = new Date(sorted[0]);
    const today = new Date();
    const todayStr = getLocalDateString(today);
    
    const newHistory = { ...h.history };
    
    let curr = new Date(firstDate);
    while (getLocalDateString(curr) <= todayStr) {
      const dateStr = getLocalDateString(curr);
      newHistory[dateStr] = true;
      curr.setDate(curr.getDate() + 1);
    }
    
    const streak = calculateHabitStreak(newHistory);
    
    return {
      ...h,
      history: newHistory,
      streak
    };
  };

  const handleToggleHabitDay = (id: string, date: string) => {
    setHabits(prev => {
      return prev.map(h => {
        if (h.id === id) {
          const isCompleted = !h.history[date];
          const newHistory = { ...h.history, [date]: isCompleted };
          const streak = calculateHabitStreak(newHistory);

          if (isCompleted) {
            addExp(15, 5); // Constant 15 XP and 5 Coins for habit ticking
            updateChallengeValue('HABITS_COMPLETED', 1);
            setCultState(c => ({ ...c, habitsCompletedCount: c.habitsCompletedCount + 1 }));
          } else {
            addExp(-15, -5); // Deduct 15 XP and 5 Coins when unchecking
            updateChallengeValue('HABITS_COMPLETED', -1);
            setCultState(c => ({ ...c, habitsCompletedCount: Math.max(0, c.habitsCompletedCount - 1) }));
          }

          return {
            ...h,
            history: newHistory,
            streak,
            lastCompletedDate: isCompleted ? date : h.lastCompletedDate
          };
        }
        return h;
      });
    });
  };

  const handleDeleteHabit = (id: string) => {
    setHabits(prev => prev.filter(h => h.id !== id));
  };

  // --- TODO LIST HANDLERS ---
  const handleAddTodo = (title: string, difficulty: Priority, dueDate?: string, googleTaskId?: string) => {
    let tuViReward = 15;
    let linhThachReward = 5;

    if (difficulty === 'TRUNG_CAP') {
      tuViReward = 30;
      linhThachReward = 15;
    } else if (difficulty === 'CAO_CAP') {
      tuViReward = 60;
      linhThachReward = 35;
    } else if (difficulty === 'THAN_CAP') {
      tuViReward = 120;
      linhThachReward = 75;
    }

    const newTodo: TodoItem = {
      id: `todo_${Date.now()}`,
      title,
      type: 'DAY',
      isCompleted: false,
      createdAt: new Date().toISOString(),
      tuViReward,
      linhThachReward,
      dueDate: dueDate || getLocalDateString(),
      googleTaskId,
      difficulty
    };
    setTodoItems(prev => [newTodo, ...prev]);
  };

  const handleSyncTodos = (syncedTodos: TodoItem[]) => {
    setTodoItems(syncedTodos);
  };

  const handleToggleTodo = (id: string) => {
    setTodoItems(prev => {
      return prev.map(t => {
        if (t.id === id) {
          const nextCompleted = !t.isCompleted;
          if (nextCompleted) {
            addExp(t.tuViReward, t.linhThachReward);
            updateDailyLog(0, 0, 1);
            updateChallengeValue('TASKS_COMPLETED', 1);
            setCultState(c => ({ ...c, tasksCompletedCount: c.tasksCompletedCount + 1 }));
          } else {
            addExp(-t.tuViReward, -t.linhThachReward); // Deduct reward if unchecked
            updateDailyLog(0, 0, -1);
            updateChallengeValue('TASKS_COMPLETED', -1);
            setCultState(c => ({ ...c, tasksCompletedCount: Math.max(0, c.tasksCompletedCount - 1) }));
          }
          return {
            ...t,
            isCompleted: nextCompleted,
            completedAt: nextCompleted ? new Date().toISOString() : undefined
          };
        }
        return t;
      });
    });
  };

  const handleDeleteTodo = (id: string) => {
    setTodoItems(prev => prev.filter(t => t.id !== id));
  };

  // Shop & Consumables
  const handleBuyItem = (item: StoreItem) => {
    if (cultState.linhThach < item.cost) return;
    setCultState(prev => {
      const inventory = [...prev.inventory];
      const existing = inventory.find(i => i.itemId === item.id);
      
      if (existing) {
        existing.quantity += 1;
      } else {
        inventory.push({ itemId: item.id, quantity: 1 });
      }

      return {
        ...prev,
        linhThach: prev.linhThach - item.cost,
        inventory
      };
    });
  };

  const handleUseConsumable = (itemId: string) => {
    const hasItem = cultState.inventory.some(i => i.itemId === itemId && i.quantity > 0);
    if (!hasItem) return;

    if (itemId === 'linh_chi_duoc') {
      // Consume, grant 100 Exp instantly
      addExp(100, 0);
      consumeItemFromInventory(itemId);
    } else if (itemId === 'ho_tam_kinh') {
      // Activate breakthrough safeguard shield
      setCultState(prev => ({
        ...prev,
        shieldActive: true
      }));
      consumeItemFromInventory(itemId);
    } else if (itemId === 'dao_tam_phu') {
      // Heal cultivation gaps and habit gaps to restore streaks
      healCultivationGaps();
      setHabits(prev => prev.map(h => healHabitGaps(h)));
      alert('⚡ Đạo Tâm Phù đã kích hoạt! Toàn bộ ngày chưa hoàn thành trong quá khứ đã được bồi đắp linh khí, hoàn trả lại chuỗi ngày tu luyện (Cultivation) và thói quen tông môn (Habit Streak) trước khi mất!');
      consumeItemFromInventory(itemId);
    } else if (itemId === 'thanh_tam_phu') {
      // Activate Tam Ma suppression
      setCultState(prev => ({
        ...prev,
        tamMaSuppressedDate: getLocalDateString()
      }));
      consumeItemFromInventory(itemId);
      alert('☯️ Đạo hữu đã kích hoạt Thanh Tâm Phù! Tâm cảnh ngay lập tức được tịnh hóa, tà khí tiêu tan, khôi phục hiệu suất hấp thụ Tu Vi 100% trong ngày hôm nay.');
    } else if (itemId === 'tu_khi_dan' || itemId === 'tu_linh_tran') {
      // Activating passive arrays/pills is done automatically during pomodoro when owned!
      // Display advice or let them use it to get instant message confirmation
      alert(`Đan dược ${itemId === 'tu_khi_dan' ? 'Tụ Khí Đan' : 'Tụ Linh Trận'} đã có sẵn trong đạo phủ. Tác dụng phụ trợ sẽ tự động được kích hoạt khi bạn bế quan thiền định (Pomodoro)!`);
    }
  };

  const consumeItemFromInventory = (itemId: string) => {
    setCultState(prev => {
      const inventory = prev.inventory.map(i => {
        if (i.itemId === itemId) {
          return { ...i, quantity: i.quantity - 1 };
        }
        return i;
      }).filter(i => i.quantity > 0);

      return {
        ...prev,
        inventory
      };
    });
  };

  // Challenges
  const handleAddChallenge = (title: string, targetValue: number, tuViReward: number, linhThachReward: number) => {
    const newChallenge: WeeklyChallenge = {
      id: `challenge_${Date.now()}`,
      title,
      targetType: 'TASKS_COMPLETED',
      currentValue: 0,
      targetValue,
      tuViReward,
      linhThachReward,
      isClaimed: false
    };
    setChallenges(prev => [newChallenge, ...prev]);
  };

  const handleProgressChallenge = (id: string, amount: number = 1) => {
    setChallenges(prev => prev.map(ch => {
      if (ch.id === id && !ch.isClaimed) {
        return { ...ch, currentValue: Math.min(ch.currentValue + amount, ch.targetValue) };
      }
      return ch;
    }));
  };

  const handleClaimChallenge = (id: string) => {
    setChallenges(prev => prev.map(ch => {
      if (ch.id === id && ch.currentValue >= ch.targetValue && !ch.isClaimed) {
        addExp(ch.tuViReward, ch.linhThachReward);
        return { ...ch, isClaimed: true };
      }
      return ch;
    }));
  };

  const handleDeleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(ch => ch.id !== id));
  };

  // Meditation Complete callback
  const handleMeditationComplete = (minutes: number) => {
    // 25 minutes Pomodoro gives 50 Base XP (+ potential pill buff of +25%) and 50 Linh Thach
    const pillMultiplier = cultState.inventory.some(i => i.itemId === 'tu_khi_dan') ? 0.25 : 0;
    const expGained = Math.round(50 * (1 + pillMultiplier));
    const coinsGained = 30;

    addExp(expGained, coinsGained);
    updateDailyLog(0, minutes, 0);
    updateChallengeValue('MEDITATION_MINUTES', minutes);
    setCultState(prev => ({ ...prev, meditationMinutes: prev.meditationMinutes + minutes }));

    // If Tu Khi Dan pill is used, consume one
    if (pillMultiplier > 0) {
      consumeItemFromInventory('tu_khi_dan');
    }
  };

  // Passive Qi Meditation Tick
  const handlePassiveQiTick = (tuViGained: number) => {
    addExp(tuViGained, 0);
  };

  // --- IELTS MOCK TEST SCORE LOGGER ---
  const handleAddIeltsLog = (
    testName: string,
    listening: number,
    reading: number,
    writing: number,
    speaking: number,
    date: string,
    notes?: string
  ) => {
    const overall = (listening + reading + writing + speaking) / 4;
    // Exactly round overall
    const base = Math.floor(overall);
    const decimal = overall - base;
    let roundedOverall = base;
    if (decimal >= 0.25 && decimal < 0.75) roundedOverall = base + 0.5;
    else if (decimal >= 0.75) roundedOverall = base + 1;

    const newLog: IeltsTestLog = {
      id: `ielts_${Date.now()}`,
      testName,
      listening,
      reading,
      writing,
      speaking,
      overall: roundedOverall,
      date,
      notes
    };
    setIeltsLogs(prev => [newLog, ...prev]);

    // Logging IELTS Mock test grants great spiritual Tu Vi! (150 Tu Vi & 100 Linh Thach)
    addExp(150, 100);
  };

  const handleDeleteIeltsLog = (id: string) => {
    setIeltsLogs(prev => prev.filter(l => l.id !== id));
  };

  const handleUpdateIeltsLog = (updatedLog: IeltsTestLog) => {
    setIeltsLogs(prev => prev.map(l => l.id === updatedLog.id ? updatedLog : l));
  };

  // --- DATA BACKUP IMPORT/EXPORT ---
  const handleExportData = () => {
    const backupObj = {
      userName,
      cultState,
      tasks,
      habits,
      timeBlocks,
      ieltsLogs,
      dailyLogs,
      challenges,
      todoItems,
      manuals
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tien_lo_ky_backup_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (!file) return;

    fileReader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.userName) setUserName(parsed.userName);
        if (parsed.cultState) setCultState(parsed.cultState);
        if (parsed.habits) setHabits(parsed.habits);
        if (parsed.timeBlocks) setTimeBlocks(parsed.timeBlocks);
        if (parsed.ieltsLogs) setIeltsLogs(parsed.ieltsLogs);
        if (parsed.dailyLogs) setDailyLogs(parsed.dailyLogs);
        if (parsed.challenges) setChallenges(parsed.challenges);
        if (parsed.manuals) setManuals(parsed.manuals);
        
        if (parsed.todoItems) {
          setTodoItems(parsed.todoItems);
        } else if (parsed.tasks) {
          // Convert legacy tasks to todoItems
          const converted: TodoItem[] = parsed.tasks.map((task: any) => {
            let type: 'DAY' | 'WEEK' | 'MONTH' = 'DAY';
            if (task.priority === 'CAO_CAP') type = 'WEEK';
            else if (task.priority === 'THAN_CAP') type = 'MONTH';
            return {
              id: task.id,
              title: task.title,
              type,
              isCompleted: task.isCompleted,
              createdAt: task.createdAt || new Date().toISOString(),
              completedAt: task.completedAt,
              tuViReward: task.tuViReward,
              linhThachReward: task.linhThachReward,
              dueDate: task.dueDate
            };
          });
          setTodoItems(converted);
        }

        alert('⚡ Chân truyền khôi phục thành công! Đạo phủ đã đồng bộ toàn bộ dữ liệu lưu trữ.');
      } catch (err) {
        alert('❌ Pháp bảo truyền tin thất bại. File JSON backup không hợp lệ.');
      }
    };
    fileReader.readAsText(file);
  };

  // Focus Mode checkbox completion
  const handleFocusTaskComplete = (taskId: string) => {
    handleToggleTask(taskId);
    setFocusSelectedTaskId('');
  };

  // Calculations for Cultivation Profile stats
  const todayStrStr = getLocalDateString();
  const todayActiveLog = dailyLogs.find(l => l.date === todayStrStr);
  const todayMeditationMinutes = todayActiveLog ? todayActiveLog.meditationMinutes : 0;

  const getCultivationStreak = (): number => {
    if (!dailyLogs || dailyLogs.length === 0) return 0;
    const activeDays = dailyLogs
      .filter(log => log.meditationMinutes > 0 || log.tasksCompleted > 0)
      .map(log => log.date);

    if (activeDays.length === 0) return 0;

    const sortedDates = Array.from(new Set(activeDays))
      .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

    const todayDateStr = getLocalDateString();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayDateStr = getLocalDateString(yesterdayDate);

    if (sortedDates[0] !== todayDateStr && sortedDates[0] !== yesterdayDateStr) {
      return 0;
    }

    let streak = 0;
    let currentDateToCheck = new Date(sortedDates[0]);

    for (let i = 0; i < sortedDates.length; i++) {
      const logDate = new Date(sortedDates[i]);
      const diffTime = Math.abs(currentDateToCheck.getTime() - logDate.getTime());
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        streak++;
      } else if (diffDays === 1) {
        streak++;
        currentDateToCheck = logDate;
      } else {
        break;
      }
    }
    return streak;
  };
  const cultivationStreak = getCultivationStreak();

  const todayStr = getLocalDateString();
  const currentYearMonth = todayStr.slice(0, 7); // "YYYY-MM"
  const monthlyTasksUpToToday = tasks.filter(t => {
    return t.dueDate.startsWith(currentYearMonth) && t.dueDate <= todayStr;
  });

  const totalTasksCount = monthlyTasksUpToToday.length;
  const completedTasksCount = monthlyTasksUpToToday.filter(t => t.isCompleted).length;
  const taskCompletionRatePercentage = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

  return (
    <div className="min-h-screen text-slate-300 relative selection:bg-amber-500/20 selection:text-amber-300" id="main-applet-container">
      {/* Immersive background stars pattern */}
      <div className="absolute inset-0 bg-[#070a0f] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-30 -z-10" />

      {/* Immersive purple vignette tà khí overlay if Tam Ma is active */}
      {checkTamMaActive() && cultState.tamMaSuppressedDate !== getLocalDateString() && (
        <div className="fixed inset-0 pointer-events-none shadow-[inset_0_0_80px_rgba(168,85,247,0.18)] z-50 animate-pulse border-2 border-purple-500/10" />
      )}

      {/* RENDER MODE A: FOCUS MODE */}
      <AnimatePresence>
        {isFocusMode ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#05070a] z-40 flex flex-col items-center justify-center p-4 overflow-y-auto"
            id="focus-mode-view"
          >
            {/* Ambient zen grid background */}
            <div className="absolute inset-0 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:32px_32px] opacity-5 -z-10" />

            <div className="max-w-xl w-full flex flex-col items-center space-y-6 my-auto">
              {/* Focus mode header */}
              <div className="text-center space-y-1">
                <span className="text-[10px] font-bold font-mono tracking-widest text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-3 py-1 rounded-full uppercase">
                  Cảnh Giới Bế Quan Tập Trung
                </span>
                <h1 className="text-xl font-bold text-slate-200 uppercase tracking-widest mt-2">Đạo Tâm Nhất Thống</h1>
                <p className="text-xs text-slate-500">Giảm bớt xao nhãng, toàn lực khắc chế tâm ma học tập.</p>
              </div>

              {/* Timer Center */}
              <div className="w-full">
                <MeditationTimer
                  state={cultState}
                  onMeditationComplete={handleMeditationComplete}
                  onPassiveQiTick={handlePassiveQiTick}
                  isFocusMode={isFocusMode}
                  onToggleFocusMode={() => setIsFocusMode(false)}
                />
              </div>

              {/* Focusing task panel */}
              <div className="bg-[#0f141c] border border-slate-800/80 p-5 rounded-2xl w-full text-center space-y-3 shadow-xl">
                <h3 className="text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 uppercase">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  Nhiệm Vụ Đang Khắc Chế
                </h3>

                {tasks.filter(t => !t.isCompleted).length > 0 ? (
                  <div className="space-y-3">
                    <select
                      value={focusSelectedTaskId}
                      onChange={(e) => setFocusSelectedTaskId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-emerald-500 cursor-pointer"
                    >
                      <option value="">-- Chọn nhiệm vụ muốn tập trung làm --</option>
                      {tasks.filter(t => !t.isCompleted).map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                    </select>

                    {focusSelectedTaskId && (
                      <div className="p-3 bg-emerald-950/10 border border-emerald-900/30 rounded-xl flex items-center justify-between gap-3 text-left">
                        <span className="text-xs font-semibold text-slate-200">
                          {tasks.find(t => t.id === focusSelectedTaskId)?.title}
                        </span>
                        <button
                          onClick={() => handleFocusTaskComplete(focusSelectedTaskId)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-slate-950 font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          HOÀN THÀNH
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic">Đạo phủ hiện không có nhiệm vụ tồn đọng nào!</p>
                )}
              </div>

              {/* Exit button */}
              <button
                onClick={() => setIsFocusMode(false)}
                className="text-[10px] text-slate-500 hover:text-rose-400 font-bold border border-slate-900 hover:border-rose-900/40 bg-slate-950/60 px-5 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                id="exit-focus-btn"
              >
                <LogOut className="w-3.5 h-3.5" />
                XUẤT QUAN (QUAY LẠI TÔNG MÔN)
              </button>
            </div>
          </motion.div>
        ) : (
          /* RENDER MODE B: MAIN HUB VIEW */
          <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
            {/* Top Navigation Bar / Metadata Backup Row */}
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f141c]/60 border border-slate-800/80 px-5 py-3 rounded-2xl shadow-lg shrink-0">
              <div className="flex items-center gap-2">
                <CompassIcon className="w-5 h-5 text-amber-500 animate-spin-slow" />
                <h1 className="text-sm font-extrabold uppercase tracking-widest text-slate-100 font-sans">
                  Tiên Lộ Ký <span className="text-[10px] text-amber-500 font-semibold font-mono">v1.1</span>
                </h1>
              </div>

              {/* Import / Export & Notification Alert controllers */}
              <div className="flex items-center gap-3">
                {/* Backup buttons */}
                <div className="flex bg-slate-950 border border-slate-900/60 p-0.5 rounded-lg text-[10px]">
                  <button
                    onClick={handleExportData}
                    className="p-1 px-2 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    title="Xuất sao lưu dữ liệu ra file JSON"
                  >
                    <Download className="w-3 h-3 text-slate-500" />
                    Sao Lưu
                  </button>

                  <label
                    className="p-1 px-2 hover:bg-slate-900 text-slate-400 hover:text-slate-200 rounded transition-colors flex items-center gap-1 font-semibold cursor-pointer"
                    title="Khôi phục dữ liệu từ file backup JSON"
                  >
                    <Upload className="w-3 h-3 text-slate-500" />
                    Khôi Phục
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportData}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Google Sign-in / Cloud Status Profile Widget */}
                {currentUser ? (
                  <div className="flex items-center gap-2 bg-slate-950 border border-slate-900/60 p-1.5 rounded-lg text-[10px] font-sans">
                    {/* User Google Avatar */}
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName || 'Avatar'} 
                        className="w-4 h-4 rounded-full border border-amber-500/50" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] flex items-center justify-center">
                        {(currentUser.displayName || 'Đ').charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* User display name & Cloud Sync indicator */}
                    <div className="flex flex-col text-left max-w-28 shrink-0">
                      <span className="font-bold text-slate-200 truncate">{currentUser.displayName || 'Đạo Hữu'}</span>
                      <span className="text-[7.5px] text-emerald-400 font-mono flex items-center gap-0.5 leading-none">
                        {isCloudSyncing ? (
                          <span className="w-1.5 h-1.5 rounded-full border border-t-transparent border-emerald-400 animate-spin" />
                        ) : (
                          <Cloud className="w-2 h-2 animate-pulse" />
                        )}
                        Đám Mây
                      </span>
                    </div>

                    {/* Logout button */}
                    <button
                      onClick={async () => {
                        if (confirm('Đạo hữu có chắc chắn muốn đăng xuất và ngắt kết nối với đám mây?')) {
                          await firebaseLogout();
                          alert('Đã đăng xuất thành công.');
                        }
                      }}
                      className="ml-1 bg-rose-950/40 hover:bg-rose-900 border border-rose-900/40 text-rose-400 px-2 py-0.5 rounded text-[8px] font-bold uppercase transition-colors cursor-pointer"
                    >
                      Đăng xuất
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={async () => {
                      try {
                        const result = await googleSignIn();
                        if (result) {
                          await handleAuthSuccess(result.user);
                        }
                      } catch (e) {
                        alert('Đăng nhập Google thất bại. Đạo hữu vui lòng kiểm tra cấu hình domain hoặc thử lại.');
                      }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-extrabold text-[9px] rounded-lg uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-amber-950/20"
                  >
                    <LogIn className="w-3.5 h-3.5 stroke-[2.5]" />
                    Đăng Nhập Google
                  </button>
                )}
              </div>
            </header>

            {/* Profile Cultivation level banner */}
            <CultivationHeader
              state={cultState}
              onRename={setUserName}
              onBreakthrough={handleBreakthrough}
              userName={userName}
            />

            {/* Cảnh báo Tâm Ma Xâm Nhập */}
            {checkTamMaActive() && cultState.tamMaSuppressedDate !== getLocalDateString() && (
              <div className="bg-purple-950/25 border border-purple-900/60 rounded-2xl p-4 shadow-lg flex items-center justify-between gap-4 font-sans text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/15 border border-purple-500/25 rounded-xl text-purple-400 animate-bounce">
                    💀
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-purple-300 font-extrabold uppercase tracking-wide flex items-center gap-1.5">
                      Tâm Ma Xâm Nhập Đạo Phủ!
                      <span className="text-[9px] bg-rose-500/15 text-rose-400 border border-rose-500/25 px-2 py-0.5 rounded-full uppercase font-bold tracking-normal font-mono animate-pulse">
                        Hiệu suất Tu Vi -30%
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Đan điền đang bị tà khí bủa vây do trì hoãn đại nguyện quá hạn hoặc lười thiền định. Hãy hoàn thành các việc trễ hạn ngay, hoặc vào Tàng Bảo Các đổi Linh Thạch lấy <strong>Thanh Tâm Phù</strong> để giải trừ tà khí.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Main Tabs switcher */}
            <nav className="flex border-b border-slate-800/60 pb-px text-xs font-bold gap-1 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setActiveTab('MEDITATION')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'MEDITATION'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-meditation"
              >
                <Flame className="w-3.5 h-3.5" />
                Thiền Định Pomodoro
              </button>

              <button
                onClick={() => setActiveTab('TODOS')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'TODOS'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-todos"
              >
                <ListTodo className="w-3.5 h-3.5" />
                Đại Nguyện Hằng Ngày
              </button>

              <button
                onClick={() => setActiveTab('IELTS_ARENA')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'IELTS_ARENA'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-ielts"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Nghiên Cứu Cổ Kinh
              </button>

              <button
                onClick={() => setActiveTab('CULT_PATH')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'CULT_PATH'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-cult-path"
              >
                <Scroll className="w-3.5 h-3.5" />
                Tiên Lộ (Lộ Trình)
              </button>

              <button
                onClick={() => setActiveTab('ANALYTICS')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'ANALYTICS'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-analytics"
              >
                <CompassIcon className="w-3.5 h-3.5" />
                Đạo Nhãn Thống Kê
              </button>

              <button
                onClick={() => setActiveTab('STORE')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'STORE'
                    ? 'border-amber-500 text-amber-500 bg-amber-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-store"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Tàng Bảo Các (Shop)
              </button>

              <button
                onClick={() => setActiveTab('CAM_DIA')}
                className={`py-2.5 px-4 transition-all border-b-2 font-bold cursor-pointer shrink-0 flex items-center gap-1.5 ${
                  activeTab === 'CAM_DIA'
                    ? 'border-purple-500 text-purple-400 bg-purple-950/10'
                    : 'border-transparent text-slate-500 hover:text-slate-300'
                }`}
                id="tab-cam-dia"
              >
                <Lock className="w-3.5 h-3.5" />
                Cấm Địa Tông Môn
              </button>
            </nav>

            {/* Main Tabs contents rendering */}
            <main>
              <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 ${activeTab !== 'MEDITATION' ? 'hidden' : ''}`} id="meditation-tab-view">
                <div className="xl:col-span-2 space-y-6">
                    {/* Guided Daily Planning & Reflection Rituals */}
                    <DailyRituals
                      todoItems={todoItems}
                      dailyLogs={dailyLogs}
                      onSyncTodos={setTodoItems}
                      onAddExp={addExp}
                      planningCompletedDate={planningCompletedDate}
                      reflectionCompletedDate={reflectionCompletedDate}
                      onCompletePlanning={setPlanningCompletedDate}
                      onCompleteReflection={setReflectionCompletedDate}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                      <MeditationTimer
                        state={cultState}
                        onMeditationComplete={handleMeditationComplete}
                        onPassiveQiTick={handlePassiveQiTick}
                        isFocusMode={isFocusMode}
                        onToggleFocusMode={() => setIsFocusMode(true)}
                      />
                      <TaskSection
                        tasks={tasks}
                        onAddTask={handleAddTask}
                        onToggleTask={handleToggleTask}
                        onDeleteTask={handleDeleteTask}
                      />
                    </div>

                    {/* Integrated Habit Tracker */}
                    <HabitSection
                      habits={habits}
                      onAddHabit={handleAddHabit}
                      onToggleHabitDay={handleToggleHabitDay}
                      onDeleteHabit={handleDeleteHabit}
                    />
                  </div>

                  <div className="space-y-6">
                    <StreakGrid dailyLogs={dailyLogs} todoItems={todoItems} />

                    {/* Quick Stats list card */}
                    <div className="bg-[#0f141c]/80 border border-slate-800/80 p-5 rounded-2xl shadow-xl space-y-3 font-mono text-[10px]">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 font-sans">
                        <Flame className="w-4 h-4 text-orange-500 animate-pulse" />
                        Hồ Sơ Tu Vi & Đạo Quả
                      </h4>
                      <p className="text-[10px] text-slate-500 font-sans leading-relaxed">
                        Thiền định tích lũy linh khí vô song, ghi nhận thành tích hành trì và duy trì định lực tu đạo bền bỉ.
                      </p>
                      <div className="grid grid-cols-2 gap-2 pt-1 font-sans">
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                          <p className="text-slate-500 uppercase tracking-wider text-[8px] mb-0.5">Tổng Giờ Thiền</p>
                          <strong className="text-xs text-slate-200">{cultState.meditationMinutes} phút</strong>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                          <p className="text-slate-500 uppercase tracking-wider text-[8px] mb-0.5">Nhiệm Vụ Đã Xong</p>
                          <strong className="text-xs text-slate-200">{todoItems.filter(i => i.isCompleted).length} nhiệm vụ</strong>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                          <p className="text-slate-500 uppercase tracking-wider text-[8px] mb-0.5">Bế Quan Hôm Nay</p>
                          <strong className="text-xs text-emerald-400">{todayMeditationMinutes} phút</strong>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900">
                          <p className="text-slate-500 uppercase tracking-wider text-[8px] mb-0.5">Chuỗi Ngày Tu Luyện</p>
                          <strong className="text-xs text-amber-400">{cultivationStreak} ngày 🔥</strong>
                        </div>
                        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-900 col-span-2">
                          <div className="flex justify-between items-center text-[8px] text-slate-500 mb-1 uppercase tracking-wider">
                            <span>Tỷ lệ đại nguyện hoàn thành (trong tháng đến nay)</span>
                            <span className="text-indigo-400 font-bold text-xs">{taskCompletionRatePercentage}%</span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500" 
                              style={{ width: `${taskCompletionRatePercentage}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-950/30 border border-slate-900 p-5 rounded-2xl space-y-2">
                      <h5 className="text-[10px] text-amber-500 uppercase tracking-wider font-extrabold flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Linh Đan Thượng Hạng
                      </h5>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Ghé thăm <strong>Tàng Bảo Các (Shop)</strong> để đổi Linh Thạch lấy các loại linh thảo trợ lực nhân đôi hiệu năng hấp thụ tu vi thiền định!
                      </p>
                    </div>
                  </div>
                </div>

              <div className={activeTab !== 'TODOS' ? 'hidden' : ''} id="todos-tab-view">
                <TodoSection
                  todoItems={todoItems}
                  onAddTodo={handleAddTodo}
                  onToggleTodo={handleToggleTodo}
                  onDeleteTodo={handleDeleteTodo}
                  onSyncTodos={handleSyncTodos}
                />
              </div>

              <div className={activeTab !== 'STORE' ? 'hidden' : ''}>
                <TreasureStore
                  state={cultState}
                  onBuyItem={handleBuyItem}
                  onUseConsumable={handleUseConsumable}
                />
              </div>

              <div className={activeTab !== 'CAM_DIA' ? 'hidden' : ''}>
                <ForbiddenNotes notes={notes} onUpdateNotes={setNotes} />
              </div>

              <div className={activeTab !== 'IELTS_ARENA' ? 'hidden' : ''}>
                <IeltsMockTestLog
                  logs={ieltsLogs}
                  onAddLog={handleAddIeltsLog}
                  onDeleteLog={handleDeleteIeltsLog}
                  onUpdateLog={handleUpdateIeltsLog}
                  targets={ieltsTargets}
                  onUpdateTargets={setIeltsTargets}
                  camBooks={camBooksList}
                  onUpdateCamBooks={setCamBooksList}
                  onAddExp={addExp}
                />
              </div>

              <div className={activeTab !== 'CULT_PATH' ? 'hidden' : ''}>
                <CultivationManualsSection
                  manuals={manuals}
                  onAddManual={(newManual) => setManuals(prev => [newManual, ...prev])}
                  onUpdateManuals={setManuals}
                  onAddExp={addExp}
                  onAddTodo={handleAddTodo}
                />
              </div>

              <div className={activeTab !== 'ANALYTICS' ? 'hidden' : ''}>
                <PerformanceStats
                  challenges={challenges}
                  dailyLogs={dailyLogs}
                  onClaimChallenge={handleClaimChallenge}
                  onAddChallenge={handleAddChallenge}
                  onProgressChallenge={handleProgressChallenge}
                  onDeleteChallenge={handleDeleteChallenge}
                  tasks={tasks}
                  todoItems={todoItems}
                />
              </div>
            </main>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
