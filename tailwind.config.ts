import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: "#fdf0d5",
        ink: "#111111",
        // Bright neobrutalist accent palette
        brut: {
          yellow: "#ffd23f",
          pink: "#ff6ec7",
          cyan: "#4deeea",
          lime: "#aeffb0",
          purple: "#b08cff",
          orange: "#ff8c42",
          red: "#ff5a5f",
          blue: "#6ea8ff",
        },
      },
      fontFamily: {
        display: ['"Archivo Black"', '"Space Grotesk"', "sans-serif"],
      },
      keyframes: {
        shimmer: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        shimmer: "shimmer 1.3s infinite",
      },
    },
  },
  plugins: [],
};

export default config;
