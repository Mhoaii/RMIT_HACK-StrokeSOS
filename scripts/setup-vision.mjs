import { mkdir, cp, stat, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
await mkdir(path.join(root, 'public/mediapipe'), { recursive: true });
await cp(path.join(root, 'node_modules/@mediapipe/tasks-vision/wasm'), path.join(root, 'public/mediapipe/wasm'), { recursive: true });
// Keep the DPoP relay byte-exact with the installed SDK (not a hand-written copy).
await copyFile(path.join(root, 'node_modules/@tidecloak/js/tide_dpop_auth.html'), path.join(root, 'public/tide_dpop_auth.html'));
const model = path.join(root, 'public/models/pose_landmarker_lite.task');
try { await stat(model); }
catch {
  await mkdir(path.dirname(model), { recursive: true });
  const url = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Pose model download failed: ${response.status}`);
  const buffer = new Uint8Array(await response.arrayBuffer());
  if (buffer.length < 1000000) throw new Error('Pose model download is unexpectedly small.');
  await writeFile(model, buffer);
}
console.log('MediaPipe WASM, pose model, and exact Tide DPoP relay are ready.');
