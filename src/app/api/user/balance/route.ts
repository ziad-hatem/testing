//@ts-nocheck

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import User from "@/models/User";
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

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(session.user.id).select("balance");
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ balance: user.balance });
  } catch (error) {
    console.error("Error fetching user balance:", error);
    return NextResponse.json(
      { message: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}
