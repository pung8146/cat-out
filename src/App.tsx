import React, { useState } from "react";
import { PhaserGame } from "./components/Game";
import "./App.css";

function App() {
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameOver">(
    "menu"
  );
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setLevel(1);
  };

  const handleGameOver = (finalScore: number) => {
    setScore(finalScore);
    setGameState("gameOver");
  };

  const handleLevelComplete = (completedLevel: number) => {
    setLevel(completedLevel);
  };

  const resetGame = () => {
    setGameState("menu");
    setScore(0);
    setLevel(1);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🦎 Gecko Puzzle - 퍼즐 게임</h1>
      </header>

      <main>
        {gameState === "menu" && (
          <div className="menu">
            <h2>도마뱀을 색상 구멍에 맞춰보세요!</h2>
            <p>도마뱀을 드래그해서 같은 색상의 구멍에 넣으세요</p>
            <button onClick={startGame} className="start-button">
              게임 시작
            </button>
          </div>
        )}

        {gameState === "playing" && (
          <div className="game-container">
            <div className="game-info">
              <p>레벨: {level}</p>
              <p>점수: {score}</p>
            </div>
            <PhaserGame
              onGameOver={handleGameOver}
              onLevelComplete={handleLevelComplete}
            />
          </div>
        )}

        {gameState === "gameOver" && (
          <div className="game-over">
            <h2>게임 종료!</h2>
            <p>최종 점수: {score}</p>
            <p>달성한 레벨: {level}</p>
            <button onClick={resetGame} className="restart-button">
              다시 시작
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
