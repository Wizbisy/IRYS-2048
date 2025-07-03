"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useWalletClient } from "wagmi";
import { WebUploader } from "@irys/web-upload";
import { WebEthereum } from "@irys/web-upload-ethereum";
import Image from "next/image";
import Link from "next/link";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const GRID_SIZE = 4;
const INITIAL_TILES = 2;

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
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();

  const initializeBoard = useCallback(() => {
    const newTiles: Tile[] = [];
    for (let i = 0; i < INITIAL_TILES; i++) {
      newTiles.push(addRandomTile(newTiles));
    }
    setTiles(newTiles);
    setScore(0);
    setGameOver(false);
    setWon(false);
  }, []);

  useEffect(() => {
    initializeBoard();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOver || won) return;
      let moved = false;
      let newScore = score;
      let newTiles = [...tiles];

      if (e.key === "ArrowUp") {
        [newTiles, moved, newScore] = moveTiles(newTiles, "up");
      } else if (e.key === "ArrowDown") {
        [newTiles, moved, newScore] = moveTiles(newTiles, "down");
      } else if (e.key === "ArrowLeft") {
        [newTiles, moved, newScore] = moveTiles(newTiles, "left");
      } else if (e.key === "ArrowRight") {
        [newTiles, moved, newScore] = moveTiles(newTiles, "right");
      }

      if (moved) {
        newTiles = [...newTiles, addRandomTile(newTiles)];
        setTiles(newTiles);
        setScore(newScore);
        if (!canMove(newTiles)) {
          setGameOver(true);
        }
        if (newTiles.some((tile) => tile.value === 2048) && !won) {
          setWon(true);
          // Trigger confetti here if desired (e.g., import confetti and call it)
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [tiles, score, gameOver, won, initializeBoard]);

  const addRandomTile = (currentTiles: Tile[]): Tile => {
    const available: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!currentTiles.some((tile) => tile.x === x && tile.y === y)) {
          available.push({ x, y });
        }
      }
    }
    const { x, y } = available[Math.floor(Math.random() * available.length)];
    return {
      id: Date.now() + Math.random(),
      value: Math.random() < 0.9 ? 2 : 4,
      x,
      y,
    };
  };

  const moveTiles = (
    tiles: Tile[],
    direction: "up" | "down" | "left" | "right"
  ): [Tile[], boolean, number] => {
    let moved = false;
    let newScore = score;
    const newTiles = [...tiles];
    const sortedTiles = [...tiles].sort((a, b) => {
      if (direction === "up") return a.y - b.y;
      if (direction === "down") return b.y - a.y;
      if (direction === "left") return a.x - b.x;
      return b.x - a.x;
    });

    const merged: number[] = [];
    for (let i = 0; i < GRID_SIZE; i++) {
      let line: Tile[] = [];
      if (direction === "up" || direction === "down") {
        line = sortedTiles.filter((tile) => tile.x === i);
        if (direction === "down") line.reverse();
      } else {
        line = sortedTiles.filter((tile) => tile.y === i);
        if (direction === "right") line.reverse();
      }

      let newLine: Tile[] = [];
      let pos = 0;
      for (let j = 0; j < line.length; j++) {
        if (
          j < line.length - 1 &&
          line[j].value === line[j + 1].value &&
          !merged.includes(line[j].id) &&
          !merged.includes(line[j + 1].id)
        ) {
          const newValue = line[j].value * 2;
          newLine.push({
            ...line[j],
            value: newValue,
            x: direction === "up" || direction === "down" ? i : pos,
            y: direction === "left" || direction === "right" ? i : pos,
          });
          merged.push(line[j].id, line[j + 1].id);
          newScore += newValue;
          j++;
          pos++;
          moved = true;
        } else {
          newLine.push({
            ...line[j],
            x: direction === "up" || direction === "down" ? i : pos,
            y: direction === "left" || direction === "right" ? i : pos,
          });
          pos++;
          if (
            (direction === "up" && line[j].y !== pos - 1) ||
            (direction === "down" && line[j].y !== GRID_SIZE - pos) ||
            (direction === "left" && line[j].x !== pos - 1) ||
            (direction === "right" && line[j].x !== GRID_SIZE - pos)
          ) {
            moved = true;
          }
        }
      }

      newLine.forEach((tile) => {
        const index = newTiles.findIndex((t) => t.id === tile.id);
        if (index !== -1) newTiles[index] = tile;
      });
    }

    return [newTiles, moved, newScore];
  };

  const canMove = (tiles: Tile[]): boolean => {
    if (tiles.length < GRID_SIZE * GRID_SIZE) return true;
    for (const tile of tiles) {
      const neighbors = [
        { x: tile.x + 1, y: tile.y },
        { x: tile.x - 1, y: tile.y },
        { x: tile.x, y: tile.y + 1 },
        { x: tile.x, y: tile.y - 1 },
      ];
      for (const { x, y } of neighbors) {
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
          const neighbor = tiles.find((t) => t.x === x && t.y === y);
          if (!neighbor || neighbor.value === tile.value) return true;
        }
      }
    }
    return false;
  };

  const uploadScore = async () => {
    if (!address || !walletClient) {
      toast.error("Please connect your wallet");
      return;
    }

    try {
      const provider = walletClient.transport;
      const uploader = await WebUploader(WebEthereum).withProvider(provider);
      await uploader.upload(
        JSON.stringify({ address, score, timestamp: Date.now() }),
        {
          tags: [
            { name: "App", value: "IRYS-2048" },
            { name: "Type", value: "Score" },
          ],
        }
      );
      toast.success("Score uploaded!");
    } catch (error) {
      toast.error("Failed to upload score");
      console.error(error);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4">
      <Image
        src="/logo.png"
        alt="IRYS 2048 Logo"
        width={200}
        height={50}
        className="mb-8"
      />
      <AnimatePresence>
        {!gameOver ? (
          <motion.div
            key="game"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative w-full max-w-md aspect-square bg-gray-800 rounded-2xl p-4"
          >
            <div className="absolute top-4 left-4 text-white">
              Score: {score}
            </div>
            <Link
              href="/leaderboard"
              className="absolute top-4 right-4 text-white underline"
            >
              Leaderboard
            </Link>
            <div className="grid grid-cols-4 gap-2 w-full h-full">
              {Array.from({ length: GRID_SIZE * GRID_SIZE }).map((_, i) => (
                <div
                  key={i}
                  className="bg-gray-700 rounded-lg"
                  style={{ aspectRatio: "1 / 1" }}
                />
              ))}
              {tiles.map((tile) => (
                <motion.div
                  key={tile.id}
                  className="absolute bg-gray-600 rounded-lg flex items-center justify-center text-white text-2xl font-bold"
                  style={{
                    width: `${100 / GRID_SIZE}%`,
                    height: `${100 / GRID_SIZE}%`,
                    left: `${(tile.x * 100) / GRID_SIZE}%`,
                    top: `${(tile.y * 100) / GRID_SIZE}%`,
                  }}
                  initial={{ scale: 0, translateZ: 0 }}
                  animate={{
                    scale: 1,
                    translateZ: 10,
                    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.3)",
                  }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  {tile.value}
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="game-over"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="flex flex-col items-center gap-4"
          >
            <h2 className="text-2xl text-white">Game Over!</h2>
            <p className="text-xl text-white">Score: {score}</p>
            <button
              onClick={uploadScore}
              className="bg-gradient-to-r from-irys-gradientFrom to-irys-gradientTo text-white px-6 py-3 rounded-2xl shadow-lg text-lg"
            >
              Upload Score
            </button>
            <button
              onClick={initializeBoard}
              className="bg-gray-600 text-white px-6 py-3 rounded-2xl shadow-lg"
            >
              Play New Game
            </button>
          </motion.div>
        )}
      </AnimatePresence>
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
    </div>
  );
}
