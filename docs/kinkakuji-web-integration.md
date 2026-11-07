# 금각사 웹 통합 v1.3.0 — 구현 및 게시 대기

기준 main: `77b30edf5f75a5e614698a838c516e156494753a` (v1.2.7, PR#8 병합).
작업 브랜치: `feat/kinkakuji-web-integration`.

## 구현

- `app/map-overlay.js`: 정규화좌표 기반SVG 추천동선, 생략연결 우선차단(양방향), 경로toggle, 오류시 지도/핀 유지.
- `pack.route.pin_style="number-label"`인 팩만 번호원/명칭캡슐 표시. 금각사에서만 opt-in. 기존 후시미이미지/핀/데이터는 변경하지 않음.
- 번호 위치는 `pin_anchor`(없으면x/y), 캡슐은 `label_anchor_candidate`를 힌트로 사용하되 번호44px 터치영역/다른캡슐과 겹치지 않도록 재배치. 이미지와 같은컨테이너에서 ResizeObserver로 계산. 명칭과번호의관계는얇은지시선으로표시하며 이SVG도pointer-events:none.
- route.path가 있을때만 fetch. visibility=show인 segments만 렌더링하며 omitted_connections에 있으면 제외. JPG자체에는 선/번호를 합성하지 않음.
- 추천동선은 현장안내/통행허가가 아닌 참고용임을 화면에 표시.
- 앱버전1.3.0, 오프라인셸에 신규모듈 포함. 기존 여행팩캐시이름/완료marker/사진DB/설정 보존.
- catalog테스트의 여행지1개 고정개수 제거; 실제공개catalog와 후시미+금각사 fixture 모두 검증.

## 공개승인 경계

현재 `data/catalog.json`은 **변경하지 않았음**. 금각사 pack은 **draft / 0.1.0-draft.1 유지**. 앱코드/테스트PR은 공개등록승인 자체를 뜻하지 않음.

`tests/fixtures/kinkakuji-catalog.json`은 실제8스팟팩의 로컬웹검증 응답용 fixture. 테스트서버만 응답을대체하며 서비스워커셸에는 fixture를등록하지 않음.

승인후 적용할 구체적 변경안은 `docs/kinkakuji-publication.patch`에 있음:

- 기존후시미등록 유지 + published금각사1개 + destination1개 + guide1개.
- destination_id jp-kyoto-kinkakuji, pack_id jp-kyoto-kinkakuji-standard, guide_id default, guide_type history, storage_mode legacy-pack, poi_count8.
- 카탈로그pack_version/guide_version 및 pack.pack_version을 **0.1.0-beta.1**로 명시. 가이드버전은 첫베타metadata의 별도등록값이며 자동동일시하는 일반규칙이 아님.
- pack.status published, description에 공개베타/이미지·공간·권리검수미완료 표시. 기존LICENSES/각POI의REVIEW_REQUIRED는 유지.
- catalog의 default는 기존단일전체팩을여는 앱식별자. Creator POI의 source guide_id=standard를변경하거나 원고를복제하지 않음.
- 태그(기타구/사찰/금각, 기본/역사)는 게시변경안의 검토대상. 공개승인시 이 metadata도 함께확정.
- 이패치는 **아직적용하지 않았음**. 사용자베타공개승인 후 적용/검증/별도커밋으로만 반영해야 함.

```sh
# 승인 후에만
# git apply docs/kinkakuji-publication.patch
```

## 실제 검사

```sh
for file in tests/*.mjs; do node "$file" || exit; done
node authoring/validators/validate_all_packs.mjs
for file in app/*.js audio-player.js sw.js authoring/validators/*.mjs; do node --check "$file" || exit; done
python3 tests/browser_kinkakuji.py --screenshots
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
python3 tests/browser_guide_cards.py
python3 tests/browser_optional_audio.py
python3 tests/browser_app_version.py --baseline-ref 77b30edf5f75a5e614698a838c516e156494753a
git apply --check docs/kinkakuji-publication.patch
git diff --check
```

PASS: Node9개, 후시미Validator7spots/31assets, 금각사8spots/29assets, JS/JSON/manifest검사.

Chromium PASS:
- 일본→교토→금각사→역사해설→지도→8개번호핀클릭.
- 360/390/430px 및 390×640 비율, CSSscale1.3/브라우저pagescale1.5에서 좌표정합성. 번호8개와명칭표시.
- SVG5구간, 2↔3/3↔4생략, 경로숨김/표시, malformed/404경로에서도핀/지도사용.
- JPG10개decode, 원고8편 원본일치, MP3없는8슬롯유지/TTS API선택, MP3요청0개.
- 다운로드30개원본파일캐시SHA 및 완료marker, offline재진입/8핀/원고/이미지/경로, 삭제시후시미캐시보존.
- 기존후시미번호중복없음/실제MP3재생/플레이어±5초/속도/취소·재시도/이미지fallback/사진·설정유지.
- 실제v1.2.7→v1.3.0셸업데이트 후 cached pack body·legacy캐시·사진old/new키·설정보존.

처음 모바일테스트에서 명칭5가 번호4를가리는문제를 실제클릭실패로재현해 캡슐충돌회피로수정했고 재검사PASS. 잘못된 추가metadata 1개도제거하여팩변경은 route.pin_style 하나뿐임을 구조비교확인.

TTS **API호출만PASS**, 이환경한국어음성0개/실제합성synthesis-failed. 실제발성은NOT_RUN이며 성공으로주장하지 않음. 실기기 iPhone/Android·잠금화면·native pinchgesture는NOT_RUN. 줌검사는Chromium emulation/geometry검사.

## 남은 승인/게시 차단

- 스팟3육주송의금각인접관계, 스팟5잉어바위형상, 표지/나머지AI이미지 외관·권리·사찰정책.
- 지도/핀/참고길의실제공간정합성 및CP5인수. 기술적좌표정합성과실측고증은다름.
- 베타공개여부사용자승인. 기존원본이미지/원고 재생성없음.
- PR생성/API접근, 병합및배포승인/권한, GitHub Actions/Pages결과확인은 실행후결과를별도보고.
- Pages배포주소예정: https://iceteass.github.io/aitourguide/ . 승인/병합/배포후 실제주소에서동일흐름과필수자산404/콘솔오류를검증해야하며 로컬PASS만으로최종완료아님.

스크린샷: `docs/screenshots/kinkakuji-map-{360-780,390-844,430-932,390-640}.png` (로컬fixture화면).
