import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return { name: 'HI THERE', short_name: 'HI THERE', description: 'Four little moments. One keepsake.', start_url: '/', scope: '/', display: 'standalone', background_color: '#15171a', theme_color: '#15171a', icons: [ { src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' } ] };
}
