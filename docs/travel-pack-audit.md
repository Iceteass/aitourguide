# 여행팩 구조 및 레거시 자산 조사

> 아래는 이전 구조 조사 기록입니다. 이후 main `4ba094c` 기준 공통 자산 경로/manifest 및 최신 유지·보류 판단은 [공통 자산 계약](common-assets.md)을 참고하세요. 여행팩과 기존 레거시 파일은 보존됩니다.

조사 기준: 원격 `main`의 `2352adb267571088d78f869059b49dfd32fcd4f9` (명칭 변경 PR 병합 후). 앱 표시 버전 v1.2.2, 공개 팩 `jp-kyoto-fushimi-inari`의 `pack_version` 1.2.0, JSON `schema_version` 1.0.0. 아래 수량은 문서 개선 전 기준이다.

## 현황과 권장 구조

현재 구조가 이미 표준에 맞으므로 경로를 유지한다. 신규 국가·도시·여행지는 실제 콘텐츠를 준비할 때만 추가한다. 가상 팩·빈 폴더는 만들지 않는다.

```text
index.html                    # 진입점, 기본 지도·해설·사진·TTS 함수
app/v12.js, app/v12.css        # 국가/도시/여행지 및 팩 연동
audio-player.js              # 공통 MP3/TTS 제어 (실제 위치는 루트)
manifest.webmanifest, sw.js    # 공통 PWA
assets/                       # 공통 배경 및 안내 문서
data/catalog.json             # 공개 등록 목록
authoring/                    # 제작 안내 및 검증기; 자동 생성기 없음
tests/, .github/workflows/    # 회귀 검사 및 CI
travel-packs/
  JP/
    kyoto/
      fushimi-inari/
        pack.json
        cover.jpg
        LICENSES.md
        route/
          points.json
          route-map.jpg
        spots/
          01-odotorii/         # 같은 구조로 총 7개 장소
            poi.json
            narration.md
            images/main.jpg
            audio/ko-N1.mp3
```

| 범위 | 추적 파일 수 | 현황 |
|---|---:|---|
| 루트 | 19 | 공통 진입점, PWA, 원본 음성·이미지, v1.1, README, `.nojekyll` |
| `app/` | 2 | 현재 공통 UI·팩 로더 |
| `assets/` | 7 | 배경 4개, SVG 대체 배경 2개, 업로드 안내 1개 |
| `data/` | 1 | catalog 하나; 등록된 팩 하나 |
| `travel-packs/` | 33 | pack·표지·라이선스·route 2개·spot 7×4개; `files`에는 31개 자산 |
| `authoring/` | 2 | 안내 및 검증기 |
| `tests/` | 3 | 의존성 설치 없이 실행되는 Node.js 검사 |
| `.github/workflows/` | 2 | Node.js 22 회귀·팩 검증 |
| 합계 | 69 | 별도 package manifest, 빌드 도구, 자동 제작기 없음 |

## 분류 및 파일별 처리

A는 현재 실행 경로의 파일, B는 이전 버전 호환·보존 파일, C는 팩 내부로 이동 가능한 파일, D는 중복 검증 대상, E는 참조 없는 제거 후보이다. 분류는 중첩될 수 있다. 테스트·제작·라이선스·배포·문서는 런타임 자산과 구별하여 **운영 지원**으로 표시한다. 이번 작업에서는 모두 유지한다. 아래 패턴 행은 해당하는 파일 전부에 적용한다.

