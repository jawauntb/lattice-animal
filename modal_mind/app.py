"""Slow mind: one L4 steps the deep male-CNS motif. Scale to zero."""
import os
import time
from pathlib import Path

import modal

GRAPH_PATH = "/root/fly-deep.json"
LOCAL_GRAPH = Path(__file__).parent / "fly-deep.json"

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("numpy", "torch", "fastapi")
    .add_local_file(str(LOCAL_GRAPH), GRAPH_PATH)
)

app = modal.App("lattice-animal-mind", image=image)

_cache = {"g": None, "src": None, "dst": None, "w": None, "ports": None, "state": None}


def _load():
    if _cache["g"] is not None:
        return
    import json
    import torch

    g = json.loads(Path(GRAPH_PATH).read_text())
    src = torch.tensor([e["s"] for e in g["edges"]], dtype=torch.long)
    dst = torch.tensor([e["t"] for e in g["edges"]], dtype=torch.long)
    w = torch.tensor([e["w"] * e["sign"] * 0.072 for e in g["edges"]], dtype=torch.float32)
    _cache["g"] = g
    _cache["src"] = src
    _cache["dst"] = dst
    _cache["w"] = w
    _cache["ports"] = g["ports"]
    _cache["state"] = {}


def _port(species):
    ports = _cache["ports"]
    return ports.get(species) or ports["_"]


def _init_v(torch, n, seeds):
    B = len(seeds)
    v = torch.zeros((B, n), dtype=torch.float32)
    nodes = _cache["g"]["nodes"]
    epg = [nd["i"] for nd in nodes if nd["type"] == "EPG"]
    if not epg:
        epg = [0]
    for b, seed in enumerate(seeds):
        bump = epg[int(seed * len(epg)) % len(epg)]
        bx, by = nodes[bump]["x"], nodes[bump]["y"]
        for i, nd in enumerate(nodes):
            dx = nd["x"] - bx
            dy = nd["y"] - by
            v[b, i] = 0.42 * torch.exp(torch.tensor(-3.2 * (dx * dx + dy * dy)))
    return v


def _step(minds, frame):
    import torch

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    g = _cache["g"]
    n = len(g["nodes"])
    B = len(minds)
    src = _cache["src"].to(device)
    dst = _cache["dst"].to(device)
    w = _cache["w"].to(device)
    key = f"{B}"
    st = _cache["state"]
    if st.get("key") != key or st.get("v") is None or st["v"].shape[0] != B:
        seeds = [float(m.get("seed") or 0.37) for m in minds]
        v = _init_v(torch, n, seeds).to(device)
        st["key"] = key
        st["v"] = v
    else:
        v = st["v"]

    inj = torch.zeros((B, n), dtype=torch.float32, device=device)
    for i, m in enumerate(minds):
        port = _port(m.get("species") or "")
        drive = float(m.get("drive") or 0)
        if port.get("pulse"):
            import math
            drive += 0.16 * math.sin((frame or 0) * 0.08)
        idx = port["sensors"]
        if idx:
            inj[i, idx] = 0.075 * drive
    v = (v + inj).clamp(-1, 1)

    ks = [_port(m.get("species") or "").get("k", 4) for m in minds]
    k_max = max(ks) if ks else 4
    dst_exp = dst.unsqueeze(0).expand(B, -1)
    live_k = torch.tensor(ks, device=device).unsqueeze(1)
    for k in range(k_max):
        act = torch.tanh(v.index_select(1, src)) * w
        act = act * (live_k > k).to(v.dtype)
        inc = torch.zeros_like(v)
        inc.scatter_add_(1, dst_exp, act)
        v = v * 0.80 + inc
        v = v - v.mean(dim=1, keepdim=True) * 0.40
        v = v.clamp(-1, 1)
    st["v"] = v

    out = []
    energy = v.abs().mean(dim=1)
    for i, m in enumerate(minds):
        port = _port(m.get("species") or "")
        ridx = port["readouts"]
        if ridx:
            rv = v[i, ridx]
            readout = float(rv.mean().item())
            peak = float(rv.abs().max().item())
        else:
            readout = 0.0
            peak = 0.0
        e = float(energy[i].item())
        out.append({
            "readout": readout,
            "e": e,
            "thought": max(0.0, min(1.0, (peak - e) * 1.35)),
            "k": ks[i],
        })
    return out


@app.function(
    gpu="L4",
    timeout=90,
    scaledown_window=120,
    secrets=[modal.Secret.from_name("lattice-think")],
)
@modal.fastapi_endpoint(method="POST")
def think(body: dict):
    token = (body or {}).get("token") or ""
    if token != os.environ.get("THINK_TOKEN", ""):
        return {"ok": False, "error": "unauthorized"}
    minds = (body or {}).get("minds") or []
    if not minds or len(minds) > 160:
        return {"ok": False, "error": "bad-batch"}
    t0 = time.time()
    _load()
    outs = _step(minds, (body or {}).get("frame") or 0)
    ms = (time.time() - t0) * 1000
    g = _cache["g"]
    return {
        "ok": True,
        "gpu": True,
        "device": "L4",
        "n": len(g["nodes"]),
        "e": len(g["edges"]),
        "dataset": g.get("dataset"),
        "ms": round(ms, 1),
        "minds": outs,
    }


@app.function(timeout=40, scaledown_window=60)
@modal.fastapi_endpoint(method="GET")
def status():
    _load()
    g = _cache["g"]
    return {
        "ok": True,
        "n": len(g["nodes"]),
        "e": len(g["edges"]),
        "dataset": g.get("dataset"),
        "gpu": "L4",
    }
