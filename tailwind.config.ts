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
          950: "#061A14",
          900: "#0A291F",
          850: "#0D3528",
          800: "#104132",
          700: "#175B46",
          600: "#1E755A",
          100: "#D1FAE5",
          50: "#ECFDF5",
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
            backgroundColor: "rgba(254, 242, 242, 0.95)",
            borderColor: "rgba(239, 68, 68, 0.8)",
            boxShadow: "0 0 25px rgba(239, 68, 68, 0.35)",
          },
          "50%": {
            backgroundColor: "rgba(254, 226, 226, 1)",
            borderColor: "rgba(220, 38, 38, 1)",
            boxShadow: "0 0 45px rgba(239, 68, 68, 0.65)",
          },
        },
      },
    },
  },
  plugins: [],
};

export default config;
