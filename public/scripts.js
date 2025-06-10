// public/scripts.js 파일

// Socket.IO 서버에 연결 시도. 웹페이지가 로드될 때 자동으로 연결됨.
// io() 함수는 /socket.io/socket.io.js 파일에서 제공됨.
var socket = io();

// 현재 사용자의 닉네임을 저장할 변수
var nickname = '';

// HTML 문서에서 필요한 DOM 요소들을 가져와 변수에 저장
const nicknameArea = document.getElementById('nicknameArea'); // 닉네임 입력 전체 영역
const nicknameInput = document.getElementById('nickname');     // 닉네임 입력 필드
const setNicknameButton = document.getElementById('setNickname'); // 닉네임 설정 버튼
const chatDisplay = document.getElementById('chatDisplay');   // 유저별 메시지 표시 메인 영역
const chatForm = document.getElementById('chatForm');         // 메시지 입력 폼 전체 영역
const messageInput = document.getElementById('m');            // 메시지 입력 필드
const logMessages = document.getElementById('logMessages');     // 실시간 대화 로그 목록 (ul 태그)


// --- 이벤트 리스너 설정 ---

// 1. 닉네임 설정 버튼 클릭 이벤트 처리
setNicknameButton.addEventListener('click', function() {
    // 닉네임 입력 필드의 값 가져와서 앞뒤 공백 제거
    const enteredNickname = nicknameInput.value.trim();

    // 입력된 닉네임이 비어있지 않다면
    if (enteredNickname) {
        nickname = enteredNickname; // 현재 사용자의 닉네임 변수에 저장
        nicknameArea.style.display = 'none'; // 닉네임 입력 영역 숨김
        chatForm.style.display = 'flex'; // 메시지 입력 폼 영역 보이게 함 (CSS에서 display: flex로 설정했었음)

        // 서버에 'set nickname' 이벤트를 발생시키고 입력된 닉네임을 데이터로 보냄
        socket.emit('set nickname', nickname);

        console.log(`닉네임 설정 완료: ${nickname}`); // 개발자 콘솔에 로그 출력

    } else {
        // 닉네임이 비어있으면 사용자에게 알림
        alert('닉네임을 입력해주세요!');
    }
});

// 2. 메시지 전송 폼 submit (제출) 이벤트 처리
chatForm.addEventListener('submit', function(e) {
    e.preventDefault(); // 폼의 기본 제출 동작(페이지 새로고침)을 막음

    // 메시지 입력 필드의 값 가져와서 앞뒤 공백 제거
    const message = messageInput.value.trim();

    // 메시지가 비어있지 않고 현재 사용자의 닉네임도 설정되어 있다면
    if (message && nickname) {
        // 서버에 'chat message' 이벤트를 발생시키고 메시지 내용을 객체 형태로 보냄
        // 서버는 이 소켓의 ID를 보고 누가 보냈는지 알 수 있음
        socket.emit('chat message', { message: message });

        messageInput.value = ''; // 메시지 입력 필드 비우기
        console.log(`메시지 전송: ${message}`); // 개발자 콘솔에 로그 출력
    }
});


// --- 서버로부터의 Socket.IO 이벤트 처리 ---

// 3. 서버로부터 'current users' (현재 접속 유저 목록) 이벤트를 받으면 (새로 접속 시 한 번만 받음)
// userList는 서버가 보낸 [{ id: ..., nickname: ... }, ...] 형태의 배열
socket.on('current users', function(userList) {
    console.log('현재 접속 유저 목록 받음:', userList); // 개발자 콘솔에 로그 출력

    // 받은 유저 목록을 순회하면서 각 유저의 메인 화면 메시지 영역을 만듦
    userList.forEach(userData => {
        // 해당 유저의 socket.id를 이용해 메인 #chatDisplay 영역에 이미 해당 유저의 메시지 영역이 있는지 찾음
        let userMessageDiv = document.querySelector(`.userMessage[data-socket-id="${userData.id}"]`);

        // 해당 유저의 메시지 영역이 아직 없다면 새로 생성
        if (!userMessageDiv) {
             userMessageDiv = document.createElement('div'); // 새로운 유저 메시지 영역 div 생성
             userMessageDiv.classList.add('userMessage'); // CSS 클래스 추가
             userMessageDiv.setAttribute('data-socket-id', userData.id); // socket.id를 data 속성으로 저장

             const nicknameElement = document.createElement('h2'); // 닉네임 표시 h2 생성
             nicknameElement.textContent = userData.nickname; // 닉네임 설정

             const messageElement = document.createElement('p'); // 메시지 표시 p 생성
             // 초기 메시지 설정 (아직 메시지 안 보냈을 경우). 실제 메시지는 chat message 이벤트로 업데이트됨.
             messageElement.textContent = '접속 중...';

             // 생성한 요소들을 유저 메시지 영역 div에 추가
             userMessageDiv.appendChild(nicknameElement);
             userMessageDiv.appendChild(messageElement);

             // 메인 chatDisplay 영역에 새로 만든 유저 메시지 영역 추가
             chatDisplay.appendChild(userMessageDiv);
        }
        // 이미 영역이 있다면 새로 만들 필요는 없음.
        // 이 로직 덕분에 새로고침하거나 해도 기존 유저 영역이 사라지지 않음.
    });
});


