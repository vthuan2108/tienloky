/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { CultivationState } from '../types';
import { Play, Pause, RotateCcw, Timer, Volume2, VolumeX, Eye } from 'lucide-react';
import { motion } from 'motion/react';

export type SoundscapeType = 'NONE' | 'ZEN' | 'RAIN' | 'STREAM' | 'CHIMES' | 'THUNDER' | 'CAMPFIRE';

interface MeditationTimerProps {
  state: CultivationState;
  onMeditationComplete: (minutes: number) => void;
  onPassiveQiTick: (tuViGained: number) => void;
  isFocusMode: boolean;
  onToggleFocusMode: () => void;
}

// --- WEB AUDIO API PROCEDURAL SOUNDSCAPES SYNTHESIS ---

function createNoiseBuffer(ctx: AudioContext, durationSeconds = 2): AudioBuffer {
  const bufferSize = ctx.sampleRate * durationSeconds;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function startZenChords(ctx: AudioContext, destination: AudioNode) {
  const oscs: OscillatorNode[] = [];
  const gains: GainNode[] = [];
  const freqs = [110.00, 165.00, 220.00, 277.18, 329.63]; // A major pentatonic drone

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(320, ctx.currentTime);
  filter.connect(destination);

  freqs.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();

    osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    // Volume LFO modulation
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.setValueAtTime(0.04 + idx * 0.015, ctx.currentTime);
    lfoGain.gain.setValueAtTime(0.04, ctx.currentTime);

    oscGain.gain.setValueAtTime(0.05 / freqs.length, ctx.currentTime);

    lfo.connect(lfoGain);
    lfoGain.connect(oscGain.gain);

    osc.connect(oscGain);
    oscGain.connect(filter);

    osc.start();
    lfo.start();

    oscs.push(osc, lfo);
    gains.push(oscGain, lfoGain);
  });

  return {
    stop: () => {
      oscs.forEach(o => {
        try { o.stop(); } catch (e) {}
        try { o.disconnect(); } catch (e) {}
      });
      gains.forEach(g => {
        try { g.disconnect(); } catch (e) {}
      });
      try { filter.disconnect(); } catch (e) {}
    }
  };
}

function startRain(ctx: AudioContext, destination: AudioNode) {
  const noiseBuffer = createNoiseBuffer(ctx, 2);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const bandpass = ctx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.setValueAtTime(1000, ctx.currentTime);
  bandpass.Q.setValueAtTime(0.4, ctx.currentTime);

  const lowpass = ctx.createBiquadFilter();
  lowpass.type = 'lowpass';
  lowpass.frequency.setValueAtTime(1500, ctx.currentTime);

  source.connect(bandpass);
  bandpass.connect(lowpass);
  lowpass.connect(destination);

  source.start();

  const raindropGains: GainNode[] = [];
  const raindropOscs: OscillatorNode[] = [];
  const intervalId = setInterval(() => {
    if (Math.random() > 0.45) {
      try {
        const osc = ctx.createOscillator();
        const dropGain = ctx.createGain();
        osc.type = 'sine';
        
        const startTime = ctx.currentTime;
        const endTime = startTime + 0.05;

        osc.frequency.setValueAtTime(1200 + Math.random() * 1500, startTime);
        osc.frequency.exponentialRampToValueAtTime(150, endTime);

        dropGain.gain.setValueAtTime(0.003 + Math.random() * 0.006, startTime);
        dropGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

        osc.connect(dropGain);
        dropGain.connect(destination);

        osc.start(startTime);
        osc.stop(endTime);

        raindropOscs.push(osc);
        raindropGains.push(dropGain);

        if (raindropOscs.length > 20) {
          raindropOscs.shift();
          raindropGains.shift();
        }
      } catch (e) {}
    }
  }, 180);

  return {
    stop: () => {
      clearInterval(intervalId);
      try { source.stop(); } catch (e) {}
      try { source.disconnect(); } catch (e) {}
      try { bandpass.disconnect(); } catch (e) {}
      try { lowpass.disconnect(); } catch (e) {}
      raindropOscs.forEach(o => { try { o.disconnect(); } catch (e) {} });
      raindropGains.forEach(g => { try { g.disconnect(); } catch (e) {} });
    }
  };
}

