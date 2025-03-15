# Vercel Deployment Guide

## Fixing 504 Gateway Timeout Errors

If you're experiencing 504 Gateway Timeout errors with your NextAuth authentication on Vercel, follow these steps to resolve the issue:

### 1. Update Environment Variables in Vercel

Make sure you have properly set all required environment variables in your Vercel project settings:

- `MONGODB_URI` or `MONGO_URI`: Your MongoDB connection string
- `NEXTAUTH_URL`: Set to your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET`: Your NextAuth secret key
- `STRIPE_SECRET_KEY`: Your Stripe secret key
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: Your Stripe publishable key
- `STRIPE_WEBHOOK_SECRET`: Your Stripe webhook secret

### 2. Configure MongoDB Atlas Network Access

Ensure your MongoDB Atlas cluster allows connections from Vercel's IP addresses:

1. Go to your MongoDB Atlas dashboard
2. Navigate to Network Access
3. Add `0.0.0.0/0` to allow connections from anywhere (for testing only)
4. For production, add Vercel's IP ranges or use MongoDB Atlas's Private Link feature

### 3. Increase Function Timeout in Vercel

Vercel has a default function timeout of 10 seconds. For database operations that might take longer, increase this limit:

1. Create or update a `vercel.json` file in your project root with:

```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60
    }
  }
}
```

### 4. Optimize Database Connections

The code has been updated to include better connection handling with appropriate timeout settings. These changes should help prevent 504 errors by:

- Setting appropriate connection timeouts
- Adding error handling for database connections
- Optimizing connection pooling

### 5. Troubleshooting

If you're still experiencing issues:

1. Check Vercel logs for specific error messages
2. Verify that your MongoDB Atlas cluster is on a tier that can handle your application's load
3. Consider implementing connection pooling or caching strategies
4. Test your application locally with production environment variables to isolate the issue
