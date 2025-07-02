"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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

const GRID = 4;
const INITIAL = 2;

interface Tile {
  id: number;
  value: number;
  x: number;
  y: number;
}

export default function Home() {
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [won, setWon] = useState(false);
  const [dark, setDark] = useState(true);
  const { address, isConnected } = useAccount();

  /* ── Board setup ── */
  const initBoard = useCallback(() => {
    const start: Tile[] = [];
    for (let i = 0; i < INITIAL; i++) start.push(addRandom(start));
    setTiles(start);
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  /* ── Run once on mount ── */
  useEffect(() => {
    initBoard();

    const onKey = (e: KeyboardEvent) => {
      if (gameOver || won) return;
      let moved = false;
      let sc = score;
      let t = [...tiles];

      if (e.key === "ArrowUp") [t, moved, sc] = move(t, "up");
      else if (e.key === "ArrowDown") [t, moved, sc] = move(t, "down");
      else if (e.key === "ArrowLeft") [t, moved, sc] = move(t, "left");
      else if (e.key === "ArrowRight") [t, moved, sc] = move(t, "right");

      if (moved) {
        t = [...t, addRandom(t)];
        setTiles(t);
        setScore(sc);
        if (!canMove(t)) setGameOver(true);
        if (t.some(v => v.value === 2048) && !won) {
          setWon(true);
          confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);                                           // <-- empty deps ensures one‑time run

  /* ── Helpers ── */
  const addRandom = (current: Tile[]): Tile => {
    const free: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++)
        if (!current.some(t => t.x === x && t.y === y)) free.push({ x, y });
    const { x, y } = free[Math.floor(Math.random() * free.length)];
    return { id: Date.now() + Math.random(), value: Math.random() < 0.9 ? 2 : 4, x, y };
  };

  const move = (
    ts: Tile[],
    dir: "up" | "down" | "left" | "right"
  ): [Tile[], boolean, number] => {
    let moved = false;
    let sc = score;
    const newTs = [...ts];
    const sorted = [...ts].sort((a, b) => {
      if (dir === "up") return a.y - b.y;
      if (dir === "down") return b.y - a.y;
      if (dir === "left") return a.x - b.x;
      return b.x - a.x;
    });
    const merged: number[] = [];
    for (let i = 0; i < GRID; i++) {
      let line =
        dir === "up" || dir === "down"
          ? sorted.filter(v => v.x === i)
          : sorted.filter(v => v.y === i);
      if (dir === "down" || dir === "right") line = [...line].reverse();
      let nl: Tile[] = [];
      let pos = 0;
      for (let j = 0; j < line.length; j++) {
        if (
          j < line.length - 1 &&
          line[j].value === line[j + 1].value &&
          !merged.includes(line[j].id) &&
          !merged.includes(line[j + 1].id)
        ) {
          const v = line[j].value * 2;
          nl.push({
            ...line[j],
            value: v,
            x: dir === "up" || dir === "down" ? i : pos,
            y: dir === "left" || dir === "right" ? i : pos,
          });
          merged.push(line[j].id, line[j + 1].id);
          sc += v;
          j++;
          pos++;
          moved = true;
        } else {
          nl.push({
            ...line[j],
            x: dir === "up" || dir === "down" ? i : pos,
            y: dir === "left" || dir === "right" ? i : pos,
          });
          if (
            (dir === "up" && line[j].y !== pos - 1) ||
            (dir === "down" && line[j].y !== GRID - pos) ||
            (dir === "left" && line[j].x !== pos - 1) ||
            (dir === "right" && line[j].x !== GRID - pos)
          )
            moved = true;
          pos++;
        }
      }
      nl.forEach(v => {
        const idx = newTs.findIndex(o => o.id === v.id);
        if (idx !== -1) newTs[idx] = v;
      });
    }
    return [newTs, moved, sc];
  };

  const canMove = (ts: Tile[]): boolean => {
    if (ts.length < GRID * GRID) return true;
    for (const t of ts) {
      const nb = [
        { x: t.x + 1, y: t.y },
        { x: t.x - 1, y: t.y },
        { x: t.x, y: t.y + 1 },
        { x: t.x, y: t.y - 1 },
      ];
      for (const { x, y } of nb) {
        if (x >= 0 && x < GRID && y >= 0 && y < GRID) {
          const n = ts.find(v => v.x === x && v.y === y);
          if (!n || n.value === t.value) return true;
        }
      }
    }
    return false;
  };

  /* ── Upload score to IRYS ── */
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
      toast.update(id, { render: "Score uploaded!", type: "success", isLoading: false, autoClose: 3000 });
    } catch (err) {
      toast.update(id, { render: "Upload failed", type: "error", isLoading: false, autoClose: 3000 });
      console.error(err);
    }
  };

  return (
    <div
      className={`relative min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 ${
        dark ? "bg-gray-900" : "bg-white"
      }`}
    >
      <button
        onClick={() => setDark(!dark)}
        className="absolute top-4 left-4 bg-gray-600 text-white px-3 py-1 rounded text-sm shadow"
      >
        {dark ? "Light Mode" : "Dark Mode"}
      </button>

      <Image src="/logo.png" alt="logo" width={200} height={50} className="mb-8" />

      <AnimatePresence>
        {!gameOver ? (
          <motion.div
            key="board"
            className="relative w-full max-w-md aspect-square bg-gray-800 rounded-2xl p-4 overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5 }}
          >
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white">
              Score: {score}
            </div>

            <Link href="/leaderboard" className="absolute top-4 right-4 text-white underline">
              Leaderboard
            </Link>

            <div className="grid grid-cols-4 gap-2 w-full h-full">
              {Array.from({ length: GRID * GRID }).map((_, i) => (
                <div key={i} className="bg-gray-700 rounded" style={{ aspectRatio: "1/1" }} />
              ))}
              {tiles.map(tile => (
                <motion.div
                  key={tile.id}
                  className="absolute bg-gray-600 rounded flex items-center justify-center text-white font-bold text-2xl"
                  style={{
                    width: `${100 / GRID}%`,
                    height: `${100 / GRID}%`,
                    left: `${(tile.x * 100) / GRID}%`,
                    top: `${(tile.y * 100) / GRID}%`,
                  }}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25 }}
                >
                  {tile.value}
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
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-2xl text-white">Game Over!</h2>
            <p className="text-xl text-white">Score: {score}</p>
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

      <Image src="/sprite.png" alt="sprite" width={100} height={100} className="absolute bottom-0 left-0" />
      <Image src="/sprite.png" alt="sprite" width={100} height={100} className="absolute bottom-0 right-0 scale-x-[-1]" />
    </div>
  );
}
