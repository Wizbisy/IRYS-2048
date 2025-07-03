"use client";

import Image from "next/image";

export default function Home() {
  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gray-900">
      <Image
        src="/logo.png"
        alt="IRYS 2048 Logo"
        width={200}
        height={50}
        className="mb-8"
      />
      <div id="game-container" className="relative w-full max-w-md aspect-square bg-gray-800 rounded-2xl p-4">
        <div id="score" className="absolute top-4 left-4 text-white">
          Score: <span id="score-value">0</span>
        </div>
        <a href="/leaderboard" className="absolute top-4 right-4 text-white underline">
          Leaderboard
        </a>
        <div id="game-grid" className="grid grid-cols-4 gap-2 w-full h-full">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="bg-gray-700 rounded-lg" style={{ aspectRatio: "1 / 1" }}></div>
          ))}
        </div>
      </div>
      <Image
        src="/sprite.png"
        alt="Sprite"
        width={100}
        height={100}
        className="absolute bottom-0 left-0"
      />
      <Image
        src="/sprite.png"
        alt="Sprite"
        width={100}
        height={100}
        className="absolute bottom-0 right-0 scale-x-[-1]"
      />

      <script
        dangerouslySetInnerHTML={{
          __html: `
            const GRID_SIZE = 4;
            let tiles = [];
            let score = 0;

            function initializeBoard() {
              tiles = [];
              score = 0;
              document.getElementById('score-value').textContent = score;
              for (let i = 0; i < 2; i++) addRandomTile();
              updateGrid();
            }

            function addRandomTile() {
              const available = [];
              for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                  if (!tiles.some(t => t.x === x && t.y === y)) available.push({ x, y });
                }
              }
              if (available.length > 0) {
                const { x, y } = available[Math.floor(Math.random() * available.length)];
                const tile = { id: Date.now() + Math.random(), value: Math.random() < 0.9 ? 2 : 4, x, y };
                tiles.push(tile);
              }
            }

            function updateGrid() {
              const grid = document.getElementById('game-grid');
              grid.innerHTML = '';
              for (let i = 0; i < GRID_SIZE * GRID_SIZE; i++) {
                const div = document.createElement('div');
                div.className = 'bg-gray-700 rounded-lg';
                div.style.aspectRatio = '1 / 1';
                grid.appendChild(div);
              }
              tiles.forEach(tile => {
                const div = document.createElement('div');
                div.textContent = tile.value;
                div.className = 'absolute bg-gray-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold';
                div.style.width = \`\${100 / GRID_SIZE}%\`;
                div.style.height = \`\${100 / GRID_SIZE}%\`;
                div.style.left = \`\${(tile.x * 100) / GRID_SIZE}%\`;
                div.style.top = \`\${(tile.y * 100) / GRID_SIZE}%\`;
                grid.appendChild(div);
              });
            }

            function moveTiles(direction) {
              let moved = false;
              let newScore = score;
              const newTiles = [...tiles];
              const sortedTiles = [...tiles].sort((a, b) => {
                if (direction === 'up') return a.y - b.y;
                if (direction === 'down') return b.y - a.y;
                if (direction === 'left') return a.x - b.x;
                return b.x - a.x;
              });

              const merged = [];
              for (let i = 0; i < GRID_SIZE; i++) {
                let line = [];
                if (direction === 'up' || direction === 'down') {
                  line = sortedTiles.filter(t => t.x === i);
                  if (direction === 'down') line.reverse();
                } else {
                  line = sortedTiles.filter(t => t.y === i);
                  if (direction === 'right') line.reverse();
                }

                let newLine = [];
                let pos = 0;
                for (let j = 0; j < line.length; j++) {
                  if (j < line.length - 1 && line[j].value === line[j + 1].value && !merged.includes(line[j].id) && !merged.includes(line[j + 1].id)) {
                    const newValue = line[j].value * 2;
                    newLine.push({ ...line[j], value: newValue, x: direction === 'up' || direction === 'down' ? i : pos, y: direction === 'left' || direction === 'right' ? i : pos });
                    merged.push(line[j].id, line[j + 1].id);
                    newScore += newValue;
                    j++;
                    pos++;
                    moved = true;
                  } else {
                    newLine.push({ ...line[j], x: direction === 'up' || direction === 'down' ? i : pos, y: direction === 'left' || direction === 'right' ? i : pos });
                    pos++;
                  }
                }
                newLine.forEach(t => {
                  const index = newTiles.findIndex(tt => tt.id === t.id);
                  if (index !== -1) newTiles[index] = t;
                });
              }

              if (moved) {
                tiles = [...newTiles, addRandomTile()];
                score = newScore;
                document.getElementById('score-value').textContent = score;
                updateGrid();
                if (!canMove()) alert('Game Over!');
              }
            }

            function canMove() {
              if (tiles.length < GRID_SIZE * GRID_SIZE) return true;
              for (const tile of tiles) {
                const neighbors = [{ x: tile.x + 1, y: tile.y }, { x: tile.x - 1, y: tile.y }, { x: tile.x, y: tile.y + 1 }, { x: tile.x, y: tile.y - 1 }];
                for (const { x, y } of neighbors) {
                  if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
                    const neighbor = tiles.find(t => t.x === x && t.y === y);
                    if (!neighbor || neighbor.value === tile.value) return true;
                  }
                }
              }
              return false;
            }

            document.addEventListener('keydown', (e) => {
              if (e.key === 'ArrowUp') moveTiles('up');
              else if (e.key === 'ArrowDown') moveTiles('down');
              else if (e.key === 'ArrowLeft') moveTiles('left');
              else if (e.key === 'ArrowRight') moveTiles('right');
            });

            initializeBoard();
          `,
        }}
      />
    </div>
  );
}
