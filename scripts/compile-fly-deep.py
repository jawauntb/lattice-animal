#!/usr/bin/env python3
"""Compile a deeper CX + mushroom-body motif from male-cns:v1.0 for GPU thought."""
import collections
import json
import math
import os
import re
import urllib.request
from datetime import date

OUT = os.path.join(os.path.dirname(__file__), "..", "modal_mind", "fly-deep.json")
HEADING = ["EPG", "EPGt", "Delta7", "PEN_b(PEN2)", "PEN_a(PEN1)", "PEG", "EL"]
PREFIXES = ("PFN", "PFL", "FC2", "hDelta", "MBON", "ER4", "ER5")
TARGET = 960
EDGE_CAP = 7200


def query(cypher, dataset="male-cns:v1.0"):
    body = json.dumps({"cypher": cypher, "dataset": dataset}).encode()
    req = urllib.request.Request(
        "https://neuprint.janelia.org/api/custom/custom",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read())


def family(typ):
    if typ in HEADING:
        return "heading"
    for p in PREFIXES:
        if typ.startswith(p):
            return p
    return typ.split("_")[0][:8]


def column(inst):
    ms = re.findall(r"([LR])(\d+)", inst or "")
    if not ms:
        return "?"
    side, n = ms[0]
    return f"{side}{int(n)}"


