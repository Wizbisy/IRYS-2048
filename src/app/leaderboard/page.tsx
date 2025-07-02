"use client";

import { useAccount } from "wagmi";
import useSWR from "swr";
import Image from "next/image";
import { motion } from "framer-motion";

interface Score {
  address: string;
  score: number;
  timestamp: number;
  id: string;
}

const fetcher = async () => {
  const res = await fetch("https://testnet1.irys.xyz/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: `
        query {
          transactions(
            tags: [
              { name: "App", values: ["IRYS-2048"] },
              { name: "Type", values: ["Score"] }
            ],
            first: 100,
            sort: HEIGHT_DESC
          ) {
            edges {
              node {
                id
                tags { name value }
              }
            }
          }
        }
      `,
    }),
  });

  const { data } = await res.json();
  const scores: Score[] = await Promise.all(
    data.transactions.edges.map(async ({ node }: any) => {
      const dataRes = await fetch(`https://testnet1.irys.xyz/${node.id}`);
      const scoreObj = await dataRes.json();
      return { ...scoreObj, id: node.id };
    })
  );

  return scores.sort((a, b) => b.score - a.score).slice(0, 100);
};

export default function Leaderboard() {
  const { address } = useAccount();
  const { data: scores, error } = useSWR("irys-scores", fetcher, {
    refreshInterval: 30000,
  });

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-[#00FF7F]">
      <Image
        src="/logo.png"
        alt="IRYS 2048 Logo"
        width={200}
        height={50}
        className="mb-8"
      />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        className="w-full max-w-4xl bg-gray-900 rounded-2xl p-6 shadow-xl"
      >
        <h1 className="text-2xl text-white mb-4">Leaderboard</h1>

        {error && <p className="text-red-500">Failed to load leaderboard</p>}
        {!scores ? (
          <p className="text-white">Loading...</p>
        ) : scores.length === 0 ? (
          <p className="text-white">No scores yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-white text-sm md:text-base">
              <thead>
                <tr>
                  <th className="p-2 text-left">Rank</th>
                  <th className="p-2 text-left">Address</th>
                  <th className="p-2 text-left">Score</th>
                  <th className="p-2 text-left">Date</th>
                </tr>
              </thead>
              <tbody>
                {scores.map((score, index) => {
                  const isCurrentUser = address?.toLowerCase() === score.address.toLowerCase();
                  return (
                    <tr
                      key={score.id}
                      className={`border-t border-gray-600 ${isCurrentUser ? "bg-green-600/20" : ""}`}
                    >
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-mono">
                        {score.address.slice(0, 6)}...{score.address.slice(-4)}
                      </td>
                      <td className="p-2 font-semibold">{score.score}</td>
                      <td className="p-2">
                        {new Date(score.timestamp).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

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
