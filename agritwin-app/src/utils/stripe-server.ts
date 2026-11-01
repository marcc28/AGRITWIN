import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  httpClient: Stripe.createFetchHttpClient(),
  // https://github.com/stripe/stripe-node#configuration
  apiVersion: "2026-09-30.endive",
  appInfo: {
    name: "expo-router-stripe",
  },
});
