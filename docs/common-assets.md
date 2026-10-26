# 공통 이미지 자산 계약과 호환성

## 이번 변경의 기준과 버전

기준 main `4ba094c6113d655a925997184424bb07f25cd3d3`의 앱 v1.2.3을 조사했다. 기준 Node 검사 4개·팩 검증·v1.2.2→v1.2.3 Chromium 업그레이드는 통과했다. 이번에는 이미지 경로와 로딩 동작이 바뀌므로 앱 버전을 **v1.2.4**로 올려 새 셸을 전달한다. 여행팩 v1.2.0 및 여행팩 스키마 1.0.0, manifest 앱 ID·scope·start URL은 유지한다.

## 변경 전·후

```text
변경 전                        변경 후 (기존 경로도 보존)
assets/                        assets/
  splash_bg_road_coast…webp       app/splash/splash_bg_road_coast_v121.webp
  road_green_drive.jpg           app/backgrounds/road_green_drive.jpg
  road-fallback.svg              app/fallbacks/road-fallback.svg
  japan-fallback.svg             app/fallbacks/japan-fallback.svg
  japan_kyoto_sunset.webp         countries/JP/images/japan_kyoto_sunset.webp
  history_journey_splash…webp     manifest.json
  UPLOAD_SPLASH_v121.md           기존 파일 전부 + 갱신한 업로드 안내
```

실제 이미지 바이트는 변경하지 않았다. 위 정리된 경로는 **새 정식 경로에 복사한 것**이며 기존 파일을 제거·이름 변경한 것이 아니다. 앱 아이콘은 루트에 둔다. 도시 전용 실물이 없으므로 빈 `cities/kyoto/images/`를 만들지 않았다. 도시 이미지가 준비되면 `assets/countries/{country_code}/cities/{city_id}/images/`를 사용한다. `japan_kyoto_sunset.webp`는 국가 테마이므로 JP 공통 이미지다.

현재 국가 선택 화면은 기존처럼 시작 배경을 쓰고, JP 선택 뒤 도시·여행지 선택 화면은 일본 국가 배경을 쓴다. 지도·장소 사진은 공통 자산이 아니라 여행팩의 파일이다.

## assets/manifest.json — 현재 구현

이 manifest는 공통 이미지용이며 `manifest.webmanifest` 및 여행팩 `pack.json.files`와 다르다. `schema_version: "1.0.0"`, `images` 배열을 가진다. 모든 `path`·`fallbacks`는 **assets/manifest.json 기준 상대경로**다. 절대 URL, 경로 이탈, 퍼센트 인코딩, query/fragment, 역슬래시는 허용하지 않는다.

| 필드 | 의미 |
|---|---|
| `id` | 유일한 소문자/숫자/하이픈 이미지 식별자 |
| `path` | 정식 파일 경로. app은 `app/`, country는 `countries/JP/images/`, city는 `countries/JP/cities/kyoto/images/` 형태 |
| `target` | `app` / `country` / `city` |
| `role` | `splash` / `background` / `fallback` |
| `country_code`, `city_id` | app은 둘 다 null, country는 국가 코드와 null, city는 국가 코드와 도시 ID |
| `season` | `all` / `spring` / `summer` / `autumn` / `winter`; 현재 선택은 `all`만 사용 |
| `tags` | 테마 설명 문자열 배열. 자동 추천·선택에는 사용하지 않음 |
| `enabled`, `default` | 활성 여부와 같은 범위 내 기본 우선순위 |
| `offline_required` | true면 SW 필수 설치 자산. 현재 SVG 대체 배경이 해당 |
| `fallbacks` | 주 이미지가 실패할 때 보이는 순서. splash→기존 도로 사진→SVG, 일본 배경→일본 SVG |
| `bytes`, `sha256` | 파일의 실제 바이트 수와 SHA-256. Node 자산 검사에서 검증 |
| `source.description`, `original_path`, `url`, `license`, `status` | 기존 원본 경로 및 출처·권리 확인 상태. 알 수 없는 권리는 `unverified`로 기록하며 허가를 추정하지 않음 |

현재 5개 이미지(splash, 도로 배경, 일본 배경, SVG 2개)가 등록돼 있다. 기존 업로드 원본·호환 사본·여행팩 이미지·루트 아이콘은 중복 항목으로 등록하지 않는다. 출처·라이선스는 아직 별도 검수되지 않았다.

### 결정적 선택

`app/assets.js`를 HTML과 SW가 공유한다. `JourneyAssets.validate`, `select`, `urls`, `offlineAssets`는 현재 구현 API다.

