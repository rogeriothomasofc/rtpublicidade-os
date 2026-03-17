import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, Volume2, VolumeX, Zap, Coffee, Wind, Waves, Moon, Music, Repeat, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Phase = 'focus' | 'short' | 'long';
type SoundType = 'none' | 'rain' | 'cafe' | 'forest' | 'white' | 'night';

interface FocusSettings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  sound: SoundType;
  volume: number;
  welcomeMsg: string;
}

const DEFAULT_SETTINGS: FocusSettings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  sound: 'rain',
  volume: 0.6,
  welcomeMsg: 'Vamos focar! Hoje será um dia incrível. 🚀',
};

const SOUNDS: { id: SoundType; label: string; icon: React.ElementType; emoji: string }[] = [
  { id: 'none',   label: 'Silêncio',      icon: VolumeX, emoji: '🔇' },
  { id: 'rain',   label: 'Chuva',         icon: Waves,   emoji: '🌧️' },
  { id: 'cafe',   label: 'Cafeteria',     icon: Coffee,  emoji: '☕' },
  { id: 'forest', label: 'Floresta',      icon: Wind,    emoji: '🌿' },
  { id: 'white',  label: 'Ruído Branco',  icon: Volume2, emoji: '📻' },
  { id: 'night',  label: 'Noturno',       icon: Moon,    emoji: '🌙' },
];

const WELCOME_MESSAGES = [
  'Vamos focar! Hoje será um dia incrível. 🚀',
  'Cada tarefa concluída é uma vitória. 💪',
  'Foco total. Resultados reais. ⚡',
  'Você consegue. Um passo de cada vez. 🎯',
  'Modo agência ativado. Bora vencer! 🏆',
];

const PHASE_LABELS: Record<Phase, string> = {
  focus: 'FOCO',
  short: 'PAUSA CURTA',
  long: 'PAUSA LONGA',
};

// ─── Web Audio Engine ─────────────────────────────────────────────────────────