// 4. 서버로부터 'user joined' (새 유저 접속) 이벤트를 받으면
// 이 이벤트는 '나를 제외한' 다른 유저가 접속했을 때 주로 받게 됨 (서버 설정에 따라 다름)
// userData는 서버가 보낸 객체 { id: socket.id, nickname: nickname } 형태
socket.on('user joined', function(userData) {
    console.log(`${userData.nickname} (${userData.id}) 님이 접속하셨습니다.`); // 개발자 콘솔에 로그 출력

    // 해당 유저의 socket.id를 이용해 메인 #chatDisplay 영역에 이미 해당 유저의 메시지 영역이 있는지 찾음
    // current users 이벤트나 새로고침 등으로 이미 영역이 만들어졌을 수 있으므로 확인
    let userMessageDiv = document.querySelector(`.userMessage[data-socket-id="${userData.id}"]`);

    // 만약 해당 유저의 메시지 영역이 아직 없다면 새로 생성
    if (!userMessageDiv) {
        userMessageDiv = document.createElement('div'); // 새로운 유저 메시지 영역 div 생성
        userMessageDiv.classList.add('userMessage'); // CSS 클래스 추가
        userMessageDiv.setAttribute('data-socket-id', userData.id); // socket.id를 data 속성으로 저장

        const nicknameElement = document.createElement('h2'); // 닉네임 표시 h2 생성
        nicknameElement.textContent = userData.nickname; // 닉네임 설정

        const messageElement = document.createElement('p'); // 메시지 표시 p 생성
        messageElement.textContent = '접속했습니다!'; // 처음 접속 메시지 내용

        // 생성한 요소들을 유저 메시지 영역 div에 추가
        userMessageDiv.appendChild(nicknameElement);
        userMessageDiv.appendChild(messageElement);

        // 메인 chatDisplay 영역에 새로 만든 유저 메시지 영역 추가
        chatDisplay.appendChild(userMessageDiv);
    } else {
       // 이미 유저 영역이 있는 경우 (주로 새로고침 후 재접속)
       // 메시지와 닉네임만 업데이트 해줄 수도 있음
       userMessageDiv.querySelector('p').textContent = '재접속했습니다!';
       userMessageDiv.querySelector('h2').textContent = userData.nickname; // 혹시 닉네임이 바뀌었을까봐 업데이트
    }

     // 화면 하단에 잠깐 뜨는 토스트 메시지로 접속 알림 표시
     showStatusMessage(`${userData.nickname} 님이 접속했습니다.`); // 이 함수 호출 시 토스트 메시지 활성화

     // 실시간 대화 로그 (#chatLog) 영역에 '유저 접속' 메시지 추가
     const logItem = document.createElement('li'); // 로그용 li 요소 생성
     logItem.textContent = `${userData.nickname} 님이 접속했습니다.`; // "닉네임 님이 접속했습니다." 형태로 표시
     logItem.classList.add('system-message'); // 시스템 메시지임을 나타내는 CSS 클래스 추가
     logMessages.appendChild(logItem); // 로그 목록 (ul)에 메시지 추가

     // 로그 목록 스크롤을 맨 아래로 이동하여 최신 메시지가 보이게 함
     logMessages.scrollTop = logMessages.scrollHeight;
});


 // 5. 서버로부터 'user left' (유저 퇴장) 이벤트를 받으면
 // userData는 서버가 보낸 객체 { id: socket.id, nickname: disconnectedNickname } 형태
socket.on('user left', function(userData) {
    console.log(`${userData.nickname} (${userData.id}) 님이 나갔습니다.`); // 개발자 콘솔에 로그 출력

    // 해당 유저의 socket.id를 이용해 메인 #chatDisplay 영역에서 해당 유저의 메시지 영역을 찾음
    const userMessageDiv = document.querySelector(`.userMessage[data-socket-id="${userData.id}"]`);

    // 유저 영역이 있다면
    if (userMessageDiv) {
        // 해당 유저의 메시지 영역을 chatDisplay에서 제거하여 화면에서 사라지게 함
        chatDisplay.removeChild(userMessageDiv);
    }

    // 화면 하단에 잠깐 뜨는 토스트 메시지로 퇴장 알림 표시
    showStatusMessage(`${userData.nickname} 님이 퇴장했습니다.`); // 이 함수 호출 시 토스트 메시지 활성화

    // 실시간 대화 로그 (#chatLog) 영역에 '유저 퇴장' 메시지 추가
    const logItem = document.createElement('li'); // 로그용 li 요소 생성
    logItem.textContent = `${userData.nickname} 님이 퇴장했습니다.`; // "닉네임 님이 퇴장했습니다." 형태로 표시
    logItem.classList.add('system-message'); // 시스템 메시지임을 나타내는 CSS 클래스 추가
    logMessages.appendChild(logItem); // 로그 목록 (ul)에 메시지 추가

    // 로그 목록 스크롤을 맨 아래로 이동하여 최신 메시지가 보이게 함
    logMessages.scrollTop = logMessages.scrollHeight;
});


