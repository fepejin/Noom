//socketio가 제공해주는 함수 io()
const socket = io();

const welcome = document.getElementById("welcome");
const form = welcome.querySelector("form");
const room = document.getElementById("room");

//초기값에 방을 숨겨줄거임. 입장하지 않았으니까
room.hidden = true;
//참가한 방을 알려줄 변수
let roomName;

//메세지를 브라우저의 리스트에 추가해주는 함수
function addMessage(message){
    const ul = room.querySelector("ul");
    const li = document.createElement("li");
    li.innerText = message;
    ul.appendChild(li);
}

//메세지 전송을 위한 함수
function handleMessageSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#msg input");
    //변수에 담아서 보내줘야만 출력됨..왜인지는 모름
    //아니 알았다. 막줄에 input.value를 비워줘서 그럼
    const value = input.value;
    //new_message라는 변수에 이벤트를 서버에 전송.
    //방이름을 같이 보내줘야 특정 방에 보내줄 수 있다.
    socket.emit("new_message", input.value, roomName, () => {
        addMessage(`You: ${value}`);
    });
    input.value="";    
}

//닉네임 설정을 위한 함수
function handleNicknameSubmit(event){
    event.preventDefault();
    const input = room.querySelector("#name input");
    const value = input.value;
    socket.emit("nickname", input.value);
}

//emit의 payload가 다 전송된 후 실행될 함수. 
//서버가 아닌 프론트에서 실행.
//showRoom : 모든 payload가 다 넘어오면 방으로 이동할 것임
function showRoom(){
    welcome.hidden = true;
    room.hidden = false;
    const h3 = room.querySelector("h3");
    console.log(`${roomName}`);
    h3.innerText = `Room ${roomName}`;
    const msgForm = room.querySelector("#msg");
    const nameForm = room.querySelector("#name");
    nameForm.addEventListener("submit", handleNicknameSubmit);
    msgForm.addEventListener("submit", handleMessageSubmit);
}

function handleRoomSubmit(event){
    event.preventDefault();
    const input = form.querySelector("input");
    //enter_room이라는 변수에 이벤트를 서버에 전송하는 것임. argument는 여러개가 올 수 있다.
    socket.emit("enter_room", input.value, showRoom);
    roomName = input.value;
    input.value="";
}

form.addEventListener("submit", handleRoomSubmit);

//welcome 이벤트가 발생하면 addMessge함수가 발생하도록 함
socket.on("welcome", (user) => {
   addMessage(`${user} joined🎉`)
});
//bye 이벤트가 발생하면 addMessge함수가 발생하도록 함
socket.on("bye", (leftUser) => {
   addMessage(`${leftUser} left😢`);
});

//메세지를 입력해서 send하면 addMessage발생
//파라미터를 안써줘도 알아서 value값 찾아서 보내줌
socket.on("new_message", addMessage);

//받아온 메시지를 매개변수로 출력하겠다는 뜻임
// socket.on("room_change", console.log);
// socket.on("room_change", (msg) => console.log(msg));

//rooms는 이벤트로부터 받아온 공개방 배열
socket.on("room_change", (rooms) => {
    const roomList = welcome.querySelector("ul");
    //배열(rooms)이 비어있으면 얘는 동작을 하지 않음 => 배열길이가 0이면 roomList를 비워주자
    roomList.innerText = "";
    if(rooms.length === 0){
    }
    rooms.forEach(room => {
        const li = document.createElement("li");
        li.innerText = room;
        roomList.append(li);
    });
});