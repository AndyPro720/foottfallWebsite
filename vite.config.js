import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [],
  base: '/',
  server: {
    host: true, 
    allowedHosts: [
      'laptop-720',
      // If you use the full Tailscale MagicDNS URL, add that too:
      // 'laptop-720.tailnet-name.ts.net' 
    ]
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        intelligence: resolve(__dirname, 'intelligence/index.html')
      }
    }
  }
});