class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  // Only long-running loop nodes that need explicit stop() on cleanup.
  // Short-lived oscillators are NOT tracked here — they self-cleanup via onended.
  private loopNodes: AudioNode[] = [];
  // Cancel token: shared by reference with active sound callbacks.
  // Flipping cancel=true stops all recursive setTimeout chains immediately.
  private activeToken: { cancel: boolean } = { cancel: false };
  private currentSound: SoundType = 'none';

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.gainNode = this.ctx.createGain();
      this.gainNode.connect(this.ctx.destination);
    }
    return this.ctx;
  }

  private stopAll() {
    // Cancel all pending recursive callbacks by flipping the shared token
    this.activeToken.cancel = true;
    // Stop and release all looping nodes
    this.loopNodes.forEach(n => { try { (n as any).stop?.(); n.disconnect(); } catch {} });
    this.loopNodes = [];
  }

  setVolume(v: number) {
    if (this.gainNode) this.gainNode.gain.setTargetAtTime(v, this.getCtx().currentTime, 0.1);
  }

  play(sound: SoundType, volume: number) {
    if (sound === this.currentSound) return;
    this.stop();
    this.currentSound = sound;
    if (sound === 'none') return;

    // New token for this sound session; passed by reference into callbacks
    const token = { cancel: false };
    this.activeToken = token;

    const ctx = this.getCtx();
    if (ctx.state === 'suspended') ctx.resume();
    this.gainNode!.gain.value = volume;

    if (sound === 'white' || sound === 'night') {
      this.makeNoise(sound);
    } else if (sound === 'rain') {
      this.makeRain(token);
    } else if (sound === 'cafe') {
      this.makeCafe(token);
    } else if (sound === 'forest') {
      this.makeForest(token);
    }
  }

  // Creates a looping buffer source and registers it for cleanup on stop()
  private makeLoopSource(buffer: AudioBuffer): AudioBufferSourceNode {
    const source = this.getCtx().createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    this.loopNodes.push(source);
    return source;
  }

  // Connects, starts and schedules stop for a short-lived oscillator.
  // Uses onended to disconnect nodes — no manual tracking needed.
  private fireOsc(osc: OscillatorNode, gain: GainNode, startAt: number, duration: number) {
    osc.connect(gain);
    gain.connect(this.gainNode!);
    osc.start(startAt);
    osc.stop(startAt + duration);
    osc.onended = () => {
      try { osc.disconnect(); gain.disconnect(); } catch { /* already disconnected */ }
    };
  }

  private makeNoise(type: 'white' | 'night') {
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    if (type === 'white') {
      for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    } else {
      let b = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b = 0.99 * b + 0.01 * white;
        data[i] = b * 12;
      }
    }

    const source = this.makeLoopSource(buffer);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = type === 'night' ? 400 : 2000;
    this.loopNodes.push(filter);

    source.connect(filter);
    filter.connect(this.gainNode!);
    source.start();
  }

  private makeRain(token: { cancel: boolean }) {
    const ctx = this.getCtx();
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;

    const source = this.makeLoopSource(buffer);
    const hi = ctx.createBiquadFilter();
    hi.type = 'bandpass';
    hi.frequency.value = 1200;
    hi.Q.value = 0.5;
    this.loopNodes.push(hi);

    source.connect(hi);
    hi.connect(this.gainNode!);
    source.start();

    const drip = () => {
      if (token.cancel) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.frequency.value = 800 + Math.random() * 400;
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15);
      this.fireOsc(osc, g, ctx.currentTime, 0.15);
      setTimeout(drip, 200 + Math.random() * 600);
    };
    drip();
  }

  private makeCafe(token: { cancel: boolean }) {
    const ctx = this.getCtx();
    // Baixo murmúrio de vozes
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) d[i] = Math.random() * 2 - 1;

    const src = this.makeLoopSource(buffer);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 350;
    bp.Q.value = 0.8;
    this.loopNodes.push(bp);

    src.connect(bp);
    bp.connect(this.gainNode!);
    src.start();

    // xícaras ocasionais
    const clink = () => {
      if (token.cancel) return;
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1800 + Math.random() * 600;
      g.gain.setValueAtTime(0.02, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
      this.fireOsc(osc, g, ctx.currentTime, 0.4);
      setTimeout(clink, 3000 + Math.random() * 8000);
    };
    clink();
  }

  private makeForest(token: { cancel: boolean }) {
    const ctx = this.getCtx();
    // Vento suave
    const bufferSize = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) d[i] = Math.random() * 2 - 1;

    const src = this.makeLoopSource(buffer);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 600;
    this.loopNodes.push(lp);

    src.connect(lp);
    lp.connect(this.gainNode!);
    src.start();

    // pássaros ocasionais
    const bird = () => {
      if (token.cancel) return;
      const freqs = [1200, 1400, 1600, 1800];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'sine';
        const t = ctx.currentTime + i * 0.08;
        osc.frequency.setValueAtTime(f, t);
        osc.frequency.linearRampToValueAtTime(f * 1.2, t + 0.05);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        this.fireOsc(osc, g, t, 0.12);
      });
      setTimeout(bird, 4000 + Math.random() * 10000);
    };
    bird();
  }

  stop() {
    this.stopAll();
    this.currentSound = 'none';
  }
}

const audioEngine = new AudioEngine();

// ─── Componente Principal ─────────────────────────────────────────────────────

