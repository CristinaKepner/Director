"""usd2glb: flatten a USD stage into a single binary glTF (positions, normals, indices).

Textures and materials are dropped on purpose — the editor is a white-model workshop — but
the mesh hierarchy, transforms and units are honoured (output is metres, Y up).

    python3 -I usd2glb.py <root.usd> <out.glb> [--meta out.json]

Requires the `usd-core` package (pip install usd-core).
"""
import json
import struct
import sys

from pxr import Gf, Usd, UsdGeom


def triangulate(counts, indices):
    out = []
    at = 0
    for n in counts:
        poly = indices[at : at + n]
        at += n
        for i in range(1, n - 1):
            out.extend((poly[0], poly[i], poly[i + 1]))
    return out


def main(argv):
    src, dst = argv[1], argv[2]
    meta_path = argv[argv.index("--meta") + 1] if "--meta" in argv else None
    stage = Usd.Stage.Open(src)
    if stage is None:
        raise SystemExit(f"cannot open {src}")
    mpu = UsdGeom.GetStageMetersPerUnit(stage) or 1.0
    up = UsdGeom.GetStageUpAxis(stage)
    cache = UsdGeom.XformCache(Usd.TimeCode.Default())
    positions, normals, indices = [], [], []
    bbox_min, bbox_max = [1e30] * 3, [-1e30] * 3
    meshes = 0
    # instanceable prims hide their meshes behind instance proxies; walk those too
    for prim in Usd.PrimRange(stage.GetPseudoRoot(), Usd.TraverseInstanceProxies(Usd.PrimAllPrimsPredicate)):
        if not prim.IsA(UsdGeom.Mesh):
            continue
        img = UsdGeom.Imageable(prim)
        if img.ComputeVisibility() == UsdGeom.Tokens.invisible:
            continue
        purpose = img.ComputePurpose()
        if purpose not in (UsdGeom.Tokens.default_, UsdGeom.Tokens.render):
            continue
        mesh = UsdGeom.Mesh(prim)
        pts = mesh.GetPointsAttr().Get()
        counts = mesh.GetFaceVertexCountsAttr().Get()
        fidx = mesh.GetFaceVertexIndicesAttr().Get()
        if not pts or not counts or not fidx:
            continue
        xf = cache.GetLocalToWorldTransform(prim)
        tri = triangulate(list(counts), list(fidx))
        base = len(positions) // 3
        world = []
        for p in pts:
            w = xf.Transform(Gf.Vec3d(p[0], p[1], p[2]))
            x, y, z = w[0] * mpu, w[1] * mpu, w[2] * mpu
            if up == UsdGeom.Tokens.z:
                x, y, z = x, z, -y
            world.append((x, y, z))
        # flat normals per triangle: duplicate vertices so the white model keeps crisp facets
        for i in range(0, len(tri), 3):
            a, b, c = (world[tri[i]], world[tri[i + 1]], world[tri[i + 2]])
            ux, uy, uz = b[0] - a[0], b[1] - a[1], b[2] - a[2]
            vx, vy, vz = c[0] - a[0], c[1] - a[1], c[2] - a[2]
            nx, ny, nz = uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx
            ln = (nx * nx + ny * ny + nz * nz) ** 0.5 or 1.0
            n = (nx / ln, ny / ln, nz / ln)
            for v in (a, b, c):
                positions.extend(v)
                normals.extend(n)
                for k in range(3):
                    bbox_min[k] = min(bbox_min[k], v[k])
                    bbox_max[k] = max(bbox_max[k], v[k])
            start = len(positions) // 3 - 3
            indices.extend((start, start + 1, start + 2))
        meshes += 1
    if not positions:
        raise SystemExit("no renderable meshes")
    pos = struct.pack(f"<{len(positions)}f", *positions)
    nor = struct.pack(f"<{len(normals)}f", *normals)
    idx = struct.pack(f"<{len(indices)}I", *indices)
    pad = lambda b: b + b"\0" * ((4 - len(b) % 4) % 4)
    bin_blob = pad(pos) + pad(nor) + pad(idx)
    gltf = {
        "asset": {"version": "2.0", "generator": "cinemap usd2glb"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": stage.GetDefaultPrim().GetName() if stage.GetDefaultPrim() else "asset"}],
        "meshes": [{"primitives": [{"attributes": {"POSITION": 0, "NORMAL": 1}, "indices": 2, "mode": 4}]}],
        "buffers": [{"byteLength": len(bin_blob)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(pos), "target": 34962},
            {"buffer": 0, "byteOffset": len(pad(pos)), "byteLength": len(nor), "target": 34962},
            {"buffer": 0, "byteOffset": len(pad(pos)) + len(pad(nor)), "byteLength": len(idx), "target": 34963},
        ],
        "accessors": [
            {"bufferView": 0, "componentType": 5126, "count": len(positions) // 3, "type": "VEC3", "min": bbox_min, "max": bbox_max},
            {"bufferView": 1, "componentType": 5126, "count": len(normals) // 3, "type": "VEC3"},
            {"bufferView": 2, "componentType": 5125, "count": len(indices), "type": "SCALAR"},
        ],
    }
    js = pad(json.dumps(gltf, separators=(",", ":")).encode())
    js = js.replace(b"\0", b" ") if js.endswith(b"\0") else js
    total = 12 + 8 + len(js) + 8 + len(bin_blob)
    with open(dst, "wb") as f:
        f.write(b"glTF" + struct.pack("<II", 2, total))
        f.write(struct.pack("<II", len(js), 0x4E4F534A) + js)
        f.write(struct.pack("<II", len(bin_blob), 0x004E4942) + bin_blob)
    meta = {"meshes": meshes, "triangles": len(indices) // 3, "bbox": {"min": bbox_min, "max": bbox_max}, "metersPerUnit": mpu, "upAxis": str(up)}
    if meta_path:
        with open(meta_path, "w") as f:
            json.dump(meta, f)
    print(json.dumps(meta))


if __name__ == "__main__":
    main(sys.argv)
