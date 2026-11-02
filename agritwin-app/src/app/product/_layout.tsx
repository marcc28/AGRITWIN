import { Stack } from "expo-router";
import StripeProvider from "../../components/stripe-provider";

export default function RootLayout() {
  return (
    <StripeProvider>
      <Stack>
        <Stack.Screen
          name="[id]"
          options={{
            title: "Producte",
          }}
        />
      </Stack>
    </StripeProvider>
  );
}