function startStream(ctx: AudioContext, destination: AudioNode) {
  const noiseBuffer = createNoiseBuffer(ctx, 2);
  const source = ctx.createBufferSource();
  source.buffer = noiseBuffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(500, ctx.currentTime);
  filter.Q.setValueAtTime(1.2, ctx.currentTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(0.18, ctx.currentTime);
  lfoGain.gain.setValueAtTime(120, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(filter.frequency);

  source.connect(filter);
  filter.connect(destination);

  source.start();
  lfo.start();

  return {
    stop: () => {
      try { source.stop(); } catch (e) {}
      try { lfo.stop(); } catch (e) {}
      try { source.disconnect(); } catch (e) {}
      try { lfo.disconnect(); } catch (e) {}
      try { lfoGain.disconnect(); } catch (e) {}
      try { filter.disconnect(); } catch (e) {}
    }
  };
}

function startWindChimes(ctx: AudioContext, destination: AudioNode) {
  const chimesScale = [880.00, 987.77, 1109.73, 1318.51, 1479.98, 1760.00];
  const activeOscs: OscillatorNode[] = [];
  const activeGains: GainNode[] = [];

  const playChime = () => {
    try {
      const freq = chimesScale[Math.floor(Math.random() * chimesScale.length)];
      const duration = 2.5 + Math.random() * 2.5;
      const startTime = ctx.currentTime;
      const endTime = startTime + duration;

      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      const osc2 = ctx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(freq * 2.76, startTime);

      const chimeGain = ctx.createGain();
      chimeGain.gain.setValueAtTime(0, startTime);
      chimeGain.gain.linearRampToValueAtTime(0.025, startTime + 0.015);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc1.connect(chimeGain);
      osc2.connect(chimeGain);
      chimeGain.connect(destination);

      osc1.start(startTime);
      osc2.start(startTime);
      osc1.stop(endTime);
      osc2.stop(endTime);

      activeOscs.push(osc1, osc2);
      activeGains.push(chimeGain);

      if (activeOscs.length > 20) {
        activeOscs.splice(0, 4);
        activeGains.splice(0, 2);
      }
    } catch (e) {}
  };

  const intervalId = setInterval(() => {
    if (Math.random() > 0.45) {
      playChime();
      if (Math.random() > 0.5) {
        setTimeout(playChime, 300 + Math.random() * 500);
      }
    }
  }, 3500);

  return {
    stop: () => {
      clearInterval(intervalId);
      activeOscs.forEach(o => { try { o.disconnect(); } catch (e) {} });
      activeGains.forEach(g => { try { g.disconnect(); } catch (e) {} });
    }
  };
}

function startCampfire(ctx: AudioContext, destination: AudioNode) {
  // 1. Warm flame roar
  const noiseBuffer = createNoiseBuffer(ctx, 2);
  const flameSource = ctx.createBufferSource();
  flameSource.buffer = noiseBuffer;
  flameSource.loop = true;

  const flameFilter = ctx.createBiquadFilter();
  flameFilter.type = 'lowpass';
  flameFilter.frequency.setValueAtTime(80, ctx.currentTime);

  const flameGain = ctx.createGain();
  flameGain.gain.setValueAtTime(0.3, ctx.currentTime);

  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();
  lfo.frequency.setValueAtTime(1.5, ctx.currentTime);
  lfoGain.gain.setValueAtTime(0.08, ctx.currentTime);

  lfo.connect(lfoGain);
  lfoGain.connect(flameGain.gain);

  flameSource.connect(flameFilter);
  flameFilter.connect(flameGain);
  flameGain.connect(destination);

  flameSource.start();
  lfo.start();

  // 2. Crackling sparks
  const activeOscs: OscillatorNode[] = [];
  const activeGains: GainNode[] = [];
  
  const playCrackle = () => {
    try {
      const osc = ctx.createOscillator();
      const crackleGain = ctx.createGain();
      osc.type = 'triangle';
      
      const startTime = ctx.currentTime;
      const duration = 0.005 + Math.random() * 0.015;
      const endTime = startTime + duration;

      osc.frequency.setValueAtTime(800 + Math.random() * 2500, startTime);
      crackleGain.gain.setValueAtTime(0.008 + Math.random() * 0.012, startTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      osc.connect(crackleGain);
      crackleGain.connect(destination);

      osc.start(startTime);
      osc.stop(endTime);

      activeOscs.push(osc);
      activeGains.push(crackleGain);

      if (activeOscs.length > 30) {
        activeOscs.shift();
        activeGains.shift();
      }
    } catch (e) {}
  };

  const intervalId = setInterval(() => {
    const rolls = Math.floor(Math.random() * 3) + 1;
    for (let r = 0; r < rolls; r++) {
      if (Math.random() > 0.4) {
        setTimeout(playCrackle, Math.random() * 400);
      }
    }
  }, 300);

  return {
    stop: () => {
      clearInterval(intervalId);
      try { flameSource.stop(); } catch (e) {}
      try { lfo.stop(); } catch (e) {}
      try { flameSource.disconnect(); } catch (e) {}
      try { lfo.disconnect(); } catch (e) {}
      try { lfoGain.disconnect(); } catch (e) {}
      try { flameFilter.disconnect(); } catch (e) {}
      try { flameGain.disconnect(); } catch (e) {}
      activeOscs.forEach(o => { try { o.disconnect(); } catch (e) {} });
      activeGains.forEach(g => { try { g.disconnect(); } catch (e) {} });
    }
  };
}

function startThunderStorm(ctx: AudioContext, destination: AudioNode) {
  const rain = startRain(ctx, destination);
  let thunderSource: AudioBufferSourceNode | null = null;
  let thunderGain: GainNode | null = null;

  const playThunderRoll = () => {
    try {
      const duration = 4 + Math.random() * 4;
      const startTime = ctx.currentTime;
      const endTime = startTime + duration;

      const buffer = createNoiseBuffer(ctx, duration);
      thunderSource = ctx.createBufferSource();
      thunderSource.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(150, startTime);
      filter.frequency.exponentialRampToValueAtTime(30, startTime + duration * 0.8);

      thunderGain = ctx.createGain();
      thunderGain.gain.setValueAtTime(0, startTime);
      thunderGain.gain.linearRampToValueAtTime(0.04 + Math.random() * 0.05, startTime + 0.3);
      thunderGain.gain.exponentialRampToValueAtTime(0.0001, endTime);

      thunderSource.connect(filter);
      filter.connect(thunderGain);
      thunderGain.connect(destination);

      thunderSource.start(startTime);
    } catch (e) {}
  };

  const intervalId = setInterval(() => {
    if (Math.random() > 0.4) {
      playThunderRoll();
    }
  }, 12000);

  return {
    stop: () => {
      clearInterval(intervalId);
      rain.stop();
      try {
        if (thunderSource) {
          thunderSource.stop();
          thunderSource.disconnect();
        }
        if (thunderGain) {
          thunderGain.disconnect();
        }
      } catch (e) {}
    }
  };
}

const SPIRITUAL_QUOTES = [
  'Lòng không tạp niệm, linh khí tự động hội tụ...',
  'Đạo tâm kiên định, phá vỡ vạn trùng bình cảnh.',
  'Thiền định tập trung, nhất niệm thông thiên địa.',
  'Mài giũa ý chí, ngưng tụ nguyên anh thần hồn.',
  'Hơi thở nhẹ nhàng, vạn vật giai không.',
  'Mỗi giây bế quan, kinh mạch lại được củng cố một phần.',
  'Ý chí sắt đá, xua tan tâm ma xâm nhập.',
  'Trời đất bao la, đạo hằng ở trong tim ta.',
];

export default function MeditationTimer({
  state,
  onMeditationComplete,
  onPassiveQiTick,
  isFocusMode,
  onToggleFocusMode
}: MeditationTimerProps) {
  const [mode, setMode] = useState<'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'>('FOCUS');
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes
  const [isRunning, setIsRunning] = useState(false);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundscape, setSoundscape] = useState<SoundscapeType>(() => {
    return (localStorage.getItem('tlk_soundscape') as SoundscapeType) || 'NONE';
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const passiveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const soundscapePlayerRef = useRef<{ stop: () => void } | null>(null);

  const getAudioContext = (): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        audioContextRef.current = new AudioCtx();
      }
    }
    return audioContextRef.current;
  };

  useEffect(() => {
    localStorage.setItem('tlk_soundscape', soundscape);
  }, [soundscape]);

  useEffect(() => {
    if (isRunning && soundscape !== 'NONE') {
      try {
        const ctx = getAudioContext();
        if (ctx) {
          if (ctx.state === 'suspended') {
            ctx.resume();
          }

          if (soundscapePlayerRef.current) {
            soundscapePlayerRef.current.stop();
            soundscapePlayerRef.current = null;
          }

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.35, ctx.currentTime);
          masterGain.connect(ctx.destination);

          let player: { stop: () => void } | null = null;
          if (soundscape === 'ZEN') {
            player = startZenChords(ctx, masterGain);
          } else if (soundscape === 'RAIN') {
            player = startRain(ctx, masterGain);
          } else if (soundscape === 'STREAM') {
            player = startStream(ctx, masterGain);
          } else if (soundscape === 'CHIMES') {
            player = startWindChimes(ctx, masterGain);
          } else if (soundscape === 'THUNDER') {
            player = startThunderStorm(ctx, masterGain);
          } else if (soundscape === 'CAMPFIRE') {
            player = startCampfire(ctx, masterGain);
          }

          soundscapePlayerRef.current = player;
        }
      } catch (e) {
        console.warn('Failed to start soundscape player:', e);
      }
    } else {
      if (soundscapePlayerRef.current) {
        soundscapePlayerRef.current.stop();
        soundscapePlayerRef.current = null;
      }
    }

    return () => {
      if (soundscapePlayerRef.current) {
        soundscapePlayerRef.current.stop();
        soundscapePlayerRef.current = null;
      }
    };
  }, [isRunning, soundscape]);

  // Play completion sound using Web Audio API
  const playCompletionSound = () => {
    if (!soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      
      const playBell = (time: number, freq: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0, time);
        gainNode.gain.linearRampToValueAtTime(0.3, time + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, time + duration);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      const now = ctx.currentTime;
      playBell(now, 523.25, 1.5); // C5
      playBell(now + 0.3, 659.25, 1.5); // E5
      playBell(now + 0.6, 783.99, 2.0); // G5
    } catch (e) {
      console.warn('Audio play blocked or failed', e);
    }
  };

  const getModeDuration = (m: typeof mode) => {
    if (m === 'FOCUS') return 25 * 60;
    if (m === 'SHORT_BREAK') return 5 * 60;
    return 15 * 60;
  };

  const gatheringPill = state.inventory.find(i => i.itemId === 'tu_khi_dan');
  const pillBonusMultiplier = gatheringPill ? 0.25 : 0;
  const baselineExp = 50;
  const actualExpGained = Math.round(baselineExp * (1 + pillBonusMultiplier));

  const handleModeChange = (newMode: typeof mode) => {
    setIsRunning(false);
    setMode(newMode);
    setTimeLeft(getModeDuration(newMode));
  };

  useEffect(() => {
    let quoteInterval: NodeJS.Timeout;
    if (isRunning) {
      quoteInterval = setInterval(() => {
        setQuoteIndex(prev => (prev + 1) % SPIRITUAL_QUOTES.length);
      }, 30000);
    }
    return () => clearInterval(quoteInterval);
  }, [isRunning]);

  // Main countdown logic
  useEffect(() => {
    if (isRunning) {
      // Request notification permission if not asked yet
      if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
      }

      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            playCompletionSound();
            
            // Trigger desktop notification
            if ('Notification' in window && Notification.permission === 'granted') {
              if (mode === 'FOCUS') {
                new Notification('🧘 Cảnh Giới Bế Quan Viên Mãn!', {
                  body: `Chúc mừng đạo hữu bế quan hoàn thành! Nhận ngay +${actualExpGained} Tu Vi và +50 Linh Thạch.`,
                  icon: '/icon.png' // Or generic placeholder
                });
                onMeditationComplete(25);
              } else {
                new Notification('⚡ Thời Gian Thần Tức Kết Thúc!', {
                  body: 'Tinh thần đạo hữu đã sảng khoái, hãy chuẩn bị quay lại bế quan tu luyện!',
                  icon: '/icon.png'
                });
              }
            } else {
              // Fallback alert if permission is not granted
              if (mode === 'FOCUS') {
                onMeditationComplete(25);
              }
            }
            
            setTimeLeft(getModeDuration(mode));
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, mode, actualExpGained]);

  // Passive Qi Ticks (Exp gain)
  const hasQiArray = state.inventory.some(i => i.itemId === 'tu_linh_tran');
  useEffect(() => {
    if (isRunning && mode === 'FOCUS' && hasQiArray) {
      passiveTimerRef.current = setInterval(() => {
        onPassiveQiTick(2);
      }, 5000);
    } else {
      if (passiveTimerRef.current) clearInterval(passiveTimerRef.current);
    }

    return () => {
      if (passiveTimerRef.current) clearInterval(passiveTimerRef.current);
    };
  }, [isRunning, mode, hasQiArray]);

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setTimeLeft(getModeDuration(mode));
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const maxTime = getModeDuration(mode);


  return (
    <div className="bg-[#0f141c] border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col items-center relative" id="meditation-timer">
      <div className="absolute top-4 right-4 flex items-center gap-1.5">
        {/* Toggle Sound */}
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
          title={soundEnabled ? 'Tắt Tiếng Chuông Cảnh Tỉnh' : 'Bật Tiếng Chuông Cảnh Tỉnh'}
          id="toggle-sound-btn"
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
        </button>

        {/* Enter Focus Mode Button */}
        <button
          onClick={onToggleFocusMode}
          className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-all ${
            isFocusMode
              ? 'bg-amber-950/40 text-amber-400 border-amber-900'
              : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-amber-400'
          }`}
          title="Kích hoạt cảnh giới bế quan tập trung (Focus Mode)"
          id="focus-mode-toggle-btn"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">{isFocusMode ? 'Thoát Bế Quan' : 'Cảnh Giới Focus'}</span>
        </button>
      </div>

      <div className="flex gap-2 p-1 bg-slate-950/80 border border-slate-900 rounded-lg mb-6 mt-2">
        <button
          onClick={() => handleModeChange('FOCUS')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
            mode === 'FOCUS'
              ? 'bg-emerald-950/80 border border-emerald-800/80 text-emerald-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Bế Quan Nhập Định
        </button>
        <button
          onClick={() => handleModeChange('SHORT_BREAK')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
            mode === 'SHORT_BREAK'
              ? 'bg-blue-950/80 border border-blue-800/80 text-blue-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Tiểu Đốn (Break)
        </button>
        <button
          onClick={() => handleModeChange('LONG_BREAK')}
          className={`px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
            mode === 'LONG_BREAK'
              ? 'bg-indigo-950/80 border border-indigo-800/80 text-indigo-400'
              : 'text-slate-400 hover:text-slate-300'
          }`}
        >
          Đại Đốn (Long Break)
        </button>
      </div>

      {/* Main Timer Display Circle */}
      <div className="relative w-48 h-48 flex items-center justify-center mb-6">
        {isRunning && (
          <div className={`absolute inset-0 rounded-full blur-xl opacity-20 animate-pulse ${
            mode === 'FOCUS' ? 'bg-emerald-500' : 'bg-blue-500'
          }`} />
        )}

        {/* Ambient active visual theme */}
        {isRunning && (
          <div className="absolute inset-0 rounded-full overflow-hidden pointer-events-none z-0">
            {soundscape === 'RAIN' && (
              <div className="absolute inset-0 bg-transparent opacity-40">
                <div className="absolute w-full h-[300%] bg-[linear-gradient(to_bottom,rgba(148,163,184,0)_0%,rgba(148,163,184,0.15)_50%,rgba(148,163,184,0)_100%)]" style={{ backgroundSize: '100% 40px', animation: 'rain-fall 1.2s linear infinite' }} />
                <div className="absolute w-full h-[300%] bg-[linear-gradient(to_bottom,rgba(148,163,184,0)_0%,rgba(148,163,184,0.2)_50%,rgba(148,163,184,0)_100%)]" style={{ backgroundSize: '100% 60px', left: '10px', animation: 'rain-fall 0.8s linear infinite 0.4s' }} />
              </div>
            )}
            {soundscape === 'THUNDER' && (
              <div className="absolute inset-0 bg-transparent opacity-30">
                <div className="absolute w-full h-[300%] bg-[linear-gradient(to_bottom,rgba(148,163,184,0)_0%,rgba(148,163,184,0.15)_50%,rgba(148,163,184,0)_100%)]" style={{ backgroundSize: '100% 40px', animation: 'rain-fall 1s linear infinite' }} />
                <div className="absolute inset-0 bg-purple-500/10" style={{ animation: 'lightning-flash 8s ease-out infinite' }} />
                <div className="absolute inset-0 bg-blue-500/10" style={{ animation: 'lightning-flash 12s ease-out infinite 3s' }} />
              </div>
            )}
            {soundscape === 'STREAM' && (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="absolute w-24 h-24 border border-cyan-500/30 rounded-full animate-ping" style={{ animationDuration: '4s' }} />
                <div className="absolute w-32 h-32 border border-cyan-500/20 rounded-full animate-ping" style={{ animationDuration: '6s', animationDelay: '2s' }} />
              </div>
            )}
            {soundscape === 'CAMPFIRE' && (
              <div className="absolute inset-0 flex items-end justify-center opacity-30 pb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 absolute" style={{ animation: 'campfire-ember 2s ease-out infinite', animationDelay: '0s', left: '35%', bottom: '20%' }} />
                <div className="w-1 h-1 rounded-full bg-orange-500 absolute" style={{ animation: 'campfire-ember 1.5s ease-out infinite', animationDelay: '0.4s', left: '48%', bottom: '20%' }} />
                <div className="w-2 h-2 rounded-full bg-red-500 absolute" style={{ animation: 'campfire-ember 2.5s ease-out infinite', animationDelay: '0.8s', left: '62%', bottom: '20%' }} />
              </div>
            )}
            {soundscape === 'CHIMES' && (
              <div className="absolute inset-0 flex items-center justify-center opacity-30">
                <div className="absolute w-20 h-20 border border-amber-500/10 rounded-full animate-spin-slow" />
                <div className="w-4 h-8 bg-amber-500/20 border border-amber-500/30 rounded-b-md" style={{ transformOrigin: 'top center', animation: 'chime-sway 3s ease-in-out infinite' }} />
              </div>
            )}
            {soundscape === 'ZEN' && (
              <div className="absolute inset-0 flex items-center justify-center opacity-25">
                <div className="w-24 h-24 rounded-full border-2 border-emerald-500/20 bg-emerald-500/5 animate-ping" style={{ animationDuration: '6s' }} />
              </div>
            )}
          </div>
        )}

        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="42"
            className="stroke-slate-950 fill-transparent"
            strokeWidth="6"
          />
          <motion.circle
            cx="96"
            cy="96"
            r="42"
            className={`fill-transparent ${
              mode === 'FOCUS' ? 'stroke-emerald-500/80' : 'stroke-blue-500/80'
            }`}
            strokeWidth="6"
            strokeDasharray="264"
            strokeDashoffset={264 - ((maxTime - timeLeft) / maxTime) * 264}
            strokeLinecap="round"
          />
        </svg>

        <div className="absolute text-center flex flex-col items-center">
          <span className="text-3xl font-extrabold font-mono tracking-wider text-slate-100">
            {formatTime(timeLeft)}
          </span>
          <span className="text-[9px] font-mono mt-0.5 text-slate-400 flex items-center gap-1 uppercase tracking-wider">
            {mode === 'FOCUS' ? (
              <>
                <Timer className="w-3 h-3 text-emerald-400 animate-spin-slow" />
                Tu Luyện
              </>
            ) : (
              'Thần Tức'
            )}
          </span>
        </div>
      </div>

      {/* Quote display */}
      <div className="text-center px-4 mb-4 min-h-8 max-w-sm flex items-center justify-center select-none">
        <p className="text-[11px] text-slate-400 italic font-medium leading-relaxed font-sans">
          {isRunning ? `"${SPIRITUAL_QUOTES[quoteIndex]}"` : '"Độ đạo tâm vững chí, bế quan điều tức khí..."'}
        </p>
      </div>

      {/* Tiên Nhạc Bồng Lai (Soundscape Selector) */}
      <div className="w-full max-w-xs mb-5 text-center space-y-1.5 font-sans">
        <label className="text-[9px] text-slate-500 uppercase tracking-widest font-extrabold block">
          🎵 Tiên Nhạc Bồng Lai (Nhạc Nền Thiền)
        </label>
        <select
          value={soundscape}
          onChange={(e) => {
            const val = e.target.value as SoundscapeType;
            setSoundscape(val);
            getAudioContext();
          }}
          className="w-full bg-slate-950/80 border border-slate-900 rounded-xl px-3 py-1.5 text-[10px] text-slate-300 focus:outline-none focus:border-emerald-500/50 cursor-pointer text-center font-bold transition-all hover:border-slate-800/80"
        >
          <option value="NONE">🔇 Tắt Tiên Nhạc (Tĩnh Tịch)</option>
          <option value="ZEN">🧘 Tiên Linh Đại Trận (Hợp Âm Thiền)</option>
          <option value="RAIN">🌧️ Mưa Rơi Trúc Lâm (Tiếng Mưa)</option>
          <option value="STREAM">🌊 Linh Tuyền Thủy Lưu (Tiếng Suối)</option>
          <option value="CHIMES">🎐 Đạo Quán Linh Chuông (Chuông Gió)</option>
          <option value="THUNDER">⚡ Lôi Kiếp Sấm Sét (Mưa Giông & Sấm Sét)</option>
          <option value="CAMPFIRE">🔥 Lửa Trại Dưỡng Thần (Tiếng Lửa Reo)</option>
        </select>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={resetTimer}
          className="p-2.5 rounded-full bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Thiết lập lại trận pháp"
          id="reset-timer-btn"
        >
          <RotateCcw className="w-4 h-4" />
        </button>

        <button
          onClick={toggleTimer}
          className={`px-6 py-2.5 rounded-full font-bold text-[10px] tracking-wider flex items-center gap-2 transition-all shadow-lg cursor-pointer ${
            isRunning
              ? 'bg-slate-200 text-slate-950 hover:bg-slate-300'
              : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-600 hover:to-teal-600'
          }`}
          id="toggle-timer-btn"
        >
          {isRunning ? (
            <>
              <Pause className="w-3.5 h-3.5 fill-current" />
              TẠM DỪNG THIỀN
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              BẾ QUAN TU LUYỆN
            </>
          )}
        </button>
      </div>

      {/* Buff details footer */}
      {mode === 'FOCUS' && (
        <div className="mt-5 pt-3 border-t border-slate-900/60 w-full text-center space-y-1 text-[10px] text-slate-500">
          <div className="flex justify-between font-mono">
            <span>Dự kiến thăng tiến:</span>
            <span className="text-emerald-400">+{actualExpGained} Tu Vi (+50 Linh Thạch)</span>
          </div>
          {gatheringPill && (
            <div className="flex justify-between font-mono text-[9px] text-emerald-500">
              <span>Hấp thu Tụ Khí Đan:</span>
              <span>+25% EXP</span>
            </div>
          )}
          {hasQiArray && (
            <div className="flex justify-between font-mono text-[9px] text-teal-400">
              <span>Hộ pháp Tụ Linh Trận:</span>
              <span>+2 Tu Vi / 5s</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
