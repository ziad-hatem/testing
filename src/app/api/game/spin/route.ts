//@ts-nocheck
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;
if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI or MONGO_URI environment variable"
  );
}

if (mongoose.connection.readyState !== 1) {
  mongoose.connect(MONGODB_URI);
}

// Define wheel segments with their values and probabilities
const wheelSegments = [
  { value: 2, probability: 0.1 },
  { value: 0, probability: 0.3 },
  { value: 5, probability: 0.05 },
  { value: 0, probability: 0.3 },
  { value: 1, probability: 0.15 },
  { value: 0, probability: 0.3 },
  { value: 10, probability: 0.02 },
  { value: 0, probability: 0.3 },
];

// Function to determine the winning segment based on probabilities
function determineWinningSegment() {
  const random = Math.random();
  let cumulativeProbability = 0;

  for (let i = 0; i < wheelSegments.length; i++) {
    cumulativeProbability += wheelSegments[i].probability;
    if (random <= cumulativeProbability) {
      return { segmentIndex: i, value: wheelSegments[i].value };
    }
  }

  // Fallback to the last segment if something goes wrong
  return {
    segmentIndex: wheelSegments.length - 1,
    value: wheelSegments[wheelSegments.length - 1].value,
  };
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { betAmount } = await req.json();

    if (!betAmount || betAmount < 1) {
      return NextResponse.json(
        { message: "Invalid bet amount" },
        { status: 400 }
      );
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    if (user.balance < betAmount) {
      return NextResponse.json(
        { message: "Insufficient balance" },
        { status: 400 }
      );
    }

    // Determine the winning segment
    const result = determineWinningSegment();
    const winAmount = result.value;

    // Update user balance
    user.balance = user.balance - betAmount + winAmount;
    await user.save();

    // Create a transaction record
    const transactionType = winAmount > 0 ? "win" : "loss";
    const transaction = await Transaction.create({
      user: user._id,
      type: transactionType,
      amount: winAmount,
      status: "completed",
      gameResult: {
        betAmount,
        winAmount,
        segmentIndex: result.segmentIndex,
      },
    });

    // Add transaction to user's transactions
    user.transactions.push(transaction._id);
    await user.save();

    return NextResponse.json({
      winAmount,
      segmentIndex: result.segmentIndex,
      newBalance: user.balance,
    });
  } catch (error) {
    console.error("Game error:", error);
    return NextResponse.json(
      { message: "Game processing failed" },
      { status: 500 }
    );
  }
}
