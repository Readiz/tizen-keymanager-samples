# Test record and device test plan

**English** | [한국어](ko/TESTING.md) | [Project README](../README.md)

## Automated checks

Automated tests simulate the web API sequence, inspect the two WGT ZIP/XML manifests and package IDs, and check hashes. Fake Tizen APIs run only inside the test runner; they do not demonstrate success on a TV.

```sh
npm test
npm run build
```

## Local checks recorded on 2026-11-09

The recorded environment was macOS, Node.js 26.13.0, Python 3.9.6, and Apple Clang `c++`. The sample key is `tcstring`; its public test value is `sample_tcstring_value`.

| Check | Recorded result | Scope |
| --- | --- | --- |
| `npm test` — Node | 12/12 passed | Owner-qualified get, protection of existing keys, READ/NONE, partial success and ACL retry, duplicate callbacks, and revocation-failure UI |
| `npm test` — Python | 4/4 passed | WGT structure and IDs, repeat package hash, and C++ host mock |
| C++ host check | Compiled and ran successfully | CKMC test double; get, size-based byte copy without NUL termination, empty value, errors and buffer cleanup, comparison output rather than raw value |
| `npm run build` | Produced two unsigned WGTs | Eight entries each; CRC/XML, Tizen 3.0, Samsung TV profile, IDs, and packaged `tcstring` configuration |
| ES5 syntax check | 4 web JS files passed | Parsed as ECMAScript 5 by Acorn. This did not run on a TV engine. |
| Chrome screen check | Both apps at 1920/1280/768/390 px | No horizontal overflow, 44 px buttons, `tcstring` visible, unavailable API state |
| Chrome keyboard check | Four arrows, Enter, and Back-cancel checked | Initial focus, cancel from delete confirmation and focus return. Back key code 10009 was a synthetic event. |
| SDK signed build | Not verified | The Tizen CLI was unavailable and the command reported this. No signed WGT or certificate use was produced. |

The browser did not expose the real `tizen.keymanager` API, so the unsupported state was checked. The Node Tizen fixture and C++ CKMC double only run in tests. These results do not prove set/get on a physical TV, cross-package `READ` behavior, TV installation, persistence across app or TV restarts, or compilation with a product native SDK.

## Physical-device test record template

Add a row for each tested device/SDK combination. Do not record accounts, certificate private keys, or the actual secret value.

| Field | Value |
| --- | --- |
| TV model and release year | |
| TV firmware/OS | |
| Tizen/Samsung SDK version | |
| Security profile type/name (no secrets) | |
| Web package/application IDs | |
| Native package ID and runtime, if applicable | |
| Test date and timezone | |
| Test IDs (T01–T13) and steps | |
| Actual result and error name/CKMC result code | |
| Confirm the secret value was not logged | |
| Limitations and follow-up | |

If separate Web app access was not tested on hardware, distinguish API fixtures and WGT structure checks from a physical TV result.
