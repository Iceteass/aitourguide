# 여행지 제작 및 등록 — v1.2

공통 화면 코드는 수정하지 않고 여행지별로 자료를 제작할 수 있습니다.

표준 출력 위치는 `travel-packs/{country_code}/{city_id}/{destination_slug}/`입니다. 현재 `authoring/`에는 아래 수동 제작 절차와 검증기만 있으며, 자동 생성기는 없습니다. 기존 `JP/kyoto/fushimi-inari/`를 스키마 참고 자료로 사용하고 공통 앱이나 국가·도시 메타데이터 파일을 새로 복제하지 않습니다.

1. 다른 제작자/ChatGPT에서 여행지명을 입력해 독립 폴더의 `pack.json`, `route/points.json`, `spots/<slug>/poi.json`, `narration.md`, 사진 출처 목록을 만듭니다.
2. 지도·장소 사진의 권리 확인과 장소별 사실·전승·추정 구분을 검수합니다.
3. 사용자가 문단별 원고를 검수하고 MP3를 제작하여 각 `spots/<slug>/audio/ko-N1.mp3`에 배치합니다.
4. `pack.json`의 `files`에는 상대 경로, 실제 바이트 크기, 가능하면 SHA-256 해시를 기록합니다.
5. 명령 `node authoring/validators/validate_pack.mjs travel-packs/JP/kyoto/fushimi-inari`로 검증합니다.
6. 검증 완료된 여행지만 `data/catalog.json`의 `published` 배열에 등록합니다. 미등록 폴더는 화면에 표시되지 않습니다.
7. 출판 후 `pack_id`는 유지하고 콘텐츠 변경 시 `pack_version`을 갱신합니다.

상대 경로는 여행지 폴더 기준이며 `../`, 절대 파일 경로와 여행지 간 파일 공유를 금지합니다. 기존 지도 및 음성은 복사·검증이 끝나기 전까지 삭제하면 안 됩니다. 사용자는 새 여행지에서 온라인 관람 후 필요하면 지도·원고·사진·MP3 전체를 다운로드할 수 있습니다.

경로 기준을 구분하세요: catalog의 `path`·`cover`는 앱 기준, pack의 `cover`·`route`·`spots[].dir`·`spots[].meta`·`files[].path`는 팩 기준, POI의 `narration`·`image.path`·`audio.path`는 해당 spot 폴더 기준입니다. `spots[].dir`와 `meta`의 부모 폴더를 일치시키세요. `audio.original_name`은 원본 파일명 기록이며 실제 음성은 `audio.path`에서 로드합니다.

`files`에는 오프라인에 필요한 모든 로컬 콘텐츠를 포함하고 catalog와 pack의 ID·버전·국가·도시 및 장소 수를 일치시키세요. 검증기가 이 일치 조건과 등록 누락을 모두 검사하는 것은 아니므로 등록 전 별도로 확인해야 합니다. 현재 Actions 검증 대상은 후시미 이나리로 고정되어 있어, 새 팩 추가 시 CI 검증 대상도 확인하세요. 상세 유지·정리 기준은 [여행팩 구조 조사](../docs/travel-pack-audit.md)를 참고하세요.

**주의:** 후시미 이나리 기존 실사 사진 중 6개는 Wikimedia 원격 URL에 의존합니다. v1.2의 오프라인 폴더에는 현재 사용자가 제공한 관람 지도를 명시적으로 **안내용 이미지**로 대체 등록했습니다. 별도 촬영·권리 검증된 실제 사진을 확보하면 각 장소의 `images/main.jpg`를 교체하고 라이선스 및 용량 정보를 업데이트해야 합니다.


## 별도 제작 시스템 통합

현재 앱과 연결할 입력·경로·ID·좌표·원고/이미지/음성·크기/해시·필수/선택 자산 및 수동 등록 규칙은 [통합 계약](../docs/travel-pack-integration.md)에 정리했습니다. 신규 여행팩은 공통 이미지 manifest를 수정할 필요 없이 국가/일반 기본 배경을 사용합니다. Creator·Publisher·단계별 엄격 검증은 별도 개발 범위이며 현재 검증 명령은 그대로 유지합니다.