| 파일·패턴 | 분류 | 참조·유지 근거 |
|---|---|---|
| `index.html` | A | 실제 HTML 진입점. 지도·해설 DOM, TTS 및 사진 IndexedDB 함수도 포함 |
| `app/v12.js`, `app/v12.css` | A | HTML이 직접 로드. catalog 필터·팩 로드·저장·삭제·플레이어 UI |
| `audio-player.js` | A/B | HTML이 직접 로드. 팩 캐시 MP3 선택·오류 시 TTS, 이전 오디오 캐시/다운로드 제어도 남음 |
| `manifest.webmanifest` | A | 상대 `id`·`start_url`·`scope`, 공통 아이콘 |
| `sw.js` | A/B | HTML에서 상대 경로 등록. 앱 셸 및 완성 팩 캐시 응답 |
| `icon-192.png`, `icon-512.png` | A | manifest 및 셸; 192 아이콘은 HTML에서도 참조 |
| `assets/road_green_drive.jpg`, `assets/japan_kyoto_sunset.webp` | A | CSS 배경 및 필수 셸 캐시 |
| `assets/road-fallback.svg`, `assets/japan-fallback.svg` | A | CSS 대체 배경 및 필수 셸 캐시 |
| `assets/splash_bg_road_coast_v121.webp` | A/D | 현재 CSS 우선 배경, SW 선택 자산. 아래 업로드 원본과 SHA-256 동일 |
| `assets/history_journey_splash_road_v121.webp` | D, 운영 지원 | 런타임 참조 없음. 업로드 안내가 원본으로 명시하므로 E로 단정하지 않음 |
| `route-map.jpg` | A/B/D | HTML 초기 지도와 이미지 오류 대체 경로, v1.1 다운로드에서 직접 참조 |
| `romon-preview.jpg` | A/B/D | v1.2 catalog 표지 미지정 시 대체 경로, v1.1 카드·다운로드 참조 |
| `audio_01_odotorii.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/01-odotorii/audio/ko-N1.mp3`와 동일 |
| `audio_02_romon.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/02-romon/audio/ko-N1.mp3`와 동일 |
| `audio_03_honden.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/03-honden/audio/ko-N1.mp3`와 동일 |
| `audio_04_senbon_torii.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/04-senbon-torii/audio/ko-N1.mp3`와 동일 |
| `audio_05_okusha.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/05-okusha/audio/ko-N1.mp3`와 동일 |
| `audio_06_omokaruishi.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/06-omokaruishi/audio/ko-N1.mp3`와 동일 |
| `audio_07_return_path.mp3` | B/D | v1.1 `TRACKS`; 팩 `spots/07-return-path/audio/ko-N1.mp3`와 동일 |
| `journey-v11.js`, `journey-v11.css` | B; 후속 E 검토 후보 | 현재 HTML·SW·테스트에서 로드하지 않음. 이전 UI 파일 보존과 현재 활성 호환 코드를 구분; 삭제 안전성은 미확정 |
| `data/catalog.json` | A | 앱 기준 pack·cover URL 및 국가·도시 선택의 유일한 공개 목록 |
| `travel-packs/JP/kyoto/fushimi-inari/pack.json` | A | ID·버전·지도·spot·자산 목록. 자체 파일은 다운로드 코드가 별도로 캐시 |
| 같은 팩의 `route/points.json` | A | `poi_id`별 정규화 좌표, `files` 및 다운로드 경로 |
| 같은 팩의 `route/route-map.jpg` | A/D | 동적 지도. 루트 지도 및 6개 spot 이미지와 동일 |
| 같은 팩의 `cover.jpg` | A/D | catalog 카드·pack 표지. 루트 누문 사진 및 spot 02 이미지와 동일 |
| 같은 팩의 `spots/*/poi.json` (7개) | A | spot ID·원고·이미지·음성 상대경로. `audio.original_name`은 기록용이며 fetch하지 않음 |
| 같은 팩의 `spots/*/narration.md` (7개) | A | 팩 로더가 직접 fetch; 화면 원고 및 TTS 입력 |
| 같은 팩의 `spots/*/images/main.jpg` (7개) | A/D | spot 02는 누문 사진, 나머지 6개는 지도 일러스트 대체 이미지. 오프라인 경로로 유지 |
| 같은 팩의 `spots/*/audio/ko-N1.mp3` (7개) | A/D | 현재 MP3의 실제 경로. 루트 MP3 7개와 각각 동일 |
| 같은 팩의 `LICENSES.md` | 운영 지원 | 콘텐츠 출처·라이선스. 검증기가 존재 확인, 현재 `files`에는 미포함 |
| `authoring/README.md`, `authoring/validators/validate_pack.mjs` | 운영 지원 | 수동 제작 계약과 구조·크기·해시 검증 |
| `tests/validate_v121.mjs`, `tests/validate_mp3_runtime.mjs`, `tests/validate_narration_sync.mjs` | 운영 지원 | 문법·UI 계약, 캐시 MP3/TTS 전환, 원고 동기화 검사 |
| `.github/workflows/v121-ux.yml`, `.github/workflows/validate-travel-packs.yml` | 운영 지원 | 현재 팩의 고정 경로와 기존 테스트 실행 |
| `.nojekyll` | 운영 지원 | 정적 Pages 배포 지원 |
| `README.md`, `assets/UPLOAD_SPLASH_v121.md` | 운영 지원 | 실행·제작·업로드 안내 |

