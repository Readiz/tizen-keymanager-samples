#include "secure_storage.h"

#include <ckmc/ckmc-manager.h>

#include <cstdlib>
#include <memory>

namespace {
struct AliasDeleter {
    void operator()(char* value) const { std::free(value); }
};

struct BufferDeleter {
    void operator()(ckmc_raw_buffer_s* value) const {
        if (value != nullptr) ckmc_buffer_free(value);
    }
};
}  // namespace

int km_load_value(const char* writer_package_id,
                  const char* key,
                  std::string& value) {
    value.clear();
    if (writer_package_id == nullptr || writer_package_id[0] == '\0' ||
        key == nullptr || key[0] == '\0') {
        return CKMC_ERROR_INVALID_PARAMETER;
    }

    char* raw_alias = nullptr;
    int result = ckmc_alias_new(writer_package_id, key, &raw_alias);
    if (result != CKMC_ERROR_NONE) return result;

    std::unique_ptr<char, AliasDeleter> alias(raw_alias);
    ckmc_raw_buffer_s* raw_buffer = nullptr;
    result = ckmc_get_data(alias.get(), nullptr, &raw_buffer);
    std::unique_ptr<ckmc_raw_buffer_s, BufferDeleter> buffer(raw_buffer);
    if (result != CKMC_ERROR_NONE) return result;

    if (!buffer || (buffer->size > 0 && buffer->data == nullptr)) {
        return CKMC_ERROR_DB_ERROR;
    }
    if (buffer->size > 0) {
        value.assign(reinterpret_cast<const char*>(buffer->data), buffer->size);
    }
    return CKMC_ERROR_NONE;
}
