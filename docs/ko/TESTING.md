# 테스트 기록과 기기 시험

[English](../TESTING.md) | **한국어** | [프로젝트 README](../../README.ko.md)

## 자동 검사

자동 테스트는 Web API 순서를 모사하는 단위 검사, 두 WGT의 ZIP/XML/package 검증, 해시 확인을 대상으로 합니다. 가짜 Tizen API는 test runner 안에서만 쓰며 실제 TV API 성공 증거로 해석하지 않습니다.

```sh
npm test
npm run build
```

## 2026-11-09 로컬 확인 결과

환경은 macOS, Node.js 26.13.0, Python 3.9.6, Apple Clang의 `c++`입니다. 저장 키는 `tcstring`, 공개 시험 문자열은 `sample_tcstring_value`입니다.

| 검사 | 실제 결과 | 확인 범위 |
| --- | --- | --- |
| `npm test` — Node | 12/12 통과 | 소유자 지정 get, 신규 set의 기존 항목 보호, READ/NONE, 부분 성공·ACL 재시도, 중복 콜백, 해제 실패 UI |
| `npm test` — Python | 4/4 통과 | WGT 구조·ID·반복 패키징 해시와 C++ 호스트 모의 검사 |
| C++ 호스트 검사 | 컴파일·실행 통과 | CKMC를 테스트 대역으로 바꾼 get, NUL 종료 없는 바이트 복사, 빈 값, 오류·버퍼 해제, 원문 대신 비교 결과 출력 |
| `npm run build` | 미서명 WGT 2개 생성 | 각 8개 엔트리, CRC/XML, Tizen 3.0·Samsung TV profile, package/app ID 및 내장 tcstring 설정 대조 |
| ES5 문법 검사 | 웹 JS 4개 파일 통과 | Acorn의 ECMAScript 5 파싱. TV 엔진 실행 시험은 아님 |
| Chrome 화면 검사 | 두 앱 × 1920/1280/768/390px 통과 | 가로 넘침 없음, 버튼 높이 44px, `tcstring` 표시, API 없음 상태 |
| Chrome 키보드 검사 | 방향키 4방향·Enter·Back 취소 확인 | 초기 포커스, 삭제 확인 취소와 포커스 복귀. Back 10009는 합성 이벤트 |
| SDK 서명 빌드 | 미검증 | Tizen CLI가 없어 안내 오류로 중단. 서명본 생성·실제 인증서 사용 없음 |

브라우저에서는 실제 `tizen.keymanager`를 사용할 수 없어 지원하지 않는 상태를 확인했습니다. Node의 Tizen 대역과 C++의 CKMC 대역은 테스트 내부에서만 사용합니다. 이 결과는 실제 TV의 set/get·패키지 간 READ 정책, TV 설치, 재실행·재부팅 후 유지 또는 제품 Native SDK 빌드 성공을 증명하지 않습니다.

## 실기기 기록 양식

각 조합별로 기록을 추가합니다. account, 인증서 개인 키, 실제 secret value를 저장하지 마세요.

| 필드 | 값 |
| --- | --- |
| TV 모델 및 출시 연도 | |
| TV 펌웨어/OS | |
| Tizen/Samsung SDK 버전 | |
| 보안 프로필 유형/이름(비밀 제외) | |
| Web package ID/앱 ID | |
| Native package ID 및 런타임(해당 시) | |
| 시험 날짜·시간대 | |
| 시험 ID (GUIDE T01–T13)와 단계 | |
| 실제 결과와 error.name/CKMC 반환 코드 | |
| 비밀값 원문을 로그에 남기지 않았음 | |
| 남은 제한 / 후속 시도 | |

별도 Web app 조회 시험을 실제로 수행하지 않았다면 테스트 표의 API fixture, WGT 구조 검사 및 일반 TV 실기 결과를 구분해서 보고합니다.
