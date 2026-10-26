# 후시미 이나리 완전 독립화·v1.1 정적 실행 종료

## 기준 및 결정

기준 main `c997f4039d01905bff904e8fa4dd97974ac6a2f2`, 앱 v1.2.4. 기존 Node 5개와 팩 검증은 PASS였다. 이번 사용자 지시에 따라 **v1.1 정적 실행 지원을 종료하고 루트 중복 자산을 실제 삭제**한다. 이전 조사 문서의 “호환성 때문에 보류” 결정을 이 문서가 대체한다. 런타임 경로·초기/fallback 코드 및 셸 내용이 달라져 앱은 v1.2.5로 갱신한다.

팩의 pack_id·poi_id·pack_version 1.2.0·schema_version 1.0.0, catalog 및 팩의 모든 파일 바이트는 유지한다. Creator·Publisher·신규 여행팩 등록·새 Validator는 범위 밖이다.

## 삭제 전후

```text
이전 루트                         현재 유일한 관리 위치
route-map.jpg                     travel-packs/JP/kyoto/fushimi-inari/route/route-map.jpg
romon-preview.jpg                 travel-packs/JP/kyoto/fushimi-inari/cover.jpg
                                  및 spots/02-romon/images/main.jpg
7개 audio_*.mp3                   spots/<spot>/audio/ko-N1.mp3 (같은 팩 내부)
journey-v11.js / journey-v11.css   삭제, 대체 정적 v1.1 진입점 없음
```

삭제 전 지도·사진·MP3 9개를 각각 팩 사본과 SHA-256 비교해 전부 일치했다. 미디어 중복 18,916,093 bytes와 레거시 JS/CSS 24,279 bytes, 총 18,940,372 bytes를 현재 트리에서 제거한다. Git 과거 이력은 버전 기록으로 남지만 호환 사본·리다이렉트·새 루트 복제본은 두지 않는다.

| 실제 삭제 파일 | 보존된 콘텐츠/근거 |
|---|---|
| `audio_01_odotorii.mp3` | `spots/01-odotorii/audio/ko-N1.mp3` |
| `audio_02_romon.mp3` | `spots/02-romon/audio/ko-N1.mp3` |
| `audio_03_honden.mp3` | `spots/03-honden/audio/ko-N1.mp3` |
| `audio_04_senbon_torii.mp3` | `spots/04-senbon-torii/audio/ko-N1.mp3` |
| `audio_05_okusha.mp3` | `spots/05-okusha/audio/ko-N1.mp3` |
| `audio_06_omokaruishi.mp3` | `spots/06-omokaruishi/audio/ko-N1.mp3` |
| `audio_07_return_path.mp3` | `spots/07-return-path/audio/ko-N1.mp3` |
| `route-map.jpg` | `route/route-map.jpg` |
| `romon-preview.jpg` | `cover.jpg`・spot 02 사진 |
| `journey-v11.js`, `journey-v11.css` | 현재 HTML/SW 미사용. 정적 실행 지원 종료 |

위 상대 팩 경로는 모두 `travel-packs/JP/kyoto/fushimi-inari/` 기준이다. 팩 안의 지도/참고 이미지 및 표지/누문 사진 사본은 기존 스키마와 독립 파일 목록을 유지하기 위해 그대로 둔다. 공통 `assets/` 배경 호환 사본은 여행지 자산이 아니므로 이번 삭제 대상이 아니다.

## 현재 앱의 경로 해석

- 초기 HTML 지도에는 공통 SVG만 표시한다. 선택한 팩을 정상 로드한 뒤 `pack.route.image`를 pack 기준으로 해석하여 실제 지도를 연결한다. 공통 JS/HTML에 후시미 이나리 디렉터리를 하드코딩하지 않는다.
- 카드 표지는 catalog.cover가 있으면 사용하고, 없거나 실패하면 로드된 pack.cover를 pack 기준으로 해석한다. 아직 팩 데이터가 없거나 두 이미지 모두 실패하면 공통 fallback을 쓴다. pack의 표지 파일명이 cover.jpg라고 가정하지 않는다.
- 사진은 POI의 로컬/원격 경로, 원고와 MP3는 spot 상대경로에서 읽는다. 로컬 사진까지 실패하면 공통 SVG를 표시한다. 초기 도움말·카운터에서도 고정 여행지명/스팟 목록에 의존하지 않는다.
- 공통 fallback은 콘텐츠 준비용 표시이며 다운로드 완료의 증거가 아니다. 미다운로드 팩은 오프라인 선택에서 진입을 거부한다. 기존 완료 marker·크기 검사·팩 캐시 계약은 유지한다.
- SW에는 이미 여행지 전용 루트 자산이 없었다. 별도 루트 URL 호환 캐시나 URL 변환을 추가하지 않는다. 새 앱 버전이 새 셸을 설치하고 구 셸만 정리한다.

## 지원 종료와 기존 사용자 영향

**종료:** v1.1 JS/CSS 직접 실행과 루트 여행지 미디어 직접 URL. 삭제된 11개 URL은 404가 되며 외부 직접 링크도 더 이상 지원하지 않는다. 오래 열린 화면이나 구 v1.1 정적 설치는 최신 앱으로 다시 열어야 한다. v1.1의 별도 오디오 캐시만 가진 상태를 현재 여행팩 다운로드 완료로 간주하거나 자동 이관하지 않는다. 필요한 경우 최신 앱에서 여행팩을 다운로드한다.

