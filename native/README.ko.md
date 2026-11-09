# Native C++ 통합 참고

[English](README.md) | **한국어** | [프로젝트 README](../README.ko.md)

이 디렉터리는 기존에 Native 런타임을 제공받는 제품 앱에 넣는 KeyManager 읽기 예제입니다. 단독 TV 앱, Samsung TV에 설치할 TPK, SDK 검증 완료 바이너리를 만들지 않습니다. Samsung TV 공식 FAQ는 일반 앱 테스트 경로에서 Native TPK 설치를 지원하지 않는다고 설명합니다. [Samsung TV FAQ](https://developer.samsung.com/smarttv/develop/faq/application-testing.html)

## 의존성

- 제품 SDK의 `<ckmc/ckmc-manager.h>`, `<ckmc/ckmc-type.h>` 헤더.
- 제품 sysroot에 포함된 Key Manager client 라이브러리. 정확한 경로/링커 인수는 제품 SDK 설정에서 확인.
- C++11 또는 그 이상.
- `samples.config.json`의 Writer Web package ID를 제품 앱 설정에 전달.

제품 빌드 시스템이 해당 헤더와 라이브러리를 찾게 설정한 뒤 기존 application target에 `secure_storage.cpp`와 `keymanager_demo.cpp`를 추가합니다. C++ 진입점에서 다음과 같이 호출할 수 있습니다. 값 저장은 Writer 웹앱이 담당하며 Native에는 저장 함수가 없습니다.

```cpp
#include "secure_storage.h"

// Writer의 set과 Native READ 부여가 모두 완료된 뒤 실행합니다.
km_run_keymanager_demo("KmWriter01", "tcstring", "sample_tcstring_value");
```

기존 앱의 설정을 사용하려면 `km_load_value(writerPackageId, "tcstring", value)`에 실제 Writer package ID를 전달합니다. 제품 SDK의 C++ 컴파일러와 sysroot를 사용할 때의 개별 파일 컴파일 형태는 다음과 같습니다. 변수에는 제공받은 SDK의 실제 경로를 지정해야 합니다.

```sh
mkdir -p build/native
"$PRODUCT_CXX" --sysroot="$PRODUCT_SYSROOT" -std=c++11 \
  -I native/inc -I "$CKMC_INCLUDE_DIR" \
  -c native/src/secure_storage.cpp -o build/native/secure_storage.o
```

생성한 object와 demo 소스를 제품 앱의 target에 연결하고 SDK가 지정한 KeyManager client 라이브러리로 링크합니다. 이 명령은 제품별 경로를 채우는 형태 예시이며 대상 SDK에서 실행한 결과는 아닙니다. 공개 TV용 Native 패키지나 공통 `.tpk` 빌드 절차는 제공하지 않습니다.

## API 계약

```cpp
int ckmc_alias_new(const char *owner_id,
                   const char *alias,
                   char **full_alias);
int ckmc_get_data(const char *alias,
                  const char *password,
                  ckmc_raw_buffer_s **ppdata);
```

owner는 `saveData`를 호출한 **Writer Web package ID**입니다. 기본 샘플 키 이름은 `tcstring`이고 항목별 비밀번호 인자는 `nullptr`입니다. 성공적으로 만든 `full_alias`는 `free()`로 해제하고 `ckmc_get_data()`가 돌려준 buffer는 `ckmc_buffer_free()`로 한 번 해제합니다. 버퍼를 NUL 종료 문자열로 간주하지 말고 `size` 바이트만 복사합니다.

`secure_storage.cpp`는 CKMC API 호출 값을 다루는 최소 경계 예제입니다. Native SDK headers나 CKMC runtime이 실제로 준비된 빌드 환경이 없으므로 코드 호환성을 TV 실기기로 검증한 상태는 아닙니다. API 모델 설명과 시그니처는 Tizen Native 공식 문서를 참고했습니다. [Key Manager types](https://docs.stg.tizen.org/application/native/api/mobile/4.0/group__CAPI__KEY__MANAGER__TYPES__MODULE.html), [Key Manager client](https://docs.stg.tizen.org/application/native/api/common/9.0/group__CAPI__KEY__MANAGER__CLIENT__MODULE.html)

## 순서와 보안 경계

Writer Web에서 항목 저장과 Native package `READ` 권한 부여가 둘 다 성공한 뒤 `km_run_keymanager_demo(writerPackageId, key, expectedValue)`를 호출합니다. 인자는 제품 설정에서 전달해 `samples.config.json`의 변경과 동기화합니다. Native의 ID는 실제 **package ID**이며 application ID/데몬 이름/UID를 임의로 대신 쓰지 않습니다. Native 공유를 원하지 않으면 `nativePackageId` 기본 빈 문자열을 유지합니다.

이 C++ 코드가 성공을 반환하더라도 대상 제품이 다른 Web package 데이터를 읽을 수 있다고 실측 확인한 것은 아닙니다. 실제 SDK, firmware, KeyManager 접근 제어 및 설치 경로에서 READ/deny/재실행 시나리오를 확인하세요. Native API 문서와 Web API 참조만으로 Samsung의 공개 TPK 배포가 가능하다는 결론을 내리지 않습니다.
