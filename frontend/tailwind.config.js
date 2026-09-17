/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // Brand palette — deep navy/slate dark theme
        brand: {
          50:  "#f0f4ff",
          100: "#dde8ff",
          200: "#c2d3ff",
          300: "#9cb5fd",
          400: "#758ef9",
          500: "#5567f3",
          600: "#3d43e7",
          700: "#3333cc",
          800: "#2b2ca4",
          900: "#282b82",
          950: "#1a1a4e",
        },
        // Surface colors for dark mode glassmorphism
        surface: {
          950: "#080c14",
          900: "#0e1420",
          800: "#131c2e",
          700: "#1a2540",
          600: "#1f2d50",
          500: "#243460",
        },
      },
      fontFamily: {
        sans: ["'DM Sans'", "system-ui", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Syne'", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-mesh": "radial-gradient(at 40% 20%, hsla(228,100%,74%,0.15) 0, transparent 50%), radial-gradient(at 80% 0%, hsla(189,100%,56%,0.1) 0, transparent 50%), radial-gradient(at 0% 50%, hsla(355,100%,93%,0.05) 0, transparent 50%)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
}
