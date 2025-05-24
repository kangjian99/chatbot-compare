import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.OPENAI_COMPATIBLE_API_KEY': JSON.stringify(env.OPENAI_COMPATIBLE_API_KEY),
        'process.env.OPENAI_COMPATIBLE_BASE_URL': JSON.stringify(env.OPENAI_COMPATIBLE_BASE_URL),
        'process.env.OPENAI_COMPATIBLE_MODEL_ID': JSON.stringify(env.OPENAI_COMPATIBLE_MODEL_ID)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
