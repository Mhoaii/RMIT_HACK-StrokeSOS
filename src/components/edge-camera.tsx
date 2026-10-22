'use client';
import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react';
import { Camera, CameraOff, ScanLine, ShieldCheck } from 'lucide-react';
import type { PoseLandmarker } from '@mediapipe/tasks-vision';
import { CONNECTIONS, REFERENCE_POSE, FallTracker, type Point } from '@/lib/pose';
import { encryptBytes, decryptBytes, toBase64 } from '@/lib/crypto';

export interface CameraHandle { stop: () => void }
interface Props {
  critical: boolean; edgeKey: CryptoKey | null; viewerKey: CryptoKey | null; unlocked: boolean;
  onFall: (simulated: boolean, confidence: number) => void;
  onStatus: (message: string) => void;
  onPacket: (value: string) => void;
  onCameraState: (active: boolean) => void;
}
// Input video is created off-DOM. Only skeleton output and AES-decrypted JPEGs are ever rendered.
export const EdgeCamera = forwardRef<CameraHandle, Props>(function EdgeCamera(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const viewerRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<PoseLandmarker | null>(null);
  const frameRef = useRef(0);
  const generation = useRef(0);
  const detector = useRef(new FallTracker());
  const latest = useRef(props); latest.current = props;
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [poseFound, setPoseFound] = useState(false);

  const stop = () => {
    generation.current++;
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach(track => track.stop());
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.srcObject = null; }
    videoRef.current = null; streamRef.current = null;
    landmarkerRef.current?.close(); landmarkerRef.current = null;
    setActive(false); setLoading(false); setPoseFound(false);
    latest.current.onCameraState(false);
    const viewer = viewerRef.current; if (viewer) viewer.getContext('2d')?.clearRect(0,0,viewer.width,viewer.height);
  };
  useImperativeHandle(ref, () => ({ stop }));
  useEffect(() => () => { generation.current++; cancelAnimationFrame(frameRef.current); streamRef.current?.getTracks().forEach(track => track.stop()); landmarkerRef.current?.close(); }, []);
  useEffect(() => {
    if (!props.unlocked) {
      const viewer = viewerRef.current;
      if (viewer) viewer.getContext('2d')?.clearRect(0,0,viewer.width,viewer.height);
    }
  }, [props.unlocked]);

  useEffect(() => {
    if (active) return;
    let id = 0;
    const render = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const points = REFERENCE_POSE.map(point => {
          const x = point.x - .5, y = point.y - .53;
          return props.critical ? { ...point, x: .5 + y * .8, y: .66 - x * .65 } : point;
        });
        drawSkeleton(canvas, points, props.critical, true);
      }
      id = requestAnimationFrame(render);
    };
    render(); return () => cancelAnimationFrame(id);
  }, [active, props.critical]);

  async function start() {
    setError(''); setLoading(true);
    const session = ++generation.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Webcam requires HTTPS or localhost and a supported browser.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, facingMode: 'user' }, audio: false });
      if (session !== generation.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      const video = document.createElement('video');
      video.muted = true; video.playsInline = true; video.srcObject = stream;
      videoRef.current = video;
      await video.play();
      const { PoseLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
      const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
      const landmarker = await PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: '/models/pose_landmarker_lite.task', delegate: 'CPU' },
        runningMode: 'VIDEO', numPoses: 1, minPoseDetectionConfidence: .55, minTrackingConfidence: .55,
      });
      if (session !== generation.current) { landmarker.close(); stream.getTracks().forEach(track => track.stop()); return; }
      landmarkerRef.current = landmarker;
      detector.current = new FallTracker();
      setActive(true); setLoading(false); latest.current.onCameraState(true);
      latest.current.onStatus('Camera online. MediaPipe processes 33 landmarks locally; raw input remains off-DOM.');
      const sourceCanvas = document.createElement('canvas'); sourceCanvas.width = 640; sourceCanvas.height = 480;
      const ctx = sourceCanvas.getContext('2d');
      let lastInference = 0, lastPacket = 0, busy = false, misses = 0;
      const loop = (time: number) => {
        if (session !== generation.current || !videoRef.current) return;
        if (video.readyState >= 2 && time - lastInference > 90) {
          lastInference = time;
          try {
            const result = landmarker.detectForVideo(video, time);
            const points = result.landmarks[0];
            misses = points ? 0 : misses + 1;
            if (points) { setPoseFound(true); if (canvasRef.current) drawSkeleton(canvasRef.current, points, latest.current.critical, false); }
            else { if (misses > 15) setPoseFound(false); if (canvasRef.current) drawSkeleton(canvasRef.current, [], false, false); }
            if (points && !latest.current.critical) {
              const state = detector.current.update(points, time);
              if (state.fall) latest.current.onFall(false, state.confidence);
            }
          } catch (err) { setError(err instanceof Error ? err.message : 'Pose inference failed'); stop(); return; }
        }
        const { edgeKey } = latest.current;
        if (ctx && edgeKey && !busy && video.readyState >= 2 && time - lastPacket > 250) {
          busy = true; lastPacket = time;
          ctx.drawImage(video, 0, 0, 640, 480);
          sourceCanvas.toBlob(async blob => {
            if (!blob) { busy = false; return; }
            let clear: Uint8Array<ArrayBuffer> | undefined;
            let bytes: Uint8Array<ArrayBuffer> | undefined;
            let bitmap: ImageBitmap | undefined;
            try {
              bytes = new Uint8Array(await blob.arrayBuffer());
              const packet = await encryptBytes(edgeKey, bytes);
              if (session !== generation.current) return;
              latest.current.onPacket(toBase64(packet.data.subarray(0, 96)));
              const access = latest.current;
              if (!access.unlocked || !access.viewerKey) return;
              const key = access.viewerKey;
              clear = await decryptBytes(key, packet);
              bitmap = await createImageBitmap(new Blob([clear], { type: 'image/jpeg' }));
              // Re-check the lease AFTER async decoding to avoid a late frame after revoke.
              if (session !== generation.current || !latest.current.unlocked || latest.current.viewerKey !== key) return;
              const viewer = viewerRef.current;
              viewer?.getContext('2d')?.drawImage(bitmap, 0, 0, viewer.width, viewer.height);
            } catch (err) { latest.current.onStatus(`Encrypted frame unavailable: ${err instanceof Error ? err.message : 'unknown error'}`); }
            finally { bytes?.fill(0); clear?.fill(0); bitmap?.close(); busy = false; }
          }, 'image/jpeg', .65);
          ctx.clearRect(0,0,640,480);
        }
        frameRef.current = requestAnimationFrame(loop);
      };
      frameRef.current = requestAnimationFrame(loop);
    } catch (err) {
      stop();
      const message = err instanceof Error ? err.message : 'Camera unavailable';
      setError(message); latest.current.onStatus(`Camera unavailable: ${message}. Simulate Fall remains available.`);
    }
  }
  // The second canvas is mounted into the dispatch panel through a portal-like DOM target.
  useEffect(() => {
    const target = document.getElementById('decrypted-video-target');
    if (!target) return;
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    canvas.className = 'decrypted-canvas'; canvas.setAttribute('aria-label', 'AES-GCM decrypted webcam frames');
    target.appendChild(canvas); viewerRef.current = canvas;
    return () => { canvas.remove(); viewerRef.current = null; };
  }, []);

  return <>
    <div className={`pose-view ${props.critical ? 'critical' : ''}`}>
      <canvas ref={canvasRef} width={640} height={440} aria-label={active ? 'Live MediaPipe skeleton, raw camera hidden' : 'Simulated reference skeleton'} />
      <div className="view-label"><span className={`status-dot ${active ? 'green' : 'muted'}`} />{active ? 'LOCAL INFERENCE' : 'REFERENCE POSE · SIMULATED'}</div>
      <div className="view-coordinate mono">NODE_01 / RGB → POSE</div>
      <div className="pose-side mono">{active ? poseFound ? '33 LANDMARKS' : 'SEARCHING FOR POSE' : 'CAMERA OFFLINE'}<br />{active ? 'MEDIAPIPE / CPU' : 'SYNTHETIC REFERENCE'}</div>
      <div className="skeleton-caption"><ShieldCheck size={13} /> Raw frames never displayed</div>
      <span className="corner tl" /><span className="corner tr" /><span className="corner bl" /><span className="corner br" />
    </div>
    <button className="button camera-button" onClick={active ? stop : start} disabled={loading}>{loading ? <ScanLine size={15} className="pulse" /> : active ? <CameraOff size={15} /> : <Camera size={15} />}{loading ? 'Loading pose model…' : active ? 'Stop camera' : 'Enable private camera'}<span className="keycap">{active ? 'ON' : 'OFF'}</span></button>
    {error && <p className="inline-error" role="alert">{error}</p>}
  </>;
});

function drawSkeleton(canvas: HTMLCanvasElement, points: Point[], critical: boolean, reference: boolean) {
  const ctx = canvas.getContext('2d'); if (!ctx) return;
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h); ctx.fillStyle = '#080e10'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#18302a'; ctx.lineWidth = .5;
  for (let x = 0; x < w; x += 32) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
  for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
  const color = critical ? '#fa7373' : '#54dbac';
  ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.shadowColor = color; ctx.shadowBlur = 7;
  const xPos = (p: Point) => reference ? p.x * w : (1 - p.x) * w;
  for (const [a,b] of CONNECTIONS) {
    if (!points[a] || !points[b] || (points[a].visibility ?? 1) < .4 || (points[b].visibility ?? 1) < .4) continue;
    ctx.beginPath(); ctx.moveTo(xPos(points[a]),points[a].y*h); ctx.lineTo(xPos(points[b]),points[b].y*h); ctx.stroke();
  }
  for (const point of points) {
    if ((point.visibility ?? 1) < .4) continue;
    ctx.fillStyle = '#a2f3d4'; ctx.beginPath(); ctx.arc(xPos(point),point.y*h,3,0,Math.PI*2); ctx.fill();
  }
  ctx.shadowBlur = 0;
}
