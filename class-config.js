/* 송현학당 · 학급 설정
   암호는 이 파일에 그대로 적지 않고 암호화된 값(해시)만 넣어 둬요. 학생들이 파일을 열어 봐도 암호를 알 수 없어요.
   암호를 바꾸고 싶으면 Claude에게 부탁해 주세요 (이 파일과 Firebase 규칙을 함께 바꿔야 해요). */
window.CLASS = {
  name: '송현학당',
  pwHash: 'ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f',  // 학생 암호
  tHash: 'f91bfed0a0f16dfb501cd4f62f8ff5da73f4fb3ff3d265637f97e843dd2288a3',   // 선생님 암호
  base: 'songhyeon/'       // Firebase 안의 저장 칸 (청도학당과 섞이지 않게) — 바꾸지 마세요
};
