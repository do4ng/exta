import { defineConfig } from 'vite';
import { exta } from 'exta';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), exta()],
});
