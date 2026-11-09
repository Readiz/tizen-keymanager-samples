from __future__ import annotations

import hashlib
import tempfile
import unittest
import zipfile
from pathlib import Path

from scripts import build_web


class WgtPackageTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.project = self.base / "KmKeyWriter"
        self.project.mkdir()
        config = build_web.load_config(Path(__file__).resolve().parents[1])
        (self.project / "config.xml").write_text(
            build_web.make_config_xml(config, config["writerPackageId"], config["writerAppId"], "Writer"),
            encoding="utf-8",
        )
        for name, contents in {
            "index.html": b"<html></html>",
            "icon.png": build_web.png_bytes(),
            "js/app.js": b"app();",
            "js/keymanager.js": b"api();",
            "js/remote.js": b"remote();",
            "js/sample-config.js": b"window.KM_SAMPLE_CONFIG = {};",
            "css/styles.css": b"body {}",
        }.items():
            target = self.project / name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(contents)
        self.wgt = self.base / "first.wgt"

    def tearDown(self) -> None:
        self.temp.cleanup()

    def test_unsigned_package_is_deterministic_and_valid(self) -> None:
        build_web.package(self.project, self.wgt)
        first_hash = hashlib.sha256(self.wgt.read_bytes()).hexdigest()
        build_web.verify(self.wgt, "KmWriter01.Writer", signed=False)
        build_web.package(self.project, self.wgt)
        second_hash = hashlib.sha256(self.wgt.read_bytes()).hexdigest()
        self.assertEqual(first_hash, second_hash)
        with zipfile.ZipFile(self.wgt) as archive:
            self.assertEqual(archive.testzip(), None)
            self.assertEqual(archive.getinfo("config.xml").date_time, (1980, 1, 1, 0, 0, 0))

    def test_verifier_rejects_mismatched_app_id(self) -> None:
        build_web.package(self.project, self.wgt)
        with self.assertRaisesRegex(ValueError, "app ID mismatch"):
            build_web.verify(self.wgt, "KmKeyReader.Reader", signed=False)

    def test_config_requires_distinct_ten_character_package_ids(self) -> None:
        root = Path(__file__).resolve().parents[1]
        config = build_web.json.loads((root / "samples.config.json").read_text(encoding="utf-8"))
        config["readerPackageId"] = "KmWriter01"
        config["readerAppId"] = "KmWriter01.Reader"
        with self.assertRaisesRegex(ValueError, "different package IDs"):
            build_web.validate_config(config)


if __name__ == "__main__":
    unittest.main()
