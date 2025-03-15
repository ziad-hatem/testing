//@ts-nocheck
"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type WheelSegment = {
  value: number;
  color: string;
  probability: number;
};

const defaultSegments: WheelSegment[] = [
  { value: 2, color: "#FF6384", probability: 0.1 },
  { value: 0, color: "#36A2EB", probability: 0.3 },
  { value: 5, color: "#FFCE56", probability: 0.05 },
  { value: 0, color: "#4BC0C0", probability: 0.3 },
  { value: 1, color: "#9966FF", probability: 0.15 },
  { value: 0, color: "#FF9F40", probability: 0.3 },
  { value: 10, color: "#FF6384", probability: 0.02 },
  { value: 0, color: "#36A2EB", probability: 0.3 },
];

export default function SpinWheel() {
  const [segments, setSegments] = useState<WheelSegment[]>(defaultSegments);
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [betAmount, setBetAmount] = useState(1);
  const [result, setResult] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { data: session } = useSession();
  const router = useRouter();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [userBalance, setUserBalance] = useState(0);

  // Fetch user balance when session changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id || "") {
        try {
          const response = await fetch("/api/user/balance");
          const data = await response.json();
          if (response.ok) {
            setUserBalance(data.balance);
          }
        } catch (error) {
          console.error("Failed to fetch user balance:", error);
        }
      }
    };

    fetchUserData();
  }, [session]);

  const spinWheel = async () => {
    if (!session) {
      setError("Please sign in to play");
      return;
    }

    if (betAmount > userBalance) {
      setError("Insufficient balance");
      return;
    }

    if (isSpinning) return;

    setIsSpinning(true);
    setResult(null);
    setMessage("");
    setError("");

    try {
      // Simulate API call to determine result
      // In a real app, this would be a server call to prevent cheating
      const response = await fetch("/api/game/spin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ betAmount }),
      });

      if (!response.ok) {
        throw new Error("Failed to process game");
      }

      const data = await response.json();
      const { winAmount, segmentIndex } = data;

      // Calculate the rotation to land on the winning segment
      // Each segment is 360 / segments.length degrees
      const segmentAngle = 360 / segments.length;
      // Calculate the position to land on the center of the segment
      // We need to adjust the position to account for the pointer at the top
      const segmentPosition =
        360 - segmentAngle * segmentIndex - segmentAngle / 2;

      // Add multiple rotations for effect (5 full rotations + position)
      const newRotation = 1800 + segmentPosition;

      // Animate the wheel
      setRotation(newRotation);

      // Update UI after spin completes
      setTimeout(() => {
        setIsSpinning(false);
        setResult(winAmount);
        setUserBalance((prev) => prev - betAmount + winAmount);

        if (winAmount > betAmount) {
          setMessage(`Congratulations! You won $${winAmount}`);
        } else if (winAmount === 0) {
          setMessage("Better luck next time!");
        } else {
          setMessage(`You won $${winAmount}`);
        }
      }, 5000); // Match this with the animation duration
    } catch (error) {
      setIsSpinning(false);
      setError("An error occurred. Please try again.");
      console.error(error);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4 text-foreground">Spin to Win!</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full">
          {error}
        </div>
      )}

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4 w-full">
          {message}
        </div>
      )}

      <div className="relative w-64 h-64 md:w-80 md:h-80 mb-8">
        {/* Wheel */}
        <motion.div
          ref={wheelRef}
          className="absolute w-full h-full rounded-full overflow-hidden border-4 border-gray-800 dark:border-gray-200"
          animate={{ rotate: rotation }}
          transition={{ duration: 5, ease: "easeOut" }}
          style={{ transformOrigin: "center center" }}
        >
          {segments.map((segment, index) => {
            const angle = 360 / segments.length;
            return (
              <div
                key={index}
                className="absolute w-full h-full"
                style={{
                  transform: `rotate(${angle * index}deg)`,
                  transformOrigin: "50% 50%",
                  clipPath: `polygon(50% 50%, 50% 0%, ${
                    50 + 50 * Math.cos((angle * Math.PI) / 180)
                  }% ${50 - 50 * Math.sin((angle * Math.PI) / 180)}%, 50% 50%)`,
                  backgroundColor: segment.color,
                }}
              >
                <div
                  className="absolute top-5 left-1/2 transform -translate-x-1/2 text-white font-bold text-lg"
                  style={{ transform: "translateX(-50%) rotate(90deg)" }}
                >
                  ${segment.value}
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Center point */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-gray-800 dark:bg-white rounded-full z-10"></div>

        {/* Pointer */}
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-12 z-10">
          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-red-600"></div>
        </div>
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <span className="text-foreground font-medium">
            Your Balance: ${userBalance.toFixed(2)}
          </span>
          <button
            onClick={() => router.push("/deposit")}
            className="px-4 py-1 bg-secondary text-white rounded-md hover:bg-secondary/90 text-sm"
          >
            Deposit
          </button>
        </div>

        <div className="mb-4">
          <label
            htmlFor="betAmount"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Bet Amount
          </label>
          <div className="flex items-center">
            <input
              type="number"
              id="betAmount"
              min="1"
              max="100"
              value={betAmount}
              onChange={(e) => setBetAmount(Number(e.target.value))}
              disabled={isSpinning}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>
        </div>

        <button
          onClick={spinWheel}
          disabled={isSpinning || !session}
          className="w-full py-3 px-4 bg-primary text-white rounded-md font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSpinning ? "Spinning..." : "Spin Now!"}
        </button>
      </div>
    </div>
  );
}
