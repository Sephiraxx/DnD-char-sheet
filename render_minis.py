"""Render tabletop miniatures with Blender 4.2+ and Cycles.

blender -b -P render_minis.py -- <input_dir> <output_dir> [--rotations 8]
The model faces -Y in Blender. Mark its plinth with role="base" or name it Base.
Tag a flight stand with role="stand" to export a separate stationary layer.
Model metadata comes from scene or object custom properties (glTF extras).
"""

import argparse
import json
import math
from pathlib import Path
import re
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Matrix, Vector


PIXELS = int(re.search(r"const pixelsPerSquare = (\d+);", (Path(__file__).parent / "miniature-mesh.js").read_text(encoding="utf-8"))[1])
FOOTPRINT = {"tiny": 0.5, "small": 1, "medium": 1, "large": 2, "huge": 3, "gargantuan": 4}
MODEL_TYPES = {"MESH", "CURVE", "SURFACE", "FONT", "META"}


def arguments():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input_dir", type=Path)
    parser.add_argument("output_dir", type=Path)
    parser.add_argument("--rotations", type=int, choices=[1, 8], default=8)
    parser.add_argument("--samples", type=int, default=48)
    return parser.parse_args(sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else [])


def bounds(objects):
    depsgraph = bpy.context.evaluated_depsgraph_get()
    result = []
    for original in objects:
        obj = original.evaluated_get(depsgraph)
        result.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    return result


def limits(points, axis):
    values = [point[axis] for point in points]
    return min(values), max(values)


def load_model(path):
    if path.suffix.lower() == ".blend":
        bpy.ops.wm.open_mainfile(filepath=str(path), load_ui=False)
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=str(path))
    scene = bpy.context.scene
    objects = [obj for obj in scene.objects if not obj.hide_render]
    metadata = {}
    for owner in [*objects, scene]:
        for key in ("id", "name", "size", "faction", "age", "variant", "appearance", "portrait_target"):
            if key in owner:
                metadata[key] = str(owner[key])
    identifier = metadata.get("id", path.stem)
    size = metadata.get("size", "").strip().lower()
    faction = metadata.get("faction", "neutral").strip().lower()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]*", identifier):
        raise ValueError(f"Invalid model id: {identifier}")
    if size not in FOOTPRINT:
        raise ValueError(f"Set the size custom property to one of {', '.join(FOOTPRINT)}")
    if faction not in {"ally", "enemy", "neutral"}:
        raise ValueError("Set faction to ally, enemy, or neutral")
    meshes = [obj for obj in objects if obj.type in MODEL_TYPES]
    for obj in list(scene.objects):
        if obj.type in {"CAMERA", "LIGHT"}:
            bpy.data.objects.remove(obj, do_unlink=True)
    bases = [
        obj for obj in meshes
        if obj.get("role") == "base" or re.fullmatch(r"(?:mini[ _-]?)?(?:base|plinth)(?:[._ -].*)?", obj.name, re.I)
    ]
    if not bases or len(bases) == len(meshes):
        raise ValueError("Provide a physical plinth tagged role=base or named Base and separate figure geometry")
    metadata.update(id=identifier, name=metadata.get("name", path.stem), size=size, faction=faction)
    return scene, meshes, bases, metadata


def normalize(meshes, bases, size):
    bpy.context.view_layer.update()
    base = bounds(bases)
    x0, x1 = limits(base, 0)
    y0, y1 = limits(base, 1)
    z0, z1 = limits(base, 2)
    if min(x1 - x0, y1 - y0) < 1e-5:
        raise ValueError("Plinth has no usable diameter")
    # Fit the short axis to the footprint and retain the sculpted base's aspect ratio.
    origin = Vector(((x0 + x1) / 2, (y0 + y1) / 2, z0))
    diameter = FOOTPRINT[size]
    factor = diameter / min(x1 - x0, y1 - y0)
    base_top = (z1 - z0) * factor
    model = [obj for obj in meshes if obj not in bases]
    body_height = (limits(bounds(model), 2)[1] - z1) * factor
    small_factor = min(1, 1.15 / max(body_height, 0.01)) if size == "small" else 1
    original = {obj: obj.matrix_world.copy() for obj in meshes}
    for obj in meshes:
        # Flatten mesh parenting while retaining the evaluated world placement.
        obj.parent = None
        transform = Matrix.Translation(-origin)
        if obj in bases:
            scaling = Matrix.Scale(factor, 4)
        else:
            scaling = Matrix.Translation((0, 0, base_top * (1 - small_factor))) @ Matrix.Scale(factor * small_factor, 4)
        obj.matrix_world = scaling @ transform @ original[obj]
        if obj.type == "MESH":
            for polygon in obj.data.polygons:
                polygon.use_smooth = False
    bpy.context.view_layer.update()
    return model


