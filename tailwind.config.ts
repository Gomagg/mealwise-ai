import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        forest: {
          50: "#f2f7f3",
          100: "#e0ede3",
          200: "#c2dbc7",
          300: "#95bf9e",
          400: "#63a06f",
          500: "#438353",
          600: "#2f6840",
          700: "#265334",
          800: "#1f422c",
          900: "#1a3725",
          950: "#0d1e14",
        },
        lime: { soft: "#eaf6df", accent: "#a3d977" },
        cream: "#faf9f5",
      },
      fontFamily: { sans: ["var(--font-sans)", "system-ui", "sans-serif"] },
      boxShadow: {
        card: "0 1px 3px rgba(26,55,37,0.08), 0 4px 16px rgba(26,55,37,0.06)",
      },
      borderRadius: { xl: "1rem", "2xl": "1.25rem" },
    },
  },
  plugins: [],
};
export default config;
