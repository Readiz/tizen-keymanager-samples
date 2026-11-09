from __future__ import annotations

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class NativeBoundaryTests(unittest.TestCase):
    def test_native_reader_with_host_ckmc_stub(self) -> None:
        compiler = shutil.which("c++")
        if compiler is None:
            self.skipTest("No C++ compiler available for the host-only CKMC stub")

        with tempfile.TemporaryDirectory() as directory:
            temp = Path(directory)
            include = temp / "ckmc"
            include.mkdir()
            (include / "ckmc-type.h").write_text(
                "#pragma once\n#include <cstddef>\n"
                "struct ckmc_raw_buffer_s { unsigned char* data; std::size_t size; };\n"
                "enum { CKMC_ERROR_NONE = 0, CKMC_ERROR_INVALID_PARAMETER = -2, CKMC_ERROR_DB_ERROR = -3 };\n",
                encoding="utf-8",
            )
            (include / "ckmc-manager.h").write_text(
                "#pragma once\n#include <ckmc/ckmc-type.h>\n"
                "int ckmc_alias_new(const char*, const char*, char**);\n"
                "int ckmc_get_data(const char*, const char*, ckmc_raw_buffer_s**);\n"
                "void ckmc_buffer_free(ckmc_raw_buffer_s*);\n",
                encoding="utf-8",
            )
            (temp / "stub.cpp").write_text(
                "#include <ckmc/ckmc-manager.h>\n#include <cstdio>\n#include <cstdlib>\n#include <cstring>\n"
                "static int frees = 0;\n"
                "int ckmc_alias_new(const char* owner, const char* key, char** out) { "
                "if (!owner || !key || !out) return CKMC_ERROR_INVALID_PARAMETER; "
                "const std::size_t n = std::strlen(owner) + std::strlen(key) + 2; "
                "*out = static_cast<char*>(std::malloc(n)); "
                "std::snprintf(*out, n, \"%s %s\", owner, key); return CKMC_ERROR_NONE; }\n"
                "int ckmc_get_data(const char* alias, const char*, ckmc_raw_buffer_s** out) { "
                "if (std::strcmp(alias, \"KmWriter01 denied\") == 0) return 42; "
                "auto* b = static_cast<ckmc_raw_buffer_s*>(std::calloc(1, sizeof(ckmc_raw_buffer_s))); "
                "if (std::strcmp(alias, \"KmWriter01 empty\") == 0) { *out=b; return 0; } "
                "const char data[] = \"sample_tcstring_value\"; b->size=sizeof(data)-1; "
                "b->data=static_cast<unsigned char*>(std::malloc(b->size)); "
                "std::memcpy(b->data,data,b->size); *out=b; return 0; }\n"
                "void ckmc_buffer_free(ckmc_raw_buffer_s* b) { ++frees; if (b) { std::free(b->data); std::free(b); } }\n"
                "int buffer_frees() { return frees; }\n",
                encoding="utf-8",
            )
            (temp / "test.cpp").write_text(
                "#include \"secure_storage.h\"\n#include <cassert>\n#include <string>\n"
                "int buffer_frees();\n"
                "int main() { std::string value = \"stale\"; "
                "km_run_keymanager_demo(\"KmWriter01\", \"tcstring\", \"sample_tcstring_value\"); "
                "assert(km_load_value(\"KmWriter01\", \"tcstring\", value) == 0); "
                "assert(value.size() == 21 && value == std::string(\"sample_tcstring_value\",21)); "
                "assert(buffer_frees() == 2); value = \"stale\"; "
                "assert(km_load_value(\"KmWriter01\", \"empty\", value) == 0 && value.empty()); "
                "assert(buffer_frees() == 3); value = \"stale\"; "
                "assert(km_load_value(\"KmWriter01\", \"denied\", value) == 42 && value.empty()); "
                "assert(buffer_frees() == 3); value = \"stale\"; "
                "assert(km_load_value(\"\", \"tcstring\", value) == CKMC_ERROR_INVALID_PARAMETER && value.empty()); "
                "return 0; }\n",
                encoding="utf-8",
            )
            binary = temp / "native-test"
            subprocess.run(
                [
                    compiler,
                    "-std=c++11",
                    "-Wall",
                    "-Wextra",
                    "-Werror",
                    "-I",
                    str(temp),
                    "-I",
                    str(ROOT / "native" / "inc"),
                    str(ROOT / "native" / "src" / "secure_storage.cpp"),
                    str(ROOT / "native" / "src" / "keymanager_demo.cpp"),
                    str(temp / "stub.cpp"),
                    str(temp / "test.cpp"),
                    "-o",
                    str(binary),
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            result = subprocess.run([str(binary)], check=True, capture_output=True, text=True)
            self.assertEqual(result.stdout, "Native value matches sample: true\n")


if __name__ == "__main__":
    unittest.main()
