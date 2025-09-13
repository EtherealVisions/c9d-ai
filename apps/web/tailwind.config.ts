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
        // C9N.AI Specific Colors (keeping existing for reference, can be merged/aliased)
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
          "0%, 100%": { transform: "translate3d(0px, 0px, 0px)" },
          "25%": { transform: "translate3d(15px, -20px, 0px)" },
          "50%": { transform: "translate3d(-20px, 15px, 0px)" },
          "75%": { transform: "translate3d(20px, -15px, 0px)" },
        },
        "pulse-glow": {
          "0%, 100%": { 
            boxShadow: "0 0 20px rgba(231, 29, 115, 0.3)",
            transform: "scale(1)"
          },
          "50%": { 
            boxShadow: "0 0 40px rgba(231, 29, 115, 0.6)",
            transform: "scale(1.02)"
          },
        },
        "counter-up": {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0px)", opacity: "1" },
        },
        "fade-in-up": {
          "0%": { 
            opacity: "0", 
            transform: "translateY(30px)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "translateY(0)" 
          },
        },
        "fade-in-left": {
          "0%": { 
            opacity: "0", 
            transform: "translateX(-30px)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "translateX(0)" 
          },
        },
        "fade-in-right": {
          "0%": { 
            opacity: "0", 
            transform: "translateX(30px)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "translateX(0)" 
          },
        },
        "scale-in": {
          "0%": { 
            opacity: "0", 
            transform: "scale(0.9)" 
          },
          "100%": { 
            opacity: "1", 
            transform: "scale(1)" 
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "gradient-wave": "gradient-wave 15s ease infinite",
        "gentle-float-1": "gentle-float 25s ease-in-out infinite",
        "gentle-float-2": "gentle-float 30s ease-in-out infinite reverse",
        "gentle-float-3": "gentle-float 22s ease-in-out infinite",
        "pulse-glow": "pulse-glow 3s ease-in-out infinite",
        "counter-up": "counter-up 0.8s ease-out forwards",
        "fade-in-up": "fade-in-up 0.6s ease-out forwards",
        "fade-in-left": "fade-in-left 0.6s ease-out forwards",
        "fade-in-right": "fade-in-right 0.6s ease-out forwards",
        "scale-in": "scale-in 0.5s ease-out forwards",
        // Mobile-optimized animations
        "mobile-slide-up": "fade-in-up 0.4s ease-out forwards",
        "mobile-fade-in": "fade-in-up 0.3s ease-out forwards",
        "touch-feedback": "scale-in 0.1s ease-out forwards",
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
      // Mobile-specific utilities
      spacing: {
        'safe-top': 'env(safe-area-inset-top)',
        'safe-bottom': 'env(safe-area-inset-bottom)',
        'safe-left': 'env(safe-area-inset-left)',
        'safe-right': 'env(safe-area-inset-right)',
      },
      minHeight: {
        'screen-safe': 'calc(100vh - env(safe-area-inset-top) - env(safe-area-inset-bottom))',
      },
      maxWidth: {
        'mobile': '375px',
        'mobile-lg': '414px',
        'tablet': '768px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