**C:** 이번 작업에서 추가로 이동할 파일 없음. 여행팩 자산은 이미 팩 안에 있으며 공통 배경은 여행지 콘텐츠가 아니다. **E:** 무조건 제거해도 안전하다고 확인된 파일 없음. 참조가 없다는 사실만으로 예전 설치나 외부 직접 링크까지 안전하다고 판단하지 않는다.

## 실행·경로·저장 계약

- HTML은 inline 공통 함수 → `audio-player.js` → SW 등록 → `app/v12.js` 순으로 실행한다. `journey-v11.js`·CSS를 로드하지 않는다. v1.1 파일을 새로 로드해 확인하는 것은 현재 앱 검증과 다르다.
- catalog의 `published`에서 국가·도시를 필터링하고 `path`를 `new URL(path, document.baseURI)`로 해석한다. catalog의 `cover`도 앱 기준이다. 별도 국가·도시 인덱스는 필요 없다. catalog와 pack의 최소 메타데이터 중복은 현재 목록 표시 계약이므로 제거하지 않는다.
- pack의 `cover`, `route.*`, `spots[].dir`, `spots[].meta`, `files[].path`는 팩 기준이다. POI의 `narration`, `image.path`, `audio.path`는 spot 기준이다. `dir`와 `meta`의 부모 폴더가 같아야 로더와 검증기가 같은 파일을 본다.
- `syncLegacy()`가 팩 데이터를 공통 `data`·`photos`·`coords` 배열로 연결하고 지도·원고·음성 경로를 대체한다. 이름에 Legacy가 들어가도 현재 실행 코드다. 최초 HTML의 루트 지도와 오류 대체 이미지는 여전히 남아 있다.
- MP3 목록은 초기에는 빈 배열이며 팩 로드 후 `setTracks()`가 채운다. 현재 루트 MP3를 기본 재생하는 방식이 아니다. 완료 marker와 바이트 크기가 확인된 팩 캐시 음성을 우선하며 미저장·오류 시 TTS로 전환한다.
- SW 셸 이름은 `history-journey-v122-shell-20261022`, 여행팩 캐시는 `travel-v12-{pack_id}@{pack_version}`, 임시 캐시는 `travel-v12-pending-{pack_id}@{pack_version}`다. `__complete_v12`가 있는 완성 팩만 SW가 사용한다. MP3 range 요청도 처리한다.
- 다운로드는 pack JSON, 좌표 JSON, `files`를 가져와 검증 후 완료 marker를 저장한다. `files`의 상대경로·크기·해시를 바꾸면 기존 저장 확인에도 영향을 줄 수 있다. 동일 바이트라도 URL을 옮기는 작업은 별도 캐시 설계가 필요하다.
- 사진 DB `kyoto-guide-photos`의 `photos` store에 새 `pack_id:poi_id` 키와 이전 숫자 키가 공존한다. 후시미 이나리는 새 키가 없을 때 옛 사진을 읽는다. 음성·사진·v1.1 캐시 정리 코드와 `kyoto-*` 사용자 설정도 유지한다.
- `.github`의 두 workflow는 Node.js 22 및 현재 팩 경로를 사용한다. UX workflow는 모든 PR에 실행되지만 pack 전용 workflow는 지정 경로 변경 때만 실행된다. 새 팩도 자동 순회하지 않으므로 신규 팩 추가 시 CI 대상을 별도로 확인해야 한다.

## 중복 확인 및 문제점

SHA-256으로 비교한 결과 루트 MP3 7개(총 18,462,644 bytes)는 팩 음성과 각각 같다. 지도 해시 그룹은 루트·팩 route·6개 spot 이미지의 8개, 누문 사진 그룹은 루트·cover·spot 02의 3개, splash 그룹은 업로드 원본·실행 배경의 2개다. 팩 내 반복 이미지는 현재 독립 콘텐츠 계약의 일부이며 중복 제거를 이유로 경로·`files`를 변경하지 않는다.

현재 구조의 문제는 폴더 계층보다 보존 이유가 불명확한 루트 자산, 사용하지 않는 v1.1 파일, 자동 생성기·전체 팩 CI가 있다는 오해 가능성이다. 기존 README의 “별도로 참조” 문구는 실제 독립 사본 로딩과 구별하도록 수정한다. 검증기는 catalog와 pack의 전체 일치, `files`의 모든 필수 콘텐츠 포함, `spots[].dir`와 `meta` 부모 일치를 모두 보장하지 않으므로 수동 검사도 필요하다.

