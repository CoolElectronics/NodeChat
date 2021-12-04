const e = require('cors');
const express = require('express');
const app = express();
const http = require('http');
const serv = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(serv);
const { v4: uuidv4 } = require('uuid');
var sanitizer = require('sanitize')();
app.get('/', (req, res) => res.sendFile(__dirname + '/client/index.html'));
app.use('/client', express.static(__dirname + '/client'));

var connectedusers = [];
var actuallyconnectedsockets = [];
var bannedguids = [];
io.on('connection', (socket) => {
    console.log('fake user connected ' + socket.id);
    socket.emit("users init", connectedusers)
    socket.on('connectpacket', (packet) => {
        if (actuallyconnectedsockets.includes(socket)) {
            socket.emit('connect 400');
        } else {
            let username = packet.replace(/\W/g, '');
            if (username != '') {
                let user = new ConnectedUser(username, socket.id);
                connectedusers.push(user);
                console.log("User " + user.name + " actually connected");
                io.emit('users new', user);
                actuallyconnectedsockets.push(socket);
                socket.emit('connect 200');
            } else {
                socket.emit('connect 406');
            }
        }
    });
    socket.on('disconnect', () => {
        if (actuallyconnectedsockets.includes(socket)) {
            console.log(socket.id);
            actuallyconnectedsockets = actuallyconnectedsockets.filter((value, index, arr) => {
                return value != socket;
            });
            let disconnectinguser = null;
            connectedusers.forEach((elem) => {
                if (elem.socketid == socket.id) {
                    disconnectinguser = elem;
                    connectedusers.splice(connectedusers.indexOf(elem), 1);
                }
            });
            console.log(connectedusers);
            console.log(disconnectinguser);
            if (disconnectinguser != null) {
                io.emit("users left", connectedusers);
            } else {
                console.log("something went very wrong");
            }
        } else {
            console.log('fake user disconnected');
        }
    });

    socket.on('newguid', () => {
        socket.emit('guid',uuidv4());
    });
    socket.on('oldguid', (guid) =>{
        if (bannedguids.includes(guid)){
            socket.emit("kick 201");
        }
    });
    socket.on('banguid', (guid) =>{
        bannedguids.push(guid);
        console.log("new banned guid! " + guid);
    });
    socket.on('sendmessage', (content) => {
        let message = content.replace("&", '&amp;').replace("<", '&lt;').replace(">", '&gt;').replace("\"", '&quot;');
        let sendinguser = null;
        connectedusers.forEach((elem) => {
            if (elem.socketid == socket.id) {
                sendinguser = elem;
            }
        });
        if (message != null && message.length < 800) {
            let parsedmessage = messageParse(message);
            let messageData = getMessageData(parsedmessage);
            if (messageData != null){
                switch (messageData[0]){
                    case "!auth":
                        // hmmmm yes sekurity
                        if (messageData[1] == 'iusearchbtw'){
                            socket.emit("auth 200");
                            sendinguser.isAuthd = true;
                        }else{
                            socket.emit("auth 400");
                        }
                        break;
                    case "!ban":
                        if (sendinguser.isAuthd){
                            if (messageData[1] != null){
                                let banneduser;
                                connectedusers.forEach((elem) => {
                                    if (elem.name == messageData[1]) {
                                        banneduser = elem;
                                    }
                                });
                                if (banneduser != null){
                                    let bannedsocket;
                                    actuallyconnectedsockets.forEach((elem) => {
                                        if (elem.id == banneduser.socketid) {
                                            bannedsocket = elem;
                                        }
                                    });
                                    if (bannedsocket != null){
                                        bannedsocket.emit("ban 201");
                                    }else{
                                        io.emit("message", "haha yeah somthing went wrong with the server code oops", "Server");
                                    }
                                    socket.emit("ban 200");
                                }else{
                                    socket.emit("ban 400");
                                }
                            }else{
                                socket.emit("ban 400");
                            }
                        }else{
                            socket.emit("ban 406");
                        }
                        break;
                    case "!kick":
                        if (sendinguser.isAuthd){
                            if (messageData[1] != null){
                                let banneduser;
                                connectedusers.forEach((elem) => {
                                    if (elem.name == messageData[1]) {
                                        banneduser = elem;
                                    }
                                });
                                if (banneduser != null){
                                    let bannedsocket;
                                    actuallyconnectedsockets.forEach((elem) => {
                                        if (elem.id == banneduser.socketid) {
                                            bannedsocket = elem;
                                        }
                                    });
                                    if (bannedsocket != null){
                                        bannedsocket.emit("kick 201");
                                    }else{
                                        io.emit("message", "haha yeah somthing went wrong with the server code oops", "Server");
                                    }
                                    socket.emit("kick 200");
                                }else{
                                    socket.emit("kick 400");
                                }
                            }else{
                                socket.emit("kick 400");
                            }
                        }else{
                            socket.emit("kick 406");
                        }
                        break;
                    case "!unban":
                        if (sendinguser.isAuthd){
                            if (messageData[1] != null){
                                if (bannedguids.includes(messageData[1])){
                                    bannedguids.forEach((elem) => {
                                        if (elem == messageData[1]) {
                                            bannedguids.splice(bannedguids.indexOf(elem), 1);
                                        }
                                    });
                                    socket.emit("message","unbanned guid","server");
                                }else{
                                    socket.emit("message","no user with that guid exists","server");
                                }
                            }else{

                                let response = "Banned Local guids : ";
                                bannedguids.forEach(element => {
                                    response = response + element + ", "; 
                                });
                                socket.emit("message",response,"server");
                            }
                        }else{
                            socket.emit("kick 406");
                        }
                        break;
                }
            }else{
                io.emit("message", parsedmessage, sendinguser);
            }
        } else {
            socket.emit("sendmessage 406");
        }
    });
});
function getMessageData(message){
    if (message[0] == '!'){
        let array = message.split(" ");
        return array;
    }
    return null;
}
function messageParse(message){
    let newMessage = message;
    // literally 1984
    //newMessage = newMessage.replace(/[^0-9a-zA-Z]+/,'');
    return newMessage;
}

serv.listen(process.env.PORT || 5000, () => {
    console.log('listening on *:5000');
});
class ConnectedUser {
    constructor(name, id) {
        this.name = name;
        this.socketid = id;
        this.isAuthd = false;
        this.uuid = uuidv4();
    }
}