# HI THERE photo booth

Phone-first Next.js photo booth. Photos stay in the browser and are never uploaded.

```sh
npm install
npm run dev
```

Use the localhost URL printed by Next.js. Physical phones need a trusted HTTPS address for camera access and file sharing. Safari → Share → Add to Home Screen installs the standalone app.

## Flow

1. Nighttime booth entrance with an illuminated HI THERE sign.
2. Choose a solid or illustrated frame and a filter, then Continue to camera. The SVA special edition keeps all four supplied people, the red border, and the YOU FAIL 0% footer and seal. Only the bright green areas in `public/sva-greenscreen.png` become transparent camera windows. The same keyed artwork overlays the live camera, frozen exposures, preview, and saved PNG. Filters affect camera photos only, not the fixed artwork.
3. Four mirrored live camera frames. Tap the shutter once: each frame has a three-second countdown and freezes after its exposure.
4. After the fourth photo, the app automatically prepares an 840 × 2264 PNG and animates it from a silver dispenser. Reduced-motion settings skip the motion.
5. The finished strip is flat and can be shared on phones or downloaded on desktop. Take another one returns to frame selection.

Canvas pixel processing applies the selected filter to the exported PNG, including on Safari. Fuji film is an approximate creative look, not an official film simulation.

The SVA limited edition is available through December 31, 2026, America/New_York. Change `SVA_END` in `lib/strip.ts` to adjust the cutoff. Availability is checked when showing choices and again before starting a camera session. It uses the device clock because this app has no server-side entitlement system.

Frame and filter rendering lives in `lib/strip.ts`. Camera and screen lifecycle lives in `app/page.tsx`. The generated night background is `public/booth-night.png`; its imagegen prompt is in `public/image-prompt.txt`.

Checks: `npm run build` and `npm run typecheck`.
