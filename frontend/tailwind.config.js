/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        primary: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e3a8a', 900: '#0f172a' },
        navy: { 700: '#1e3a5f', 800: '#152a45', 900: '#0c1929' },
        naukri: {
          bg: '#f4f5f7',
          text: '#121224',
          muted: '#474d6a',
          skill: '#717b9e',
          blue: '#457eff',
          'blue-hover': '#275df5',
          border: '#e7e7f1',
        },
      },
      boxShadow: {
        naukri: '0 1px 4px rgba(18, 18, 36, 0.08)',
      },
    },
  },
  plugins: [],
}
