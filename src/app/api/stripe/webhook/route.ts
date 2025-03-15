//@ts-nocheck

import { NextResponse } from "next/server";
import Stripe from "stripe";
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
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

if (mongoose.connection.readyState !== 1) {
  mongoose.connect(MONGODB_URI);
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  let event: Stripe.Event;

  // In development mode, we can parse the raw body directly
  // In production, we should verify the webhook signature
  if (
    process.env.NODE_ENV === "development" ||
    !process.env.STRIPE_WEBHOOK_SECRET
  ) {
    try {
      event = JSON.parse(body) as Stripe.Event;
      console.log("Development mode: Skipping signature verification");
    } catch (err) {
      console.error("Error parsing webhook payload:", err);
      return NextResponse.json(
        { message: "Invalid webhook payload" },
        { status: 400 }
      );
    }
  } else {
    // Production mode with signature verification
    if (!signature) {
      return NextResponse.json(
        { message: "Missing signature" },
        { status: 400 }
      );
    }

    try {
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET as string
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { message: "Webhook signature verification failed" },
        { status: 400 }
      );
    }
  }

  // Handle the event
  if (event.type === "payment_intent.succeeded") {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;

    try {
      // Find the transaction with this payment intent ID
      const transaction = await Transaction.findOne({
        paymentIntentId: paymentIntent.id,
      });

      if (!transaction) {
        console.error(
          "Transaction not found for payment intent:",
          paymentIntent.id
        );
        return NextResponse.json(
          { message: "Transaction not found" },
          { status: 404 }
        );
      }

      // Update transaction status
      transaction.status = "completed";
      await transaction.save();

      // Update user balance
      const user = await User.findById(transaction.user);
      if (!user) {
        console.error("User not found for transaction:", transaction._id);
        return NextResponse.json(
          { message: "User not found" },
          { status: 404 }
        );
      }

      user.balance += transaction.amount;
      await user.save();

      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("Error processing payment success:", error);
      return NextResponse.json(
        { message: "Error processing payment" },
        { status: 500 }
      );
    }
  }

  // Return a response to acknowledge receipt of the event
  return NextResponse.json({ received: true });
}
