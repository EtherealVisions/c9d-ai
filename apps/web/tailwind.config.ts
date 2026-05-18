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
        "dify-white": "#FFFFFF", // Primary background
        "dify-gray-50": "#F9FAFB", // Light gray background
        "dify-gray-100": "#F3F4F6", // Section backgrounds
        "dify-gray-200": "#E5E7EB", // Borders
        "dify-gray-300": "#D1D5DB", // Disabled states
        "dify-gray-400": "#9CA3AF", // Muted text
        "dify-gray-500": "#6B7280", // Secondary text
        "dify-gray-600": "#4B5563", // Primary text light
        "dify-gray-700": "#374151", // Primary text medium
        "dify-gray-800": "#1F2937", // Primary text dark
        "dify-gray-900": "#111827", // Primary text darkest
        
        // Brand colors
        "dify-blue": "#0055FF", // Primary blue accent
        "dify-blue-light": "#E6F0FF", // Light blue background
        "dify-blue-dark": "#0044CC", // Dark blue hover
        
        // Status colors
        "dify-green": "#10B981", // Success
        "dify-amber": "#F59E0B", // Warning
        "dify-red": "#EF4444", // Error
        
        // Legacy colors (updated to match new scheme)
        "c9n-blue-dark": "#111827",
        "c9n-blue-mid": "#1F2937",
        "c9n-teal": "#0055FF"
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
        "dify-gradient": "linear-gradient(135deg, #0055FF 0%, #0044CC 100%)",
        "dify-gradient-subtle": "linear-gradient(180deg, #FFFFFF 0%, #F9FAFB 100%)",
        "dify-section-gradient": "linear-gradient(180deg, #F9FAFB 0%, #FFFFFF 100%)",
      },
      backgroundSize: {
        "200%": "200% 200%",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
