# 앱·여행팩 버전 관리

## 단일 앱 버전 소스

`app/version.js`의 `self.APP_VERSION`만 런타임 앱 버전을 정의한다. 앱은 이 값으로 첫 화면의 `App vX.Y.Z`와 문서 제목을 표시하고, 서비스 워커는 `history-journey-v12-shell-{APP_VERSION}` 셸 캐시를 만든다. HTML은 앱보다 먼저 이 파일을 읽으며 SW는 같은 파일을 import하고 오프라인 셸에 저장한다. 별도 버전 JSON, HTML 고정 버전, 팩 버전에서 앱 버전을 추론하지 않는다.

이번 UI 변경은 v1.2.2→v1.2.3이다. 문서의 이전 버전 설명은 이력이며 버전 원본이 아니다. `manifest.webmanifest`의 앱 ID·scope·start_url과 여행팩 ID·경로·버전은 그대로다.

| 구분 | 역할 | 변경 기준 |
|---|---|---|
| 앱 버전 | 사용자 화면·공통 앱 셸의 배포 버전 | 앱 UI/동작 변경에 맞게 증가. 호환 수정은 patch, 새 호환 기능은 minor, 비호환 변경은 별도 설계 후 major 검토 |
| `pack_version` | 여행지 콘텐츠와 해당 오프라인 캐시 버전 | 실제 팩 콘텐츠 변경 시 해당 팩만 증가 |
| `schema_version` | JSON 데이터 계약 버전 | 스키마 변경과 구 로더 호환성 검토 후 변경 |
| Commit | 모든 코드·문서·테스트 변경 기록 | 작은 논리 단위, 검증 결과와 함께 기록 |
| PR | 변경 검토 및 main 반영 단위 | 통합 계획의 각 단계마다 별도 PR |
| Tag | 검증된 공식 앱 배포 commit의 고정 이름 | 해당 버전이 main에 병합되고 검증된 뒤 `vX.Y.Z` 검토 |
| Release | Tag 기준 변경·제한·배포 자료 안내 | 승인 후 발행. Tag/Release 생성만으로 Pages 배포 성공을 의미하지 않음 |

도구·문서·검증기·CI만 바꿨다면 앱 버전을 임의로 올리지 않는다. 셸에 포함된 코드·문구·자산을 바꾸는 경우에는 기존 cache-first 설치에 변경을 전달할 셸 갱신도 검토한다. 같은 앱 버전의 셸 내용을 조용히 덮어쓰지 않는다.

## 변경·검증·공식 배포 절차

1. 최신 main과 깨끗한 작업 트리를 확인하고 작업 브랜치를 만든다. `app/version.js`를 의도한 다음 버전으로 갱신한다.
2. 앱 버전 변경과 관련 테스트·문서만 수정하고 팩·스키마 버전은 무관하게 올리지 않는다.
3. 저장소 루트에서 아래 명령을 실행한다.

   ```sh
   set -e
   for file in tests/*.mjs; do node "$file"; done
   for file in app/*.js audio-player.js journey-v11.js sw.js; do node --check "$file"; done
   node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari
   git diff --check
   ```

4. Python Playwright와 Chromium이 설치된 환경에서 실제 이전 설치→업데이트 및 오프라인 시험을 수행한다. 아래 baseline commit이 로컬에 있어야 한다. shallow checkout이면 해당 commit을 먼저 정상 Git 인증 경로로 가져온다. 이 시험은 임시 디렉터리에 이전 소스를 추출해 같은 로컬 origin/경로에서 새 버전으로 전환하며 사용자 저장소 파일은 수정하지 않는다.

   ```sh
   python3 tests/browser_app_version.py --baseline-ref e4c4f188fc3e827b35015f798892ef16f14a665e
   ```

   Chromium 위치가 다르면 `--chromium /path/to/chromium`을 지정한다. Node CI 검사와 이 브라우저 검사는 별개이며 브라우저 의존성이 없으면 미검증으로 보고한다.
5. 별도 commit/push/PR을 만들고 변경 파일·검증 결과·미검증 사항을 기록한다. API 접근 불가 시 웹 PR 생성 링크를 제공한다.
6. 사용자가 PR을 검토·병합한 뒤 최신 main의 commit·버전·CI 결과를 다시 확인하고 Pages 배포·실기기 확인을 별도로 진행한다.
7. 검증된 main commit에 대한 Tag/Release를 사용자 승인 후 생성한다. 작업 브랜치나 미병합 PR을 공식 Release로 발행하지 않는다. 이후 다음 단계는 최신 main에서 시작한다.

## 기존 설치 및 오프라인

새 SW는 버전 파일과 모든 필수 셸 자산 설치가 성공한 뒤 활성화되고, 이전 `history-journey-v12*` 셸만 정리한다. 설치 실패 시 기존 활성 셸은 유지한다. 여행팩 `travel-v12-*`, 예전 음성 캐시, 사진 IndexedDB, 사용자 설정을 버전 표시 변경으로 초기화하지 않는다. SW 등록의 `updateViaCache: 'none'`은 worker와 import한 버전 파일의 HTTP 캐시가 버전 확인을 지연하지 않게 한다.

이미 열린 탭은 갱신 전 UI를 계속 표시할 수 있다. 새 worker 설치 후 앱을 새로 열거나 새로고침하여 새 화면을 확인한다. 네트워크가 끊겨 업데이트를 받지 못한 기존 설치는 설치된 이전 버전을 계속 사용한다. 새 버전을 받기 전 오프라인 상태에서 새 버전 표시를 강제하지 않는다.

PR 1 브라우저 검사는 실제 v1.2.2의 다운로드 팩 바이트·기존 캐시·숫자/새 키 개인 사진·음성/속도 설정을 저장하고 갱신 후 보존을 비교한다. 오프라인 버전·터치·키보드 진입·지도·원고·이미지·MP3 선택/range 및 새 설치도 검사한다. 실제 음성 출력, 모바일 TTS, 잠금 화면, 실제 사용자의 모든 과거 설치 조합은 별도 미검증이다. 콘텐츠 사실·권리 검수는 자동 검사의 범위가 아니다.
