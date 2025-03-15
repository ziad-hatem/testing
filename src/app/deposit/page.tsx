//@ts-nocheck

"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";

// Initialize Stripe
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ""
);

export default function DepositPage() {
  const [amount, setAmount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userBalance, setUserBalance] = useState(0);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  // Fetch user balance
  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
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

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // Create payment intent on the server
      const response = await fetch("/api/stripe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment processing failed");
      }

      // Load Stripe
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error("Stripe failed to initialize");
      }

      // Use Stripe Elements for a better payment experience
      const { error: stripeError } = await stripe.confirmCardPayment(
        data.clientSecret,
        {
          payment_method: {
            // In a real application, you would use Elements to collect card details
            // This is just for testing purposes
            card: {
              token: "tok_visa",
            },
            billing_details: {
              name: session?.user?.name || "Unknown",
            },
          },
          // This will redirect the customer to the payment confirmation page
          return_url: window.location.origin + "/?deposit=success",
        }
      );

      if (stripeError) {
        throw new Error(stripeError.message || "Payment failed");
      }

      // If we get here without a redirect, the payment was successful
      // Refresh the user's balance
      const balanceResponse = await fetch("/api/user/balance");
      const balanceData = await balanceResponse.json();
      if (balanceResponse.ok) {
        setUserBalance(balanceData.balance);
      }

      // Show success message
      router.push("/?deposit=success");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Payment processing failed"
      );
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-foreground">
          Deposit Funds
        </h1>

        <div className="mb-6 p-4 bg-gray-100 dark:bg-gray-700 rounded-md">
          <p className="text-foreground font-medium">
            Current Balance: ${userBalance.toFixed(2)}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleDeposit} className="space-y-4">
          <div>
            <label
              htmlFor="amount"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Deposit Amount ($)
            </label>
            <input
              type="number"
              id="amount"
              min="5"
              max="1000"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex flex-col space-y-2">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Select a preset amount:
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[10, 25, 50, 100, 200, 500].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`py-2 px-4 rounded-md text-sm font-medium ${
                    amount === preset
                      ? "bg-primary text-white"
                      : "bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200"
                  }`}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || amount < 5}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Processing..." : "Deposit Now"}
          </button>
        </form>

        <div className="mt-6">
          <button
            onClick={() => router.push("/")}
            className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Back to Game
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Secure payments powered by Stripe. Your card information is never
            stored on our servers.
          </p>
        </div>
      </div>
    </div>
  );
}
