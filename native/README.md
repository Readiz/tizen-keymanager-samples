# Native C++ integration notes

**English** | [한국어](README.ko.md) | [Project README](../README.md)

This directory provides a KeyManager **get-only** example for an existing product app with a native runtime. It does not produce a standalone TV app, a TPK for Samsung TV, or a binary verified with a product SDK. Samsung's public FAQ says Native TPK installation is not supported in its regular TV app testing flow. [Samsung TV FAQ](https://developer.samsung.com/smarttv/develop/faq/application-testing.html)

## Dependencies

- The product SDK headers `<ckmc/ckmc-manager.h>` and `<ckmc/ckmc-type.h>`.
- The Key Manager client library supplied with the product sysroot. Check its path and linker flags in the product SDK.
- C++11 or later.
- Pass the Writer web package ID from `samples.config.json` into the product app's configuration.

Configure the product build system to find those headers and libraries, then add `secure_storage.cpp` and `keymanager_demo.cpp` to an existing application target. Call the demo from the product C++ entry point after Writer has set the value and granted the native package `READ`:

```cpp
#include "secure_storage.h"

// Run only after Writer has saved the item and granted Native READ access.
km_run_keymanager_demo("KmWriter01", "tcstring", "sample_tcstring_value");
```

To use the existing product configuration, pass its Writer package ID to `km_load_value(writerPackageId, "tcstring", value)`. The following shows the shape of a per-file compile using the product SDK compiler and sysroot. Replace these variables with paths from your SDK:

```sh
mkdir -p build/native
"$PRODUCT_CXX" --sysroot="$PRODUCT_SYSROOT" -std=c++11 \
  -I native/inc -I "$CKMC_INCLUDE_DIR" \
  -c native/src/secure_storage.cpp -o build/native/secure_storage.o
```

Link the object and demo source into the existing product target and use the Key Manager client library specified by its SDK. This is a command template, not a build tested against an SDK. This project does not provide a public TV Native package or a generic `.tpk` build recipe.

## API contract

```cpp
int ckmc_alias_new(const char *owner_id,
                   const char *alias,
                   char **full_alias);
int ckmc_get_data(const char *alias,
                  const char *password,
                  ckmc_raw_buffer_s **ppdata);
```

The owner is the **Writer web package ID** that called `saveData`. The sample key is `tcstring`, and its per-item password argument is `nullptr`. Release a successfully created `full_alias` with `free()`. Release the buffer returned by `ckmc_get_data()` once with `ckmc_buffer_free()`. Copy its `size` bytes; do not assume NUL termination.

`secure_storage.cpp` is a small boundary example around the CKMC calls. No product Native SDK headers or CKMC runtime were available, so the code has not been validated on a TV. For the API signatures and model, see Tizen's official [Key Manager types](https://docs.stg.tizen.org/application/native/api/mobile/4.0/group__CAPI__KEY__MANAGER__TYPES__MODULE.html) and [Key Manager client](https://docs.stg.tizen.org/application/native/api/common/9.0/group__CAPI__KEY__MANAGER__CLIENT__MODULE.html) references.

## Call order and security boundary

Call `km_run_keymanager_demo(writerPackageId, key, expectedValue)` only after Writer has completed the set and granted `READ` to this native package. Supply its actual **package ID**; do not substitute an application ID, daemon name, or UID. The sample's `nativePackageId` defaults to empty, so Writer does not request native access unless a product package ID is configured.

A successful C++ return is not evidence that a product can read data owned by another Web package on a target device. Check the product SDK, firmware, KeyManager access policy, and installation flow with granted, denied, and restarted-app cases. Native API documentation alone does not establish that Samsung publicly supports distributing TV TPK packages.
