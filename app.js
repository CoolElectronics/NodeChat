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
    socket.on('sendmessage', (content) => {
        let message = content.replace("&", '&amp;').replace("<", '&lt;').replace("<", '&gt;').replace("\"", '&quot;');
        let sendinguser = null;
        connectedusers.forEach((elem) => {
            if (elem.socketid == socket.id) {
                sendinguser = elem;
            }
        });
        if (message != null) {
            io.emit("message", message, sendinguser);
        } else {
            socket.emit("sendmessage 406");
        }
    });
});

serv.listen(process.env.PORT || 5000, () => {
    console.log('listening on *:5000');
});
class ConnectedUser {
    constructor(name, id) {
        this.name = name;
        this.socketid = id;
        this.uuid = uuidv4();
    }
}