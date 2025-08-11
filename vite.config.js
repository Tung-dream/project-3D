// vite.config.js
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'), // <-- Đường dẫn alias bắt buộc
    },
  },
})

server: {
  fs: {
    strict: false
  }
}

