import { defineConfig } from 'vite';

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
  }
});
