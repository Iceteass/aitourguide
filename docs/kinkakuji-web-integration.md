# 금각사 웹 통합 v1.3.0 / 승인된 공개 베타

지도 구현은 PR#9로 main `c37de03fffc809ff3891ee2c5915036bbefe6c2a`에 병합되어 있습니다. 앱은 v1.3.0을 유지합니다. 이번 `feat/publish-kinkakuji-beta` 브랜치는 사용자 공개 베타 승인에 따라 준비된 등록 패치를 적용한 후속 변경입니다. 이미지·원고·기존 후시미 이나리·앱 런타임을 변경하지 않습니다.

## 등록과 승인 상태

- catalog.published에 금각사1개, destinations에 목적지1개, 기본역사guide1개 추가.
- destination_id=jp-kyoto-kinkakuji, pack_id=jp-kyoto-kinkakuji-standard, guide_id=default, guide_type=history, storage_mode=legacy-pack, poi_count=8.
- pack.pack_version, catalog의 pack_version/guide_version 모두 **0.1.0-beta.1**. guide_version은 첫 베타 메타데이터 등록값이며 여행팩버전과 독립적인 개념입니다.
- pack.status=published, description에 공개베타/이미지·공간·권리검수미완료 명시. beta 표기는 가이드 행의 버전에도 표시됩니다.
- 공개 베타 등록 승인을 콘텐츠 고증·권리 승인으로 취급하지 않습니다. 각 POI의 visual_review/usage_status 및 LICENSES.md 원본의 검수·공개보류 기록은 그대로 보존했습니다. 원본 기록 이후 사용자가 미승인사항을 명시한 공개 베타를 승인한 것입니다.
- catalog의 default는 기존 전체팩을 여는 앱식별자입니다. Creator source guide_id=standard를 바꾸거나 원고를 복제하지 않습니다.
- 이전 승인대기 publication.patch는 이번에 적용해 제거했습니다. 다시 적용할 필요가 없습니다.

## 지도 동작

- route.pin_style=number-label인 금각사만 번호원/명칭캡슐 표시. 후시미 기존표시 유지.
- 번호는 pin_anchor(없으면x/y), 명칭은 label_anchor_candidate를 힌트로 사용하고 번호44px터치영역/다른캡슐과 겹치지 않게 배치. 지시선으로 번호와 명칭 연결.
- SVG 참고 동선은 route.path가 있을때만 로드하고 visibility=show 구간만 표시. omitted_connections는 양방향 우선제외. 금각사5구간 표시,2↔3/3↔4생략.
- SVG는 JPG와 분리하고 pointer-events:none. 경로숨김/표시 및 오류시지도/핀 유지. 실제길안내가 아닌 참고용임을 화면에 표시.
- 신규모듈은 오프라인셸에 포함. 기존CacheStorage namespace/완료marker/사진DB/설정 유지.

## 실제 검사

```sh
for file in tests/*.mjs; do node "$file" || exit; done
node authoring/validators/validate_all_packs.mjs
for file in app/*.js audio-player.js sw.js; do node --check "$file" || exit; done
python3 tests/browser_kinkakuji.py --screenshots
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
python3 tests/browser_guide_cards.py
python3 tests/browser_optional_audio.py
python3 tests/browser_app_version.py --baseline-ref 77b30edf5f75a5e614698a838c516e156494753a
git diff --check
```

PASS:
- Node9개, Validator후시미7spots/31assets·금각사8spots/29assets.
- 브라우저 금각사 검사는 **실제 data/catalog.json**을 읽고 진행합니다. --fixture-catalog 옵션을 쓸때만 fixture응답으로 대체합니다.
- 일본→교토→금각사→역사해설→지도8핀, SVG5구간/2구간생략, 모바일360/390/430 및 화면비율/줌 좌표.
- JPG10개/원고8편, MP3 0개8슬롯/TTS API경로, 캐시30파일SHA, 다운로드/오프라인재진입/삭제격리, 경로404/malformed복구.
- 후시미번호중복없음/MP3실제재생/플레이어±5초·속도/사진·설정보존/이미지fallback/취소재시도.
- 실제v1.2.7→v1.3.0셸업데이트 후 기존캐시body/사진old-new키/설정보존。
- 새목적지 등록으로 드러난 브라우저테스트1개카드 가정은 동적개수/후시미개별검증으로 수정. 한가이드비공개일때 다른목적지공개유지 및 모든가이드비공개일때목록숨김도 검사.

이환경한국어음성0개/실제합성synthesis-failed 관찰. TTS API호출을 실제발성성공으로 주장하지 않습니다. 실기기발성·잠금화면·native pinchgesture는NOT_RUN. 줌은Chromium emulation/geometry검사입니다.

## 게시 및 남은 항목

- 등록승인은 받았지만 원격브랜치/PR/병합/배포는 실제결과를별도확인해야 합니다.
- 현재로컬검사만으로공개웹배포완료라고판정하지 않습니다.
- 배포주소: https://iceteass.github.io/aitourguide/ . 병합후Pages배포성공, 실제8스팟흐름/필수자산404/콘솔오류 확인 필요.
- 이환경에서는 GitHub API/Pages접근이 Forbidden으로차단된 이력이 있습니다. 실제시도결과를사용자에게보고합니다.
- 스팟3육주송의금각인접관계, 스팟5잉어바위형상, 표지/AI이미지외관·권리·사찰정책, 지도/참고길실제공간정합성과CP5고증은 미완료 상태입니다.
- 기술좌표정합성/베타공개승인은 콘텐츠정확성이나법적권리승인을 뜻하지 않습니다.