1. 시작/국가 선택: 활성 app/splash, season=all.
2. 도시/여행지 선택: 현재 city/background → country/background → app/background 순으로 찾는다.
3. 각 범위에서 enabled=true·season=all만 고려한다. default=true 우선, 동률이면 id의 ASCII 사전순을 사용한다. 배열 순서·현재 날짜·시간대·랜덤 값에 의존하지 않는다.
4. 선택된 파일과 fallback 목록을 CSS 배경의 앞→뒤 레이어로 배치한다. 로딩 실패·손상된 이미지 decode 실패 시 뒤의 대체 이미지가 보이며 화면 전환을 막지 않는다.

CSS에는 같은 디자인의 초기 기본 배경이 있다. manifest 로드는 첫 화면·catalog 로딩을 기다리게 하지 않고 완료 시 **현재 화면**에만 적용한다. fetch/파싱/스키마 오류면 CSS 기본 배경을 유지한다. manifest 지연 중 이동한 뒤 이전 화면 배경을 덮어쓰지 않는다. 모든 레이어는 기존 cover·position 설정을 사용한다.

### 오프라인 및 업데이트

SW는 네트워크에서 manifest를 검증하고 그 응답을 새 버전 셸에 저장한다. 공통 로더·버전 파일·SVG는 필수 캐시다. 활성 이미지와 fallback 목록의 bitmap은 가능한 경우 캐시하고 없거나 실패해도 설치를 막지 않는다. SVG와 manifest가 유효하면 사진이 없어도 오프라인 선택 화면을 표시할 수 있다. manifest/필수 자산 설치가 실패하면 이전 활성 셸이 유지된다.

현재 legacy 이미지 URL도 셸의 호환 목록에 유지한다. 옛 bitmap URL 역시 선택 캐시이므로 정식/옛 사진이 모두 실패해도 필수 SVG가 설치를 지원한다. 새 cache-first 셸은 앱 버전에 따라 교체하지만 여행팩/사진 DB/설정은 건드리지 않는다. 앱 셸 자산이나 기본 이미지 manifest를 변경해 배포할 때 버전 갱신을 검토한다. 이미 열린 구 탭은 새로고침 전 구 코드를 유지할 수 있다.

## 파일별 처리 판단

| 대상 | 판단 | 근거 및 후속 조건 |
|---|---|---|
| `assets/app/splash/splash_bg_road_coast_v121.webp` | 새 정식 위치 | 원본과 해시 동일, 현재 앱 manifest·CSS·SW 사용 |
| `assets/app/backgrounds/road_green_drive.jpg` | 새 정식 위치 | 일반 배경 및 splash 1차 fallback |
| `assets/app/fallbacks/road-fallback.svg`, `japan-fallback.svg` | 새 정식 위치 | offline 필수 대체 배경 |
| `assets/countries/JP/images/japan_kyoto_sunset.webp` | 새 정식 위치 | 일본 국가 테마. 도시명 포함 파일명은 사용 목적을 결정하지 않음 |
| `assets/splash_bg_road_coast_v121.webp` | 보류·호환 사본 유지 | v1.2.3 CSS/SW와 외부 업로드 경로를 위해 보존 |
| `assets/road_green_drive.jpg` | 보류·호환 사본 유지 | v1.2.3 및 v1.1 CSS, 기존 셸이 참조 |
| `assets/japan_kyoto_sunset.webp` | 보류·호환 사본 유지 | v1.2.3 및 v1.1 CSS, 기존 셸이 참조 |
| `assets/road-fallback.svg`, `assets/japan-fallback.svg` | 보류·호환 사본 유지 | v1.2.3/v1.1 CSS 및 기존 SW 참조 |
| `assets/history_journey_splash_road_v121.webp` | 보류 | 동일 splash 원본이지만 업로드 원본·외부 사용의 종료를 증명하지 못함 |
| `assets/UPLOAD_SPLASH_v121.md` | 유지·내용 갱신 | 문서 URL 보존. 이미 존재하는 파일을 미업로드 상태로 설명하던 문구 수정 |
| 루트 `route-map.jpg` | 유지 | 현재 HTML 초기 지도/오류 fallback 및 v1.1 참조 |
| 루트 `romon-preview.jpg` | 유지 | catalog cover 미지정 시 대체 이미지 및 v1.1 참조 |
| 루트 MP3 7개 (`audio_01_odotorii.mp3` ~ `audio_07_return_path.mp3`) | 보류·유지 | 팩 사본과 같지만 v1.1 TRACKS가 참조. 삭제 안전성을 입증하지 못함 |
| `journey-v11.js`, `journey-v11.css` | 보류·유지 | 현재 HTML은 로드하지 않으나 이전 설치/외부 직접 사용 종료 미확인 |
| `icon-192.png`, `icon-512.png`, `manifest.webmanifest` | 유지 | PWA 설치 ID·아이콘 URL 보존 |
| 후시미 이나리 전체 팩·catalog | 유지 | 기존 7 spot·31 자산·ID·버전·상대경로 보존 |

