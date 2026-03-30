import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages にデプロイする場合のベースパス
  // リポジトリ名に合わせて変更してください
  base: '/fukugyo-dashboard/',
  build: {
    outDir: 'dist',
  },
});

