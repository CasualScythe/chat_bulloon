// server.js 파일

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
// socket.io 객체 생성 시 cors 설정을 추가하여 다른 출처(origin)에서의 접속 허용
const io = socketIo(server, {
  cors: {
    origin: "*", // 모든 출처 허용 (개발 단계에서 편리, 상용 시에는 특정 출처만 허용하도록 변경 필요)
    methods: ["GET", "POST"] // 허용할 HTTP 메서드
  }
});


app.use(express.static('public')); // 'public' 폴더의 정적 파일 제공

// 접속한 유저들의 socket.id와 닉네임을 매핑하여 저장할 객체
const users = {};

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`); // 누가 접속했는지 socket.id로 구분

  // 클라이언트로부터 'set nickname' 이벤트를 받으면
  socket.on('set nickname', (nickname) => {
      // 이미 접속한 유저인지 확인 (같은 닉네임으로 두 번 접속하는 경우 방지 등)
      // 여기서는 간단하게 socket.id에 닉네임 매핑
      users[socket.id] = nickname;
      console.log(`Nickname set for ${socket.id}: ${nickname}`);

      // 모든 클라이언트에게 새로운 유저 접속 알림 이벤트 전송
      // 이때 새로운 유저의 닉네임과 socket.id를 함께 보내주면 프론트에서 처리하기 편함
      io.emit('user joined', { id: socket.id, nickname: nickname });

      // 새로 접속한 유저에게 현재 접속해 있는 다른 유저들의 목록과 마지막 메시지를 보내줄 수도 있음 (선택 사항)
      // 이건 좀 더 복잡해지니 일단 패스!
  });


  // 클라이언트로부터 'chat message' 이벤트를 받으면
  socket.on('chat message', (data) => { // data는 { message: '메시지 내용' } 형태일 것으로 예상
    const nickname = users[socket.id] || '익명 유저'; // socket.id로 닉네임 찾기

    console.log(`Message from ${nickname} (${socket.id}): ${data.message}`);

    // 접속한 모든 클라이언트에게 메시지 다시 보내기
    // 보낼 때는 발신자의 socket.id, 닉네임, 메시지 내용을 함께 보냄
    io.emit('chat message', { id: socket.id, nickname: nickname, message: data.message });
  });

  // 사용자가 접속을 끊었을 때 실행됨
  socket.on('disconnect', () => {
    const disconnectedNickname = users[socket.id] || '익명 유저';
    console.log(`User disconnected: ${disconnectedNickname} (${socket.id})`);

    // users 객체에서 해당 유저 정보 삭제
    delete users[socket.id];

    // 모든 클라이언트에게 유저 퇴장 알림 이벤트 전송
    // 나간 유저의 socket.id를 함께 보내주면 프론트에서 해당 유저 영역 삭제하기 편함
    io.emit('user left', { id: socket.id, nickname: disconnectedNickname });
  });
});

const PORT = process.env.PORT || 3000; // 서버 포트 설정 (환경변수 없으면 3000번)
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/ 🚀`);
});
