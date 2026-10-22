import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          950: "#0B1F33",
          900: "#102A43",
          850: "#163456",
          800: "#1C416B",
          700: "#244F81",
          600: "#336699",
          100: "#E2E8F0",
          50: "#F0F4F8",
        },
      },
      animation: {
        "emergency-pulse": "emergencyPulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ping-slow": "ping 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
      keyframes: {
        emergencyPulse: {
          "0%, 100%": {
            boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.25)",
            borderColor: "rgba(239, 68, 68, 0.9)",
          },
          "50%": {
            boxShadow: "0 15px 35px -5px rgba(239, 68, 68, 0.45)",
            borderColor: "rgba(220, 38, 38, 1)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
