/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'bg-primary': '#0a0a0a',
        'bg-secondary': '#141414',
        'bg-tertiary': '#1f1f1f',
        'text-primary': '#ffffff',
        'text-secondary': '#a0a0a0',
        'text-muted': '#6b6b6b',
        'border': '#2a2a2a',
        'border-hover': '#3a3a3a',
        'accent': '#3b82f6',
        'accent-hover': '#2563eb',
        'danger': '#ef4444',
        'success': '#22c55e',
      },
    },
  },
  plugins: [],
}
