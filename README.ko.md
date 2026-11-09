# Tizen TCString KeyManager 샘플

[English](README.md) | **한국어**

Samsung TV용 Web 앱 두 개로 `tcstring` 문자열의 set/get을 시험합니다. **Writer 웹앱만 값을 저장(set)**하고, Reader 웹앱과 C++ Native 예제는 저장된 값을 읽기(get)만 합니다. 두 WGT는 각자 다른 Web package ID를 사용하며 저장소는 KeyManager입니다.

| 앱 | 역할 | Tizen Web package |
| --- | --- | --- |
| Writer | `tcstring`에 `sample_tcstring_value` 신규 저장, Writer에서 읽기, Reader에 `READ` 설정 | `KmWriter01` |
| Reader | Writer package가 소유한 같은 항목 읽기 | `KmReader01` |

먼저 Node.js 18+와 Python 3.9+를 준비한 뒤 저장소 루트에서 실행합니다.

```sh
npm test
npm run build
```

빌드는 `dist/unsigned/`에 서명되지 않은 WGT 두 개와 SHA-256 목록을 만듭니다. 이 패키지는 ZIP 구조 검증과 앱 구조 검토용입니다. **TV에 설치할 수 있는 서명 WGT가 아닙니다.** 설치하려면 Samsung TV SDK, 개발자 모드 TV, TV용 인증서와 해당 인증서 프로필이 필요합니다. [v1.0.0 공개 다운로드](https://github.com/Readiz/tizen-keymanager-samples/releases/tag/v1.0.0)도 제공합니다. 다운로드 WGT 역시 미서명이므로 TV 인증서 프로필로 서명해야 합니다. 자세한 절차는 [빌드 안내](docs/ko/BUILDING.md)를 참고하세요.

## 샘플 순서

1. 대상 TV에서 개발자 모드를 켜고 **개발 PC의 LAN IP를 Host PC IP에 입력**한 다음 TV를 재시작합니다.
2. Writer와 Reader 두 앱을 같은 테스트 TV에 설치합니다.
3. Writer에서 새 `tcstring` 항목을 저장합니다. Writer가 저장한 뒤 Reader package에 `READ` 권한을 부여합니다.
4. Writer에서 같은 앱 읽기를 확인한 다음 Reader를 실행해 소유 Writer package의 값을 읽습니다.
5. 필요한 경우 [Native 참고 코드](native/README.ko.md)를 제품의 Native SDK에 연결합니다.

앱 시작, 복구, 빌드 시 저장하거나 삭제하지 않습니다. 이미 `tcstring` 항목이 있으면 새 저장은 거부됩니다. 처음 테스트 후 다시 시작할 때는 Writer에서 명시적으로 데모 키를 삭제합니다. `samples.config.json`의 `value`를 바꾸면 다른 시험 문자열을 사용할 수 있습니다. 이 파일과 WGT에는 공개 시험값만 넣고 실제 민감한 문자열은 제품 앱의 실행 시점에 전달하세요.

## 중요한 플랫폼 조건

- 삼성 TV의 일반 앱 배포는 Web WGT 경로입니다. 공개 FAQ는 TV Native TPK 설치를 지원하지 않는다고 설명합니다. C++ 코드는 WGT가 아니며, 적합한 제품 전용 Native 런타임과 SDK가 있는 기존 앱의 통합 예제입니다. [Samsung TV 앱 테스트 FAQ](https://developer.samsung.com/smarttv/develop/faq/application-testing.html)
- KeyManager API 레퍼런스는 TV 지원을 나타내지만, Seller Office의 출시 점검 문서는 Privilege 안내 문맥에서 더는 제공되지 않는다고 기재합니다. 해당 TV 세대·펌웨어와 배포 상태에서 `tizen.keymanager` 및 실제 읽기 권한을 시험하세요. [API 레퍼런스](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/keymanager-api.html), [Seller Office 점검표](https://developer.samsung.com/tv-seller-office/checklists-for-distribution/launch-checklist.html#privilege-api)
- 실제 SDK 빌드, 인증서 서명, WGT 설치, 실물 Web-to-Web 공유, Native 교차 읽기는 이 저장소만으로 검증되지 않았습니다.

## 문서

| 한국어 | English |
| --- | --- |
| [실습 가이드](docs/ko/GUIDE.md) | [Implementation guide](docs/GUIDE.md) |
| [빌드와 TV 설치](docs/ko/BUILDING.md) | [Build and installation](docs/BUILDING.md) |
| [범위와 수용 기준](docs/ko/REQUIREMENTS.md) | [Requirements and acceptance criteria](docs/REQUIREMENTS.md) |
| [테스트 기록](docs/ko/TESTING.md) | [Test record](docs/TESTING.md) |
| [Native C++ 안내](native/README.ko.md) | [Native C++ notes](native/README.md) |

## 저장소 구성

```text
web/                     두 Web 앱 원본과 공통 UI/API 코드
native/                  기존 제품 앱에 넣을 C++ 읽기 예제
scripts/                 Web staging과 unsigned/signed 빌드
tests/                   웹 API 시뮬레이션 및 WGT 구조 검사
docs/GUIDE.md            저장, ACL, 읽기 흐름과 인수 시험
docs/BUILDING.md         unsigned, 서명, 설치와 실행
docs/REQUIREMENTS.md     범위와 완료 기준
docs/TESTING.md          English test record
docs/ko/                 한국어 번역 문서
dist/unsigned/           로컬에서 만든 비서명 WGT (Git 제외)
```

## 라이선스

샘플 코드와 문서는 MIT 라이선스입니다. Samsung/Tizen 상표와 SDK는 각 권리자의 소유입니다. [라이선스](LICENSE)
