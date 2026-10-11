import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { describeDevPlugin } from './src/lib/describe/describeDevPlugin'
import { kpsDevPlugin } from './src/lib/kps/kpsDevPlugin'
import { hapticsDevPlugin } from './src/lib/haptics/hapticsDevPlugin'
import { transcribeDevPlugin } from './src/lib/voice/transcribeDevPlugin'
import { yoloDevPlugin } from './src/lib/yolo/yoloDevPlugin'
import { splatDevPlugin, threeR186Plugin } from './src/lib/webgl/splat/splatDevPlugin'

// Dev server. Haptics requests are forwarded by hapticsDevPlugin.
export default defineConfig({
  plugins: [threeR186Plugin(), react(), tailwindcss(), kpsDevPlugin(), describeDevPlugin(), transcribeDevPlugin(), yoloDevPlugin(), hapticsDevPlugin(), splatDevPlugin()],
  optimizeDeps: {
    exclude: ['three-r186'],
    include: [
      'lenis',
      'lucide-motion',
      'motion/react',
      'seti-icons',
      '@glideapps/glide-data-grid',
      'react-responsive-carousel',
      'lodash',
      'marked',
      'mermaid',
    ],
  },
  server: {
    host: '127.0.0.1',
    port: Number(process.env.PORT) || 5173,
    strictPort: Boolean(process.env.PORT),
    watch: { ignored: ['**/public/3d/**'] },
  },
})
