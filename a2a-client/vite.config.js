import vitePluginA2a from './vite-plugin-a2a.js';

/** @type {import('vite').UserConfig} */
export default {
  root: 'web',
  server: { port: 5173 },
  plugins: [vitePluginA2a()],
};
