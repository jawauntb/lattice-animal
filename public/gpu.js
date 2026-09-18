// WebGPU all-pairs pass for the field's two genuinely O(n^2) scans:
// chord-interference kinship (how many other minds committed together, in
// the same burst, near enough to brighten as one chord) and the cancer
// mind's nearest-other-animal search. Both are serial "for every mind, scan
// every other mind" loops in main.js today; here they run as one GPU thread
// per mind instead, so a bigger mass-commit burst or a bigger field doesn't
// cost more wall-clock on the main thread.
//
// Feature-detected and fully optional: if WebGPU isn't available (or the
// device is lost), `ready()` stays false and every caller in main.js keeps
// using its original serial CPU loop. Dispatch is fire-and-forget — results
// land a frame or two later via `resultFrame()` / per-mind `_gpu*` fields,
// which is invisible for a cosmetic effect like this.

const WORKGROUP = 64;

const SHADER = /* wgsl */ `
struct Params {
  n: u32,
  chordWindow: f32,
  chordRadius2: f32,
  _pad: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var<storage, read> posV: array<vec4<f32>>;
@group(0) @binding(2) var<storage, read> meta: array<vec4<f32>>;
@group(0) @binding(3) var<storage, read_write> outp: array<vec4<f32>>;

@compute @workgroup_size(${WORKGROUP})
fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
  let i = gid.x;
  if (i >= params.n) { return; }
  let mi = posV[i];
  let bi = meta[i];
  let iCommitted = bi.y > 0.5;
  let iCancer = bi.z > 0.5;
  let iAnimal = bi.x;
  let iAge = mi.w;

  var kin: f32 = 0.0;
  var bestD2: f32 = 3.4e38;
  var bestV: f32 = 0.0;
  var found: f32 = 0.0;

  for (var j: u32 = 0u; j < params.n; j = j + 1u) {
    if (j == i) { continue; }
    let mj = posV[j];
    let bj = meta[j];
    let dx = mi.x - mj.x;
    let dy = mi.y - mj.y;
    let d2 = dx * dx + dy * dy;

    if (iCommitted && bj.y > 0.5 && iAge <= params.chordWindow && mj.w <= params.chordWindow && d2 < params.chordRadius2) {
      kin = kin + 1.0;
    }
    if (iCancer && bj.x >= 0.0 && bj.x != iAnimal && d2 < bestD2) {
      bestD2 = d2;
      bestV = mj.z;
      found = 1.0;
    }
  }
  outp[i] = vec4<f32>(kin, bestV, bestD2, found);
}
`;

let device = null;
let pipeline = null;
let paramsBuf = null;
let posBuf = null, metaBuf = null, outBuf = null, readBuf = null;
let capacity = 0;
let initPromise = null;
let inflight = false;
let lastResultFrame = null;
let cpuPos = null, cpuMeta = null;

export function backend() {
  return device ? "webgpu" : "cpu";
}

export function ready() {
  return !!device;
}

export function resultFrame() {
  return lastResultFrame;
}

export async function init() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    if (!("gpu" in navigator)) return false;
    try {
      const adapter = await navigator.gpu.requestAdapter();
      if (!adapter) return false;
      const dev = await adapter.requestDevice();
      dev.lost.then(() => { if (device === dev) device = null; });
      const module = dev.createShaderModule({ code: SHADER });
      pipeline = dev.createComputePipeline({
        layout: "auto",
        compute: { module, entryPoint: "main" },
      });
      paramsBuf = dev.createBuffer({
        size: 16,
        usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
      });
      device = dev;
      return true;
    } catch {
      device = null;
      return false;
    }
  })();
  return initPromise;
}

function ensureCapacity(n) {
  if (n <= capacity && posBuf) return;
  capacity = Math.max(64, Math.ceil(n * 1.5));
  posBuf?.destroy();
  metaBuf?.destroy();
  outBuf?.destroy();
  readBuf?.destroy();
  const bytes = capacity * 16;
  posBuf = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  metaBuf = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST });
  outBuf = device.createBuffer({ size: bytes, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC });
  readBuf = device.createBuffer({ size: bytes, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
  cpuPos = new Float32Array(capacity * 4);
  cpuMeta = new Float32Array(capacity * 4);
}

// Fire-and-forget: uploads mind state, dispatches the compute pass, and
// writes results back onto the mind objects (`_gpuKin`, `_gpuCancerV`,
// `_gpuCancerD2`, `_gpuCancerFound`, `_gpuFrame`) whenever the async
// readback resolves — never blocks the caller's frame.
export function dispatchPairwise(minds, frame, chordWindow, chordRadius) {
  if (!device || inflight || !minds.length) return;
  const n = minds.length;
  ensureCapacity(n);

  for (let i = 0; i < n; i++) {
    const m = minds[i];
    const age = (m.committed && Number.isFinite(m.bornAt)) ? (frame - m.bornAt) : 1e9;
    cpuPos[i * 4] = m.x;
    cpuPos[i * 4 + 1] = m.y;
    cpuPos[i * 4 + 2] = m.V || 0;
    cpuPos[i * 4 + 3] = age;
    cpuMeta[i * 4] = m.animalId;
    cpuMeta[i * 4 + 1] = m.committed ? 1 : 0;
    cpuMeta[i * 4 + 2] = m.cancer ? 1 : 0;
    cpuMeta[i * 4 + 3] = 0;
  }

  const params = new ArrayBuffer(16);
  new Uint32Array(params, 0, 1)[0] = n;
  new Float32Array(params, 4, 3).set([chordWindow, chordRadius * chordRadius, 0]);

  device.queue.writeBuffer(paramsBuf, 0, params);
  device.queue.writeBuffer(posBuf, 0, cpuPos.buffer, 0, n * 16);
  device.queue.writeBuffer(metaBuf, 0, cpuMeta.buffer, 0, n * 16);

  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: paramsBuf } },
      { binding: 1, resource: { buffer: posBuf } },
      { binding: 2, resource: { buffer: metaBuf } },
      { binding: 3, resource: { buffer: outBuf } },
    ],
  });

  const encoder = device.createCommandEncoder();
  const pass = encoder.beginComputePass();
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(n / WORKGROUP));
  pass.end();
  encoder.copyBufferToBuffer(outBuf, 0, readBuf, 0, n * 16);
  device.queue.submit([encoder.finish()]);

  inflight = true;
  readBuf.mapAsync(GPUMapMode.READ, 0, n * 16).then(() => {
    const copy = new Float32Array(readBuf.getMappedRange(0, n * 16).slice(0));
    readBuf.unmap();
    for (let i = 0; i < n; i++) {
      const m = minds[i];
      if (!m) continue;
      m._gpuKin = copy[i * 4];
      m._gpuCancerV = copy[i * 4 + 1];
      m._gpuCancerD2 = copy[i * 4 + 2];
      m._gpuCancerFound = copy[i * 4 + 3] > 0.5;
      m._gpuFrame = frame;
    }
    lastResultFrame = frame;
    inflight = false;
  }).catch(() => { inflight = false; });
}
