#!/bin/bash
# Move to the directory where this script is located
cd "$(dirname "$0")"

clear
echo "========================================================="
echo "   Union Bug Smart Stamper - 원클릭 실행 도우미"
echo "========================================================="
echo ""

# 1. Check Node.js installation
if ! command -v node &> /dev/null; then
  echo "⚠️ 오류: 시스템에 Node.js가 설치되어 있지 않습니다!"
  echo "https://nodejs.org/ 에서 Node.js를 설치한 뒤 다시 실행해 주세요."
  echo ""
  read -p "엔터 키를 누르면 종료합니다..."
  exit 1
fi

# 2. Automatically install packages if node_modules is missing
if [ ! -d "node_modules" ]; then
  echo "📦 패키지 모듈이 없어 최초 설치를 시작합니다..."
  echo "잠시만 기다려 주세요 (수십 초 정도 소요될 수 있습니다)..."
  npm install
  if [ $? -ne 0 ]; then
    echo "⚠️ 패키지 설치 실패! 인터넷 연결이나 권한을 확인해 주세요."
    read -p "엔터 키를 누르면 종료합니다..."
    exit 1
  fi
  echo "✅ 패키지 설치 완료!"
  echo ""
fi

echo "🚀 1.5초 뒤 기본 브라우저에서 애플리케이션을 자동으로 엽니다..."
# Wait 1.5 seconds and open the browser dynamically (compatible with macOS 'open')
(sleep 1.5 && open http://localhost:5173/) &

echo "🔥 2. 로컬 개발 서버 구동 중..."
echo "서버를 종료하려면 이 터미널 창을 닫거나 [Control + C] 키를 누르세요."
echo "========================================================="
echo ""

npm run dev
