# 金閣寺·清水寺 v1.0.0 RC 통합 검수

## 상태

- 기준 main: `a0d4284e7d8fe7a11ec0075da1a24e26a1a42f23` / 기존 앱 v1.3.2.
- 보존 커밋: `a4f80fd57bef30021aabb88cf4e7137f23e1fd3e`. 브랜치 `feat/kyoto-kinkakuji-kiyomizu-v1-content`.
- 후보 앱 v1.3.3 / 두 팩·catalog·guide `1.0.0-rc.1`. schema_version·ID·스팟 순서 유지.
- `TECHNICAL_VERIFIED`: 아래 실제 로컬 검증 범위 PASS. 원고는 `CONTENT_EDIT_READY`(제공 후보 바이트 통합·편집 검토용), 16편 모두 `REVIEW_REQUIRED`. 완전한 사실 감수 또는 사용자 편집 승인을 뜻하지 않음.
- `RIGHTS_CLEARED`: REVIEW_REQUIRED. `CROP_PASS`, `LABEL_PASS`, `OFFLINE_CREDIT_PASS`: PASS.
- `RELEASE_READY`: 아직 부여하지 않음. 기존 운영 베타의 `BETA_PUBLISHED`는 유지. 신규 v1.0.0은 미게시.
- 테스트 catalog는 작업 브랜치에서만 RC 참조로 변경. pack.status=published는 기존 앱 catalog 계약을 위한 로컬 미리보기 값이며 운영 게시 실행을 뜻하지 않음.

## 적용 및 실패 원인

첨부 APPLY_NARRATION_RC_SAFE.py 기본 dry-run은 SHA 가드 통과, 35개 경로를 제시했다. --apply로 원고16·POI16·pack2·catalog1만 적용했다. JPG는 재적용하지 않았다.

재현된 오류만 추가 수정했다:

1. index.html 사진 처리의 `i===1` 누문 고정 안내가 서문에 누문이라고 표시했다. POI 표시명 기반으로 바꿨다.
2. 기존 cover 크롭이 고야스탑 상륜을 잘랐다. `poi_id=koyasuto`만 contain/상단 정렬. 다른 이미지 cover/중앙 정렬은 유지했다.
3. 출처 정보가 링크만 있고 오프라인 저작자·라이선스·가공 내역이 없었다. POI의 출처 메타데이터를 상세 사진 탭에 표시하고 URL을 이스케이프한다.
4. 기존 CSS가 모든 .credit를 숨겼다. #tab-photo #photo-credit에만 표시 override를 적용했다. 숨김 실패를 브라우저 회귀시험으로 재현한 뒤 visible 검사 PASS.

공통 셸 변경으로 APP_VERSION을1.3.3으로 증가했다. SW 파일 자체는 변경하지 않고 기존 단일 버전 소스의 셸 갱신을 사용한다. 기존 catalog fixture가 베타 버전에 고정돼 Node 검사가 실패해 RC 참조를 동기화했다. 청수사 브라우저 검사의 전 이미지 AI 가정과 캐시 버전 고정도 실제 데이터 기반으로 수정했다. 검사를 삭제하거나 오류를 무시하지 않았다.

## 보존·원고 비교

- 제공 최종 원고16편 SHA와 POI script_sha256 PASS. TTS TXT는 앱 자산으로 추가하지 않음. 원고 새 작성/재생성 없음.
- a4f80fd 대비 전체 JPG 바이트 불변, 지정5장 SHA 불변.
- 후시미 전체·모든 MP3·route-map/points/path 포함 보호 파일39개 바이트 불변.
- [16편 이전/이후 SHA](docs/kyoto-v1-evidence/narration-hashes.json), [보존 증거](docs/kyoto-v1-evidence/preservation-and-narration.json).

## 이미지·권리

육주송 AI illustration 구분 유지. 나머지4사진은 이용자 제공 사본이며 원본 바이트 동일성을 주장하지 않는다. 첨부 PHOTO_ATTRIBUTION_READY.md의 저작자·라이선스 확인 기록을 승계하되 이번 실행의 Commons4페이지 접근은 모두 proxy403이었다. 제공 문서의 확인 주장과 독립 확인을 구분한다.

- 용문폭포: そらみみ / CC BY-SA4.0.
- 서문: Vitalie Ciubotaru / CC BY-SA3.0.
- 오토와·고야스탑: そらみみ / CC BY-SA3.0.
- 리사이즈/재인코딩 가능, 정확한 변형 이력 미확인. 오토와 얼굴 모자이크도 표시했다.
- LICENSES/POI 및 실제 오프라인 UI에 저작자·원본 URL·라이선스URL·가공·동일조건 의무를 기록했다. 권리 확정이나 저작자 보증으로 표현하지 않았다.

[권리 접근 로그](docs/kyoto-v1-evidence/rights-network.json). 공식 경내·원고·AI 건축의 완전 고증 및 사진 사용권의 최종 판단은 CONTENT_QA_PENDING/REVIEW_REQUIRED.

## 실제 테스트

