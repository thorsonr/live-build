/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'live': {
          'bg': 'var(--bg)',
          'bg-warm': 'var(--bg-warm)',
          'surface': 'var(--surface)',
          'border': 'var(--border)',
          'text': 'var(--text)',
          'text-secondary': 'var(--text-secondary)',
          'accent': 'var(--accent)',
          'accent-soft': 'var(--accent-soft)',
          'primary': 'var(--primary)',
          'success': 'var(--success)',
          'warning': 'var(--warning)',
          'danger': 'var(--danger)',
          'info': 'var(--info)',
        }
      },
      fontFamily: {
        'sans': ['Inter', '-apple-system', 'sans-serif'],
        'display': ['Playfair Display', 'serif'],
      },
    },
  },
  plugins: [],
}
