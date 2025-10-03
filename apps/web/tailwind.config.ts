import type { Config } from "tailwindcss"

const config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
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
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // C9D.AI Specific Colors (keeping existing for reference, can be merged/aliased)
        "c9n-blue-dark": "#0A192F", // Existing dark background
        "c9n-blue-mid": "#0F203A", // Existing slightly lighter dark blue
        "c9n-teal": "#2CE4B8", // Existing accent teal

        // Windsurf Inspired Palette
        "windsurf-purple-deep": "#300D4F", // Deep purple for backgrounds or text
        "windsurf-purple-vibrant": "#7B2CBF", // A vibrant purple
        "windsurf-pink-hot": "#E71D73", // Hot pink accent
        "windsurf-pink-light": "#FDEFF5", // Very light pink for backgrounds
        "windsurf-blue-electric": "#00B2FF", // Electric blue accent
        "windsurf-yellow-bright": "#FFD700", // Bright yellow accent
        "windsurf-green-lime": "#AFFF3C", // Lime green accent
        "windsurf-off-white": "#F7F9FA", // Off-white/light beige
        "windsurf-gray-light": "#E0E6ED", // Light gray for borders or subtle text
        "windsurf-gray-medium": "#9FB3C8", // Medium gray
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "gradient-wave": {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
        "gentle-float": {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "25%": { transform: "translateY(-20px) translateX(15px)" },
          "50%": { transform: "translateY(15px) translateX(-20px)" },
          "75%": { transform: "translateY(-15px) translateX(20px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-wave": "gradient-wave 15s ease infinite",
        "gentle-float-1": "gentle-float 25s ease-in-out infinite",
        "gentle-float-2": "gentle-float 30s ease-in-out infinite reverse",
        "gentle-float-3": "gentle-float 22s ease-in-out infinite",
      },
      backgroundImage: {
        "purple-pink-gradient": "linear-gradient(to right, #7B2CBF, #E71D73)",
        "blue-teal-gradient": "linear-gradient(to right, #00B2FF, #2CE4B8)",
        "yellow-lime-gradient": "linear-gradient(to right, #FFD700, #AFFF3C)",
        "colorful-feature-gradient": "linear-gradient(135deg, #7B2CBF 0%, #E71D73 33%, #FFD700 66%, #2CE4B8 100%)",
      },
      backgroundSize: {
        "200%": "200% 200%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
