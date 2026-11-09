# Tizen TCString KeyManager Samples

**English** | [한국어](README.ko.md)

Two Samsung TV web apps show how to set and get a `tcstring` string with Tizen KeyManager. The **Writer web app is the only app that sets the value**. The Reader web app and the native C++ example only get it. Each WGT uses a different web package ID.

| App | Role | Tizen web package |
| --- | --- | --- |
| Writer | Sets `sample_tcstring_value` under `tcstring`, can get its own value, and grants the Reader `READ` access | `KmWriter01` |
| Reader | Gets the item owned by the Writer package | `KmReader01` |

## Quick start

Install Node.js 18 or later and Python 3.9 or later. From the repository root, run:

```sh
npm test
npm run build
```

The build writes two **unsigned** WGT packages and a SHA-256 manifest to `dist/unsigned/`. They are ZIP packages for structural review and **cannot be installed on a TV as-is**. Signing requires the Samsung TV SDK and a certificate profile that is valid for your target TV. See the [build and installation guide](docs/BUILDING.md).

Prebuilt unsigned WGTs are also available in the [v1.0.0 release](https://github.com/Readiz/tizen-keymanager-samples/releases/tag/v1.0.0). The release assets are unsigned and are not installable until you sign them with your own TV certificate profile.

## Try the samples

1. On the TV, enable Developer Mode, enter the **development PC's LAN IP address** as the Host PC IP, and restart the TV.
2. Sign and install both WGTs on the same test TV.
3. In Writer, select **“tcstring 저장(set) + READ”** to create a new item. After saving it, Writer grants `READ` access to the Reader package.
4. Select **“Writer에서 읽기(get)”** to check the value, then open Reader and select **“tcstring 읽기(get)”** to get the item owned by the Writer package.
5. If you have a compatible product native SDK and runtime, see the [native C++ integration notes](native/README.md).

The on-screen button labels are in Korean; their exact labels are included above. The apps do not save or delete data at startup, recovery, or build time. Writer refuses to overwrite an existing `tcstring` item. To repeat the sample, select **“삭제 단계 열기”**, then confirm with **“tcstring 삭제”** in Writer. You can change `value` in `samples.config.json` for another public test string. Never put a real secret in this file or in a WGT; pass sensitive values to your product app at runtime.

## Platform constraints

- Samsung's public TV app flow uses Web WGTs. Samsung's FAQ says Native TPK installation is not supported for regular TV app testing. The C++ code here is an integration example for an existing product app that has a suitable native runtime and SDK; it is not a standalone TV package. [Samsung TV application testing FAQ](https://developer.samsung.com/smarttv/develop/faq/application-testing.html)
- Samsung's KeyManager API reference lists TV support. The Seller Office launch checklist also says KeyManager is no longer provided in its privilege guidance. Those documents differ in context, so check `tizen.keymanager` and cross-app access on the target TV model, firmware, and distribution path. Do not infer universal support or removal. [API reference](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html) | [Seller Office checklist](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html#privilege-api)
- This project has not verified the Tizen SDK build, certificate signing, TV installation, Web-to-Web access, or native cross-app reads on a physical TV.

## Documentation

| English | Korean |
| --- | --- |
| [Implementation guide](docs/GUIDE.md) | [실습 가이드](docs/ko/GUIDE.md) |
| [Build and installation](docs/BUILDING.md) | [빌드와 TV 설치](docs/ko/BUILDING.md) |
| [Requirements and acceptance criteria](docs/REQUIREMENTS.md) | [범위와 수용 기준](docs/ko/REQUIREMENTS.md) |
| [Test record](docs/TESTING.md) | [테스트 기록](docs/ko/TESTING.md) |
| [Native C++ notes](native/README.md) | [Native C++ 안내](native/README.ko.md) |

## Repository layout

```text
web/                     The two web apps and shared UI/API code
native/                  C++ read example for an existing product app
scripts/                 Web staging and unsigned/signed build commands
tests/                   Web API fixtures and WGT structure checks
docs/                    English implementation, build, requirements, and test guides
docs/ko/                 Korean translations of the guides
dist/unsigned/           Locally generated, unsigned WGT files (not tracked by Git)
```

## License

The sample code and documentation are licensed under MIT. Samsung and Tizen trademarks and SDKs remain the property of their respective owners. See [LICENSE](LICENSE).
