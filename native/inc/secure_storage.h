#ifndef KM_SECURE_STORAGE_H
#define KM_SECURE_STORAGE_H

#include <ckmc/ckmc-type.h>
#include <string>

// Reads an item owned by writer_package_id. The caller must supply the Web
// package ID that saved the item, not this Native application's package ID.
// Returns a CKMC error code. `value` is empty on every error.
int km_load_value(const char* writer_package_id,
                  const char* key,
                  std::string& value);

// Read after the Writer saved the item and granted this Native package READ.
// The caller supplies configuration values; the stored string is never logged.
void km_run_keymanager_demo(const char* writer_package_id,
                            const char* key,
                            const char* expected_value);

#endif  // KM_SECURE_STORAGE_H
