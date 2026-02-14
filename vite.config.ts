import { defineConfig } from 'vite';

// GitHub Pages serves at https://<user>.github.io/tube/ so assets must use that base
const base = process.env.GITHUB_PAGES === 'true' ? '/tube/' : '/';

export default defineConfig({
  base,
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    target: 'esnext',
    sourcemap: true,
  },
});
