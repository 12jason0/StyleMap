# StyleMap Mobile (React Native / Expo)

## 실행 방법

```bash
cd mobile
npm install
npm run start
# 필요시
npm run android
npm run ios
```

## 구조
- App.tsx: 하단 탭 네비게이션(코스, 맵, 마이, 홈, 사건)
- src/components/WebScreen.tsx: 공통 WebView 래퍼(로딩/뒤로가기 처리)
- src/screens/*: dona.io.kr 경로를 여는 탭 스크린
- src/config.ts: `WEB_BASE` 설정 (기본 `https://dona.io.kr`)
- app.json: Expo 설정