// 6. 서버로부터 'chat message' (채팅 메시지) 이벤트를 받으면
// data는 서버가 보낸 객체 { id: socket.id, nickname: nickname, message: message } 형태
socket.on('chat message', function(data) {
    console.log(`[${data.nickname}] ${data.message} (from ${data.id})`); // 개발자 콘솔에 로그 출력

    // 메시지 내용을 가져옴
    const fullMessage = data.message;
    // 유저별 메시지 영역에 표시할 글자수 제한 설정 (원하는 숫자로 바꿔보세요!)
    const charLimit = 80;
    // 실제로 유저 영역에 표시할 메시지 내용을 담을 변수
    let displayMessage = fullMessage;

    // 메시지 길이가 제한 글자수를 초과하면 자르고 ...을 붙임
    if (fullMessage.length > charLimit) {
        // substring(시작 인덱스, 끝 인덱스): 시작부터 끝 인덱스 직전까지의 문자열 반환
        displayMessage = fullMessage.substring(0, charLimit) + '...';
    }


    // 1) 메인 #chatDisplay 영역 업데이트
    // 메시지를 보낸 유저의 socket.id를 이용해 해당 유저의 메시지 영역을 찾음
    const userMessageDiv = document.querySelector(`.userMessage[data-socket-id="${data.id}"]`);

    // 유저 영역을 찾았다면
    if (userMessageDiv) {
        // 해당 유저 영역의 닉네임과 메시지를 최신 내용으로 업데이트
        userMessageDiv.querySelector('h2').textContent = data.nickname; // 혹시 닉네임이 바뀌었을까봐 업데이트
        userMessageDiv.querySelector('p').textContent = displayMessage; // ***자른 메시지(displayMessage)로 업데이트***

        // (선택 사항) 해당 유저 영역에 메시지 도착 시 강조 효과나 애니메이션 추가 가능
    } else {
         // (일반적으로는 user joined 이벤트나 current users 이벤트가 먼저 오므로 이 경우는 거의 없음)
         // 만약 해당 유저 영역이 없다면 경고 로그 출력
         console.warn(`메시지를 보냈지만 유저 영역이 없는 socket.id: ${data.id}. user joined/current users 이벤트가 누락되었을 수 있습니다.`);
         // 이 else 문에서는 별도의 DOM 생성 로직을 넣지 않음. user joined/current users에서 처리되도록 함.
    }

    // 2) #chatLog 영역에 실시간 메시지 추가
    // 로그에는 ***전체 메시지 내용(fullMessage)***을 그대로 추가함!
    const logItem = document.createElement('li'); // 로그용 li 요소 생성
    logItem.textContent = `[${data.nickname}] ${fullMessage}`; // ***원본 전체 메시지 사용*** "[닉네임] 전체 메시지" 형식
    // 일반 채팅 메시지에는 'system-message' 클래스를 추가하지 않음 (시스템 메시지와 구분)
    logMessages.appendChild(logItem); // 로그 목록 (ul)에 메시지 추가

    // 로그 목록 스크롤을 맨 아래로 이동하여 최신 메시지가 보이게 함
    logMessages.scrollTop = logMessages.scrollHeight;
});


// --- 유틸리티 함수 ---

// 화면 하단에 잠시 나타났다가 사라지는 상태 메시지(토스트 메시지)를 표시하는 함수
function showStatusMessage(message) {
    // 이전에 표시된 상태 메시지가 있다면 삭제
    const existingMessage = document.querySelector('.status-message');
    if (existingMessage) {
        existingMessage.remove();
    }

    // 새로운 상태 메시지를 표시할 div 요소 생성
    const statusDiv = document.createElement('div');
    statusDiv.classList.add('status-message'); // CSS 스타일 적용을 위한 클래스 추가
    statusDiv.textContent = message; // 메시지 내용 설정

    // body 요소의 자식으로 상태 메시지 div 추가하여 화면에 표시
    document.body.appendChild(statusDiv);

    // 3초(3000ms) 후에 메시지를 사라지게 하는 타이머 설정
    setTimeout(() => {
        // 'hidden' 클래스 추가 (CSS transition을 이용해 부드럽게 사라지게 함)
        statusDiv.classList.add('hidden');
        // transition 애니메이션이 끝난 후 요소 완전히 제거
        statusDiv.addEventListener('transitionend', () => {
             statusDiv.remove();
        }, { once: true }); // transitionend 이벤트 리스너는 한 번만 실행되도록 설정
    }, 3000); // 메시지가 표시될 시간 (밀리초)
}