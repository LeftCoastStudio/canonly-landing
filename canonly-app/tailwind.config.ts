import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: "#1E2761",
        navydeep: "#161d4a",
        ice: "#CADCFC",
        mint: "#02C39A",
        mintdark: "#02907A",
        tint: "#F0F4FB",
        ink: "#1A2238",
      },
    },
  },
  plugins: [],
};
export default config;
