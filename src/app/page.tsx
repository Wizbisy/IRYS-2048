"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { useAccount } from "wagmi";
import { BrowserProvider } from "ethers";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import { EthersV6Adapter } from "@irys/web-upload-ethereum-ethers-v6";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import confetti from "canvas-confetti";
import "react-toastify/dist/ReactToastify.css";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const SIZE = 4;
const START_TILES = 2;

interface Tile {
  id: number;
  value: number;
  x: number;
  y: number;
  merged: boolean;
}

const tileColors: Record<number, string> = {
  2: "bg-[#eee4da] text-[#776e65]",
  4: "bg-[#ede0c8] text-[#776e65]",
  8: "bg-[#f2b179] text-white",
  16: "bg-[#f59563] text-white",
  32: "bg-[#f67c5f] text-white",
  64: "bg-[#f65e3b] text-white",
  128: "bg-[#edcf72] text-white",
  256: "bg-[#edcc61] text-white",
  512: "bg-[#edc850] text-white",
  1024: "bg-[#edc53f] text-white",
  2048: "bg-[#edc22e] text-white",
};

export default function Home() {
  /* ───────── state ───────── */
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [dark, setDark] = useState(true);
  const { address, isConnected } = useAccount();

  /* ───────── helpers ───────── */
  const emptyGrid = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(0));

  const initBoard = useCallback(() => {
    const grid = emptyGrid();
    const initial: Tile[] = [];
    for (let i = 0; i < START_TILES; i++) {
      addRandomTileToGrid(grid, initial);
    }
    setTiles(initial);
    setScore(0);
    setWon(false);
    setGameOver(false);
  }, []);

  /* ───────── board utils ───────── */
  const addRandomTileToGrid = (grid: number[][], list: Tile[]) => {
    const free: { x: number; y: number }[] = [];
    grid.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v === 0) free.push({ x, y });
      })
    );
    if (free.length === 0) return;
    const { x, y } = free[Math.floor(Math.random() * free.length)];
    const value = Math.random() < 0.9 ? 2 : 4;
    grid[y][x] = value;
    list.push({ id: Date.now() + Math.random(), value, x, y, merged: false });
  };

  const gridFromTiles = (list: Tile[]) => {
    const g = emptyGrid();
    list.forEach((t) => {
      g[t.y][t.x] = t.value;
    });
    return g;
  };

  /* ───────── move logic ───────── */
  const slide = (grid: number[][], dir: "up" | "down" | "left" | "right") => {
    const rotate = (g: number[][]) => g[0].map((_, i) => g.map((row) => row[i])).reverse();

    const times =
      dir === "up" ? 0 : dir === "right" ? 1 : dir === "down" ? 2 : 3;
    let working = structuredClone(grid);
    for (let r = 0; r < times; r++) working = rotate(working);

    let moved = false;
    let add = 0;
    for (let y = 0; y < SIZE; y++) {
      const row = working[y].filter((v) => v !== 0);
      for (let x = 0; x < row.length - 1; x++) {
        if (row[x] === row[x + 1]) {
          row[x] *= 2;
          add += row[x];
          row.splice(x + 1, 1);
          moved = true;
        }
      }
      while (row.length < SIZE) row.push(0);
      if (!working[y].every((v, i) => v === row[i])) moved = true;
      working[y] = row;
    }

    for (let r = 0; r < (4 - times) % 4; r++) working = rotate(working);

    return { grid: working, moved, add };
  };

  const anyMovesLeft = (g: number[][]) => {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        if (g[y][x] === 0) return true;
        const val = g[y][x];
        if (
          (x < SIZE - 1 && g[y][x + 1] === val) ||
          (y < SIZE - 1 && g[y + 1][x] === val)
        )
          return true;
      }
    return false;
  };

  /* ───────── handle move ───────── */
  const handleMove = (dir: "up" | "down" | "left" | "right") => {
    const grid = gridFromTiles(tiles);
    const { grid: nGrid, moved, add } = slide(grid, dir);
    if (!moved) return;

    const newTiles: Tile[] = [];
    nGrid.forEach((row, y) =>
      row.forEach((v, x) => {
        if (v !== 0) newTiles.push({ id: Date.now() + Math.random(), value: v, x, y, merged: false });
      })
    );

    addRandomTileToGrid(nGrid, newTiles);
    setTiles(newTiles);
    setScore((s) => s + add);
    if (newTiles.some((t) => t.value === 2048) && !won) {
      setWon(true);
      confetti({ particleCount: 200, spread: 100, origin: { y: 0.6 } });
    }
    if (!anyMovesLeft(nGrid)) setGameOver(true);
  };

  /* ───────── key + swipe listeners ───────── */
  useEffect(() => {
    initBoard();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (gameOver) return;
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
        e.preventDefault();
      if (e.key === "ArrowUp") handleMove("up");
      if (e.key === "ArrowDown") handleMove("down");
      if (e.key === "ArrowLeft") handleMove("left");
      if (e.key === "ArrowRight") handleMove("right");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const swipe = useSwipeable({
    onSwipedUp: () => handleMove("up"),
    onSwipedDown: () => handleMove("down"),
    onSwipedLeft: () => handleMove("left"),
    onSwipedRight: () => handleMove("right"),
    trackTouch: true,
  });

  /* ───────── upload to IRYS ───────── */
  const uploadScore = async () => {
    if (!isConnected || !address || !window.ethereum) {
      toast.error("Connect wallet first");
      return;
    }
    const id = toast.loading("Uploading…");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const uploader = await WebUploader(WebEthereum).withAdapter(
        EthersV6Adapter(provider)
      );
      await uploader.upload(
        JSON.stringify({ address, score, timestamp: Date.now() }),
        { tags: [{ name: "App", value: "IRYS-2048" }, { name: "Type", value: "Score" }] }
      );
      toast.update(id, { render: "Score uploaded", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      toast.update(id, { render: "Upload failed", type: "error", isLoading: false, autoClose: 3000 });
      console.error(err);
    }
  };

  /* ───────── render ───────── */
  return (
    <div
      className={`relative min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors ${
        dark ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      <button
        onClick={() => setDark(!dark)}
        className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-1 rounded text-sm shadow"
      >
        {dark ? "Light Mode" : "Dark Mode"}
      </button>

      <Image src="/logo.png" alt="logo" width={200} height={50} className="mb-6" />

      <AnimatePresence>
        {!gameOver ? (
          <motion.div
            key="board"
            {...swipe}
            className="relative w-full max-w-md aspect-square bg-gray-800 rounded-2xl p-4 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white select-none">
              Score: {score}
            </div>

            <Link href="/leaderboard" className="absolute top-4 right-4 text-white underline">
              Leaderboard
            </Link>

            {/* board grid */}
            <div className="grid grid-cols-4 gap-2 w-full h-full">
              {Array.from({ length: SIZE * SIZE }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded-lg" style={{ aspectRatio: "1/1" }} />
              ))}

              {tiles.map((t) => (
                <motion.div
                  key={t.id}
                  className={`absolute rounded-lg flex items-center justify-center font-bold text-xl ${
                    tileColors[t.value] || "bg-gray-500 text-white"
                  }`}
                  style={{
                    width: `${100 / SIZE}%`,
                    height: `${100 / SIZE}%`,
                    left: `${(t.x * 100) / SIZE}%`,
                    top: `${(t.y * 100) / SIZE}%`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {t.value}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="over"
            className="flex flex-col items-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl text-white">Game Over!</h2>
            <p className="text-lg text-white">Score: {score}</p>
            <button
              onClick={uploadScore}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-2xl shadow"
            >
              Upload Score
            </button>
            <button
              onClick={initBoard}
              className="bg-gray-600 text-white px-6 py-3 rounded-2xl shadow"
            >
              New Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      <Image src="/sprite.png" alt="sprite" width={90} height={90} className="absolute bottom-0 left-0" />
      <Image src="/sprite.png" alt="sprite" width={90} height={90} className="absolute bottom-0 right-0 scale-x-[-1]" />
    </div>
  );
}
