HYPERLINK HEAVEN — Personal homepage, old web forever!

HYPERLINK HEAVEN — 설치 및 GitHub Pages 업데이트
======================================================

변경 내용
- 브라우저 제목: HYPERLINK HEAVEN
- GeoCities 소개문에 등장하는 사이트 이름 변경
- GIF EXCHANGE(방문자 업로드/승인/공개 갤러리) 전체 메뉴·화면·프런트엔드 코드 제거
- 기존 장식 GIF, 음악, 팝업, 거북이 게임, 공개 방명록, 방문자 수 누적은 유지

GitHub Pages에 반영하기
1. 이 ZIP의 압축을 풀어주세요.
2. 기존 GitHub 저장소의 최상위 폴더에 index.html, style.css를 업로드(덮어쓰기)하세요.
3. js 폴더의 site.js, music-player.js, gif-decorations.js를
   저장소 js 폴더에 업로드(덮어쓰기)하세요.
4. assets/music 폴더의 파일도 꼭 유지/업로드하세요.
   이미 최적화 버전을 사용 중이라면 동일한 음악 파일은 재업로드할 필요 없습니다.
5. 기존 GIF/PNG 파일들은 그대로 보관하세요. 지금 ZIP에는
   기존 사이트에서 별도로 보유한 모든 GIF/PNG가 포함되어 있지 않습니다.
6. GitHub Pages 반영 후 새로고침하고 메뉴/음악/방명록을 확인하세요.

서버 설정
- 방명록과 방문자 카운터: 변경 없음. Apps Script 재배포 불필요.
- 구글 Apps Script에 남아 있는 GIF 업로드 코드/Drive 폴더/스프레드시트 기록은
  웹사이트에서 제거하는 것과 별개로 그대로 남을 수 있습니다.
- GIF 업로드를 서버에서 완전히 끄고 싶다면 이 패키지의 guestbook.gs를
  Apps Script 프로젝트의 Code.gs에 붙여넣고 저장한 뒤
  [배포 → 배포 관리 → 수정(연필) → 새 버전 → 배포]하세요.
- 이 서버 코드는 방명록, 방문자 수 누적만 유지하며 gif_upload 요청을 차단합니다.
- 기존 Drive 폴더와 시트 GifSubmissions 탭의 과거 데이터는 자동 삭제하지 않습니다.
- 실시간 구글 서버에 직접 배포하는 작업은 사용자가 해야 합니다.

주요 파일
- index.html: 배포용 홈 파일
- soyong.html: index.html과 내용이 동일한 보조 사본
- style.css: 사이트 전체 스타일
- js/site.js: 사이트 UI, 팝업, 방명록, 카운터, 터틀 게임
- js/music-player.js: MIDI/음악
- js/gif-decorations.js: 기존 장식 GIF 관련 코드 (업로드 기능 아님)
- assets/music/*: MP3와 MIDI 음원
- guestbook.gs: 선택 적용용(서버 GIF 업로드 비활성화 / 방명록·카운터 유지)
