import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
  const env=loadEnv(mode,process.cwd(),'');
  return {
    plugins:[react()],
    define:{
      'process.env.REACT_APP_API_URL':JSON.stringify(env.REACT_APP_API_URL || ''),
      'process.env.REACT_APP_GOOGLE_BOOKS_KEY':JSON.stringify(env.REACT_APP_GOOGLE_BOOKS_KEY || '')
    },
    build:{outDir:'dist'}
  };
});
