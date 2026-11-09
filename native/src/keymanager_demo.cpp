#include "secure_storage.h"

#include <cstdio>
#include <string>

// Call after the Writer has saved the item and granted this Native package
// READ permission. Integrate this function into an existing product app.
// Samsung's public TV flow installs Web WGT applications; this source is not a
// standalone, publicly installable TV Native package.
void km_run_keymanager_demo(const char* writer_package_id,
                           const char* key,
                           const char* expected_value) {
    std::string value;
    const int result = km_load_value(writer_package_id, key, value);
    if (result != CKMC_ERROR_NONE) {
        std::printf("Native KeyManager read failed (CKMC %d)\n", result);
        return;
    }
    // Print only a comparison; never write the stored value to a log.
    std::printf("Native value matches sample: %s\n",
                expected_value != nullptr && value == expected_value ? "true" : "false");
}