export function FocusMode() {
  const [open, setOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [phase, setPhase] = useState<Phase>('focus');
  const [running, setRunning] = useState(false);
  const [settings, setSettings] = useState<FocusSettings>(DEFAULT_SETTINGS);
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.focusMin * 60);
  const [pomodoroCount, setPomodoroCount] = useState(0);
  const [soundMuted, setSoundMuted] = useState(false);
  const [activeTab, setActiveTab] = useState<'timer' | 'music' | 'sound' | 'welcome'>('timer');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [musicLoop, setMusicLoop] = useState(true);
  const [musicVolume, setMusicVolume] = useState(0.8);
  const [musicFile, setMusicFile] = useState<string | null>(null);
  const [musicName, setMusicName] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputMusicRef = useRef<HTMLInputElement>(null);

  // Total de segundos para a fase atual
  const totalSeconds = useCallback(() => {
    const m = phase === 'focus' ? settings.focusMin : phase === 'short' ? settings.shortMin : settings.longMin;
    return m * 60;
  }, [phase, settings]);

  // Progresso do círculo (0-1)
  const progress = 1 - secondsLeft / totalSeconds();

  // Formatar tempo
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Reset ao trocar fase ou settings
  useEffect(() => {
    setRunning(false);
    setSecondsLeft(totalSeconds());
  }, [phase, settings.focusMin, settings.shortMin, settings.longMin]);

  // Tick
  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            handlePhaseEnd();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Som
  useEffect(() => {
    if (open && !soundMuted && settings.sound !== 'none') {
      audioEngine.play(settings.sound, settings.volume);
    } else {
      audioEngine.stop();
    }
  }, [open, settings.sound, soundMuted]);

  useEffect(() => {
    audioEngine.setVolume(soundMuted ? 0 : settings.volume);
  }, [settings.volume, soundMuted]);

  // Fechar → parar tudo
  useEffect(() => {
    if (!open) {
      audioEngine.stop();
      setRunning(false);
      if (audioRef.current) {
        audioRef.current.pause();
        setMusicEnabled(false);
      }
    }
  }, [open]);

  // Sync music file into the audio element
  useEffect(() => {
    if (!audioRef.current || !musicFile) return;
    audioRef.current.src = musicFile;
    audioRef.current.volume = musicVolume;
    audioRef.current.loop = musicLoop;
  }, [musicFile]);

  // Sync volume changes to the audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = musicVolume;
  }, [musicVolume]);

  // Sync loop changes to the audio element
  useEffect(() => {
    if (audioRef.current) audioRef.current.loop = musicLoop;
  }, [musicLoop]);

  // Revoke object URL on unmount to avoid memory leak
  useEffect(() => {
    return () => {
      if (musicFile) URL.revokeObjectURL(musicFile);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  const handleMusicFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Revoke previous object URL before creating a new one
    if (musicFile) URL.revokeObjectURL(musicFile);
    const url = URL.createObjectURL(file);
    setMusicFile(url);
    setMusicName(file.name.replace(/\.[^/.]+$/, ''));
    setMusicEnabled(false);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  }, [musicFile]);

  const toggleMusic = useCallback(() => {
    if (!audioRef.current || !musicFile) return;
    if (musicEnabled) {
      audioRef.current.pause();
      setMusicEnabled(false);
    } else {
      audioRef.current.play().catch(() => toast.error('Não foi possível reproduzir o arquivo.'));
      setMusicEnabled(true);
    }
  }, [musicEnabled, musicFile]);

  const removeMusic = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    if (musicFile) URL.revokeObjectURL(musicFile);
    setMusicFile(null);
    setMusicName(null);
    setMusicEnabled(false);
  }, [musicFile]);

  const handlePhaseEnd = () => {
    if (phase === 'focus') {
      const count = pomodoroCount + 1;
      setPomodoroCount(count);
      const next: Phase = count % 4 === 0 ? 'long' : 'short';
      toast.success(next === 'long' ? '🏆 Pausa longa merecida!' : '☕ Hora da pausa curta!');
      setPhase(next);
    } else {
      toast.success('⚡ Hora de focar!');
      setPhase('focus');
    }
  };

  const reset = () => {
    setRunning(false);
    setSecondsLeft(totalSeconds());
  };

  const startDay = () => {
    setShowWelcome(true);
    setActiveTab('timer');
    audioEngine.play(settings.sound, settings.volume);
    setTimeout(() => {
      setShowWelcome(false);
      setRunning(true);
    }, 3000);
  };

  // SVG progress circle
  const R = 52;
  const C = 2 * Math.PI * R;
  const dash = C * (1 - progress);

  const phaseColor = phase === 'focus' ? 'text-primary' : phase === 'short' ? 'text-blue-400' : 'text-amber-400';
  const phaseStroke = phase === 'focus' ? 'hsl(142 71% 45%)' : phase === 'short' ? '#60a5fa' : '#f59e0b';

  return (
    <>
      {/* Elemento de áudio persistente — sobrevive a trocas de aba */}
      <audio ref={audioRef} />

      {/* Botão flutuante */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 w-12 h-12 rounded-full',
          'bg-primary text-primary-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:scale-110 active:scale-95 transition-transform duration-150',
          running && 'animate-pulse'
        )}
        title="Modo Foco"
      >
        <Zap className="w-5 h-5" />
        {running && (
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-background" />
        )}
      </button>

      {/* Painel do Modo Foco */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end p-6 pointer-events-none">
          <div
            className="w-[340px] max-h-[90vh] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-4 duration-200"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold">Modo Foco</span>
                {pomodoroCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                    {pomodoroCount} 🍅
                  </span>
                )}
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Welcome overlay */}
            {showWelcome && (
              <div className="absolute inset-0 z-10 bg-card/95 flex flex-col items-center justify-center gap-4 rounded-2xl">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                  <Zap className="w-8 h-8 text-primary" />
                </div>
                <p className="text-base font-semibold text-center px-6">{settings.welcomeMsg}</p>
                <p className="text-xs text-muted-foreground">Iniciando timer em instantes...</p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 px-4 pt-3">
              {(['timer', 'music', 'sound', 'welcome'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'flex-1 text-xs py-1.5 rounded-md transition-colors',
                    activeTab === tab
                      ? 'bg-primary/15 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {tab === 'timer' ? 'Timer' : tab === 'music' ? 'Música' : tab === 'sound' ? 'Sons' : 'Rotina'}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-4 pb-4 pt-3">

              {/* ── TAB TIMER ── */}
              {activeTab === 'timer' && (
                <div className="space-y-4">
                  {/* Fase selector */}
                  <div className="grid grid-cols-3 gap-1.5 bg-muted/30 rounded-lg p-1">
                    {(['focus', 'short', 'long'] as Phase[]).map(p => (
                      <button
                        key={p}
                        onClick={() => setPhase(p)}
                        className={cn(
                          'text-xs py-1.5 rounded-md transition-all',
                          phase === p ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground'
                        )}
                      >
                        {p === 'focus' ? 'Foco' : p === 'short' ? 'P. Curta' : 'P. Longa'}
                      </button>
                    ))}
                  </div>

                  {/* Timer circle */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative w-36 h-36">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r={R} fill="none" stroke="hsl(148 33% 18%)" strokeWidth="6" />
                        <circle
                          cx="60" cy="60" r={R}
                          fill="none"
                          stroke={phaseStroke}
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={C}
                          strokeDashoffset={dash}
                          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-3xl font-mono font-semibold tabular-nums">{fmt(secondsLeft)}</span>
                        <span className={cn('text-[10px] font-medium tracking-widest mt-0.5', phaseColor)}>
                          {PHASE_LABELS[phase]}
                        </span>
                      </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={reset}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setRunning(r => !r)}
                        className={cn(
                          'w-14 h-14 rounded-full flex items-center justify-center transition-all',
                          'bg-primary text-primary-foreground hover:scale-105 active:scale-95'
                        )}
                      >
                        {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                      </button>
                      <button
                        onClick={() => setSoundMuted(m => !m)}
                        className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {soundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Durações */}
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: 'focusMin', label: 'Foco' },
                      { key: 'shortMin', label: 'P. Curta' },
                      { key: 'longMin', label: 'P. Longa' },
                    ] as { key: keyof FocusSettings; label: string }[]).map(({ key, label }) => (
                      <div key={key} className="bg-muted/30 rounded-lg p-2 text-center">
                        <p className="text-[10px] text-muted-foreground mb-1">{label}</p>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setSettings(s => ({ ...s, [key]: Math.max(1, (s[key] as number) - 1) }))}
                            className="w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-base leading-none"
                          >-</button>
                          <span className="text-sm font-medium w-6 text-center tabular-nums">{settings[key] as number}</span>
                          <button
                            onClick={() => setSettings(s => ({ ...s, [key]: Math.min(90, (s[key] as number) + 1) }))}
                            className="w-5 h-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-base leading-none"
                          >+</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── TAB MÚSICA ── */}
              {activeTab === 'music' && (
                <div className="space-y-4">
                  {/* Input de arquivo oculto */}
                  <input
                    ref={fileInputMusicRef}
                    type="file"
                    accept="audio/mp3,audio/mpeg,.mp3"
                    className="hidden"
                    onChange={handleMusicFileChange}
                  />

                  {/* Upload zone */}
                  {!musicFile ? (
                    <button
                      onClick={() => fileInputMusicRef.current?.click()}
                      className={cn(
                        'w-full py-8 border-2 border-dashed border-border rounded-xl',
                        'flex flex-col items-center gap-3 transition-colors',
                        'hover:border-primary/50 hover:bg-primary/5'
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Upload className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium">Enviar arquivo MP3</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Clique para selecionar</p>
                      </div>
                    </button>
                  ) : (
                    <>
                      {/* Track info */}
                      <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-3">
                        <div className={cn(
                          'w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0',
                          musicEnabled && 'animate-pulse'
                        )}>
                          <Music className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-xs font-medium truncate flex-1">{musicName}</p>
                        <button
                          onClick={removeMusic}
                          className="text-muted-foreground hover:text-destructive transition-colors ml-1 shrink-0"
                          title="Remover música"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Play/Pause */}
                      <div className="flex items-center justify-center gap-3">
                        <button
                          onClick={() => fileInputMusicRef.current?.click()}
                          className="w-9 h-9 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                          title="Trocar arquivo"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                        <button
                          onClick={toggleMusic}
                          className={cn(
                            'w-14 h-14 rounded-full flex items-center justify-center transition-all',
                            'bg-primary text-primary-foreground hover:scale-105 active:scale-95'
                          )}
                        >
                          {musicEnabled ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                        </button>
                        <button
                          onClick={() => setMusicLoop(l => !l)}
                          className={cn(
                            'w-9 h-9 rounded-full border flex items-center justify-center transition-colors',
                            musicLoop
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground'
                          )}
                          title={musicLoop ? 'Loop ativado' : 'Loop desativado'}
                        >
                          <Repeat className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Volume */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Volume da música</span>
                          <span className="text-xs font-medium">{Math.round(musicVolume * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={musicVolume}
                          onChange={e => setMusicVolume(Number(e.target.value))}
                          className="w-full accent-primary"
                        />
                      </div>
                    </>
                  )}

                  <p className="text-[10px] text-muted-foreground text-center">
                    A música toca independentemente dos sons ambientes
                  </p>
                </div>
              )}

              {/* ── TAB SOM ── */}
              {activeTab === 'sound' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    {SOUNDS.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setSettings(prev => ({ ...prev, sound: s.id }));
                          setSoundMuted(false);
                        }}
                        className={cn(
                          'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all',
                          settings.sound === s.id
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-muted/20 text-muted-foreground hover:border-border/60 hover:text-foreground'
                        )}
                      >
                        <span className="text-xl">{s.emoji}</span>
                        <span className="text-[10px] font-medium">{s.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Volume */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Volume</span>
                      <span className="text-xs font-medium">{Math.round(settings.volume * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={settings.volume}
                      onChange={e => setSettings(s => ({ ...s, volume: Number(e.target.value) }))}
                      className="w-full accent-primary"
                    />
                  </div>

                  <button
                    onClick={() => setSoundMuted(m => !m)}
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-medium border transition-colors',
                      soundMuted
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {soundMuted ? '🔇 Som mudo — clique para ativar' : '🔊 Som ativo — clique para mutar'}
                  </button>
                </div>
              )}

              {/* ── TAB ROTINA ── */}
              {activeTab === 'welcome' && (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Mensagem de boas-vindas</p>
                    <textarea
                      value={settings.welcomeMsg}
                      onChange={e => setSettings(s => ({ ...s, welcomeMsg: e.target.value }))}
                      className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors"
                      rows={3}
                    />
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Sugestões rápidas</p>
                    <div className="flex flex-col gap-1.5">
                      {WELCOME_MESSAGES.map((msg, i) => (
                        <button
                          key={i}
                          onClick={() => setSettings(s => ({ ...s, welcomeMsg: msg }))}
                          className={cn(
                            'text-left text-xs px-3 py-2 rounded-lg border transition-colors',
                            settings.welcomeMsg === msg
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground hover:text-foreground hover:border-border/60'
                          )}
                        >
                          {msg}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={startDay}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  >
                    ⚡ Iniciar meu dia
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
