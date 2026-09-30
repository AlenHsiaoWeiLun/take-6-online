import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/** Emits /ads.txt for AdSense when a publisher id is configured. */
function adsTxt(client: string | undefined): Plugin {
  return {
    name: 'ads-txt',
    generateBundle() {
      if (!client) return;
      const pub = client.replace(/^ca-/, '');
      this.emitFile({ type: 'asset', fileName: 'ads.txt', source: `google.com, ${pub}, DIRECT, f08c47fec0942fa0\n` });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), tailwindcss(), adsTxt(env.VITE_ADSENSE_CLIENT)],
    server: { port: 5173 },
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            motion: ['framer-motion'],
            supabase: ['@supabase/supabase-js'],
            realtime: ['socket.io-client'],
          },
        },
      },
    },
  };
});
