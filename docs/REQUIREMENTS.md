# 범위와 수용 기준

## 요청 범위

- 서로 다른 Web package ID를 사용하는 Tizen Web 샘플 앱 두 개.
- Writer는 새 문자열 항목 저장, 동일 앱 읽기, 별도 Reader 또는 설정된 제품 Native package에 `READ`/`NONE` 권한 설정을 수행.
- Reader는 Writer package가 소유한 항목을 명시적 owner-qualified 조회로 읽기.
- 저장 키는 `tcstring`, 공개 시험값은 `sample_tcstring_value`다. set은 Writer 웹앱이 수행하고 Reader 웹앱과 C++ Native 예제는 get만 수행한다.
- 기존 Native 코드의 C++ 읽기 통합 예제를 두 Web 앱과 분리해 제공.
- 자동 unsigned WGT 빌드와 서명 가능한 Tizen CLI 절차, 공개 사용 가이드 포함.

## 기대 조건

1. Web apps가 독립 package/app ID, Tizen 3.0 minimum과 Samsung TV profile로 구성된다.
2. 화면/API 부재 또는 읽기/권한 실패를 감추지 않으며 저장 문자열을 로그에 출력하지 않는다.
3. 기존 key를 같은 값 또는 새 값으로 덮어쓰지 않는다. ACL만 실패하면 ACL만 재시도한다.
4. WGT build는 XML, 엔트리 목록, CRC와 package ID를 검사하고 두 파일 및 해시를 출력한다.
5. unsigned package와 인증서로 서명한 설치 후보를 출력 위치와 문서에서 구분한다.
6. Native 코드는 owner package ID 조회, 입력 검사, 버퍼 해제와 비밀값 로그 제한을 구현한다.
7. README/상세 가이드는 KeyManager 문서 간 지원 상충과 Native TV 지원 범위를 설명한다.
8. 빌드와 테스트 결과는 기기 테스트 완료와 혼동되지 않는다.

## 환경 제약과 미해결 확인

- 삼성 일반 공개 TV 앱 경로는 Web WGT입니다. 공개 FAQ는 Native TPK 설치를 지원하지 않는다고 명시합니다. Native는 제품용 SDK/런타임이 별도로 제공될 때 통합할 참고 코드입니다.
- 공식 KeyManager API 레퍼런스와 Seller Office 출시 점검의 제공 여부 안내는 문맥이 서로 다릅니다. 해당 TV 모델·firmware에서 API와 ACL을 시험해야 합니다.
- 로컬 작성 시 Tizen Studio CLI와 TV certificate가 확인되지 않았습니다. 실제 CLI compile, WGT signing, device installation, Web/Web 및 Web/Native 교차 읽기는 검증 대기입니다.
- Web API가 런타임에서 활성화되지 않는 경우 평문 저장소로 fallback하지 않습니다.
