var socket = io();
var packet = {};
var sanitizer;
var username = null;

var connectedusers = [];

var connected = false;
var cansendnotifs = false;

function preload() {}

function setup() {
    sanitizer = new Sanitize();
    createCanvas(70, 70);

    document.getElementById("connectbutton").addEventListener("click", () => connect(null));
    document.getElementById("sendbutton").addEventListener("click", () => sendmessage(null));

    Notification.requestPermission().then(function(result) {
        cansendnotifs = true;

    });
    $("#chatinput").keyup(function(event) {
        if (event.keyCode === 13) {
            $("#sendbutton").click();
        }
    });
}



function connect(res) {
    if (!res) {
        sanitizer.clean_node(document.getElementById("usernameinput"));
        if (document.getElementById("usernameinput").value != "") {
            username = document.getElementById("usernameinput").value;

            socket.emit("connectpacket", username);
        } else {
            alert("please set a username!");
        }
    } else {
        switch (res) {
            case 200:
                document.getElementById("usernamecontainer").style.display = "none";
                document.getElementById("connectbutton").style.display = "none";
                document.getElementById("connectedtext").innerHTML = "CONNECTED";
                document.getElementById("connectedtext").style.color = "rgb(20, 220, 87)";
                document.getElementById("mainpanel").style.display = 'block';
                break;
            case 400:
                alert("well, either something went catastrophically wrong with the server internals, or someone's messing around with socket emits");
                break;
            case 406:
                alert("the server didn't like your username. sorry");
                break;
        }
    }
}

function users(type, value) {
    let userlistcontainer = document.getElementById("userlistcontainercontainer");
    switch (type) {
        case "init":
            console.log(value);
            connectedusers = value;


            connectedusers.forEach(user => {
                if (userlistcontainer) {
                    let userelem = document.createElement("p");
                    userelem.className = 'connecteduser';
                    userelem.innerHTML = user.name;
                    userlistcontainer.appendChild(userelem);
                }
            });
            break;
        case "new":
            console.log("new user " + value.name);
            let userelem = document.createElement("p");
            userelem.className = 'connecteduser';
            userelem.innerHTML = value.name;
            userlistcontainer.appendChild(userelem);
            sendalert('User joined!', value.name + " has joined the chat!");
            break;
        case "left":
            connectedusers = value;
            console.log("user left");
            while (userlistcontainer.firstChild) {
                userlistcontainer.removeChild(userlistcontainer.firstChild);
            }
            connectedusers.forEach(user => {
                let userelem = document.createElement("p");
                userelem.className = 'connecteduser';
                userelem.innerHTML = user.name;
                userlistcontainer.appendChild(userelem);
            });
            sendalert('User left', "A user has left the chat");
            break;
    }
}

function sendmsg() {}

function sendmessage(res) {
    if (res == 406) {
        alert("the server didn't like your message. sorry");
    } else {
        if (document.getElementById("chatinput").value != "") {
            let message = document.getElementById("chatinput").value;
            document.getElementById("chatinput").value = null;
            socket.emit("sendmessage", message);
        }
    }

}

function sendalert(title, text) {
    if (!document.hasFocus()) {
        new Notification(title, { body: text });
    }
}

function message(content, user) {
    let chatcontainer = document.getElementById("chatcontainer");
    let message = document.createElement("p");
    message.className = 'message';
    message.innerHTML = user.name + ": " + content;
    sendalert("New message!", user.name + ": " + content);
    chatcontainer.appendChild(message);
    chatcontainer.scrollTop = chatcontainer.scrollHeight;
}

socket.on("connect 200", () => connect(200));
socket.on("connect 406", () => connect(406));
socket.on("connect 400", () => connect(400));
socket.on("users init", (userlist) => users("init", userlist));
socket.on("users new", (user) => users("new", user));
socket.on("users left", (user) => users("left", user));

socket.on("message", (content, user) => message(content, user));
socket.on("sendmessage 406", () => message(406));

class ConnectedUser {
    constructor(name) {
        this.name = name;
        this.uuid = uuidv4();
    }
}