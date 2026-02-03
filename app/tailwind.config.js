import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    resolve(__dirname, 'index.html'),
    resolve(__dirname, 'src/**/*.{ts,tsx,js,jsx}')
  ],
  theme: {
    extend: {
      colors: {
        discord: {
          bg: '#1e2124',
          sidebar: '#2f3136',
          blurple: '#5865F2',
          text: '#e3e5e8',
          muted: '#b5bac1'
        }
      },
      borderRadius: {
        sm: '6px',
        md: '10px'
      }
    }
  },
  plugins: []
};