## 검증 범위

기존 `tests/*.mjs` 3개 전체, 여행팩 검증기, JSON·manifest 파싱, HTML/CSS/SW 및 catalog→pack→POI 자산 참조와 `files` 포함 관계, 루트 MP3의 v1.1 참조 및 사본 해시, Actions YAML과 실행 대상 경로를 검사한다. Node 검사는 모바일 브라우저의 실제 음성·기기 TTS·사진 이관 성공을 입증하지 않는다.

현재 구조에서는 `/aitourguide/` 하위 경로의 Chromium 선택·다운로드·지도 및 SW/오프라인 재진입도 확인한다. 여행팩 로딩은 비동기이므로 새 페이지에서 `window.kyotoAudio.tracks`가 팩 경로로 채워진 뒤 지도 진입을 검사한다. 완료 전 빠른 클릭 시 거절되는 기존 동작은 문서 정리로 수정하지 않는다. 실제 실행 결과와 원격 CI·배포 여부는 PR 설명에 기록한다.

## 승인 후 별도 PR로 검토할 작업

1. **v1.1 지원 종료 범위 확정:** 이전 설치·직접 링크·배포 보존 기간을 확인하고 v1.1 JS/CSS와 루트 MP3의 계약을 결정한다. 현재 HTML 안의 활성 사진/TTS 호환 코드를 함께 지우지 않는다.
2. **레거시 자산 정리 설계:** 구/신 클라이언트 및 기존 저장 캐시를 준비하여 재다운로드·지도·오디오·개인 사진 유지 시험을 만든다. URL 삭제/이동과 캐시/DB 마이그레이션은 사용자 승인 뒤 별도 구현한다. 루트 지도·누문 사진의 현재 fallback도 대체 검증해야 한다.
3. **업로드 원본 중복 검토:** splash 두 파일은 동일하지만 업로드 안내가 원본명을 사용한다. 원본 보존 위치와 외부 링크를 확인하고 안내·대체 업로드 절차를 준비한 뒤 삭제 여부를 정한다.
4. **새 팩 등록 검증 확대:** 실제 두 번째 팩을 추가할 때 catalog 기준 검증 대상 순회 및 메타데이터·필수 자산 누락 검증을 별도 개선한다. 이번에는 가상 팩·스키마·Actions를 변경하지 않는다.

이번 변경은 문서만 다룬다. 파일 이동·삭제, 런타임·JSON·캐시·DB·ID·버전·스키마 변경은 없다. 기존 설치 사용자의 저장 데이터에 영향을 주는 작업은 승인 대상 후속 PR로 남긴다.

## 이번 작업의 실행 결과

| 검사 | 결과 |
|---|---|
| `for file in tests/*.mjs; do node "$file"; done` | PASS, 기존 검사 3개 전부 실행 |
| `node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari` | PASS, 7개 spot·31개 자산 |
| `node --check` (루트 JS 2개, `app/v12.js`, `sw.js`) | PASS; HTML inline 스크립트는 기존 회귀 검사에서 구문 확인 |
| 별도 Python 조사 스크립트: JSON·manifest·HTML/CSS/SW·catalog/pack/POI·루트 음성 해시·문서 링크 | PASS, 누락 없음 |
| Actions YAML 파싱·Node 22 설정 및 모든 `run` 대상 경로 | PASS; workflow 파일은 변경하지 않음 |
| Chromium `/aitourguide/`: 국가→도시→여행지→다운로드→지도, SW scope 및 오프라인 재접속 | PASS, uncaught JavaScript error 없음 |
| Chromium 오프라인 상세 원고·이미지·캐시 MP3 기본 선택·100바이트 range 요청 | PASS, MP3 응답 HTTP 206 및 100바이트 확인 |
| HTTP 팩 자산 31개 크기·기록된 SHA-256 | PASS |
| 실제 음성 출력·모바일 TTS·잠금 화면·기존 설치 데이터 이관 | 미검증 |
| 원격 Actions 실행·GitHub Pages 실제 배포 | 미검증; GitHub API 조회는 Forbidden |

로컬 도구는 Node.js 24.19.0, Python 3.12.14 및 설치된 Chromium을 사용했다. CI 설정의 Node.js 22 실행과 모바일 실기기 성공을 주장하지 않는다. 브라우저·참조 검사용 임시 스크립트는 저장소에 추가하지 않았다.
