import React, { useState, useEffect } from 'react';
import { useBot } from '../context/BotContext.tsx';
import { Shell } from './Shell.tsx';
import {
  CURRENCY_PAIRS,
  OTC_PAIRS,
  LIVE_TIMERS,
  FUTURE_TIMERS,
  formatTime,
} from '../constants.ts';
import { SignalItem } from '../types.ts';
import {
  Zap,
  Clock,
  Globe,
  ChevronDown,
  Brain,
  TrendingUp,
  Activity,
  Layers,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Copy,
  Check,
  List,
} from 'lucide-react';

const SCAN_STEPS = [
  'Scanning Market Data',
  'Analyzing Price Action',
  'Checking Market Trends',
  'Detecting Patterns',
  'Calculating Accuracy',
  'Finalizing Signal',
];

export const DashboardView: React.FC = () => {
  const { addSignal, navigateTo, signals } = useBot();

  const [marketType, setMarketType] = useState<'OTC Markets' | 'Live Markets'>('OTC Markets');
  const [selectedPair, setSelectedPair] = useState<string>(OTC_PAIRS[0]);
  const [timer, setTimer] = useState<string>(LIVE_TIMERS[0]);
  const [mode, setMode] = useState<'live' | 'future'>('live');
  const [futureEntryTime, setFutureEntryTime] = useState<string>('');

  const [stage, setStage] = useState<'idle' | 'loading' | 'result'>('idle');
  const [activeSignal, setActiveSignal] = useState<SignalItem | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [scanStepIndex, setScanStepIndex] = useState<number>(0);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const availablePairs = marketType === 'Live Markets' ? CURRENCY_PAIRS : OTC_PAIRS;
  const availableTimers = mode === 'live' ? LIVE_TIMERS : FUTURE_TIMERS;

  const handleModeChange = (newMode: 'live' | 'future') => {
    setMode(newMode);
    const timers = newMode === 'live' ? LIVE_TIMERS : FUTURE_TIMERS;
    setTimer(timers[0]);
    if (newMode === 'future' && !futureEntryTime) {
      // Default to 5 minutes in future
      const future = new Date(Date.now() + 5 * 60 * 1000);
      setFutureEntryTime(future.toISOString().slice(0, 16));
    }
  };

  useEffect(() => {
    if (stage !== 'loading') return;

    const stepInterval = window.setInterval(() => {
      setScanStepIndex((prev) => Math.min(SCAN_STEPS.length - 1, prev + 1));
    }, 800);

    const finishTimeout = window.setTimeout(() => {
      const entryDate = mode === 'future' && futureEntryTime ? new Date(futureEntryTime) : new Date();
      const expiryDate = new Date(entryDate.getTime() + 45000);
      const randomId = Math.floor(100000 + Math.random() * 900000);
      const randomDirection: 'BUY' | 'SELL' = Math.random() > 0.5 ? 'BUY' : 'SELL';

      const newSig: SignalItem = {
        id: `#FRK${randomId}`,
        pair: selectedPair,
        market: marketType,
        timer: timer,
        mode: mode,
        direction: randomDirection,
        entry: entryDate.toISOString(),
        expiry: expiryDate.toISOString(),
        accuracy: '98.6%',
        strength: '98.7%',
      };

      setActiveSignal(newSig);
      addSignal(newSig);
      setStage('result');
    }, 5000);

    return () => {
      window.clearInterval(stepInterval);
      window.clearTimeout(finishTimeout);
    };
  }, [stage, selectedPair, marketType, timer, mode, futureEntryTime]);

  const handleStartGenerate = () => {
    if (mode === 'future') {
      if (!futureEntryTime || new Date(futureEntryTime).getTime() <= Date.now()) {
        setErrorMsg('Select a valid future entry time.');
        return;
      }
    }
    setErrorMsg('');
    setIsCopied(false);
    setScanStepIndex(0);
    setStage('loading');
  };

  const handleCopySignal = async () => {
    if (!activeSignal) return;
    const text = `${activeSignal.pair} ${activeSignal.direction} ${formatTime(activeSignal.entry)} ${activeSignal.timer}`;
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setErrorMsg('Could not copy signal to clipboard.');
    }
  };

  const todayCount = signals.filter((s) => {
    const d = new Date(s.entry);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  }).length;

  return (
    <Shell showDashboardHeader={true}>
      <section className="terminal">
        {/* IDLE VIEW */}
        {stage === 'idle' && (
          <>
            <h2 className="terminal-heading">
              GENERATE <span>SIGNALS</span>
            </h2>
            <p className="terminal-subtitle">
              AI Analyzed High Accuracy Trading Signals
            </p>

            {/* Signal Modes: Live vs Future */}
            <div className="signal-modes">
              <button
                className="bot-button bot-button-outline cursor-pointer"
                data-active={mode === 'live'}
                onClick={() => handleModeChange('live')}
              >
                <Zap size={14} />
                <span>LIVE SIGNAL</span>
              </button>

              <button
                className="bot-button bot-button-outline cursor-pointer"
                data-active={mode === 'future'}
                onClick={() => handleModeChange('future')}
              >
                <Clock size={14} />
                <span>FUTURE SIGNAL</span>
              </button>
            </div>

            {/* Broker Selector */}
            <div className="selector-row">
              <span className="selector-icon">
                <img
                  src="/quotex-logo.png"
                  alt="Quotex"
                  className="w-5 h-5 object-contain"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </span>
              <div className="selector-main">
                <label>BROKER</label>
                <select value="Quotex" disabled className="cursor-default">
                  <option value="Quotex">Quotex</option>
                </select>
              </div>
              <ChevronDown size={16} className="selector-chevron" />
            </div>

            {/* Market Selector */}
            <div className="selector-row">
              <span className="selector-icon">
                <Globe size={22} />
              </span>
              <div className="selector-main">
                <label>MARKET</label>
                <select
                  value={marketType}
                  onChange={(e) => {
                    const newType = e.target.value as 'OTC Markets' | 'Live Markets';
                    setMarketType(newType);
                    setSelectedPair(newType === 'Live Markets' ? CURRENCY_PAIRS[0] : OTC_PAIRS[0]);
                  }}
                >
                  <option value="OTC Markets">OTC Markets</option>
                  <option value="Live Markets">Live Markets</option>
                </select>
              </div>
              <ChevronDown size={16} className="selector-chevron" />
            </div>

            {/* Pair Selector */}
            <div className="selector-row">
              <span className="selector-icon text-lg">💱</span>
              <div className="selector-main">
                <label>PAIR</label>
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                >
                  {availablePairs.map((pair) => (
                    <option key={pair} value={pair}>
                      {pair}
                    </option>
                  ))}
                </select>
              </div>
              <ChevronDown size={16} className="selector-chevron" />
            </div>

            {/* Timer Selector */}
            <div className="selector-row">
              <span className="selector-icon">
                <Clock size={20} />
              </span>
              <div className="selector-main">
                <label>TIMER</label>
                <select
                  value={timer}
                  onChange={(e) => setTimer(e.target.value)}
                >
                  {availableTimers.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <ChevronDown size={16} className="selector-chevron" />
            </div>

            {/* Future Entry Time Picker if in future mode */}
            {mode === 'future' && (
              <div className="selector-row">
                <span className="selector-icon">
                  <Clock size={20} />
                </span>
                <div className="selector-main">
                  <label htmlFor="future-entry">ENTRY TIME</label>
                  <input
                    id="future-entry"
                    type="datetime-local"
                    value={futureEntryTime}
                    onChange={(e) => setFutureEntryTime(e.target.value)}
                    className="text-sm font-mono text-[#FFE166]"
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <p role="alert" className="text-[#FF4D6D] text-xs font-bold my-2 text-center">
                {errorMsg}
              </p>
            )}

            {/* Generate Action Button */}
            <button
              className="bot-button bot-button-neon generate-button flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleStartGenerate}
            >
              <Zap size={17} />
              <span>GENERATE {mode === 'future' ? 'FUTURE ' : ''}SIGNAL</span>
            </button>

            {/* Metrics */}
            <div className="metrics">
              <div className="metric">
                <Brain />
                <small>AI ACCURACY</small>
                <strong>98.6%</strong>
              </div>
              <div className="metric">
                <TrendingUp />
                <small>SIGNAL STR.</small>
                <strong>98.7%</strong>
              </div>
              <div className="metric">
                <Clock />
                <small>AVG TIME</small>
                <strong>00:45</strong>
              </div>
              <div className="metric">
                <Activity />
                <small>TODAY</small>
                <strong>{Math.max(32, todayCount)}</strong>
              </div>
            </div>
          </>
        )}

        {/* LOADING STAGE */}
        {stage === 'loading' && (
          <div className="loading-stage" role="status">
            <h2 className="terminal-heading">
              GENERATING <span>SIGNALS</span>
            </h2>
            <p className="terminal-subtitle">
              Please wait while our AI analyzes the market and finds the best opportunity...
            </p>

            {/* Authentic Radar Scanner SVG */}
            <svg
              viewBox="0 0 300 230"
              width="320"
              height="246"
              xmlns="http://www.w3.org/2000/svg"
              className="select-none"
            >
              <defs>
                <radialGradient id="glow">
                  <stop offset="0%" stopColor="#FFD000" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#FFD000" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#FFD000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#FFD000" stopOpacity="0.35" />
                </linearGradient>
                <clipPath id="core">
                  <circle cx="150" cy="104" r="29" />
                </clipPath>
              </defs>

              <circle cx="150" cy="104" r="100" fill="url(#glow)">
                <animate attributeName="r" values="92;104;92" dur="4s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="104" r="45" fill="none" stroke="#FFD000" strokeOpacity="0.3" strokeDasharray="3 5" />
              <circle cx="150" cy="104" r="68" fill="none" stroke="#FFD000" strokeOpacity="0.2" />
              <circle cx="150" cy="104" r="88" fill="none" stroke="#FFD000" strokeOpacity="0.14" />
              <line x1="150" y1="14" x2="150" y2="194" stroke="#FFD000" strokeOpacity="0.1" />
              <line x1="60" y1="104" x2="240" y2="104" stroke="#FFD000" strokeOpacity="0.1" />

              {/* Pulsing rings */}
              <circle cx="150" cy="104" r="30" fill="none" stroke="#FFD000" strokeWidth="1.6">
                <animate attributeName="r" values="30;90" dur="3.6s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.7;0" dur="3.6s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="104" r="30" fill="none" stroke="#FFD000" strokeWidth="1.6">
                <animate attributeName="r" values="30;90" dur="3.6s" begin="1.2s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.7;0" dur="3.6s" begin="1.2s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="104" r="30" fill="none" stroke="#FFD000" strokeWidth="1.6">
                <animate attributeName="r" values="30;90" dur="3.6s" begin="2.4s" repeatCount="indefinite" />
                <animate attributeName="stroke-opacity" values="0.7;0" dur="3.6s" begin="2.4s" repeatCount="indefinite" />
              </circle>

              {/* Rotating Sweep */}
              <g>
                <path d="M150 104 L150 16 A88 88 0 0 1 212 42 Z" fill="url(#sweep)" transform="rotate(-30 150 104)" />
                <line x1="150" y1="104" x2="150" y2="16" stroke="#FFD000" strokeWidth="1.6" strokeLinecap="round" transform="rotate(30 150 104)" />
                <animateTransform attributeName="transform" type="rotate" from="0 150 104" to="360 150 104" dur="5s" repeatCount="indefinite" />
              </g>

              <circle cx="150" cy="104" r="68" fill="none" stroke="#FFD000" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="80 347">
                <animateTransform attributeName="transform" type="rotate" from="360 150 104" to="0 150 104" dur="9s" repeatCount="indefinite" />
              </circle>
              <circle cx="150" cy="104" r="88" fill="none" stroke="#FFD000" strokeOpacity="0.7" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="30 523">
                <animateTransform attributeName="transform" type="rotate" from="0 150 104" to="360 150 104" dur="6s" repeatCount="indefinite" />
              </circle>

              {/* Core and Candlesticks */}
              <circle cx="150" cy="104" r="29" fill="#17160F" stroke="#FFD000" strokeOpacity="0.85" />
              <circle cx="150" cy="104" r="35" fill="none" stroke="#FFD000" strokeOpacity="0.25">
                <animate attributeName="stroke-opacity" values="0.15;0.5;0.15" dur="2s" repeatCount="indefinite" />
              </circle>

              {/* Candlestick bars in core */}
              <g clipPath="url(#core)">
                <g stroke="#FFD000" strokeOpacity="0.35" strokeWidth="1">
                  <line x1="132" y1="108" x2="132" y2="124" />
                  <line x1="141" y1="102" x2="141" y2="118" />
                  <line x1="150" y1="96" x2="150" y2="114" />
                  <line x1="159" y1="90" x2="159" y2="108" />
                  <line x1="168" y1="82" x2="168" y2="102" />
                </g>
                <polyline
                  points="124,122 134,114 141,119 150,104 158,108 168,90 176,84"
                  fill="none"
                  stroke="#FFD000"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="90"
                  strokeDashoffset="90"
                >
                  <animate attributeName="stroke-dashoffset" values="90;0;0;90" keyTimes="0;0.45;0.85;1" dur="3.6s" repeatCount="indefinite" />
                </polyline>
              </g>

              {/* Floating BUY / SELL Signal blips */}
              <g>
                <rect x="30" y="38" width="40" height="18" rx="9" fill="#FFD000" />
                <text x="50" y="50.5" fontSize="9.5" fontWeight="700" textAnchor="middle" fill="#17160F">
                  BUY ▲
                </text>
                <circle cx="50" cy="47" r="14" fill="none" stroke="#FFD000">
                  <animate attributeName="r" values="18;30" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.6;0" dur="3s" repeatCount="indefinite" />
                </circle>
                <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;0.1;0.4;0.5;1" dur="6s" repeatCount="indefinite" />
              </g>

              <g>
                <rect x="230" y="46" width="44" height="18" rx="9" fill="#17160F" stroke="#FFD000" />
                <text x="252" y="58.5" fontSize="9.5" fontWeight="700" textAnchor="middle" fill="#FFD000">
                  SELL ▼
                </text>
                <animate attributeName="opacity" values="0;0;1;1;0;0" keyTimes="0;0.2;0.3;0.6;0.7;1" dur="6s" repeatCount="indefinite" />
              </g>

              {/* Live fluctuating histogram bars at bottom */}
              <g fill="#FFD000">
                <rect x="96" y="204" width="6" height="14" rx="1">
                  <animate attributeName="height" values="14;22;10;14" dur="2.4s" repeatCount="indefinite" />
                  <animate attributeName="y" values="204;198;208;204" dur="2.4s" repeatCount="indefinite" />
                </rect>
                <rect x="109" y="202" width="6" height="16" rx="1" fillOpacity="0.5">
                  <animate attributeName="height" values="16;8;20;16" dur="2.8s" repeatCount="indefinite" />
                  <animate attributeName="y" values="202;210;198;202" dur="2.8s" repeatCount="indefinite" />
                </rect>
                <rect x="122" y="200" width="6" height="18" rx="1">
                  <animate attributeName="height" values="18;24;12;18" dur="2.2s" repeatCount="indefinite" />
                  <animate attributeName="y" values="200;194;206;200" dur="2.2s" repeatCount="indefinite" />
                </rect>
                <rect x="135" y="206" width="6" height="12" rx="1" fillOpacity="0.5">
                  <animate attributeName="height" values="12;20;8;12" dur="3s" repeatCount="indefinite" />
                  <animate attributeName="y" values="206;198;210;206" dur="3s" repeatCount="indefinite" />
                </rect>
                <rect x="148" y="198" width="6" height="20" rx="1">
                  <animate attributeName="height" values="20;12;24;20" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="y" values="198;206;194;198" dur="2.6s" repeatCount="indefinite" />
                </rect>
                <rect x="161" y="203" width="6" height="15" rx="1" fillOpacity="0.5">
                  <animate attributeName="height" values="15;22;9;15" dur="2.3s" repeatCount="indefinite" />
                  <animate attributeName="y" values="203;196;209;203" dur="2.3s" repeatCount="indefinite" />
                </rect>
                <rect x="174" y="200" width="6" height="18" rx="1">
                  <animate attributeName="height" values="18;10;22;18" dur="2.9s" repeatCount="indefinite" />
                  <animate attributeName="y" values="200;208;196;200" dur="2.9s" repeatCount="indefinite" />
                </rect>
                <rect x="187" y="205" width="6" height="13" rx="1" fillOpacity="0.5">
                  <animate attributeName="height" values="13;20;8;13" dur="2.5s" repeatCount="indefinite" />
                  <animate attributeName="y" values="205;198;210;205" dur="2.5s" repeatCount="indefinite" />
                </rect>
              </g>
              <line x1="90" y1="218" x2="210" y2="218" stroke="#FFD000" strokeOpacity="0.3" />
            </svg>

            <strong className="tracking-widest uppercase mt-3">ANALYZING MARKET</strong>
            <p className="text-muted-foreground text-xs mt-2 font-mono">
              {SCAN_STEPS[scanStepIndex]}
            </p>
            <div className="progress-track">
              <div className="progress-fill" />
            </div>
            <p className="text-muted-foreground text-xs font-mono">Please wait...</p>
          </div>
        )}

        {/* RESULT STAGE */}
        {stage === 'result' && activeSignal && (
          <div>
            <div className="result-stage">
              {/* Left Column */}
              <div className="result-side">
                <div>
                  <small>PAIR</small>
                  <strong>{activeSignal.pair}</strong>
                </div>
                <div>
                  <small>BROKER</small>
                  <strong>Quotex</strong>
                </div>
                <div>
                  <small>TIMER</small>
                  <strong>{activeSignal.timer}</strong>
                </div>
              </div>

              {/* Center Direction Ring */}
              <div
                className={`direction-ring ${
                  activeSignal.direction === 'BUY' ? 'direction-buy' : 'direction-sell'
                }`}
              >
                {activeSignal.direction === 'BUY' ? (
                  <ArrowUp strokeWidth={4} />
                ) : (
                  <ArrowDown strokeWidth={4} />
                )}
                <strong>{activeSignal.direction === 'BUY' ? 'UP' : 'DOWN'}</strong>
                <small>STRONG {activeSignal.direction} SIGNAL</small>
              </div>

              {/* Right Column */}
              <div className="result-side text-right">
                <div>
                  <small>SIGNAL ID</small>
                  <strong>{activeSignal.id}</strong>
                </div>
                <div>
                  <small>ACCURACY</small>
                  <strong>98.6%</strong>
                </div>
                <div>
                  <small>EXECUTION</small>
                  <strong>{activeSignal.mode === 'future' ? 'FUTURE' : 'INSTANT'}</strong>
                </div>
              </div>
            </div>

            {/* Result Details Grid */}
            <div className="result-details">
              <div>
                <small>ENTRY TIME</small>
                <strong>{formatTime(activeSignal.entry)}</strong>
              </div>
              <div>
                <small>EXPIRY TIME</small>
                <strong>{formatTime(activeSignal.expiry)}</strong>
              </div>
              <div>
                <small>SIGNAL STRENGTH</small>
                <strong>98.7%</strong>
              </div>
              <div>
                <small>AI CONFIDENCE</small>
                <strong>HIGH</strong>
              </div>
            </div>

            {/* Result Actions */}
            <div className="result-actions">
              <p>
                <Brain size={16} className="text-[#FFD000]" />
                <span>
                  AI Analysis Completed <span className="online" />
                </span>
              </p>

              <button
                className="bot-button bot-button-neon flex items-center gap-1.5 cursor-pointer"
                onClick={() => setStage('idle')}
              >
                <RefreshCw size={14} />
                <span>NEW SIGNAL</span>
              </button>

              <button
                className="bot-button bot-button-ghost p-2 text-[#B8B8B8] hover:text-white cursor-pointer"
                title="Copy signal"
                aria-label="Copy signal"
                onClick={handleCopySignal}
              >
                {isCopied ? (
                  <Check size={16} className="text-[#00D68F]" />
                ) : (
                  <Copy size={16} />
                )}
              </button>
            </div>
          </div>
        )}

        {/* Win Rate Panel (shown when idle) */}
        {stage === 'idle' && (
          <>
            <section className="win-panel">
              <h3>
                <Layers size={16} className="text-[#FFC247]" />
                <span>Win Rate</span>
              </h3>
              <div className="win-grid">
                <div className="win-stat">
                  <small>TODAY</small>
                  <strong>92%</strong>
                </div>
                <div className="win-stat">
                  <small>WEEK</small>
                  <strong>89%</strong>
                </div>
                <div className="win-stat">
                  <small>MONTH</small>
                  <strong>87%</strong>
                </div>
              </div>
            </section>

            <button
              onClick={() => navigateTo('/future-signals')}
              className="link-row mt-3 w-full rounded-2xl bg-[#151515]/60 border border-[#34302A] p-3.5 flex items-center justify-between text-left cursor-pointer hover:border-[#FFD000]/40 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <List size={18} className="text-[#FFD000]" />
                <span className="font-bold text-xs uppercase tracking-wide">
                  FUTURE SIGNAL LIST
                </span>
              </div>
              <ChevronDown size={16} className="text-[#777777] -rotate-90" />
            </button>
          </>
        )}

        <p className="signal-note">
          Simulated signals · Original bot display values · Not financial advice
        </p>
      </section>
    </Shell>
  );
};
