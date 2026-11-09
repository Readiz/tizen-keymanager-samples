#!/usr/bin/env python3
"""Prepare static Tizen Web projects and create/inspect reproducible WGT ZIPs."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import struct
import zlib
import zipfile
from pathlib import Path
from xml.etree import ElementTree


APPS = (
    ("writer", "writerPackageId", "writerAppId", "Writer", "KmKeyWriter"),
    ("reader", "readerPackageId", "readerAppId", "Reader", "KmKeyReader"),
)
WEB_FILES = (
    ("index.html", "index.html"),
    ("app.js", "js/app.js"),
)
SHARED_FILES = (
    ("keymanager.js", "js/keymanager.js"),
    ("remote.js", "js/remote.js"),
    ("styles.css", "css/styles.css"),
)


def load_config(root: Path) -> dict[str, str]:
    config = json.loads((root / "samples.config.json").read_text(encoding="utf-8"))
    return validate_config(config)


def validate_config(config: dict[str, str]) -> dict[str, str]:
    for field in ("writerPackageId", "readerPackageId"):
        value = config.get(field, "")
        if not re.fullmatch(r"[A-Za-z0-9]{10}", value):
            raise ValueError(f"{field} must contain exactly 10 ASCII letters or digits")
    if config["writerPackageId"] == config["readerPackageId"]:
        raise ValueError("Writer and Reader must use different package IDs")
    for prefix, package in (("writerAppId", config["writerPackageId"]),
                            ("readerAppId", config["readerPackageId"])):
        app_id = config.get(prefix, "")
        suffix = app_id[len(package) + 1:] if app_id.startswith(package + ".") else ""
        if not re.fullmatch(r"[A-Za-z0-9._-]{1,52}", suffix):
            raise ValueError(f"{prefix} must be {package}.<1-52 ASCII app-name characters>")
    if not re.fullmatch(r"\d+\.\d+\.\d+", config.get("version", "")):
        raise ValueError("version must use the numeric major.minor.patch format")
    if not isinstance(config.get("key"), str) or not config["key"] or re.search(r"\s", config["key"]):
        raise ValueError("key must be a non-empty string without whitespace")
    if not isinstance(config.get("value"), str):
        raise ValueError("value must be a string")
    native = config.get("nativePackageId", "")
    if not isinstance(native, str):
        raise ValueError("nativePackageId must be a string; leave empty to disable Native access")
    return config


def png_bytes(size: int = 128) -> bytes:
    """Create a simple blue and white key tile with only Python's stdlib."""
    raw = bytearray()
    center = size // 2
    outer = size * 0.30
    inner = size * 0.10
    for y in range(size):
        raw.append(0)  # PNG filter: None
        for x in range(size):
            dx, dy = x - center, y - center
            distance = (dx * dx + dy * dy) ** 0.5
            if inner <= distance <= outer:
                pixel = (245, 250, 255, 255)
            elif abs(dy + size * 0.19) <= size * 0.08 and abs(dx - size * 0.2) <= size * 0.09:
                pixel = (245, 250, 255, 255)
            else:
                pixel = (28, 74, 132, 255)
            raw.extend(pixel)

    def chunk(kind: bytes, data: bytes) -> bytes:
        payload = kind + data
        return struct.pack(">I", len(data)) + payload + struct.pack(">I", zlib.crc32(payload) & 0xFFFFFFFF)

    header = b"\x89PNG\r\n\x1a\n"
    return (header + chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)) +
            chunk(b"IDAT", zlib.compress(bytes(raw), level=9)) + chunk(b"IEND", b""))


def make_config_xml(config: dict[str, str], package: str, app_id: str, name: str) -> str:
    version = config["version"]
    return f'''<?xml version="1.0" encoding="UTF-8"?>
<widget xmlns="http://www.w3.org/ns/widgets"
        xmlns:tizen="http://tizen.org/ns/widgets"
        id="https://example.invalid/tizen-keymanager/{name.lower()}"
        version="{version}"
        viewmodes="maximized">
  <name>{name}</name>
  <icon src="icon.png"/>
  <content src="index.html"/>
  <tizen:application id="{app_id}" package="{package}" required_version="3.0"/>
  <tizen:profile name="tv-samsung"/>
</widget>
'''


def write_js_config(config: dict[str, str], name: str) -> str:
    value = dict(config)
    value["appName"] = name
    return "window.KM_SAMPLE_CONFIG = " + json.dumps(value, ensure_ascii=True, separators=(",", ":")) + ";\n"


