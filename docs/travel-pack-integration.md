# Creator/Publisher 통합을 위한 현재 앱 계약

이 문서는 **현재 앱에서 확인한 계약**과 **후속 제안**을 구분한다. Creator·Publisher·엄격 Validator·전체 catalog CI는 이번 PR에서 개발하지 않는다. 별도 채팅의 구현은 병합 시점 최신 main과 이 계약을 비교해야 한다.

## 현재 공개 경로와 ID

- 여행팩 위치: `travel-packs/{country_code}/{city_id}/{destination_slug}/`. 예: `JP/kyoto/fushimi-inari/`.
- 관례: 국가 코드는 대문자 ISO 2자, 도시/slug는 소문자 ASCII kebab-case. 기존 팩 ID는 `jp-kyoto-fushimi-inari`, 팩 버전은 1.2.0, 스키마는 1.0.0이다. 현재 검증기가 경로 관례 전체를 강제하는 것은 아니다.
- 공개 목록은 `data/catalog.json.published`다. 국가·도시 선택은 이 배열에서 생성하며 별도 국가/도시 JSON이나 HTML 사본을 만들지 않는다.
- catalog의 `path`는 앱 기준 pack.json, `cover`는 앱 기준 이미지다. `pack_id`, `pack_version`, 국가·도시, 제목, `poi_count`를 pack과 일치시킨다. `pack_id`와 기존 경로는 임의로 바꾸지 않는다.

## pack·route·spot 파일

| 자료 | 현재 계약 |
|---|---|
| `pack.json` | `schema_version`, `pack_id`, `pack_version`, 국가·도시, 제목, `cover`, `route`, `poi_ids`, `spots`, `files` |
| `cover.jpg` | 여행지 전용 표지. 공통 assets에 넣지 않음 |
| `route/route-map.jpg` | 여행지 전용 지도 이미지 |
| `route/points.json` | `points[].poi_id`, 정규화 x/y [0,1]. 앱은 poi_id로 연결하며 route 이미지와 별도 로드 |
| `spots[]` | `poi_id`, `sequence`, `dir`, `meta`. 현재 화면은 배열 순서를 사용하므로 sequence·poi_ids·지도 순서를 일치시킴 |
| `spots/<slug>/poi.json` | ID, 제목/요약, `narration`, `image.path/type`, `audio.path/bytes/sha256` 등. `audio.original_name`은 기록이며 fetch 경로가 아님 |
| `narration.md` | 실제 원고와 TTS 입력. 마크다운 파일이지만 앱의 문장 처리를 고려해 전체 원문 미리보기 필요 |
| `images/main.jpg` | 각 spot의 로컬 이미지. 원격 사진이 없어도 오프라인 대체 이미지가 필요 |
| `audio/ko-N1.mp3` | 제작 MP3. 배포 팩에 연결하고 실제 파일 크기/SHA-256 기록 |
| `LICENSES.md` | 팩의 출처·라이선스 설명. 현재 검증기는 존재 확인하며 현재 files에는 미포함 |

pack의 `cover`, `route.*`, `spots[].dir/meta`, `files[].path`는 팩 기준이다. POI의 원고·사진·음성 경로는 spot 기준이다. `dir`와 `meta` 부모 폴더를 일치시킨다. 절대경로·`..`·다른 팩 공유 참조를 사용하지 않는다.

`files`에는 오프라인에 필요한 지도·좌표·표지·모든 POI/원고/이미지/MP3를 포함한다. 현재 팩은 31개이며 pack.json은 다운로드 코드가 별도로 저장한다. 바이트 수 및 가능한 SHA-256을 기록하고 오디오 해시는 POI와 files 모두 실제 파일에 맞춘다. 앱은 완료 marker와 크기가 확인된 팩의 MP3를 우선 선택하고 미저장·재생 실패 시 TTS로 전환한다.

