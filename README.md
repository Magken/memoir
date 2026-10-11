# MEMOIR

**A real place you can see, touch, and hear.**

MEMOIR turns a 3D scan of a real site into an experience blind and low-vision people can explore on their own. A Gaussian-splat capture fills the screen. The same view is raised in pins on a **Dot Pad X** tactile display as you move through it. One button press describes the scene with AI vision, speaks it aloud, and writes it out word by word on the pad's braille line.

Sighted and non-sighted visitors explore the same scene at the same time, from the same camera.

---

## How it works

1. **Scan.** The site is captured as a Gaussian splat with **Scaniverse by Niantic Spatial** and loaded in the browser with three.js r186 (WebGPU, with a WebGL fallback).
2. **See.** The splat fills the page behind a glass LCL frame. The clear window in the centre is the shared view.
3. **Touch.** Every few frames the window is read back and converted into a 60 × 40 tactile graphic, which is sent to the Dot Pad X. The pins follow the camera live.
4. **Steer.** The Dot Pad's hardware buttons drive the camera, so a blind user can turn, tilt, and frame the scene without a mouse.
5. **Describe.** F4 captures the view, sends it to OpenAI vision, and gets back a structured description: scene, orientation, angle, objects.
6. **Hear and read.** The description is spoken with text-to-speech and stepped across the 20-cell braille line in sync with the voice. The same words are highlighted on screen.
7. **Make.** A capture can be sent to **ProjectSim (KPS)** to generate a 3D object (GLB), which opens in the Object viewer and on the pad.

---

## Braille telemetry

The Dot Pad X carries two surfaces, and MEMOIR streams to both of them.

### Graphic area: 30 × 10 cells, 60 × 40 pins

- **Scene mode.** The splat window is cropped to the pad's 3:2 ratio and sampled at 60 × 40 every 6th frame. A luminance Sobel edge pass raises a pin wherever there is structure, such as walls, edges, and silhouettes, so the pad reads as a line drawing of what is on screen.
- **Object mode.** The 3D object is rendered on its own and traced from its alpha outline plus interior edges. The edge threshold drops as you zoom in, so close-ups show more internal detail, like a plane scan.
- **Packing.** Pins pack 2 × 4 per cell into one byte each, giving 300 bytes of hex per frame.
- **Rate limiting.** Frames are de-duplicated and throttled to one every 500 ms, because the physical pins take longer to settle than a screen frame.
- **On-screen mirror.** The same pin field is painted on screen: raised pins in bright white, flat pins dim.

### Braille line: 20 cells

- Descriptions are split into pages of at most 20 characters, breaking between words. Copy is lowercased, because grade-1 braille spends an extra cell on every capital.
- Each page is translated with **liblouis** (WASM) and sent through the Dot Pad SDK text mode.
- **Voice-synced.** The page changes on the speech engine's word-boundary events, so the braille under your fingers matches the word being spoken. Voices that don't report boundaries fall back to one page every 3 s.
- The page being read is highlighted in the on-screen Description pane, which follows it as it scrolls.

### Hardware controls

| Dot Pad X button | Action |
|---|---|
| Panning ◀ / ▶ | Turn the view left / right (15° per press) |
| F1 | Rotate down |
| F2 | Rotate up |
| F3 | Capture the current view |
| F4 | Describe: AI vision, then voice and braille. Press again to stop. |

The connection status shows as a red or green dot in the Dot Pad X pane header. USB (FTDI serial) and Bluetooth are both supported.

---

## Features

| Pane | What it does |
|---|---|
| **Window** (centre) | The live splat scene. Drag to orbit, scroll to zoom. |
| **Object** (top left) | A collapsible 3D object viewer. Switch between the ProjectSim-generated capture and the Statue of an Owl, and download the GLB. |
| **Dot Pad X** (bottom left) | The 60 × 40 tactile mirror of the scene or the object, with USB and Bluetooth connect. Dragging on it orbits only its own source. Choosing the scene collapses the Object viewer; choosing the object expands it. |
| **Capture** (top right) | Photograph the window at its true aspect ratio. **Chat** sends it for a description; **Send** sends it to ProjectSim for image-to-3D. |
| **Description** (bottom right) | The scrollable AI description, with read-aloud. Braille and on-screen highlighting stay in sync. |

