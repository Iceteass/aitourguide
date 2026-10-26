# v1.2.1 첫 화면 배경 이미지 등록 안내

앱 코드의 시작·국가 선택 배경 참조는 **assets/splash_bg_road_coast_v121.webp**입니다.

1. 제공된 `history_journey_splash_road_v121.webp` 파일을 PC에 저장합니다.
2. 해당 파일 이름을 반드시 **splash_bg_road_coast_v121.webp**로 변경합니다.
3. GitHub 저장소의 [assets/](https://github.com/Iceteass/aitourguide/tree/main/assets) 폴더에서 Add file → Upload files 선택.
4. 위 파일을 업로드한 뒤 Commit changes.
5. iPhone Safari 또는 Android Chrome에서 Wi-Fi 연결 상태로 새로고침, 배경 표시 확인 후 비행기 모드 재실행 확인.

현재 앱은 새 배경 파일을 우선 읽고, 아직 업로드되지 않았다면 기존 도로 배경으로 자동 전환합니다. 새로운 사진이 업로드된 후 실제 화면에서 로드되면 서비스 워커가 캐시하여 오프라인에서도 재사용할 수 있습니다.

- 원본 생성 이미지: 941×1672 px
- 모바일 배포용 WebP: 1440×2560 px로 리샘플링한 출력본(원본의 고유 디테일이 증가한 것은 아님)
- 제목/부제 등 글자는 배경 파일에 넣지 않고 HTML/CSS로 별도 표시

본 안내는 오프라인/PWA 구성을 깨뜨리지 않기 위해 추가했습니다. 실제 파일은 아직 저장소에 업로드된 것으로 가정하지 않습니다.