현재 공개 팩의 필수/선택 구분: pack/route/표지/POI/원고/로컬 이미지/음성 및 출처 파일은 제작·공개 검수 대상이다. `cues`는 현재 null이며 선택 사항이고, 원격 Wikimedia 사진은 오프라인 필수 자산이 아니다. 기존 validator는 MP3 미포함 draft 모드를 제공하지 않으므로 미완료 초안을 공개 catalog에 등록하지 않는다.

## 공통 이미지와 분리

팩 추가만으로 `app/`나 `assets/manifest.json`을 수정할 필요는 없다. 새 국가/도시에 공통 이미지가 없으면 일반 앱 배경을 쓰고, JP의 도시 이미지가 없으면 국가 기본 배경을 쓴다. 국가/도시 테마를 별도로 추가하고 싶을 때만 [공통 자산 계약](common-assets.md)에 따라 manifest를 수정한다. 여행지 표지·지도·장소 이미지는 항상 팩 안에 둔다.

이미지 manifest의 schema_version과 pack schema_version은 이름이 같아도 별개 계약이다. 향후 도구의 오디오 manifest·작업 초안·승인 결과를 공통 이미지 manifest 또는 공개 pack 스키마에 임의로 섞지 않는다.

## 신규 팩 수동 등록 (현재 가능)

1. 표준 경로에 실제 검수한 콘텐츠와 출처를 준비한다. 기존 후시미 이나리는 참고하되 가상 팩을 공개 목록에 넣지 않는다.
2. ID·배열/지도 순서·경로·필수 파일을 확인하고 실제 크기와 해시를 기록한다.
3. `node authoring/validators/validate_pack.mjs travel-packs/CC/city/destination`을 실제 경로로 실행한다.
4. catalog의 `published`에 앱 기준 pack/cover 경로와 일치하는 메타데이터를 추가한다. JSON 파싱과 등록 연결·중복 ID·장소 수를 별도로 확인한다.
5. 기존 Node 테스트와 신규 팩 검증, 브라우저 선택·지도·다운로드·삭제·오프라인 재진입을 실행한다. 현재 Actions는 후시미 이나리 고정 경로이므로 새 팩도 자동 검사된다고 주장하지 않는다.
6. 별도 PR로 제출하고 운영자 검토·병합·배포 후 실제 Pages 주소를 확인한다. 미완료 원고/MP3·권리 미확인 상태를 자동 승인하지 않는다.

기존 팩 검사 명령:

```sh
node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari
```

## 후속 제안 — 아직 미구현

- Creator 프로젝트 저장/재개·미리보기·ZIP·MP3 원고 출력 및 콘텐츠 승인 상태.
- draft/publish 단계별 엄격 검증, 전역 중복 ID·필수 자산/해시/순서 정합성 검사.
- Publisher의 외부 MP3 연결·오디오 manifest·catalog 변경안·검증 실패 차단·운영자 승인.
- catalog 전체 순회 CI 및 2개 이상의 시험 팩에 대한 정상/손상 사례 검증.

실제 기존 validator는 필수 키·파일 존재·기록된 크기/해시·POI/좌표 일부를 검사하지만 catalog 전체 연결·모든 타입·files 완전성·배열 순서를 모두 보장하지 않는다. 이 제한을 숨기거나 이번 작업에서 별도 Validator로 재작성하지 않는다. 통합 시 기존 명령·팩1.2.0·스키마1.0.0 호환성과 구 설치 데이터 보존을 먼저 확인한다.


v1.2.5부터 공통 코드의 초기 지도·이미지 fallback은 여행지 루트 자산을 사용하지 않습니다. catalog.cover가 없으면 로드한 pack.cover를 사용하며 데이터가 없으면 공통 fallback을 사용합니다. v1.1 정적 실행은 종료했지만 개인 사진 숫자 키 호환은 유지합니다. [지원 종료와 검사](pack-independence.md)를 참고하세요.
