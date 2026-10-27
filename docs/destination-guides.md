# 여행지 펼침 카드·기본 가이드 — 단계 A / B 저장 계약 게이트

## 범위와 기준

기준 main은 `f3a7070b2d68f35478708ad01e5b8bb16af42d53`(App v1.2.5, PR #5 병합)이다. 작업 전 트리는 깨끗했고 기존 Node 6개·팩 검증·기존 브라우저 2개가 PASS였다. 열린 PR API는 Forbidden이라 상태 미확인이다. 관련 신규 원격 UI 브랜치는 발견되지 않았고 Creator v0.4.7 소스/출력·별도 승인 시안은 저장소에 없었다. 사용자 제공 텍스트 디자인을 구현 기준으로 삼았다.

**이번 PR은 단계 A 구현이다. 단계 B의 독립 다중 가이드 저장은 미구현이다.** 기본 가이드의 실제 다운로드·취소·삭제·오프라인을 연결하며, 현재 팩 전체 저장을 두 가이드의 독립 저장인 것처럼 표시하지 않는다. 안전한 대체 범위인 A만 제출하고 B는 아래 후속 PR 게이트로 분리한다.

공통 이미지·국가/도시 UI·루트 독립화·지도·원고·MP3/TTS·플레이어·사진 DB·설정은 재구현하지 않았다. 변경된 카드에서 기존 API를 재사용한다. 앱 런타임이 바뀌어 **v1.2.6**으로 올리고 새 catalog adapter를 셸에 포함한다. 팩 v1.2.0·팩 스키마 1.0.0·7 spot·31 assets·pack/POI ID와 파일 바이트는 유지한다.

## 단계 A UI 및 실제 기능

- 카드 하나/여행지, 60×60 이미지, 18px 제목, 12px 태그, rgba(4,33,48,.65)·기존 blur/국가 배경.
- 기본은 접힘. 이미지·제목·화살표를 하나의 버튼으로 묶고 버튼 중첩은 없다. aria-expanded/controls와 guide list를 연결한다.
- 펼치면 실제 등록된 기본 가이드 `역사 해설`, `v1.0.0`, `#기본 #역사` 및 저장 버튼 하나를 표시한다. 이 v1.0.0은 이번에 **최초 등록한 가이드 메타데이터 버전**이며 과거 가이드 버전을 알아냈다는 뜻이 아니다. 팩1.2.0을 자동 복사한 값도 아니다.
- 미저장은 다운로드, 완료는 삭제, 처리 중은 진행 상태·중복 방지다. 오른쪽 터치44×44 이상, 화살표/저장 버튼 정렬축이 일치한다. 가이드 본문만 지도에 들어간다.
- 긴 제목/태그는 말줄임표로 처리한다. 확대 시 metadata 줄바꿈을 허용하며 이미지/버튼을 줄이거나 겹치게 하지 않는다. 가이드 수/저장 수나 하단 흰색 패널은 추가하지 않았다.
- Enter/Space·포커스 유지, dialog Tab/Shift+Tab/Escape 및 저장 버튼 복귀, 지도에서 돌아왔을 때 선택 가이드 포커스를 구현한다.
- 표지 fallback은 새 destination ID 컨테이너를 사용한다. 구 `data-action=open` 이미지 버튼 구조에 의존하지 않는다.
- 저장 상태는 각 guide의 실제 pack_id@pack_version에 대해 캐시/완료 marker/pack metadata/파일 크기를 검사한다. 마지막에 연 팩의 상태를 다른 카드에 복사하지 않는다.
- 진행 중 catalog 상태 조회 결과가 완료 상태를 덮지 않도록 revision/busy 가드를 둔다. 로딩/처리 중 새 선택을 막고 dialog 진행 렌더에서도 취소 포커스를 유지한다.

전/후 스크린샷:

- [기존 여행지 카드](screenshots/destination-before.png)
- [새 접힌 카드](screenshots/destination-collapsed.png)
- [새 펼친 카드](screenshots/destination-expanded.png)

## 현재 데이터 계약 — app/catalog.js

기존 `data/catalog.json.published` 배열의 항목은 그대로 유지한다. 구 앱은 이를 계속 읽을 수 있다. 새 앱은 선택적 `destinations` 확장을 읽으며 `app/catalog.js`의 `JourneyCatalog.normalize()`가 UI용 destination/guide를 만든다. 공개 catalog에는 실제 후시미 이나리 기본 가이드 하나만 있다.

```json
{
  "published": ["기존 pack 등록 항목 — 실제 JSON에서는 기존 객체 그대로"],
  "destinations": [{
    "destination_id": "jp-kyoto-fushimi-inari",
    "destination_tags": ["후시미구", "신사", "센본도리이"],
    "guides": [{
      "guide_id": "default",
      "guide_title": "역사 해설",
      "guide_type": "history",
      "guide_version": "1.0.0",
      "guide_tags": ["기본", "역사"],
      "status": "published",
      "storage_mode": "legacy-pack",
      "pack_id": "jp-kyoto-fushimi-inari",
      "pack_version": "1.2.0",
      "path": "travel-packs/JP/kyoto/fushimi-inari/pack.json"
    }]
  }]
}
```

위 published 문자열은 설명용이며 실행 입력이 아니다. 실제 정본은 `data/catalog.json`이다.

| 항목 | 현재 규칙 |
|---|---|
| destination_id | 안정 ID. 이름/배열 순서에서 재생성하지 않음. 후시미 이나리는 기존 pack_id와 같은 값을 명시 |
| guide_id | destination 내부에서 유일. UI 선택 키는 `destination_id/guide_id` |
| guide_title/type/version | 명시 메타데이터. 버전은 pack 버전과 별개. type은 분류만 하며 새 콘텐츠를 만들지 않음 |
| destination_tags | 지역/유형/특징 순서의 3개 실제 태그. 공통 코드에 여행지 태그를 하드코딩하지 않음 |
| guide_tags | 2개 실제 태그 |
| status | published만 노출, draft/review는 숨김. 숨긴 등록을 legacy adapter로 재노출하지 않음 |
| pack_id/version/path | published 항목과 정확히 일치. path는 **앱 기준 pack.json 경로**이며 guide descriptor 경로가 아님 |
| storage_mode | 현재 `legacy-pack`만 지원. 하나의 destination에서 공개 guide가 2개 이상이면 독립 저장 미구현 오류로 차단 |

중복 destination/guide/pack ID, 중복 pack 경로, 경로 이탈, 연결 불일치, 잘못된 태그/버전/상태를 검사한다. 같은 pack을 다른 destination에 중복 귀속하지 않는다. 확장이 손상됐을 때 조용히 legacy로 우회하지 않고 목록 로드를 실패시킨다. 기존 팩 Validator는 변경하지 않고 메타데이터 Node 검사를 별도로 추가했다.

### 구 catalog adapter

`destinations`가 없거나 특정 pack이 새 목록에 귀속되지 않았으면 기존 published 항목을 기본 가이드 하나로 해석한다. destination ID는 pack_id, guide ID는 default, 제목은 `기본 가이드`, 버전은 null이다. 태그/버전은 각각 `태그 미등록`, `버전 미등록`으로 표시하며 지역·유형·특징을 추측하지 않는다. 명시 확장에서 private로 등록한 팩은 이 fallback에서 제외한다.

### 원고·MP3·사진·현재 캐시

단계 A의 기본 가이드는 기존 pack.json→spots[].meta→POI narration/image/audio 경로를 그대로 사용한다. guide 메타데이터가 콘텐츠 사본을 만들거나 기존 파일 경로를 바꾸지 않는다. 팩 기준/spot 기준 상대경로 규칙도 그대로다.

저장 캐시 `travel-v12-{pack_id}@{pack_version}`, pending 캐시 및 `__complete_v12`를 그대로 사용한다. 기존 저장본을 읽어 새 행에서 바로 삭제 아이콘으로 표시한다. 다운로드/삭제 대상은 여전히 **기본 가이드가 유일한 전체 팩**이며 여러 가이드의 독립 저장이 아니다. 개인 사진 숫자/pack:poi 키와 사용자 설정을 변경하지 않는다.

## 단계 B 평가 — 이번에 미구현으로 분리한 근거

현재 legacy marker에는 guide ID·guide asset list가 없고 삭제는 해당 pack_id의 전체 버전을 지운다. SW도 첫 일치 URL을 가진 완료 팩 캐시를 반환한다. 따라서 metadata/UI에 가이드 둘을 넣기만 해서는 자산 격리·공유 보존을 증명할 수 없다. Node 검사에서 두 공개 guide를 같은 legacy whole-pack 저장으로 추가하는 경우를 실제로 거부한다. 이는 B 구현 시험의 PASS가 아니라 **위험한 등록 차단**이다.

아래 변경은 단순 UI 범위를 넘어 실제 저장/삭제 마이그레이션 계약이 필요하므로 별도 PR에서 수행한다. 이 PR에서 이를 안전하게 검증한 독립 2가이드 fixture는 없으며 B 완료를 주장하지 않는다. Creator 실출력도 제공되지 않았다.

후속 PR의 필수 설계·완료 게이트:

1. `shared_files`(지도/표지/좌표/공통 POI)와 `guide_files`(원고/음성/전용 이미지/descriptor)를 명시한다. pack.files와의 합집합·경로/bytes/hash 일치를 검사한다.
2. guide별 POI overlay와 경로 기준을 확정한다. 동일 URL에 다른 guide 바이트를 저장하지 않으며 기존 guide 경로는 유지한다.
3. destination/guide/guide_version 및 shared/pack revision을 구분하는 cache namespace·독립 완료 marker와 SW/플레이어 연결을 구현한다.
4. 구 __complete_v12는 legacy 기본 guide에만 재사용한다. 다른 guide의 완료 상태로 확대하지 않는다. 재사용은 실제 manifest/version/hash 일치로 검증한다.
5. stage→검증→commit, 취소·실패·재시도 중 기존 완료 자료 보존을 구현한다. 공유 GC는 남은 완료 guide 및 pending 작업 참조를 확인한다.
6. 기본 guide 삭제 전, 그 legacy 캐시에서 빌린 shared 파일을 남은 guide가 쓸 수 있도록 검증·보존한다. 현재 removeSaved()를 가이드 삭제에 그대로 호출하지 않는다.
7. 공개 catalog에 추가하지 않은 실제 2가이드 fixture에서 다른 원고·MP3·버전을 선택/다운로드/삭제하고, 한 guide 삭제 뒤 남은 guide가 오프라인 재생되는지 확인한다. 중복 ID·손상·경로 이탈·실패/취소/재시도도 검사한다.
8. 기존 1.2.5/1.2.6 설치의 사진·설정·legacy 팩 캐시를 업그레이드 검사한다. 이 모든 조건 전에는 B 완료가 아니다.

## Creator·Publisher 최소 연계 사항

현재 앱이 받는 것은 위 A metadata와 기존 pack/POI 계약이다. Creator v0.4.7을 수정하거나 호환 완료라고 주장하지 않는다. 외부 출력이 제공되면 destination/guide 안정 ID, 태그 개수/순서, 명시 버전, 공개 상태, pack 링크, 파일 경로/해시를 비교한다. 독립 guide manifest와 공유 자산 계약은 위 B 설계 확정 후 별도로 버전화해야 한다. 미완료 자료를 공개 catalog로 넣지 않는다.

## 검증 및 미검증

```sh
set -e
for file in tests/*.mjs; do node "$file"; done
for file in app/*.js audio-player.js sw.js; do node --check "$file"; done
node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari
python3 tests/browser_guide_cards.py --screenshots
python3 tests/browser_assets.py
python3 tests/browser_pack_independence.py
python3 tests/browser_app_version.py --baseline-ref f3a7070b2d68f35478708ad01e5b8bb16af42d53
git diff --check
```

- `validate_catalog.mjs`: 실제 metadata/legacy adapter, 비공개 비노출, ID/path/version 검사, B safety gate. (아래 결과 보고는 PASS/FAIL/NOT_RUN으로 구분한다.)
- `browser_guide_cards.py`: 360/390/430px × text-size 100/125/150/200%의 12개 조합. 텍스트 요소의 font-size를 실제로 확대하고 computed size와 overflow를 검사한다. 전체 페이지/핀치 확대나 실제 OS 접근성 설정 시험으로 대체 주장하지 않는다.
- 같은 브라우저 시험에서 60px 이미지, 44px 저장 버튼·정렬, 태그/버전·긴 이름, mouse/keyboard 펼침·접힘·포커스/dialog trap, 실제 pending 오디오 취소·재시도·완료·삭제, legacy/private 표시를 검사한다.
- 기존 브라우저 검사는 helper로 새 실제 사용자 흐름인 펼침→가이드 선택으로 갱신했다. 과거 baseline의 다운로드 절차는 실제 과거 UI를 사용하고 콘텐츠 검사·MP3/TTS·저장/사진 검사도 유지한다.
- 실기기 iPhone/Android 음성·TTS·잠금 화면·OS 글자 확대, Creator v0.4.7 실출력, 원격 CI/Pages 배포: NOT_RUN.

## 이번 실행 결과

| 항목 | 결과 |
|---|---|
| 단계 A | PASS: 실제 기본 guide·지도·다운로드/취소/삭제·오프라인 연결 |
| 단계 B | NOT_IMPLEMENTED: 독립 2가이드 자산/캐시/공유 삭제 fixture 미구현, 후속 PR 필요 |
| 기존 기준 검사 | PASS: Node6개·기존 Validator·브라우저2개 |
| 최종 Node7개·JS 문법·pack Validator | PASS, 기존 팩 7 spot/31 assets 유지 |
| 전체 JSON/manifest·Python·HTML/CSS·문서 링크·Actions 경로/새 command·트리거 | PASS |
| published 항목·pack·공통 assets·PWA manifest·플레이어·기존 Validator baseline 비교 | PASS, 콘텐츠/기존 계약 바이트 및 published 의미 변경 없음 |
| UI 360/390/430 × 실제 font-size 100/125/150/200% | PASS, 12조합·이미지60px·터치44px·정렬/overflow·.65 배경 |
| 펼침·접힘·이미지/제목 클릭·키보드·focus·dialog Tab/Shift+Tab/Escape | PASS |
| 다운로드 중 Escape/취소·재시도·완료·삭제 및 아이콘 상태 | PASS, actual Cache Storage·pending 오디오 응답 사용 |
| 옛 catalog·비공개 guide·긴 제목/태그 | PASS |
| 기존 MP3/TTS·플레이어·팩 다운로드/삭제/오프라인·사진 API | PASS |
| 실제 v1.2.5→v1.2.6 worker 업그레이드 | PASS, 팩/옛 캐시/사진 blob 해시·설정 보존·새 설치 오프라인 |
| 리뷰 | 예전 전역 Escape handler가 다운로드 취소 수단을 숨기던 1건을 RED로 재현·수정·재검토 완료 |
| 실제 기기/OS 글자 확대·음성/TTS/잠금 화면·Creator 실출력·원격 CI/Pages | NOT_RUN |

환경: Node.js24.19.0, Python3.12.14, 설치된 Chromium/Playwright. 로컬 검사는 CI Node22 및 실기기/배포 결과와 구분한다. 단계 A의 남은 FAIL은 없다. 단계 B 또는 Creator 호환을 전체 완료로 보고하지 않는다.
