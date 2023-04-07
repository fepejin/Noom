//서버. 이곳에 app 생성
import http from "http";
import SocketIO from "socket.io";
import express from "express";
import { type } from "os";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (_, res) => res.render("home"));
app.get("/*", (_, res) => res.redirect("/"));




//아래 두 프로토콜(http, ws)은 같은 port를 공유함
//http 서버 생성
const httpServer = http.createServer(app);
const wsServer = SocketIO(httpServer);

//공개방 찾는 함수
function publicRooms() {
    // const sids = wsServer.socket.adapter.sids;
    // const rooms = wsServer.socket.adapter.rooms;
    //위 두 코드를 아래처럼 깔끔하게 만들어줄 수 있단다..JSON을 변수로
    const {
        sockets: {
          adapter: { sids, rooms },
        },
      } = wsServer;
    //공개방 배열
    const publicRooms = [];
    rooms.forEach((_, key) => {
        //만약 key가 SocketID에 정의되지 않았다면 그건 공개방임. 왜냐하면 socketID에는 privateRoom만이 존재함
        if(sids.get(key) === undefined){
            //그럼 공개방을 배열에 push해주면 됨
            publicRooms.push(key);
        }
    })
    return publicRooms;
}

//socket.io 연결 준비
wsServer.on("connection", (socket) => {
    //닉네임을 설정해주지 않았을때 default값
    socket["nickname"] = "익명";
    //socket에서 일어난 이벤트(enter_room같은)를 찾아서 출력해줌
    socket.onAny((event) => {
        console.log(wsServer.sockets.adapter);
        console.log(`Socket Event: ${event}`);
    });

    //enter_room: app.js에서 생성해서 이벤트
    //done: argument호출 후 실행될 프론트함수
    socket.on("enter_room", (roomName, done) => {
        //소켓이 있는 room을 생성
        socket.join(roomName); //브라우저에서 1212라는 방에 참가
        done(); //이 함수를 실행시켰을때 함수는 front에서 작동된다.
        //방에 입장까지 하면 나를 제외한 방에 있는 모든 사람들에게 emit 하는 것
        socket.to(roomName).emit("welcome", socket.nickname);
        //서버(모든 방) 전체에 메세지 emit => payload로 공개방 찾는 함수를 둠
        wsServer.sockets.emit("room_change", publicRooms());
    });
    //방에서 나가기 직전에 실행되는 on함수
    socket.on("disconnecting", () => {
        //방참가자들이 Set으로 저장되어 있기 때문에 iterator(반복)이 가능하기때문에 forEach를 써줌
        //왜냐? 방 참가자들에게 메세지를 보내주어야 하니까 
        socket.rooms.forEach((room) => socket.to(room).emit("bye", socket.nickname));
    });
    
    socket.on("disconnect", () => {
        wsServer.sockets.emit("room_change", publicRooms());
    });
    //방에 메세지 보내기 이벤트(메세지, 방이름, 백엔드함수)
    socket.on("new_message", (msg, room, done) => {
        socket.to(room).emit("new_message", `${socket.nickname}: ${msg}`);
        done();
    });
    //socket에 nickname key를 생성한 뒤 value를 가져와서 대입&저장
    socket.on("nickname", (nickname) => socket["nickname"] = nickname)
});

//WebSocket 서버 생성후 {server} 전달(pass)
// const wss = new WebSocket.Server({ server }); 


//메시지를 주고받기 위한 함수, socket은 주고받을 사람이라고 보면 됨
// function handleConnection(socket) {
//     console.log(socket)
// }

//fake database: 누군가 서버에 접속하면 connection을 기록. sockets.push(socket)을 사용
//서로 다른 브라우저 수 만큼 배열을 생성함
// const sockets = [];

// //on 메소드 => 백엔드에 연결된 사람(socket)의 정보를 제공해줌
// //"connection" 위의 handleConnection함수를 익명함수로 변경해주었다.
// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     //닉네임을 지정하지 않은 익명의 사용자들이 있을 수도 있기에 default값도 정해주자
//     //입력시에는 switch문이 동작해서 닉을 새로 재배치 해줄것임
//     socket["nickname"] = "익명";
//     console.log("Connected from the Browser🌱");
//     //브라우저 닫을시 백엔드에서 출력될 함수 
//     //=> 서버는 꺼지지 않지만 socket과의 연결이 끊기는 것
//     socket.on("close", () => console.log("Disconnected from the Browser😢"));

//     // message: WebSocket.RawData. 브라우저가 서버에 메세지를 보냈을때 발생하는 함수
//     // UTF-8인코딩이 필요힘
//     socket.on("message", (msg) => {
//         //프론트로부터 {"type":"nickname","payload":"noljis"} 식의 string을 받아옴
//         const message = JSON.parse(msg);
//         //message의 type에 따라 다른 동작을 할 수 있도록 해주자
//         switch(message.type){
//             //만약 new_message의 타입이라면 해당 오브젝트의 payload 값을 보내줌
//             case "new_message": 
//                 //연결된 모든 브라우저를 배열sockets이라고 할때, 서버는 메세지를 연결된 모든 socket으로 전송함
//                 //닉네임: 메세지 내용으로 출력시켜주는 형태
//                 sockets.forEach((aSocket) => aSocket.send(`${socket.nickname}: ${message.payload}`));
//                 break;
//             case "nickname":
//                 //소켓(객체)에 "nickname"이라는 새로운 item을 추가
//                 socket["nickname"] = message.payload;
//                 break;
//         }

//         //브라우저가 서버로 메세지를 보내면 이 함수에서 메세지를 받은 뒤,
//         //socket.send()를 통해 서버는 브라우저로 다시 보내주는 것
//         // socket.send(message.toString('utf-8'));
//     });
//     //서버도 wss도 아닌 소켓에 메시지를 담아서 프론트로 보냄
//     // socket.send("hello!! 안녕!!");
// });

//서버 호출
const handleListen = () => console.log(`Listenin on http://localhost:3000`);
httpServer.listen(3000, handleListen); 


//console.log("hello");