def prepare(root: Path, output: Path) -> None:
    config = load_config(root)
    shutil.rmtree(output, ignore_errors=True)
    output.mkdir(parents=True)
    for folder, package_field, app_field, name, _ in APPS:
        project = output / folder
        project.mkdir(parents=True)
        for source_name, destination in WEB_FILES:
            source = root / "web" / folder / source_name
            if not source.is_file():
                raise FileNotFoundError(f"Expected Web sample file is missing: {source.relative_to(root)}")
            target = project / destination
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        for source_name, destination in SHARED_FILES:
            source = root / "web" / "shared" / source_name
            if not source.is_file():
                raise FileNotFoundError(f"Expected shared Web file is missing: {source.relative_to(root)}")
            target = project / destination
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
        package = config[package_field]
        app_id = config[app_field]
        (project / "config.xml").write_text(make_config_xml(config, package, app_id, name), encoding="utf-8")
        config_js = project / "js" / "sample-config.js"
        config_js.write_text(write_js_config(config, name), encoding="utf-8")
        (project / "icon.png").write_bytes(png_bytes())
        print(f"Staged {folder}: {package} / {app_id}")


def zip_entries(project: Path) -> list[Path]:
    entries = sorted((p for p in project.rglob("*") if p.is_file()), key=lambda p: p.relative_to(project).as_posix())
    if not any(p.name == "config.xml" for p in entries):
        raise ValueError("project lacks config.xml")
    return entries


def package(project: Path, output: Path) -> None:
    entries = zip_entries(project)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.unlink(missing_ok=True)
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for file_path in entries:
            name = file_path.relative_to(project).as_posix()
            info = zipfile.ZipInfo(name, date_time=(1980, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, file_path.read_bytes())


def verify(wgt: Path, app_id: str | None = None, signed: bool = False) -> None:
    if not wgt.is_file():
        raise FileNotFoundError(wgt)
    with zipfile.ZipFile(wgt) as archive:
        bad_entry = archive.testzip()
        if bad_entry:
            raise ValueError(f"ZIP CRC failed for {bad_entry}")
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError("duplicate ZIP entries are not allowed")
        required = {"config.xml", "index.html", "icon.png", "js/app.js", "js/keymanager.js", "js/remote.js", "js/sample-config.js", "css/styles.css"}
        missing = required.difference(names)
        if missing:
            raise ValueError("WGT is missing: " + ", ".join(sorted(missing)))
        tree = ElementTree.fromstring(archive.read("config.xml"))
        ns = {"tizen": "http://tizen.org/ns/widgets"}
        app = tree.find("tizen:application", ns)
        profile = tree.find("tizen:profile", ns)
        if app is None or profile is None or profile.get("name") != "tv-samsung":
            raise ValueError("config.xml must declare a Samsung TV profile and Tizen application")
        if app.get("required_version") != "3.0":
            raise ValueError("required_version must be 3.0")
        if app_id and app.get("id") != app_id:
            raise ValueError(f"WGT app ID mismatch: expected {app_id}, got {app.get('id')}")
        if app.get("package", "") == "" or not re.fullmatch(r"[A-Za-z0-9]{10}", app.get("package", "")):
            raise ValueError("invalid 10-character ASCII package ID")
        if not app.get("id", "").startswith(app.get("package", "") + "."):
            raise ValueError("application ID must start with its package ID")
        manifest = archive.read("config.xml").lower()
        if b"<tizen:privilege" in manifest and b"keymanager" in manifest:
            raise ValueError("KeyManager privilege must not be declared for this Tizen 3.0+ sample")
        signatures = {"author-signature.xml", "signature1.xml"}.intersection(names)
        if signed and signatures != {"author-signature.xml", "signature1.xml"}:
            raise ValueError("signed WGT must contain author-signature.xml and signature1.xml")
        if not signed and signatures:
            raise ValueError("unsigned output unexpectedly contains signing metadata")
    print(f"Verified {'signed' if signed else 'unsigned'} WGT: {wgt.name}")


def main() -> int:
    parser = argparse.ArgumentParser()
    commands = parser.add_subparsers(dest="command", required=True)
    prep = commands.add_parser("prepare")
    prep.add_argument("--root", type=Path, required=True)
    prep.add_argument("--output", type=Path, required=True)
    pack = commands.add_parser("package")
    pack.add_argument("--project", type=Path, required=True)
    pack.add_argument("--output", type=Path, required=True)
    check = commands.add_parser("verify")
    check.add_argument("--wgt", type=Path, required=True)
    check.add_argument("--app-id")
    check.add_argument("--signed", action="store_true")
    args = parser.parse_args()
    if args.command == "prepare":
        prepare(args.root.resolve(), args.output.resolve())
    elif args.command == "package":
        package(args.project.resolve(), args.output.resolve())
    else:
        verify(args.wgt.resolve(), args.app_id, args.signed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
