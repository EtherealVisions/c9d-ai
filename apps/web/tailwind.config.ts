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
        // Dify-inspired Color Palette
        "dify-bg-primary": "#0F0F1A", // Deep dark background
        "dify-bg-secondary": "#1A1A2E", // Secondary dark background
        "dify-bg-card": "#16161F", // Card background
        "dify-bg-gradient-start": "#4F46E5", // Gradient start (indigo)
        "dify-bg-gradient-end": "#7C3AED", // Gradient end (purple)
        
        // Text colors
        "dify-text-primary": "#FFFFFF", // Primary text
        "dify-text-secondary": "#9CA3AF", // Secondary text (gray)
        "dify-text-muted": "#6B7280", // Muted text
        
        // Accent colors
        "dify-accent-primary": "#6366F1", // Primary accent (indigo)
        "dify-accent-secondary": "#8B5CF6", // Secondary accent (purple)
        "dify-accent-success": "#10B981", // Success green
        "dify-accent-warning": "#F59E0B", // Warning amber
        "dify-accent-error": "#EF4444", // Error red
        
        // Border and surface colors
        "dify-border": "#2D2D3F", // Border color
        "dify-surface-hover": "#1F1F2E", // Hover state
        "dify-surface-active": "#2A2A3E", // Active state
        
        // Legacy colors (for backward compatibility)
        "c9n-blue-dark": "#0F0F1A",
        "c9n-blue-mid": "#1A1A2E",
        "c9n-teal": "#10B981"
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
        "dify-gradient": "linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)",
        "dify-gradient-radial": "radial-gradient(circle at top left, #4F46E5, #7C3AED, #0F0F1A)",
        "dify-card-gradient": "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)",
        "dify-text-gradient": "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
        "dify-hover-gradient": "linear-gradient(135deg, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.2) 100%)",
      },
      backgroundSize: {
        "200%": "200% 200%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