def aim(obj, point):
    obj.rotation_euler = (Vector(point) - obj.location).to_track_quat("-Z", "Y").to_euler()


def studio(scene, samples):
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = max(1, samples)
    scene.cycles.use_denoising = samples >= 8
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.pixel_aspect_x = scene.render.pixel_aspect_y = 1
    scene.render.use_border = False
    scene.render.use_compositing = False
    scene.render.use_sequencer = False
    scene.view_settings.view_transform = "AgX"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.world = bpy.data.worlds.new("Mini Studio")
    scene.world.use_nodes = True
    scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.22
    for label, location, power, width, color in [
        ("Key", (-3.6, 2.7, 7), 1350, 4, (1, .91, .81)),
        ("Fill", (4, -2.5, 4), 480, 5, (.9, .95, 1)),
        ("Cool Rim", (1.4, 4.5, 6.5), 1580, 3.5, (.63, .80, 1)),
    ]:
        light = bpy.data.lights.new(label, "AREA")
        light.energy, light.size, light.color = power, width, color
        obj = bpy.data.objects.new(label, light)
        scene.collection.objects.link(obj)
        obj.location = location
        aim(obj, (0, 0, 0.7))
    data = bpy.data.cameras.new("Mini Orthographic")
    data.type = "ORTHO"
    data.sensor_fit = "HORIZONTAL"
    data.clip_end = 300
    camera = bpy.data.objects.new("Mini Orthographic", data)
    scene.collection.objects.link(camera)
    scene.camera = camera
    return camera


def pose_camera(camera, elevation):
    angle = math.radians(elevation)
    camera.location = (0, -30 * math.cos(angle), 30 * math.sin(angle))
    aim(camera, (0, 0, 0))
    rotation = camera.rotation_euler.to_quaternion()
    return rotation @ Vector((1, 0, 0)), rotation @ Vector((0, 1, 0))


def board_frame(scene, camera, points):
    right, up = pose_camera(camera, 55)
    # Guard space around the geometry keeps wings and other overhang from clipping.
    left = math.floor((min(p.dot(right) for p in points) - .3) * PIXELS)
    right_px = math.ceil((max(p.dot(right) for p in points) + .55) * PIXELS)
    bottom = math.floor((min(p.dot(up) for p in points) - .55) * PIXELS)
    top = math.ceil((max(p.dot(up) for p in points) + .14) * PIXELS)
    scene.render.resolution_x = right_px - left
    scene.render.resolution_y = top - bottom
    camera.data.ortho_scale = scene.render.resolution_x / PIXELS
    camera.location += right * ((left + right_px) / (2 * PIXELS)) + up * ((bottom + top) / (2 * PIXELS))
    bpy.context.view_layer.update()
    anchor = world_to_camera_view(scene, camera, Vector((0, 0, 0)))
    unit = world_to_camera_view(scene, camera, right)
    if abs((unit.x - anchor.x) * scene.render.resolution_x - PIXELS) > 0.05:
        raise RuntimeError("Camera sensor fit did not preserve pixels per square")
    return dict(x=round(anchor.x * scene.render.resolution_x, 3), y=round((1 - anchor.y) * scene.render.resolution_y, 3))


