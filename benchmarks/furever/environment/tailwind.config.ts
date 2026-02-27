import type {Config} from 'tailwindcss';

const config = {
  darkMode: ['class'],
  important: true,
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        banner: '#0e5b2f',
        foreground: 'hsl(var(--foreground))',
        dialog: {
          background: 'var(--dialog-background)',
          content: 'hsl(var--dialog-content)',
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)',
        },
        secondary: {
          DEFAULT: 'var(--subdued)',
        },
        offset: {
          DEFAULT: 'var(--offset)',
        },
        subdued: {
          DEFAULT: 'var(--subdued)',
          foreground: 'var(--subdued-foreground)',
        },
        destructive: {
          DEFAULT: 'var(--destructive)',
          foreground: 'var(--destructive-foreground)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          subdued: 'var(--accent-subdued)',
          foreground: 'var(--accent-foreground)',
        },
        success: {
          DEFAULT: 'var(--success)',
          border: 'var(--success-border)',
          foreground: 'var(--success-foreground)',
        },
        fill: 'var(--primary)',
        tools: {
          background: 'var(--tools-background)',
        },
        screen: {
          background: 'var(--screen-background)',
          foreground: 'var(--screen-foreground)',
        },
        component: {
          DEFAULT: 'var(--embedded-component)',
          hover: 'var(--embedded-component-hover)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      transitionProperty: {
        border: 'border-color',
      },
      backgroundImage: {
        'paw-pattern': "url('/pattern.png')",
        'paw-pattern-white': "url('/pattern-white.png')",
        'dot-grid': "url('/dot-grid.png')",
        'dot-grid-dark': "url('/dot-grid-dark.png')",
      },
      boxShadow: {
        md: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -4px rgba(0, 0, 0, 0.08)',
      },
    },
    fontFamily: {
      sans: ['Sohne', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
    },
  },
  plugins: [require('tailwindcss-animate')],
} satisfies Config;

export default config;