**유지:** 현재 앱의 IndexedDB `kyoto-guide-photos`와 photos store, 숫자 사진 키 fallback 및 `pack_id:poi_id` 키, 읽기/삭제 호환 함수, 사용자 음성·속도 설정, 현재 `travel-v12-*` 완료 팩, 기존 음성 캐시. 업데이트 시 이 저장소를 초기화하거나 다시 이름 붙이지 않는다. 사용자가 팩 삭제를 명시적으로 누르는 기존 동작은 별개다.

v1.2.3 및 v1.2.4 설치를 실제 소스로 구성하고 동일 origin/path에서 v1.2.5로 갱신해 캐시와 사진 blob의 해시·설정 보존을 검사한다. 기존 사진 숫자 키만 있을 때의 읽기, 새 키 우선 읽기, 명시적 삭제 시 두 키 제거도 실제 IndexedDB로 검사한다. 모든 과거 OS·설치 조합이나 v1.1 실행의 계속 지원을 보장하는 것은 아니다.

## 재검색 분류

`index.html`, `app/*.js/css`, `audio-player.js`, `sw.js`에서 삭제 자산 파일명은 **0건**이어야 한다. 이 영역의 후시미 이나리 디렉터리 문자열도 0건이다. 특수 pack_id 조건은 기존 후시미 이나리 개인 사진/캐시 호환을 위한 것이며 삭제하지 않는다.

문서 삭제 목록·이력에는 옛 파일명이 남는다. 팩 POI의 `audio.original_name` 7건은 출처 기록이며 fetch 경로가 아니다. 팩의 `route/route-map.jpg` 참조도 유효한 팩 내부 경로다. 테스트의 삭제 방지 목록은 의도적으로 옛 이름을 기록하지만 앱이 이 URL을 요청하지 않음을 별도로 관찰한다.

## 검증 명령

```sh
set -e
for file in tests/*.mjs; do node "$file"; done
for file in app/*.js audio-player.js sw.js; do node --check "$file"; done
node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari
python3 tests/browser_app_version.py --baseline-ref 4ba094c6113d655a925997184424bb07f25cd3d3
python3 tests/browser_app_version.py --baseline-ref c997f4039d01905bff904e8fa4dd97974ac6a2f2
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
git diff --check
```

`validate_pack_independence.mjs`는 삭제 파일 재도입, 런타임 옛 파일명 참조, 공통 코드의 고정 여행지 경로를 CI에서 실패시킨다. 기존 Validator는 수정하지 않는다. 브라우저 신규 검사는 삭제 URL 404·실제 요청 0건, 표지 메타데이터 해석, 7개 원고/사진, 사진 읽기/삭제 API, 이미지 누락 fallback, 빈 catalog, 미다운로드 팩의 오프라인 진입 차단을 확인한다. 기존 브라우저 검사는 실제 MP3 조작·팩 다운로드/삭제·오프라인과 업데이트 보존을 맡는다.

실제 iPhone/Android 음성·한국어 TTS·잠금 화면, 모든 과거 설치 조합, 원격 CI·Pages 배포 및 콘텐츠 권리 검수는 별도 미검증이다. 로컬 재생 상태를 실제 청취나 공식 배포 성공으로 보고하지 않는다.

## 이번 실행 결과

| 검사 | 결과 |
|---|---|
| 기준 Node 5개·기존 팩 검증 | PASS |
| 최종 Node 검사 6개·JS 문법 | PASS |
| 후시미 이나리 Validator | PASS, 7 spot·31 assets |
| 전체 JSON/manifest·Python 구문·HTML/CSS·문서·Actions 실행 경로 | PASS |
| catalog/POI/files 연결 및 baseline 팩·catalog·공통 이미지·PWA·플레이어·검증기 바이트 비교 | PASS, 변경 없음 |
| 루트 미디어 9개 삭제 전 SHA-256 비교 | PASS, 팩 사본과 전부 동일 |
| 현재 런타임 삭제 파일명/고정 여행지 디렉터리 전수 검색 | PASS, 0건 |
| 삭제된 11개 URL HTTP 검사 및 새 앱 요청 관찰 | PASS, 404 및 앱 요청 0건 |
| 실제 v1.2.3→v1.2.5, v1.2.4→v1.2.5 업데이트 | PASS, 셸 교체·팩/기존 캐시/사진 blob 해시/설정 보존 |
| 첫 화면·국가/도시/여행지·7핀 지도·7개 원고/사진 | PASS |
| 루트 없는 다운로드·삭제·오프라인 재진입, MP3 재생/일시정지/±5초/속도·미저장 TTS 선택 | PASS |
| 메타데이터 표지 해석, 표지/사진 누락 fallback, 빈 catalog, 미다운로드 팩 오프라인 차단 | PASS |
| 기존 사진 숫자 키 읽기·새 키 우선·읽기/삭제 API | PASS, 실제 IndexedDB |
| 독립 리뷰 및 diff check | PASS, actionable findings 없음 |
| 실기기 음성/TTS/잠금 화면·모든 과거 설치·권리 검수·원격 CI/Pages | 미검증 |

도구는 로컬 Node.js 24.19.0, Python 3.12.14, Chromium/Playwright다. CI의 Node.js 22 원격 실행 성공을 주장하지 않는다. 과거 문서·original_name 기록·삭제 방지 테스트 목록에 남은 파일명은 실행 참조와 구별한다. 현재 코드/테스트의 남은 FAIL은 없다.
