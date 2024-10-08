const http = require("http"),
    fs = require("fs"),
    path = require("path");

const port = 3456;

const file = "ChatRoom.html";

let users = []
let channels = [{
    channel_name: "Lobby",
    creator: null,
    password: null,
    userlist: users
},]

let ban_list = [];
let timeout_list = [];

let messages = [];

// Listen for HTTP connections.  This is essentially a miniature static file server that only serves our one file, client.html, on port 3456:
const server = http.createServer(function (req, res) {
    let filePath = '.' + req.url;
    if (filePath === './') {
        filePath = file;
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    let contentType = 'text/html';
    if (extname === '.css') {
        contentType = 'text/css';
    } else if (extname === '.js') {
        contentType = 'text/javascript';
    }

    fs.readFile(filePath, function(err, content) {
        if (err) {
            if (err.code == 'ENOENT') {
                fs.readFile('./404.html', function(err, content) {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end(content, 'utf-8');
                });
            } else {
                res.writeHead(500);
                res.end('Sorry, check with the site admin for error: '+err.code+' ..\n');
                res.end();
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});
server.listen(port);


// Import Socket.IO and pass our HTTP server object to it.
const socketio = require("socket.io")(http, {
    wsEngine: 'ws'
});

// Attach our Socket.IO server to our HTTP server to listen
const io = socketio.listen(server);
io.sockets.on("connection", function (socket) {
    // This callback runs when a new Socket.IO connection is established.
    let username = "User#" + (users.length + 1).toString().padStart(4, '0');
    let tag = "#" + (users.length + 1).toString().padStart(4, '0');
    let newUser = {
        username: username,
        tag: tag,
        id: socket.id
    };
    users.push(newUser);
    channels[0].userlist = users
    io.sockets.local.emit("initialization", {user: newUser, channels: channels, messages: messages});

    socket.on("userinfo update", function (user){
        users.forEach(function (oldUser){
            if(oldUser.id === user.id){
                oldUser.username = user.username;
            }
        })
        channels[0].userlist = users
    });
    socket.join("Lobby");
    socket.on("channel users request", function (data){
        const channel_name = data.channel_name;
        channels.forEach(function (channel){
            if(channel.channel_name == channel_name){
                io.sockets.local.emit("channel users response", {channel: channel});
                socket.broadcast.emit("channel users update", {channel: channel});
            }
        });
    });

    socket.on("channel messages request", function (data){
        const  channel_name = data.channel_name;
        let response_messages = [];
        messages.forEach(function (message){
            if(message.channel == channel_name){
                response_messages.push(message);
            }
        });
        io.sockets.local.emit("channel messages response", {channel_name: channel_name, messages: response_messages});
    })


    socket.on("channel join request", function (data) {
        const request_user = data.user;
        const request_channel_name = data.channel_name;
        const request_password = data.password
        let isBanned = false;
        ban_list.forEach(function (ban){
            if (ban.user.id == request_user.id && ban.channel.channel_name == request_channel_name){
                isBanned = true;
            }
        });
        if(isBanned){
            io.to(socket.id).emit("banned fail to join");
        }else{
            channels.forEach(function (channel){
                if(channel.channel_name == request_channel_name){
                    if(channel.password === data.password){
                        socket.join(request_channel_name);
                        let isIn = false;
                        channel.userlist.forEach(function (user){
                            if (user.id === request_user.id){
                                isIn = true;
                            }
                        })
                        if(!isIn){
                            channel.userlist.push(request_user);
                        }
                        io.to(socket.id).emit("channel join approved", {channel_name: request_channel_name});
                    }
                }
            });
        }

    });

    socket.on("user sent message", function (data){
        const newMessage = data.message;
        let isTimeout = false;
        timeout_list.forEach(function (timeout){
            if (timeout.user.id == socket.id && timeout.channel.channel_name == newMessage.channel){
                isTimeout = true;
            }
        })
        if (isTimeout){
            io.to(socket.id).emit("timeout fail to send message");
        } else {
            messages.push(newMessage);
            if (newMessage.toUser != null){
                let receptor = null;
                users.forEach(function (user){
                    if(user.username == newMessage.toUser){
                        receptor = user.id;
                    }
                });
                io.sockets.to(receptor).to(socket.id).emit("new message", {message: newMessage});
            }else{
                io.sockets.to(newMessage.channel).emit("new message", {message: newMessage});
            }
        }

    });

    socket.on("get user list", function (data){
        const current_channel = data.channel_name;
        const user_id = data.request_user_id;
        channels.forEach(function (channel){
            if (channel.channel_name == current_channel){
                io.to(user_id).emit("response user list", channel.userlist);
            }
        })
    })

    socket.on("kick user request", function (data){
        const current_channel = data.channel;
        const kick_user = data.kicked_user;
        let kick_username = null;
        users.forEach(function (user){
            if(user.id == kick_user){
                kick_username = user.username;
            }
        });
        channels.forEach(function (channel){
            if(channel.channel_name == current_channel){
                if(channel.creator == socket.id){
                    channel.userlist.forEach(function (user, index, array){
                        if(user.id == kick_user){
                            array.splice(index, index);
                            io.to(socket.id).emit("kick succeeded", {user: kick_username,channel: current_channel});
                            io.to(kick_user).emit("kicked out from channel", {channel: current_channel});
                            io.to(current_channel).emit("user list update", {channel: current_channel});
                        }
                    })
                }else{
                    io.to(socket.id).emit("failed to kick user");
                }
            }
        });
    });

    socket.on("ban user request", function (data){
        const current_channel = data.channel;
        let ban_user = null;
        const ban_user_id = data.banned_user;
        let ban_username = null;
        users.forEach(function (user){
            if(user.id == ban_user_id){
                ban_username = user.username;
                ban_user = user
            }
        });
        channels.forEach(function (channel){
            if(channel.channel_name == current_channel){
                if(channel.creator == socket.id){
                    channel.userlist.forEach(function (user, index, array){
                        if(user.id == ban_user_id){
                            array.splice(index, index);
                            let ban = {
                                user: ban_user,
                                channel: channel
                            }
                            ban_list.push(ban);
                            io.to(socket.id).emit("banned succeeded", {user: ban_username,channel: current_channel});
                            io.to(ban_user_id).emit("banned from channel", {channel: current_channel, channels: channels});
                            io.to(current_channel).emit("user list update", {channel: current_channel});
                        }
                    })
                }else{
                    io.to(socket.id).emit("failed to ban user");
                }
            }
        });
    });

    socket.on("timeout user request", function (data){
        const current_channel = data.channel;
        let timeout_user = null;
        const timeout_user_id = data.timeout_user;
        let timeout_username = null;
        users.forEach(function (user){
            if(user.id == timeout_user_id){
                timeout_username = user.username;
                timeout_user = user
            }
        });
        channels.forEach(function (channel){
            if(channel.channel_name == current_channel){
                if(channel.creator == socket.id){
                    channel.userlist.forEach(function (user, index, array){
                        if(user.id == timeout_user_id){
                            let timeout = {
                                user: timeout_user,
                                channel: channel
                            }
                            timeout_list.push(timeout);
                            io.to(socket.id).emit("timeout succeeded", {user: timeout_username,channel: current_channel});
                            io.to(timeout_user_id).emit("timeout in channel", {channel: current_channel, channels: channels});
                            io.to(current_channel).emit("user list update", {channel: current_channel});
                        }
                    })
                }else{
                    io.to(socket.id).emit("failed to timeout user");
                }
            }
        });
    });


    socket.on('create_channel', function(data) {
        const { channelName, channelPassword } = data;
        // Ensure channelName is unique or handle it according to your needs
        let newChannel;
        if (channelPassword==null || channelPassword == ""){
            newChannel = {
                channel_name: channelName,
                creator: socket.id,
                password: null,
                userlist: []
            };
        }
        else{
            newChannel = {
                channel_name: channelName,
                creator: socket.id,
                password: channelPassword,
                userlist: []
            };
        }

        let bool = false;
        channels.forEach(function (channel){
            if(channel.channel_name == newChannel.channel_name){
                bool=true;
            }
        })
        if (bool == false){
            channels.push(newChannel);
            io.sockets.emit('channel_created', { newChannel }); // Notify all clients about the new channel
        }
        else{
            io.sockets.emit('channel_failed_created');
            io.to(socket.id).emit('alert');
        }

    });

    socket.on('invite_user', function(data) {
        const current_channel = data.channel_name;
        const invited_user = data.username;
        let isChannelExist = false;
        let isUserExist = false;
        // Ensure channelName is unique or handle it according to your needs
        channels.forEach(function (channel){
            if(channel.channel_name == current_channel){
                isChannelExist = true;
                users.forEach(function (user){
                    if (user.username==invited_user){
                        isUserExist = true;
                        let bool1 = false;
                        channel.userlist.forEach(function(user){
                            if (user.username == invited_user){
                                bool1 = true;
                            }
                        });
                        if(bool1){
                            io.sockets.emit('channel_failed_invite');
                            io.to(socket.id).emit('alert2');
                        }
                        else{
                            channel.userlist.push(user);
                            io.sockets.emit('channel_invited',{channel: current_channel, channels: channels});
                        }
                    }
                });
            }
        });
        if (!isChannelExist){
            io.to(socket.id).emit('alert3');
        }
        if (!isUserExist){
            io.to(socket.id).emit('alert4');
        }

    });

    // let newMessage = {
    //     user: username,
    //     channel: channel_name,
    //     content: message,
    //     toUser: null
    // }

    // socket.on('message_to_server', function (data) {
    //     // This callback runs when the server receives a new message from the client.
    //     console.log("message: " + data["message"]); // log it to the Node.JS output
    //     io.sockets.emit("message_to_client", { message: data["message"] }) // broadcast the message to other users
    // });
})
