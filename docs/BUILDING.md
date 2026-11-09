# 빌드와 TV 설치

이 저장소에는 로컬 자동 빌드용 서명 없는 WGT 생성과 Samsung Tizen CLI를 사용한 인증서 서명 빌드가 있습니다. 두 출력은 용도가 다릅니다.

| 출력 | 명령 | 경로 | TV 설치 |
| --- | --- | --- | --- |
| 서명 없는 검토 ZIP | `npm run build` | `dist/unsigned/` | 불가 |
| TV SDK 서명 WGT | `npm run build:signed -- --profile PROFILE` | `dist/signed/` | 인증서와 TV 조건을 갖추면 설치 시험 가능 |

## 서명 없는 빌드

필요한 도구는 Node.js 18 이상과 Python 3.9 이상입니다. SDK·네트워크·인증서가 필요 없습니다.

```sh
npm test
npm run build
```

WGT는 ZIP 컨테이너입니다. 빌드 단계에서 app manifest, 웹 설정 배치, ZIP 무결성/CRC와 SHA-256 목록을 확인합니다. 이 확인은 Samsung SDK 빌드나 TV가 신뢰하는 서명을 생성하지 않습니다. 만들어진 파일을 `dist/unsigned/` 바깥에 서명본인 것처럼 배포하지 마세요.

## Samsung TV SDK 설치 및 서명

macOS 또는 Windows에 Samsung TV용 Tizen Studio와 Samsung TV extension/SDK를 설치하고 CLI가 제공되는지 확인합니다. Samsung의 공식 CLI 안내는 `tizen build-web`, `tizen package` 절차를 설명합니다. SDK/확장 이름과 요구 버전은 최신 설치 자료를 기준으로 확인하세요. Linux CLI는 자동 WGT 빌드에 쓸 수 있지만 실제 Samsung TV 등록/인증서는 호스트와 TV 개발자 계정 요건을 따릅니다. [Samsung Tizen CLI](https://developer.samsung.com/smarttv/develop/getting-started/using-sdk/command-line-interface.html)

### 인증서 프로필

1. Samsung TV에서 개발자 모드를 켜고, 호스트 PC의 주소를 입력한 뒤 TV를 재시작합니다.
2. Tizen Studio Certificate Manager에서 Samsung → TV 유형을 선택합니다. 배포자 인증서의 대상 장치 목록에 연결된 TV의 DUID를 추가합니다. DUID는 연결 장치 목록에서 선택하거나 TV의 지원/삼성 문의 메뉴에서 확인합니다. [공식 인증서 생성 안내](https://developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk/creating-certificates.html)
3. 해당 인증서와 연결된 Security Profile 이름을 기록합니다. `author.p12`, 비밀번호 파일, 프로필 설정과 개인 키는 GitHub나 이 프로젝트에 커밋하지 않습니다.
4. SDK CLI가 인증서 프로필에 접근하는지 확인하고, 저장소 루트에서 다음 명령을 실행합니다.

```sh
npm run build:signed -- --profile YOUR_PROFILE
```

다른 `tizen` 실행 파일을 명시할 수 있습니다.

```sh
npm run build:signed -- --profile YOUR_PROFILE --tizen /path/to/tizen
```

위 자동 서명 명령은 직접 실행할 수 있는 CLI 파일을 사용합니다. Windows의 `tizen.bat`은 Tizen Studio 명령창이나 PowerShell에서 실행하세요. `npm run build`로 준비된 `build/web/writer`와 `build/web/reader` 디렉터리에서 각각 아래 명령을 실행하면 됩니다. CLI 경로와 프로필 이름은 설치한 환경에 맞춥니다.

```powershell
# 저장소 루트의 PowerShell
Push-Location build/web/writer
& 'C:\tizen-studio\tools\ide\bin\tizen.bat' package -t wgt -s YOUR_PROFILE -- .
Pop-Location
Push-Location build/web/reader
& 'C:\tizen-studio\tools\ide\bin\tizen.bat' package -t wgt -s YOUR_PROFILE -- .
Pop-Location
```

수동 패키징의 출력은 각 프로젝트 디렉터리에서 확인합니다. Windows에서는 Python 3.9 이상을 설치하고 `python3` 명령이 동작하는지도 확인하세요. 이 Windows 절차와 실제 SDK 서명은 이번 검증 환경에서 실행하지 않았습니다.

스크립트는 앱별 Web 프로젝트를 새로 staging하고 프로젝트 안에서 `tizen package -t wgt -s YOUR_PROFILE -- .`를 직접 실행합니다. Samsung CLI 예시는 `config.xml`과 웹 파일이 있는 디렉터리를 이 명령으로 패키징합니다. 새로 만들어진 각 WGT 안의 작성자와 배포자 서명 파일을 검사한 뒤 `dist/signed/`에 복사합니다. `dist/unsigned`를 재사용하거나 이전 출력으로 성공을 판단하지 않습니다. 설치용 WGT는 로컬에 보관하고 공개 CI 아티팩트에 업로드하지 마세요. [Samsung CLI 패키징 예제](https://developer.samsung.com/smarttv/develop/extension-libraries/webassembly/tizen-sockets-extension/building-curl-applications-using-cli-tools.html)

명령행의 `--profile`은 Tizen CLI profile 이름을 선택합니다. CLI가 프로필 이름을 찾지 못하면 Certificate Manager에서 TV certificate와 지정 프로필의 등록 상태를 먼저 확인하세요. Tizen Studio/TV SDK 빌드나 인증 프로필이 없는 환경에서는 서명 단계가 실패해야 정상입니다. 실패를 비서명 WGT로 대체해 설치 가능하다고 보고하지 마세요.

## TV 연결과 설치

동일한 네트워크에 연결한 뒤 다음을 실행합니다.

```sh
sdb connect TV_IP
sdb devices
tizen install -s SERIAL --name KmKeyWriter.wgt -- dist/signed
tizen install -s SERIAL --name KmKeyReader.wgt -- dist/signed
tizen run -s SERIAL -p KmWriter01.Writer
tizen run -s SERIAL -p KmReader01.Reader
```

설치 파일명이 다르게 생성됐다면 `dist/signed/` 안의 실제 WGT 이름을 쓰세요. TV가 이미 설치된 같은 앱 ID를 업데이트하는 절차와 처음 설치하는 절차는 다를 수 있습니다. 앱을 제거하거나 데이터를 초기화하기 전에 TV의 저장 상태에 주의하세요. 설치·실행 명령이 성공해도 KeyManager 공유나 실제 값 읽기가 확인된 것은 아닙니다. [빌드 안내](GUIDE.md#실기기-시험표)의 T03–T12를 TV에서 따로 확인합니다.

## 파일 결과와 공개

- `dist/unsigned/`: 공개 가능한 자동 검사 출력. `.gitignore` 처리.
- `dist/signed/`: 로컬 설치용, Git/CI 아티팩트에서 제외.
- SDK 인증서/키/프로필 파일: 비밀 자료이며 저장소에 넣지 않습니다.
- 공개 GitHub CI: Linux에서 `npm test`, unsigned WGT 생성, 두 WGT와 해시 목록을 보관합니다. Samsung SDK/인증서 서명·TV 설치는 하지 않습니다.
