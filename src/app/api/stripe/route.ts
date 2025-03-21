//@ts-nocheck

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import User from "@/models/User";
import Transaction from "@/models/Transaction";
import mongoose from "mongoose";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("Missing STRIPE_SECRET_KEY environment variable");
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

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

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { amount } = await req.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ message: "Invalid amount" }, { status: 400 });
    }

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount * 100, // Convert to cents
      currency: "usd",
      metadata: {
        userId: user._id.toString(),
      },
    });

    // Create a pending transaction
    const transaction = await Transaction.create({
      user: user._id,
      type: "deposit",
      amount,
      status: "pending",
      paymentIntentId: paymentIntent.id,
    });

    // Add transaction to user's transactions
    user.transactions.push(transaction._id);
    await user.save();

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      transactionId: transaction._id,
    });
  } catch (error) {
    console.error("Stripe payment error:", error);
    return NextResponse.json(
      { message: "Payment processing failed" },
      { status: 500 }
    );
  }
}