def main():
    pref = " OR ".join(f"n.type STARTS WITH '{p}'" for p in PREFIXES)
    heading = ", ".join(repr(t) for t in HEADING)
    nodes = query(f"""
    MATCH (n:Neuron)
    WHERE n.type IN [{heading}] OR {pref}
    RETURN n.bodyId AS id, n.type AS type, n.instance AS instance
    """)
    raw_nodes = [{"id": r[0], "type": r[1], "instance": r[2]} for r in nodes["data"]]
    ids = [n["id"] for n in raw_nodes]
    print(f"fetched {len(raw_nodes)} candidate neurons")

    # Strength from a type-filtered edge query (faster than 1k-id IN lists).
    edges = query(f"""
    MATCH (a:Neuron)-[w:ConnectsTo]->(b:Neuron)
    WHERE (a.type IN [{heading}] OR {" OR ".join(f"a.type STARTS WITH '{p}'" for p in PREFIXES)})
      AND (b.type IN [{heading}] OR {" OR ".join(f"b.type STARTS WITH '{p}'" for p in PREFIXES)})
      AND w.weight >= 5
    RETURN a.bodyId AS src, b.bodyId AS dst, w.weight AS weight
    """)
    raw_edges = [{"src": r[0], "dst": r[1], "w": r[2]} for r in edges["data"]]
    print(f"fetched {len(raw_edges)} synapses weight>=5")

    idset = set(ids)
    raw_edges = [e for e in raw_edges if e["src"] in idset and e["dst"] in idset and e["src"] != e["dst"]]
    strength = collections.Counter()
    for e in raw_edges:
        strength[e["src"]] += e["w"]
        strength[e["dst"]] += e["w"]

    by_fam = collections.defaultdict(list)
    for n in raw_nodes:
        by_fam[family(n["type"])].append(n)
    quotas = {
        "heading": 170, "PFL": 50, "MBON": 90, "FC2": 80,
        "hDelta": 120, "PFN": 320, "ER4": 40, "ER5": 30,
    }
    chosen = []
    used = set()
    for fam, qn in quotas.items():
        pool = by_fam.get(fam, [])
        pool.sort(key=lambda n: strength[n["id"]], reverse=True)
        for n in pool[:qn]:
            if n["id"] not in used:
                chosen.append(n)
                used.add(n["id"])
    leftover = [n for n in raw_nodes if n["id"] not in used]
    leftover.sort(key=lambda n: strength[n["id"]], reverse=True)
    for n in leftover:
        if len(chosen) >= TARGET:
            break
        chosen.append(n)
        used.add(n["id"])
    chosen = chosen[:TARGET]
    used = {n["id"] for n in chosen}

    kept = [e for e in raw_edges if e["src"] in used and e["dst"] in used]
    kept.sort(key=lambda e: e["w"], reverse=True)
    kept = kept[:EDGE_CAP]
    live = {e["src"] for e in kept} | {e["dst"] for e in kept}
    chosen = [n for n in chosen if n["id"] in live]
    index = {n["id"]: i for i, n in enumerate(chosen)}
    wmax = max(e["w"] for e in kept)

    rings = {
        "EPG": 1.00, "EPGt": 0.94, "PEG": 0.86,
        "PEN_a(PEN1)": 0.72, "PEN_b(PEN2)": 0.66,
        "EL": 0.42, "Delta7": 0.28,
    }
    nodes_out = []
    for i, n in enumerate(chosen):
        col = column(n["instance"])
        m = re.match(r"([LR])(\d+)", col)
        if m:
            side = 0.0 if m.group(1) == "L" else math.pi
            ang = side + (int(m.group(2)) - 1) * (math.pi / 8.0)
        else:
            ang = ((hash(n["instance"]) % 360) * math.pi) / 180.0
        fam = family(n["type"])
        ring = rings.get(n["type"], {
            "heading": 0.9, "PFL": 0.58, "PFN": 0.5, "FC2": 0.4,
            "hDelta": 0.32, "MBON": 0.22, "ER4": 0.78, "ER5": 0.74,
        }.get(fam, 0.55))
        nodes_out.append({
            "i": i, "id": n["id"], "type": n["type"], "instance": n["instance"],
            "fam": fam,
            "x": round(math.cos(ang) * ring, 4),
            "y": round(math.sin(ang) * ring, 4),
            "inh": n["type"].startswith("Delta7") or n["type"].startswith("hDelta"),
        })
    edges_out = []
    for e in kept:
        s, t = index[e["src"]], index[e["dst"]]
        sign = -1 if nodes_out[s]["inh"] else 1
        edges_out.append({
            "s": s, "t": t,
            "w": round(math.log1p(e["w"]) / math.log1p(wmax), 4),
            "raw": e["w"], "sign": sign,
        })

    ports = {
        "lion":     {"sensors": ["PEN_a(PEN1)", "PFL"], "readouts": ["EPG"], "k": 4},
        "parakeet": {"sensors": ["PEG", "PFN"], "readouts": ["EPG"], "k": 5},
        "wolf":     {"sensors": ["EPG"], "readouts": ["EPG", "PFL"], "k": 4},
        "elephant": {"sensors": ["Delta7", "hDelta"], "readouts": ["Delta7"], "k": 3},
        "whale":    {"sensors": ["EPG", "EL", "MBON"], "readouts": ["EL", "MBON"], "k": 3},
        "frog":     {"sensors": ["PEN_b(PEN2)"], "readouts": ["EPG"], "k": 4, "pulse": True},
        "owl":      {"sensors": ["Delta7"], "readouts": ["PEG", "FC2"], "k": 3},
        "dolphin":  {"sensors": ["PEN_a(PEN1)", "PEN_b(PEN2)", "PFN"], "readouts": ["EPG"], "k": 6},
        "cricket":  {"sensors": ["EPG", "PEG", "FC2"], "readouts": ["EPG"], "k": 4},
        "sparrow":  {"sensors": ["PEG", "PFL"], "readouts": ["PEN_a(PEN1)"], "k": 4},
        "_":        {"sensors": ["EPG"], "readouts": ["EPG"], "k": 4},
    }
    type_to = collections.defaultdict(list)
    for n in nodes_out:
        type_to[n["type"]].append(n["i"])
        type_to[n["fam"]].append(n["i"])
    port_idx = {}
    for key, p in ports.items():
        port_idx[key] = {
            "sensors": sorted({i for t in p["sensors"] for i in type_to.get(t, [])}),
            "readouts": sorted({i for t in p["readouts"] for i in type_to.get(t, [])}),
            "k": p["k"],
            "pulse": bool(p.get("pulse")),
        }

    graph = {
        "source": "Janelia FlyEM male CNS via neuPrint",
        "dataset": "male-cns:v1.0",
        "license": "CC-BY",
        "url": "https://neuprint.janelia.org",
        "motif": "deep heading + PFN/PFL/FC2/hDelta/MBON",
        "retrieved": str(date.today()),
        "compiledFrom": f"{len(raw_nodes)} candidates, {len(raw_edges)} synapses, kept {len(nodes_out)} / {len(edges_out)}",
        "nodes": nodes_out,
        "edges": edges_out,
        "ports": port_idx,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(graph, f, separators=(",", ":"))
        f.write("\n")
    fams = collections.Counter(n["fam"] for n in nodes_out)
    print(f"wrote {OUT} nodes={len(nodes_out)} edges={len(edges_out)} bytes={os.path.getsize(OUT)} fams={dict(fams)}")


if __name__ == "__main__":
    main()
