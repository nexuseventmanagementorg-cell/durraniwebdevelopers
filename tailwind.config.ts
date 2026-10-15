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
        brand: {
          red: "#E31E36",
          "red-hover": "#C8162D",
          "red-light": "#FFF1F2",
          "red-muted": "#FFE4E6",
          black: "#101216",
          dark: "#181B20",
          "dark-surface": "#242830",
          "dark-border": "#2E3440",
          light: "#F4F5F7",
          border: "#E2E8F0",
          muted: "#64748B",
          white: "#FFFFFF",
        },
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(227, 30, 54, 0.4)",
        card: "0 10px 30px -10px rgba(16, 18, 22, 0.08)",
        "card-dark": "0 10px 30px -10px rgba(0, 0, 0, 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
