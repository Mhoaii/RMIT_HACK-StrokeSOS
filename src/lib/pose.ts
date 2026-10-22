export interface Point { x: number; y: number; z?: number; visibility?: number }
export const CONNECTIONS = [[0,1],[1,2],[2,3],[3,7],[0,4],[4,5],[5,6],[6,8],[9,10],[11,12],[11,13],[13,15],[15,17],[15,19],[15,21],[17,19],[12,14],[14,16],[16,18],[16,20],[16,22],[18,20],[11,23],[12,24],[23,24],[23,25],[25,27],[27,29],[29,31],[27,31],[24,26],[26,28],[28,30],[30,32],[28,32]];
// An illustrative 33-point reference pose, explicitly marked simulated in the UI.
export const REFERENCE_POSE: Point[] = [
  [.5,.16],[.48,.15],[.47,.15],[.46,.15],[.52,.15],[.53,.15],[.54,.15],[.44,.17],[.56,.17],[.48,.2],[.52,.2],
  [.39,.29],[.61,.29],[.32,.43],[.68,.43],[.28,.57],[.72,.57],[.26,.6],[.74,.6],[.29,.61],[.71,.61],[.31,.59],[.69,.59],
  [.43,.55],[.57,.55],[.4,.73],[.6,.73],[.39,.9],[.61,.9],[.37,.92],[.63,.92],[.43,.93],[.57,.93],
].map(([x,y]) => ({ x, y, visibility: 1 }));
export function fallMetrics(points: Point[]) {
  if (points.length < 33 || [11,12,23,24,27,28].some(i => (points[i].visibility ?? 0) < .55)) return null;
  const shoulder = { x: (points[11].x + points[12].x) / 2, y: (points[11].y + points[12].y) / 2 };
  const hip = { x: (points[23].x + points[24].x) / 2, y: (points[23].y + points[24].y) / 2 };
  const ankle = (points[27].y + points[28].y) / 2;
  const angle = Math.atan2(Math.abs(shoulder.y - hip.y), Math.abs(shoulder.x - hip.x)) * 180 / Math.PI;
  const relativeHead = (points[0].y - hip.y) / Math.max(.12, ankle - hip.y);
  return { angle, relativeHead, shoulderY: shoulder.y, horizontal: angle < 32 };
}
export class FallTracker {
  private samples: { time: number; relativeHead: number; shoulderY: number }[] = [];
  private candidate = 0;
  private dropUntil = 0;
  update(points: Point[], time: number) {
    const metrics = fallMetrics(points);
    if (!metrics) { this.candidate = 0; return { fall: false, confidence: 0 }; }
    this.samples = this.samples.filter(sample => time - sample.time < 1800);
    if (this.samples.some(sample => metrics.relativeHead - sample.relativeHead > .24 && metrics.shoulderY - sample.shoulderY > .08)) this.dropUntil = time + 1800;
    this.samples.push({ time, relativeHead: metrics.relativeHead, shoulderY: metrics.shoulderY });
    if (metrics.horizontal && time < this.dropUntil) this.candidate ||= time;
    else this.candidate = 0;
    const sustained = this.candidate ? time - this.candidate : 0;
    return { fall: sustained >= 1000, confidence: Math.min(.99, .55 + sustained / 2500), angle: metrics.angle };
  }
}
