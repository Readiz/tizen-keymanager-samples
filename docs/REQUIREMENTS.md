# Scope and acceptance criteria

**English** | [한국어](ko/REQUIREMENTS.md) | [Project README](../README.md)

## Requested scope

- Two Tizen web sample apps with different package IDs.
- Writer creates a new string item, gets its own value, and grants or revokes `READ` access for the separate Reader package or an explicitly configured product native package.
- Reader gets an item owned by Writer by using an owner-qualified query.
- The sample key is `tcstring`, and the public test value is `sample_tcstring_value`. Only the Writer web app sets it. The Reader web app and native C++ example only get it.
- A C++ get example for integration into an existing native app, kept separate from the two web apps.
- An automated unsigned WGT build, instructions for signing with the Tizen CLI, and a public usage guide.
- English is the default documentation language at the canonical paths in the repository. Korean translations live under `docs/ko/` and the corresponding `*.ko.md` files, with links in both directions.

## Acceptance criteria

1. Each web app has its own package/application ID, the Tizen 3.0 minimum, and the Samsung TV profile.
2. The UI and API report missing support, read failures, and permission failures rather than hiding them. The stored string is not logged.
3. An existing key is never overwritten. If an ACL step fails, retry the ACL without saving again.
4. The WGT build checks its XML, entries, CRC, package IDs, and configuration, then produces two files and a hash manifest.
5. Unsigned review packages and certificate-signed installation candidates are clearly distinguished by output path and documentation.
6. The native example reads with the writer owner package ID, validates inputs, releases API buffers, and does not log private values.
7. README and detailed guides explain the conflicting KeyManager availability guidance and native TV support boundary.
8. Build/test results are never presented as physical-device test results.

## Environment limits and unresolved checks

- Samsung's public regular TV app path uses Web WGTs. Its public FAQ says Native TPK installation is unsupported in its regular TV testing flow. The native code is a reference for a product that separately has a suitable SDK/runtime.
- Samsung's KeyManager API reference and Seller Office launch checklist differ in the context of their availability guidance. Check API and ACL behavior on the actual TV model and firmware.
- Tizen Studio CLI and a TV certificate were not available when this project was prepared. SDK compilation, WGT signing, device installation, Web-to-Web get, and Web-to-native get remain unverified.
- If the API is not active in a runtime, the samples must not fall back to plaintext storage.