| 명령 | 결과 |
|---|---|
| python3 APPLY_NARRATION_RC_SAFE.py --repo <checkout> | PASS dry-run SHA/35경로 |
| python3 APPLY_NARRATION_RC_SAFE.py --repo <checkout> --apply | PASS 안전 증분 |
| node authoring/validators/validate_all_packs.mjs | PASS 후시미7/31, 금각사8/29, 청수사8/29 |
| for f in tests/validate_*.mjs; do node "$f" || exit 1; done | PASS11개 |
| node --check app/*.js (각 파일), audio-player.js, sw.js | PASS |
| JSON 및 manifest 파싱 / git diff --check | PASS |
| python3 tests/browser_photo_credits.py | PASS4사진 실제 visible 오프라인 크레딧, 서문 안내, 고야스탑3폭 contain |
| python3 tests/browser_narration_release.py | PASS16편 온라인/오프라인 모든 문장 순서·ko-KR호출, 후시미캐시MP3 재생·일시정지·±5초·1.5x |
| python3 tests/browser_kiyomizudera.py | PASS3폭/8핀/3표시4생략/8원고10이미지/다운로드·오프라인·삭제·재다운로드/기존2팩·사진·설정 보존 |
| python3 tests/browser_kinkakuji.py | PASS8핀/5표시2생략/3폭·줌/8원고10이미지/TTS호출/캐시SHA·삭제/후시미보존/잘못된경로 폴백 |
| python3 tests/browser_tts_state.py | PASS 현재스팟·구콜백격리·문장±1/처음부터·일시정지전환 |
| python3 tests/browser_app_version.py --baseline-ref a0d4284e7d8fe7a11ec0075da1a24e26a1a42f23 | PASS 실제1.3.2→1.3.3업데이트, 캐시바이트·구/신사진키·설정 보존, 오프라인버전/신규설치 |

TTS 전체 문장 시험은 제어된 SpeechSynthesis 콜백 검사다. native headless에서는 synthesis-failed가 발생하며 실제 발성 PASS가 아니다. 사용자의 기존 TTS 청취 확인은 유지하지만 새16편 전체 발성·일본어 고유명사 발음·실기기 청취는 NOT_RUN이다.

## 화면 증거

docs/kyoto-v1-evidence/*-credit-{360,390,430}.png: 각4실사진 상세·오프라인 출처 화면12개. 고야스탑은 상륜 전체가 프레임 안에 들어온다. 다른 가로 사진은 기존 cover 크롭 유지. 스팟 카드에는 cover 이미지를 사용하므로 고야스탑 전용 main.jpg 크롭과 무관하다.

## 변경 경로

- `app/v12.css`
- `app/v12.js`
- `app/version.js`
- `data/catalog.json`
- `index.html`
- `tests/browser_kiyomizudera.py`
- `tests/fixtures/kinkakuji-catalog.json`
- `tests/validate_image_attribution.mjs`
- `travel-packs/JP/kyoto/kinkakuji-standard/LICENSES.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/pack.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/01-kyokochi/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/01-kyokochi/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/02-shariden-kinkaku/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/02-shariden-kinkaku/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/03-rikushunomatsu/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/03-rikushunomatsu/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/04-gingasen-gankasui/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/04-gingasen-gankasui/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/05-ryumontaki-kinkakujigaki/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/05-ryumontaki-kinkakujigaki/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/06-anmintaku-hakujanotsuka/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/06-anmintaku-hakujanotsuka/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/07-sekkatei/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/07-sekkatei/poi.json`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/08-fudodo/narration.md`
- `travel-packs/JP/kyoto/kinkakuji-standard/spots/08-fudodo/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/LICENSES.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/pack.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/01-niomon/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/01-niomon/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/02-saimon/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/02-saimon/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/03-zuigudo/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/03-zuigudo/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/04-sanjunoto/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/04-sanjunoto/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/05-hondo/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/05-hondo/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/06-okunoin/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/06-okunoin/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/07-otowa/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/07-otowa/poi.json`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/08-koyasuto/narration.md`
- `travel-packs/JP/kyoto/kiyomizudera-standard/spots/08-koyasuto/poi.json`
- `tests/browser_photo_credits.py`
- `tests/browser_narration_release.py`
- `RELEASE_REVIEW.md`
- `docs/kyoto-v1-evidence/ (logs, hashes, screenshots)`

## PR·CI·배포 준비와 다음 단계

현재 후보는 RC 검토 커밋으로 보존한다. 필수 권리/편집 검수가 끝나지 않아 정식1.0.0 PR 생성 조건을 충족했다고 보고하지 않는다. PR 초안 설명은 별도 PR_DRAFT.md에 준비. 원격 push/PR/CI 실행/main병합/Tag/Release/Pages 배포는 미실행. 실제 배포 접속·새 원고 실기기 발성 NOT_RUN.

최종 출시 전: 제공 출처 기록의 권리 검토 및 원고16편 사용자 검수 → 정확한 승인 범위 확정 → 두 pack_version 및 published[]/guides[].pack_version/guide_version과 테스트fixture를1.0.0으로 동기화 → Validator/영향 회귀 → PR/CI → 사용자 최종 게시 승인 후 병합 → Pages 성공 SHA 확인 → 실제 https://iceteass.github.io/aitourguide/ 에서3팩 선택·8스팟·필수자산/콘솔·TTS/오프라인 확인. 실패 시 미완료로 유지하고 승인된 이전 배포로 복구 검토. 기존 이미배포베타를 재등록하거나 임의재배포하지 않는다.
