# 청수사 0.1.0-beta.1 공개 베타 등록

## 기준과 승인 범위

main `df29e027e52727eaf53b5ccba5865d096a9f3759`의 앱v1.3.1을 기준으로 원본30개를 통합 검증한 `e418cade5cb038f3f71ec14779ae814e494ab087`에서 이어 작업했습니다. 사용자가 청수사0.1.0-beta.1 공개 베타 등록 및 검사통과후PR병합/Pages확인을 명시 승인했습니다. 콘텐츠 고증·권리 승인은 별개입니다.

- pack.status=published, pack_version/catalog.pack_version/guide_version=0.1.0-beta.1.
- destination_id=jp-kyoto-kiyomizudera, pack_id=jp-kyoto-kiyomizudera-standard, guide_id=default, guide_type=history, storage_mode=legacy-pack,8스팟.
- default는 앱의 기존 전체팩 가이드핸들입니다. Creator원본의guide_id=standard 및metadata는그대로이며 원고를복제하지않습니다.
- 공개베타의한계는 pack.description, content_qa_status=CONTENT_QA_PENDING, LICENSES.md, 가이드행의AI재구성/검수중태그 및베타버전에 명시합니다.
- 콘텐츠변경은없음. 이미지10개/원고8편/지도·좌표·동선/POI ID·순서/MP3미생성metadata를원본과대조했습니다. LICENSES의게시승인설명추가에따른files[]bytes/SHA만갱신합니다.
- 이미지디자인승인은첨부기록의범위로인계하고 원고·AI외형·위치·동선·공개이용권리·사찰정책검수는CONTENT_QA_PENDING/REVIEW_REQUIRED유지. 서문·인왕문형상혼동과07·08저해상도보간한계를숨기지않습니다.

## 실제 재현된 공통앱 표시 오류

게시검사에서 AI이미지가Wikimedia사진으로표시되고, 두번째스팟이팩과관계없이누문사진으로표시되는문제를재현했습니다. 기존kind/asset_origin metadata를사용하여 AI/일반일러스트/개인사진을구분하도록출처문구만수정했습니다. 후시미의기존실사진표시는유지합니다.

또한MP3재생후TTS팩으로전환하면이전MP3길이(예:0:28)가남았습니다. TTS모드의전체길이는--:--로표시하고 늦은MP3 loadedmetadata이벤트가TTS길이를다시덮어쓰지않도록했습니다. 이두실패를브라우저에서확인한후최소수정했으며 앱런타임변경에맞춰APP_VERSION은**v1.3.2**입니다. 미디어·원고재생기능을재작성하지않았습니다.

## 검증

```sh
for file in tests/*.mjs; do node "$file" || exit; done
node authoring/validators/validate_all_packs.mjs
python3 tests/browser_kiyomizudera.py
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
python3 tests/browser_guide_cards.py
python3 tests/browser_kinkakuji.py
python3 tests/browser_optional_audio.py
python3 tests/browser_tts_state.py
python3 tests/browser_map_collisions.py
python3 tests/browser_app_version.py --baseline-ref df29e027e52727eaf53b5ccba5865d096a9f3759
git diff --check
```

로컬 Node24/Python3.12/Chromium에서 실행:

- Node11개및3팩Validator PASS(후시미7/31,금각사8/29,청수사8/29).
- **실제 data/catalog.json**의 일본→교토→청수사→기본역사가이드→8스팟. 테스트catalog응답대체없음.
- 360/390/430px8핀/라벨,3참고경로/4생략구간,5종충돌0개; JPG10decode/원고8원본일치.
- MP3 0/8트랙null, TTS선택/한국어API첫문장전달, 미생성MP3요청없음, AI출처/검수중표시 및TTS길이--:--검증.
- 30파일캐시bodySHA/완료marker,offline재진입8스팟/지도/경로,삭제/재다운로드격리.
- 기존두팩캐시bodySHA·개인사진·설정보존,후시미MP3실제재생/일시정지/±5초/속도,금각사8핀/5동선회귀.
- 1.3.1→1.3.2실제셸교체후기존캐시/사진/설정보존.
- 기존금각사브라우저검사의2목적지고정은실제/fixture catalog개수로대체하여3팩에서도동일검사를수행합니다.
- 이작업브랜치에서도UX NodeCI가실행되도록기존push대상에feat/kiyomizudera-integration추가. PR/main검사유지.

실제기기TTS발성·실기기·잠금화면은NOT_RUN. 이환경nativeAPI에서는한국어음성0개/synthesis-failed를관찰하며 API호출PASS를발성성공으로보고하지않습니다.

## 배포 판정과 복구

이문서와로컬검사만으로실제배포완료를주장하지않습니다. PR/필수CI검사/Pagessuccess 및실제주소 https://iceteass.github.io/aitourguide/ 의청수사8스팟/기존두팩확인을최종보고에서구분합니다. 기존후시미·금각사의BETA_PUBLISHED는유지합니다.

GitHub API접근차단으로PR생성/병합이불가능하면작업브랜치push와검증결과만성공으로기록하고main/Pages반영완료로표시하지않습니다. 이경우웹PR생성→검사PASS확인→승인된병합→Pages성공→실제3팩확인이남은복구절차입니다. 배포후기술회귀가발생하면이번게시/표시수정커밋을revert하는후속PR로이전상태를복구할수있으며개인캐시/사진을임의삭제하지않습니다.

스크린샷(로컬실제catalog): [360](screenshots/kiyomizudera-beta-360.png), [390](screenshots/kiyomizudera-beta-390.png), [430](screenshots/kiyomizudera-beta-430.png), [AI표기/TTS길이](screenshots/kiyomizudera-beta-detail.png).
