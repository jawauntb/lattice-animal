#!/usr/bin/env python3
"""Compile a heading-circuit motif from the public male-cns:v1.0 neuPrint API."""
import collections
import json
import math
import os
import re
import urllib.request
from datetime import date

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "data", "fly-cx.json")
TYPES = ["EPG", "EPGt", "Delta7", "PEN_b(PEN2)", "PEN_a(PEN1)", "PEG", "EL"]
QUOTAS = {
    "EPG": 16, "PEG": 8, "PEN_a(PEN1)": 6, "PEN_b(PEN2)": 6,
    "Delta7": 8, "EL": 2, "EPGt": 2,
}


def query(cypher, dataset="male-cns:v1.0"):
    body = json.dumps({"cypher": cypher, "dataset": dataset}).encode()
    req = urllib.request.Request(
        "https://neuprint.janelia.org/api/custom/custom",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as r:
        return json.loads(r.read())


def column(inst):
    ms = re.findall(r"([LR])(\d+)", inst or "")
    if not ms:
        return "?"
    side, n = ms[0]
    return f"{side}{int(n)}"


def main():
    type_list = ",".join(repr(t) for t in TYPES)
    nodes = query(f"""
    MATCH (n:Neuron)
    WHERE n.type IN [{type_list}]
    RETURN n.bodyId AS id, n.type AS type, n.instance AS instance
    """)
    edges = query(f"""
    MATCH (a:Neuron)-[w:ConnectsTo]->(b:Neuron)
    WHERE a.type IN [{type_list}] AND b.type IN [{type_list}] AND w.weight >= 3
    RETURN a.bodyId AS src, b.bodyId AS dst, w.weight AS weight
    """)
    raw_nodes = [{"id": r[0], "type": r[1], "instance": r[2]} for r in nodes["data"]]
    raw_edges = [{"src": r[0], "dst": r[1], "w": r[2]} for r in edges["data"]]
    strength = collections.Counter()
    for e in raw_edges:
        strength[e["src"]] += e["w"]
        strength[e["dst"]] += e["w"]
    chosen = []
    for typ, qn in QUOTAS.items():
        pool = [n for n in raw_nodes if n["type"] == typ]
        by_col = collections.defaultdict(list)
        for n in pool:
            by_col[column(n["instance"])].append(n)
        reps = []
        for ns in by_col.values():
            ns.sort(key=lambda n: strength[n["id"]], reverse=True)
            reps.append(ns[0])
        reps.sort(key=lambda n: strength[n["id"]], reverse=True)
        take = reps[:qn]
        leftover = [n for n in pool if n["id"] not in {x["id"] for x in take}]
        leftover.sort(key=lambda n: strength[n["id"]], reverse=True)
        take.extend(leftover[: qn - len(take)])
        chosen.extend(take)
    ids = {n["id"] for n in chosen}
    kept = [e for e in raw_edges if e["src"] in ids and e["dst"] in ids and e["src"] != e["dst"]]
    kept.sort(key=lambda e: e["w"], reverse=True)
    kept = kept[:280]
    used = {e["src"] for e in kept} | {e["dst"] for e in kept}
    chosen = [n for n in chosen if n["id"] in used]
    index = {n["id"]: i for i, n in enumerate(chosen)}
    wmax = max(e["w"] for e in kept)
    nodes_out = []
    rings = {
        "EPG": 1.00, "EPGt": 0.92, "PEG": 0.78,
        "PEN_a(PEN1)": 0.62, "PEN_b(PEN2)": 0.54,
        "EL": 0.36, "Delta7": 0.22,
    }
    for i, n in enumerate(chosen):
        col = column(n["instance"])
        m = re.match(r"([LR])(\d+)", col)
        if m:
            side = 0.0 if m.group(1) == "L" else math.pi
            ang = side + (int(m.group(2)) - 1) * (math.pi / 8)
        else:
            ang = (hash(n["instance"]) % 360) * math.pi / 180
        ring = rings.get(n["type"], 0.7)
        nodes_out.append({
            "i": i, "id": n["id"], "type": n["type"], "instance": n["instance"],
            "x": round(math.cos(ang) * ring, 4),
            "y": round(math.sin(ang) * ring, 4),
            "inh": n["type"].startswith("Delta7"),
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
    graph = {
        "source": "Janelia FlyEM male CNS via neuPrint",
        "dataset": "male-cns:v1.0",
        "license": "CC-BY",
        "url": "https://neuprint.janelia.org",
        "paper": "https://www.janelia.org/project-team/flyem/male-cns-connectome",
        "motif": "ellipsoid-body heading circuit: EPG compass, PEN shift, PEG feedback, Delta7 inhibition, EL",
        "retrieved": str(date.today()),
        "compiledFrom": f"{len(raw_nodes)} CX neurons, {len(raw_edges)} synapses weight>=3, strongest {len(edges_out)} edges kept",
        "nodes": nodes_out,
        "edges": edges_out,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w") as f:
        json.dump(graph, f, indent=2)
        f.write("\n")
    print(f"wrote {OUT} nodes={len(nodes_out)} edges={len(edges_out)}")


if __name__ == "__main__":
    main()
