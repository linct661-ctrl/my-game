import { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// 16 張牌 = 8 對符號
const SYMBOLS = ['🦋', '🌸', '🎯', '🎸', '🌈', '🦄', '🔥', '💎'];

// 產生並洗牌
function createShuffledDeck() {
  const pairs = [...SYMBOLS, ...SYMBOLS].map((symbol, index) => ({
    id: index,
    symbol,
    isFlipped: false,
    isMatched: false,
    isWrong: false,
  }));
  // Fisher-Yates shuffle
  for (let i = pairs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
  }
  return pairs;
}

// 格式化時間 mm:ss
function formatTime(seconds) {
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

// 彩屑粒子
function Confetti() {
  const particles = Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 2}s`,
    duration: `${2.5 + Math.random() * 2}s`,
    color: ['#a78bfa', '#ec4899', '#06b6d4', '#f59e0b', '#10b981', '#f97316'][i % 6],
    size: `${6 + Math.random() * 8}px`,
  }));

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((p) => (
        <div
          key={p.id}
          className="confetti-particle"
          style={{
            left: p.left,
            top: '-10px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animationDuration: p.duration,
            animationDelay: p.delay,
          }}
        />
      ))}
    </div>
  );
}

// 勝利彈窗
function VictoryOverlay({ steps, time, onRestart }) {
  return (
    <>
      <Confetti />
      <div className="victory-overlay" role="dialog" aria-modal="true" aria-label="遊戲完成">
        <div className="victory-card">
          <span className="victory-emoji" role="img" aria-label="慶祝">🎉</span>
          <h2 className="victory-title">完成！</h2>
          <p className="victory-subtitle">所有牌對都找到了，太厲害了！</p>
          <div className="victory-stats">
            <div className="victory-stat">
              <span className="victory-stat-icon" role="img" aria-label="步數">👣</span>
              <span className="victory-stat-value">{steps}</span>
              <span className="victory-stat-label">步數</span>
            </div>
            <div className="victory-stat">
              <span className="victory-stat-icon" role="img" aria-label="時間">⏱️</span>
              <span className="victory-stat-value">{formatTime(time)}</span>
              <span className="victory-stat-label">用時</span>
            </div>
          </div>
          <button id="restart-btn-victory" className="btn btn-primary" onClick={onRestart}>
            🔄 再玩一次
          </button>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [cards, setCards] = useState(createShuffledDeck);
  const [flipped, setFlipped] = useState([]); // 當前翻開的牌索引
  const [steps, setSteps] = useState(0);
  const [time, setTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isVictory, setIsVictory] = useState(false);
  const [isLocked, setIsLocked] = useState(false); // 防止快速點擊
  const timerRef = useRef(null);

  const matchedCount = cards.filter((c) => c.isMatched).length;
  const totalPairs = SYMBOLS.length;
  const matchedPairs = matchedCount / 2;

  // 計時器
  useEffect(() => {
    if (isRunning && !isVictory) {
      timerRef.current = setInterval(() => {
        setTime((t) => t + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isRunning, isVictory]);

  // 檢查勝利
  useEffect(() => {
    if (matchedCount === cards.length && cards.length > 0) {
      setIsVictory(true);
      setIsRunning(false);
    }
  }, [matchedCount, cards.length]);

  const handleCardClick = useCallback(
    (index) => {
      if (isLocked) return;
      if (cards[index].isFlipped || cards[index].isMatched) return;
      if (flipped.length === 2) return;

      // 開始計時
      if (!isRunning) setIsRunning(true);

      const newCards = cards.map((card, i) =>
        i === index ? { ...card, isFlipped: true } : card
      );
      const newFlipped = [...flipped, index];

      setCards(newCards);
      setFlipped(newFlipped);

      if (newFlipped.length === 2) {
        setSteps((s) => s + 1);
        const [first, second] = newFlipped;

        if (newCards[first].symbol === newCards[second].symbol) {
          // 配對成功
          setTimeout(() => {
            setCards((prev) =>
              prev.map((card, i) =>
                i === first || i === second
                  ? { ...card, isMatched: true, isFlipped: true }
                  : card
              )
            );
            setFlipped([]);
          }, 500);
        } else {
          // 配對失敗 — 標記錯誤，再翻回
          setIsLocked(true);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((card, i) =>
                i === first || i === second
                  ? { ...card, isWrong: true }
                  : card
              )
            );
          }, 50);
          setTimeout(() => {
            setCards((prev) =>
              prev.map((card, i) =>
                i === first || i === second
                  ? { ...card, isFlipped: false, isWrong: false }
                  : card
              )
            );
            setFlipped([]);
            setIsLocked(false);
          }, 1100);
        }
      }
    },
    [cards, flipped, isLocked, isRunning]
  );

  const handleRestart = useCallback(() => {
    clearInterval(timerRef.current);
    setCards(createShuffledDeck());
    setFlipped([]);
    setSteps(0);
    setTime(0);
    setIsRunning(false);
    setIsVictory(false);
    setIsLocked(false);
  }, []);

  const progressPercent = (matchedPairs / totalPairs) * 100;

  return (
    <main className="game-wrapper">
      {/* 標題 */}
      <header className="game-header">
        <h1 className="game-title">記憶翻牌</h1>
        <p className="game-subtitle">找出所有相同的配對</p>
      </header>

      {/* 統計列 */}
      <div className="stats-bar" role="status" aria-live="polite">
        <div className="stat-item">
          <span className="stat-icon" role="img" aria-label="步數">👣</span>
          <span className="stat-label">步數</span>
          <span className="stat-value steps" id="steps-display">{steps}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-icon" role="img" aria-label="計時">⏱️</span>
          <span className="stat-label">時間</span>
          <span className="stat-value timer" id="timer-display">{formatTime(time)}</span>
        </div>
        <div className="stat-divider" />
        <div className="stat-item">
          <span className="stat-icon" role="img" aria-label="配對">🎯</span>
          <span className="stat-label">配對</span>
          <span className="stat-value" id="match-display">{matchedPairs}/{totalPairs}</span>
        </div>
      </div>

      {/* 進度條 */}
      <div className="progress-section">
        <div className="progress-header">
          <span className="progress-label">進度</span>
          <span className="progress-count">{matchedPairs} / {totalPairs} 對</span>
        </div>
        <div className="progress-track" role="progressbar" aria-valuenow={matchedPairs} aria-valuemin={0} aria-valuemax={totalPairs}>
          <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* 牌組 */}
      <div
        className="card-grid"
        role="grid"
        aria-label="記憶翻牌遊戲板"
      >
        {cards.map((card, index) => (
          <div
            key={card.id}
            className={`card ${card.isFlipped || card.isMatched ? 'flipped' : ''} ${card.isMatched ? 'matched' : ''} ${card.isWrong ? 'wrong' : ''}`}
            onClick={() => handleCardClick(index)}
            role="gridcell"
            tabIndex={card.isMatched ? -1 : 0}
            onKeyDown={(e) => e.key === 'Enter' || e.key === ' ' ? handleCardClick(index) : null}
            aria-label={card.isMatched ? `已配對：${card.symbol}` : card.isFlipped ? `翻開：${card.symbol}` : '牌背面'}
            aria-pressed={card.isFlipped || card.isMatched}
            id={`card-${index}`}
          >
            <div className="card-inner">
              <div className="card-back" aria-hidden="true">
                <div className="card-back-pattern" />
              </div>
              <div className="card-front" aria-hidden={!card.isFlipped && !card.isMatched}>
                <span className="card-emoji" role="img" aria-label={card.symbol}>
                  {card.symbol}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 重置按鈕 */}
      <div className="controls">
        <button
          id="restart-btn"
          className="btn btn-secondary"
          onClick={handleRestart}
          aria-label="重新開始遊戲"
        >
          🔄 重新開始
        </button>
      </div>

      {/* 勝利彈窗 */}
      {isVictory && (
        <VictoryOverlay steps={steps} time={time} onRestart={handleRestart} />
      )}
    </main>
  );
}