**삭제 파일: 없음. 물리적 이동/이름 변경: 없음.** 공통 자산의 정식 경로 전환은 사본을 통해 수행했다. 중복 저장량은 의도적인 호환 비용이며 원본 종료·구 설치/외부 URL 검증 후 별도 PR에서 정리할 수 있다. 기존 앱의 숫자 키 개인 사진 호환 코드와 TTS/MP3 로직도 그대로다.

## 검사 명령과 범위

```sh
set -e
for file in tests/*.mjs; do node "$file"; done
for file in app/*.js audio-player.js journey-v11.js sw.js; do node --check "$file"; done
node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari
python3 tests/browser_app_version.py --baseline-ref 4ba094c6113d655a925997184424bb07f25cd3d3
python3 tests/browser_assets.py
git diff --check
```

Python 브라우저 검사는 Playwright·Chromium 및 baseline commit이 로컬에 있어야 한다. Node 검사는 별도 패키지 설치가 필요 없다. Actions에는 공통 자산 Node 검사만 추가하며 전체 여행팩 CI/Creator/Publisher는 개발하지 않는다.

- `validate_assets.mjs`: 결정적 기본 선택·범위 fallback·season/disabled 처리·안전 경로·manifest 메타데이터 및 실제 크기/해시·호환 원본 일치·오프라인 목록.
- `validate_app_version.mjs`: 새 셸 설치·구 셸만 제거·사용자 캐시 보존·필수 자산 실패/잘못된 manifest 차단·optional bitmap 실패 허용.
- `browser_app_version.py`: 실제 v1.2.3→v1.2.4 설치 갱신, 팩/기존 캐시·옛/새 사진 키의 바이트 해시·설정 보존, 새 설치·오프라인 화면.
- `browser_assets.py`: 현재 배경·manifest 캐시, manifest 지연/404/잘못된 JSON, 필수 SVG만 있는 오프라인 배경 픽셀, 국가/도시/여행지, 지도/상세, 미저장 MP3의 TTS 선택, 실제 MP3 play/pause/±5초/속도, 팩 다운로드·삭제 및 개인 사진·다른 팩·설정 보존.

실기기 음성 출력·한국어 TTS·잠금 화면·콘텐츠 권리 검수·모든 과거 설치 조합은 별도 미검증이다. 브라우저의 디코딩/재생 상태 확인은 사람이 실제 소리를 들었다는 의미가 아니다. 원격 CI·Pages 배포 결과도 로컬 검증과 구분한다.

## 이번 실행 결과

| 검사 | 결과 |
|---|---|
| 기준 main Node 4개·기존 팩·기존 Chromium 버전 검사 | PASS |
| 최종 `tests/*.mjs` 5개 전체 | PASS |
| JS 문법·전체 JSON/manifest·Python 구문·문서 링크 | PASS |
| 기존 팩 검증기 | PASS, 후시미 이나리 7 spot·31 자산 |
| catalog/pack/POI 연결·필수 files 포함·크기/기록된 SHA-256·루트 음성 참조 | PASS |
| 기존 미디어 33개 및 팩/catalog/PWA manifest/레거시/플레이어/검증기와 baseline 비교 | PASS, 바이트 변경·삭제 없음 |
| 새 정식 이미지 5개와 원본 비교 | PASS, 해시 동일 |
| v1.2.3→v1.2.4 worker/새 셸 갱신 및 팩·옛 캐시·사진·설정 보존 | PASS |
| 첫 화면 시각 비교 | PASS, 버전 숫자를 숨긴 전/후 픽셀 동일 |
| 새 설치·선택·지도 7핀·상세·다운로드·삭제·오프라인 재진입 | PASS |
| 실제 브라우저 MP3 디코딩·재생/일시정지·±5초·1.5배속 | PASS (청취·실기기 출력 검증과 다름) |
| manifest 지연/404/불량 JSON·정식/옛 bitmap 모두 누락 시 설치 및 오프라인 SVG 픽셀 | PASS |
| Actions YAML·새 Node 명령·PR/main 관련 경로 트리거 | PASS, 원격 실행은 미검증 |
| 독립 리뷰 | 옛 bitmap이 필수 설치를 막던 1건을 수정하고 재검토 완료 |
| 실제 iPhone/Android 음성·TTS·잠금 화면·권리 검수·모든 과거 v1.1 설치 조합 | 미검증 |
| 실제 Pages 배포 | 미검증 |

도구: Node.js 24.19.0, Python 3.12.14, 설치된 Chromium/Playwright. CI 설정의 Node.js 22 및 원격 실행 성공을 로컬 결과로 대체하지 않는다. Creator/Publisher 통합 완료는 주장하지 않는다. 실행 중 발견한 설치 실패 조건은 새 회귀 검사로 재현한 뒤 수정했고 최종 검사에는 남은 FAIL이 없다.
