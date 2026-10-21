# 교토 역사 해설 가이드 v1.7.3 — iPhone / Android 공용 오프라인 MP3 PWA

후시미 이나리 지도·7개 장소의 역사 해설·사진·제작 MP3를 제공합니다. 기본 음원은 사용자가 제작한 MP3이고 기존 TTS도 선택 가능합니다.

## 최초 한 번: MP3 파일을 GitHub에 업로드

GitHub 연결로 HTML/JavaScript는 반영했습니다. 별도로 제공한 **kyoto_history_7_mp3_for_github.zip**을 Windows에서 압축 해제하고, 그 안의 **7개 MP3 파일**을 저장소 루트에 업로드해야 합니다. 압축 ZIP 자체를 업로드하면 앱에서 재생할 수 없습니다.

1. [저장소 열기](https://github.com/Iceteass/kyoto-history-guide)
2. **Add file → Upload files** 선택
3. 아래 7개 MP3 파일을 모두 선택하여 업로드 (기본 브랜치 `main`, 폴더 `/`)
4. **Commit changes** 선택
5. GitHub Pages 배포를 기다린 후 https://iceteass.github.io/kyoto-history-guide/ 재접속

| 장소 | MP3 파일 이름 | 길이 | 바이트 |
|---|---|---:|---:|
| 1 | `audio_01_odotorii.mp3` | 0:28 | 452,396 |
| 2 | `audio_02_romon.mp3` | 3:56 | 3,776,684 |
| 3 | `audio_03_honden.mp3` | 4:10 | 4,001,324 |
| 4 | `audio_04_senbon_torii.mp3` | 5:03 | 4,855,724 |
| 5 | `audio_05_okusha.mp3` | 4:40 | 4,479,020 |
| 6 | `audio_06_omokaruishi.mp3` | 0:36 | 577,580 |
| 7 | `audio_07_return_path.mp3` | 0:20 | 319,916 |

**총 MP3 용량:** 18,462,644 bytes (약 17.6 MiB). `audio-player.js`는 업로드 파일의 크기와 SHA-256 해시를 검사하므로, 파일 이름과 원본 내용이 정확해야 합니다.

## iPhone/Android 비행기 모드 테스트

1. Wi-Fi 연결 상태에서 iPhone은 Safari, Android는 Chrome으로 웹 앱 열기
2. 홈 화면 앱으로 설치 (이미 설치했으면 온라인 상태에서 다시 열고 새로고침하여 업데이트 적용)
3. 지도 화면에서 **오프라인 준비 확인**을 눌러 지도·원고 준비 완료 확인
4. **음성 7개 오프라인 저장** 버튼 누르고 **✓ 7/7개 MP3 오프라인 저장 완료** 문구가 나타날 때까지 대기
5. 필요한 경우 **사진 6장 사전 저장**도 눌러 별도 다운로드
6. 비행기 모드 및 Wi-Fi 끄기 → 앱 종료 → 홈 화면 아이콘으로 다시 실행
7. 장소 1~7의 재생·일시정지·탐색·속도 조절·장소 전환 확인

PWA 저장소의 데이터는 운영체제나 브라우저가 저장 공간을 정리하거나 사용자가 웹사이트 데이터를 지울 때 제거될 수 있습니다. 오프라인 재생 전 **7/7개** 상태를 확인하세요. iOS Safari의 백그라운드/화면 잠금 중 연속 재생은 별도 실기기 검증이 필요합니다.

## 구성

- `index.html`: 기존 지도 및 해설 UI, 음성플레이어 연결
- `audio-player.js`: 7개 장소 MP3 연동, 오디오 탐색/속도, SHA-256 검증 및 캐시 다운로드
- `sw.js`: 오프라인 화면·이미지 캐시 및 MP3 HTTP Range 요청 대응
- `manifest.webmanifest`, 앱 아이콘 2개, 지도·누문 사진
- `audio_*.mp3` 7개: 직접 GitHub에 추가해야 하는 제작 MP3

음성 파일이 아직 올라가지 않은 경우 앱 UI의 MP3 버튼은 실패 안내를 표시하고, TTS 모드를 이용할 수 있습니다. iPhone/Android 실기기 오프라인 동작은 추가 검증이 필요합니다.
