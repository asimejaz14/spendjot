import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1rem",
      screens: { "2xl": "1280px" },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
        xl: "calc(var(--radius) + 4px)",
        "2xl": "calc(var(--radius) + 8px)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-sora)", "var(--font-inter)", "sans-serif"],
      },
      transitionTimingFunction: {
        // Strong custom curves (animations.dev) — built-in easings are too weak.
        "out-strong": "cubic-bezier(0.23, 1, 0.32, 1)",
        "in-out-strong": "cubic-bezier(0.77, 0, 0.175, 1)",
      },
      backgroundImage: {
        // Forest (#153D30) brand gradient — token-driven so dark mode can lift it.
        brand:
          "linear-gradient(135deg, hsl(var(--brand-1)) 0%, hsl(var(--brand-2)) 50%, hsl(var(--brand-3)) 100%)",
        "brand-soft":
          "linear-gradient(135deg, hsl(var(--foreground) / 0.07) 0%, hsl(var(--foreground) / 0.04) 100%)",
        // Animated hero mesh — pairs with `animate-gradient-pan` (bg-[length:200%_200%]).
        "brand-mesh":
          "linear-gradient(120deg, hsl(var(--brand-2)) 0%, hsl(var(--brand-1)) 35%, hsl(var(--brand-3)) 65%, hsl(var(--brand-2)) 100%)",
        sheen:
          "linear-gradient(105deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)",
      },
      // Black shadows; --shadow-strength deepens them on the dark theme.
      boxShadow: {
        soft: "0 1px 2px hsl(var(--shadow-color) / calc(0.05 * var(--shadow-strength))), 0 8px 24px -12px hsl(var(--shadow-color) / calc(0.18 * var(--shadow-strength)))",
        glow: "0 10px 40px -12px hsl(var(--shadow-color) / calc(0.35 * var(--shadow-strength)))",
        "glow-lg": "0 24px 70px -24px hsl(var(--shadow-color) / calc(0.5 * var(--shadow-strength)))",
        lift: "0 1px 2px hsl(var(--shadow-color) / calc(0.06 * var(--shadow-strength))), 0 18px 40px -18px hsl(var(--shadow-color) / calc(0.3 * var(--shadow-strength)))",
      },
      keyframes: {
        "fade-in": {
          from: { opacity: "0", transform: "translateY(6px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-out": { from: { opacity: "1" }, to: { opacity: "0" } },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        // Slow vertical bob for floating decorative orbs/sparkles.
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-12px)" },
        },
        // Pans a 200% background — the living hero gradient.
        "gradient-pan": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        // Soft breathing glow for accents.
        "pulse-glow": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.04)" },
        },
        // Scale-in pop for badges / freshly revealed elements.
        pop: {
          "0%": { transform: "scale(0.85)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // One-shot light sweep across brand buttons on hover.
        "shine-sweep": {
          "0%": { transform: "translateX(-130%) skewX(-12deg)" },
          "100%": { transform: "translateX(230%) skewX(-12deg)" },
        },
        "spin-slow": {
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.35s ease-out both",
        "fade-out": "fade-out 0.2s ease-in both",
        shimmer: "shimmer 1.6s infinite",
        float: "float 7s ease-in-out infinite",
        "float-slow": "float 11s ease-in-out infinite",
        "gradient-pan": "gradient-pan 9s ease infinite",
        "pulse-glow": "pulse-glow 3.5s ease-in-out infinite",
        pop: "pop 0.32s cubic-bezier(0.34,1.56,0.64,1) both",
        "shine-sweep": "shine-sweep 0.9s ease-out",
        "spin-slow": "spin-slow 14s linear infinite",
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"),
    // `hover-on:` = hover, but never on a disabled control (keeps the
    // not-allowed cursor from lighting the button up).
    plugin(({ addVariant }) => {
      addVariant("hover-on", "&:not(:disabled):hover");
    }),
  ],
};

export default config;