def gallery_frame(scene, camera, points, portrait, target=None):
    right, up = pose_camera(camera, 20)
    xs = [p.dot(right) for p in points]
    ys = [p.dot(up) for p in points]
    left, rightmost = min(xs), max(xs)
    bottom, top = min(ys), max(ys)
    if target:
        x, y, z, span = target
        subject = Matrix.Rotation(math.radians(28), 4, "Z") @ Vector((x, y, z))
        center_x, center_y = subject.dot(right), subject.dot(up)
        bottom, top = center_y - span / 2, center_y + span / 2
    elif portrait:
        bottom = top - (top - bottom) * .35
        upper = [p.dot(right) for p in points if p.dot(up) >= bottom]
        center_x = (min(upper) + max(upper)) / 2
        span = (top - bottom) / .82
    else:
        center_x = (left + rightmost) / 2
        span = max(top - bottom, rightmost - left) / .85
    camera.location += right * center_x + up * ((top + bottom) / 2)
    scene.render.resolution_x = scene.render.resolution_y = 512
    camera.data.ortho_scale = span


def render(scene, path):
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)


def process(path, out, rotations, samples, used):
    scene, meshes, bases, metadata = load_model(path)
    stem = metadata["id"]
    if stem.casefold() in used:
        raise ValueError(f"Duplicate model id: {stem}")
    used.add(stem.casefold())
    model = normalize(meshes, bases, metadata["size"])
    original = {obj: obj.matrix_world.copy() for obj in meshes}
    camera = studio(scene, samples)
    # The tablero draws the contact shadow at the footprint, independently of facing.
    stands = [obj for obj in model if obj.get("role") == "stand"]
    if stands:
        for obj in model:
            obj.hide_render = obj not in stands
        for obj in bases + stands:
            obj.matrix_world = Matrix.Rotation(math.radians(20), 4, "Z") @ original[obj]
        bpy.context.view_layer.update()
        filename = f"{stem}_fixture.png"
        anchor = board_frame(scene, camera, bounds(bases + stands))
        render(scene, out / filename)
        metadata["fixture"] = dict(image=filename, anchor=anchor)
        for obj in bases:
            obj.hide_render = True
        for obj in model:
            obj.hide_render = obj in stands
    frames = {}
    for angle in range(0, 360, 360 // rotations):
        turn = Matrix.Rotation(math.radians(angle + 20), 4, "Z")
        for obj, matrix in original.items():
            obj.matrix_world = turn @ matrix
        bpy.context.view_layer.update()
        filename = f"{stem}_board_r{angle:03}.png" if rotations == 8 else f"{stem}_board.png"
        anchor = board_frame(scene, camera, bounds([obj for obj in meshes if not obj.hide_render]))
        render(scene, out / filename)
        frames[f"{angle:03}"] = dict(image=filename, anchor=anchor)
    for obj, matrix in original.items():
        obj.hide_render = False
        obj.matrix_world = Matrix.Rotation(math.radians(28), 4, "Z") @ matrix
    bpy.context.view_layer.update()
    gallery_frame(scene, camera, bounds(meshes), portrait=False)
    render(scene, out / f"{stem}_gallery.png")
    framing_meshes = [obj for obj in model if obj.get("role") != "equipment"]
    portrait_target = json.loads(metadata.pop("portrait_target", "null"))
    if portrait_target and (len(portrait_target) != 4 or portrait_target[3] <= 0):
        raise ValueError("portrait_target must be a JSON string of [x,y,z,span] in normalized Blender units")
    gallery_frame(scene, camera, bounds(framing_meshes or model), portrait=True, target=portrait_target)
    render(scene, out / f"{stem}_portrait.png")
    metadata.update(frames["000"], pixelsPerSquare=PIXELS, shadow=False)
    if rotations == 8:
        metadata["rotations"] = frames
    (out / f"{stem}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf8")
    return metadata


def main():
    args = arguments()
    source = args.input_dir.resolve()
    files = sorted(path for path in source.iterdir() if path.suffix.lower() in {".blend", ".glb"})
    if not files:
        raise SystemExit(f"No .blend or .glb files in {source}")
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    failures, used, index = [], set(), []
    for path in files:
        try:
            index.append(process(path, output, args.rotations, args.samples, used))
        except Exception as error:
            failures.append(f"{path.name}: {error}")
    if failures:
        raise SystemExit("\n".join(failures))
    (output / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n", encoding="utf8")


if __name__ == "__main__":
    main()
