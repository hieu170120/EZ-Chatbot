import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        format: "iife",
        name: "EzChatWidget",
        entryFileNames: "ez-chat-widget.js",
        assetFileNames: "ez-chat-widget.[ext]",
        chunkFileNames: "ez-chat-widget-[hash].js",
        manualChunks: undefined,
      },
    },
  },
});