- The loader holds until the splat and the side object are both parsed and drawing, so the reveal lands on a finished scene.
- Each pane has its own controls. Interacting with a pane never moves the main splat unless that pane is set to drive it.
- `/WGLTOOLKIT` opens the standalone splat loader.

---

## Integrations and sponsors

| Partner | What we use | Where |
|---|---|---|
| **Dot Inc. — Dot Pad X** | Web SDK 3.0.3: graphic area, 20-cell braille line, hardware key events, USB/BLE | `front_end/src/lib/dotpad/` |
| **Niantic Spatial — Scaniverse** | Gaussian-splat capture of the site (`.ply` / `.spz`) | `front_end/public/3d/`, `src/lib/webgl/splat/` |
| **Sensory — TrulyHandsfree / TSSV 3.15** | On-device speech recognition, wake word, speaker enroll and authenticate, and sound ID, wrapped for the voice hardware slot. Hackathon license through 2026-11-01. | `hardware/sdk/voice/tssv.ts` |
| **ProjectSim (KPS)** | Image to 3D object generation (variation, reconstruction, scale, physics) with GLB/FBX download | `front_end/src/lib/kps/` |
| **OpenAI** | `gpt-4.1-mini` vision for scene descriptions | `front_end/src/lib/describe/` |
| **liblouis** | Braille translation (WASM, LGPL-2.1) | `front_end/public/dotpad/lib/` |

API keys never reach the browser. The Vite dev server proxies `/api/describe` and `/api/kps/*` and reads the keys from `front_end/.env`.

---

## Tech stack

- **Frontend:** React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router
- **3D:** three.js r186 (WebGPU renderer with forced-WebGL fallback) for splats; three.js with GLTFLoader and DRACO for objects; OrbitControls
- **Tactile:** Dot Pad Web SDK, a custom readback-to-pin pipeline (luminance Sobel and alpha outline), liblouis WASM
- **Voice:** Web Speech API (`speechSynthesis` with word-boundary events) for output; Sensory TSSV for on-device recognition
- **AI:** OpenAI vision (scene description); ProjectSim (image to 3D)
- **Hardware transport:** WebSerial (FTDI USB) and Web Bluetooth, which needs Chrome or Edge
- **Layout:** an 8 × 8 LCL grid, with a tinted glass frame around a clear viewing window

---

## Run it

```bash
npm run install:front_end
npm run dev            # http://127.0.0.1:5174/memoir/home
```

Use Chrome or Edge. Plug in the Dot Pad X and press the USB button in the Dot Pad X pane.

### `front_end/.env`

```bash
OPENAI_API_KEY=...     # scene descriptions
kps_api_token=...      # ProjectSim generation
```

Never commit `.env`.

---

## Layout

```
front_end/
  src/pages/MemoirHomePage.tsx      the MEMOIR page
  src/pages/WglToolkitPage.tsx      splat loader
  src/lib/dotpad/                   Dot Pad bridge, tactile graphic, braille pages, pad keys, object stage
  src/lib/webgl/splat/              splat stage (capture, sampling, control surfaces, pad nudges)
  src/lib/describe/                 /api/describe (OpenAI vision)
  src/lib/kps/                      /api/kps (ProjectSim)
  src/lib/voice/speak.ts            text-to-speech with word events
  public/3d/                        splat scan and GLB models
  public/dotpad/lib/                liblouis WASM tables
hardware/
  sdk/voice/                        Sensory TSSV wrappers
  adapters/                         hardware slot contract and registry
```

ProjectSim downloads land in `front_end/public/3d/kps/` and are gitignored. Restart the dev server after a new download so it can serve the file.
