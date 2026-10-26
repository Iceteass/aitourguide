# 공통 시작 배경 업로드·갱신 안내

이전 파일명으로 연결된 안내 URL은 보존합니다. 현재 저장소에는 `history_journey_splash_road_v121.webp`와 `splash_bg_road_coast_v121.webp`가 이미 있으며 두 파일의 SHA-256은 같습니다. 미업로드 상태로 가정하지 않습니다.

현재 정식 실행 경로는 `assets/app/splash/splash_bg_road_coast_v121.webp`입니다. 기존 `assets/` 바로 아래 파일은 구 설치·CSS·SW·외부 링크를 위해 유지합니다. 원본 파일을 단순히 옮기거나 삭제하지 마세요.

새 이미지 추가 시:

1. 출처·라이선스·권리와 모바일 해상도를 검수합니다. 기존 manifest의 `unverified`는 사용 허가 확인을 뜻하지 않습니다.
2. 새 파일은 [app/splash/](https://github.com/Iceteass/aitourguide/tree/main/assets/app/splash)에 고유 이름으로 추가합니다. 기존 호환 URL은 유지합니다.
3. `assets/manifest.json`에 이미지 ID, 경로, target=app, role=splash, season=all, flags, 출처·라이선스, 실제 bytes/SHA-256, fallback 목록을 기록합니다. 기존 기본 항목의 default를 해제하고 새 항목을 default로 지정합니다. 여러 default가 있으면 ID 사전순이므로 의도한 선택인지 검사하세요.
4. 앱 셸에 제공되는 자산이 바뀌므로 `app/version.js`의 버전 갱신을 검토하고 `node tests/validate_assets.mjs`, 전체 Node 검사와 Chromium 오프라인 검사를 실행합니다.
5. 별도 PR에서 실제 화면·fallback·오프라인 결과를 검토합니다. main 직접 수정·Tag/Release 자동 발행은 하지 않습니다.

기본 배경 로딩은 주 이미지→기존 도로 사진→SVG 순서입니다. bitmap이 없어도 필수 SVG가 오프라인 셸에 저장되어 대체 배경을 제공합니다. 새 이미지의 권리 확인, 출처 기록, manifest와 배포 절차는 [공통 자산 계약](../docs/common-assets.md)을 참고하세요.

기존 생성 이미지 안내 기록: 원본 941×1672 px, 모바일 배포 WebP 1440×2560 px 리샘플링(고유 디테일 증가를 의미하지 않음). 제목·부제는 배경에 합성하지 않고 DOM 텍스트로 표시합니다.
