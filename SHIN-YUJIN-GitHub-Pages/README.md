# SHIN YUJIN — Design in Play

신유진의 인터랙티브 디자인 포트폴리오입니다.

## 사이트 주소

GitHub Pages 주소: https://tlsdbwls.github.io/yuzineda.github.io/

현재 저장소는 `Tlsdbwls` 계정의 `yuzineda.github.io` 프로젝트 저장소이므로 주소에 `/yuzineda.github.io/` 경로가 포함됩니다.

## 빈 저장소에 파일 올리기

1. 이 ZIP 파일을 컴퓨터에서 압축 해제합니다.
2. GitHub의 `Tlsdbwls/yuzineda.github.io` 저장소를 엽니다.
3. 저장소가 비어 있으면 **Quick setup** 영역의 **uploading an existing file** 링크를 누릅니다. 이미 파일이 있으면 **Add file → Upload files**를 누릅니다.
4. 압축을 푼 파일 72개를 모두 선택해서 업로드 영역으로 끌어옵니다. ZIP 파일 자체나 상위 폴더가 아니라 `index.html`, `assets-*`, `work-*.html`, `.nojekyll` 등의 파일이 저장소 최상위에 들어가야 합니다.
5. 아래 **Commit changes**를 눌러 `main` 브랜치에 저장합니다.

## GitHub Pages 설정

1. 저장소 **Settings → Pages**를 엽니다.
2. **Source → Deploy from a branch**를 선택합니다.
3. **Branch → main**, 폴더 **/(root)**를 선택하고 **Save**를 누릅니다.
4. 배포가 끝나면 위 사이트 주소를 확인합니다.

## 파일 구성과 수정

- `index.html`: 인트로, 작업 목록, 자기소개
- `work-*.html`: G-SHOCK, COMPASS, SUMBI, SSG, OFF, Crossy Road 상세 페이지
- `assets-*`: 이미지, 로컬 폰트, 스타일, 인터랙션 스크립트 (모두 저장소 루트에 위치)
- `404.html`: 없는 주소에서 홈으로 돌아오는 안내
- `.nojekyll`: 별도 변환 없이 정적 파일을 게시하도록 설정

빌드나 별도 서버가 필요 없는 HTML·CSS·JavaScript 사이트입니다. 파일을 수정한 뒤 `main`에 커밋하면 Pages가 다시 게시합니다. 이미지와 내부 링크는 `/yuzineda.github.io/`를 기준으로 작성되어 있습니다. 저장소 이름이나 게시 경로를 바꿀 때는 링크, CSS 폰트 경로, `assets-site.js`의 `homePath`, HTML의 인트로 경로 판정과 공유 메타 주소를 함께 변경해야 합니다.

## 작업과 크레딧

작업 목록은 사용자가 제공한 여섯 프로젝트로 구성했습니다. 팀 프로젝트의 크레딧은 각 상세 페이지에 표시되어 있습니다. 브랜드 자산과 프로젝트 이미지는 해당 작업 소개를 위해 사용되며, 폰트 라이선스는 `assets-OFL-*.txt`에 포함되어 있습니다.

이 버전은 GitHub 웹의 Upload files에서 한 번에 올릴 수 있도록 폴더를 펼친 구성입니다. 모든 파일을 저장소 루트에 함께 업로드해야 합니다.
