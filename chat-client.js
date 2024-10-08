const socketio = io.connect();
let id = null
let username = null
let tag = null

socketio.once("initialization", function (data) {
    const user = data.user;
    const channels = data.channels
    const messages = data.messages
    id = user.id;
    username = user.username;
    tag = user.tag;
    changeUserInfo();
    const channel_list = document.getElementById("channel_list");
    while (channel_list.firstChild) {
        channel_list.removeChild(channel_list.firstChild)
    }
    for (let i = 0; i < channels.length; i++) {
        appendChannel(channels[i]);
    }
    updateEventListeners();
    document.getElementById("current_channel").innerHTML = "Lobby";
    document.getElementById("message-input").placeholder = "Message #Lobby";
    const user_input = prompt("Please update your nickname!", username);
    if (user_input != null && user_input != "") {
        username = user_input;
        changeUserInfo();
        socketio.emit("userinfo update", {
            username: username,
            tag: tag,
            id: id
        });
    }
    socketio.emit("channel users request", {channel_name: "Lobby"});
    socketio.emit("channel messages request", {channel_name: "Lobby"});
});

socketio.on("channel users response", function (data) {
    const channel = data.channel;
    updateChannelUsers(channel);
})

socketio.on("channel users update", function (data) {
    updateChannelUsers(data.channel);
})

socketio.on("new message", function (data) {
    const newMessage = data.message;
    appendMessage(newMessage);
});

socketio.on("channel messages response", function (data) {
    const message_list = data.messages;
    const channel_name = data.channel_name;
    const message_container = document.getElementById("message-container");
    const current_channel = document.getElementById("current_channel").textContent;
    if (current_channel === channel_name) {
        while (message_container.firstChild) {
            message_container.removeChild(message_container.firstChild);
        }
        message_list.forEach(function (message) {
            {
                if (message.user == username || message.toUser == username || message.toUser == null) {
                    appendMessage(message);
                }
            }
        })
    }

})

function appendMessage(message) {
    const current_channel = document.getElementById("current_channel").textContent;
    const message_container = document.getElementById("message-container");
    if (current_channel == message.channel) {
        const msg_username = message.user;
        const msg_content = message.content;
        let msg = document.createElement("div");
        msg.setAttribute("class", "message");
        let username_element = document.createElement("div");
        username_element.setAttribute("class", "username");
        username_element.appendChild(document.createTextNode(msg_username));
        let text_element = document.createElement("div");
        text_element.setAttribute("class", "message-text");
        text_element.appendChild(document.createTextNode(msg_content));
        msg.appendChild(username_element);
        if (message.toUser != null) {
            let toUser = document.createElement("div");
            toUser.setAttribute("class", "receptor");
            const format = "to " + message.toUser;
            toUser.appendChild(document.createTextNode(format));
            msg.appendChild(toUser);
        }
        msg.appendChild(text_element);
        message_container.appendChild(msg);
    }

}

function updateChannelUsers(channel) {
    const users = document.getElementById("people_list");
    const current_channel = document.getElementById("current_channel").textContent;
    if (current_channel === channel.channel_name) {
        while (users.firstChild) {
            users.removeChild(users.firstChild);
        }
        users.innerHTML = `<menu type="toolbar" class="userlist">
            <h2 class="userlist-title" id="userlist_channel_name">${channel.channel_name}</h2>
        </menu>`
        channel.userlist.forEach(function (user) {
            if (user.id != id) {
                let newUser = document.createElement("div");
                newUser.setAttribute("class", "people-user");
                let content = document.createElement("div");
                content.setAttribute("class", "user focusable");
                content.setAttribute("role", "button");
                content.appendChild(document.createTextNode(user.username));
                newUser.appendChild(content);
                users.appendChild(newUser);
            }
        })
        updateEventListeners();
    }
}

function appendChannel(channel) {
    const channel_list = document.getElementById("channel_list");
    let new_channel = document.createElement("li");
    let form_html;
    if (channel.password != null) {
        let isUnlocked = false;
        channel.userlist.forEach(function (user) {
            if (user.id == id) {
                isUnlocked = true;
            }
        });
        if (isUnlocked) {
            form_html = `
        <svg class="lock"><use xlink:href="#icon-lock-unlocked" /></svg>
        <span></span>
        <span class="channel-name">${channel.channel_name}</span>
        <button class="button invite" role="button" aria-label="Invite"><svg>
            <use xlink:href="#icon-invite" />
        </svg></button>
        <button class="button setting" role="button" aria-label="settings"><svg>
            <use xlink:href="#icon-channel-settings" />
            </svg></button>`;
        } else {
            form_html = `
        <svg class="lock"><use xlink:href="#icon-lock-locked" /></svg>
        <span class="channel-name">${channel.channel_name}</span>
        <button class="button invite" role="button" aria-label="Invite"><svg>
            <use xlink:href="#icon-invite" />
        </svg></button>
        <button class="button setting" role="button" aria-label="settings"><svg>
            <use xlink:href="#icon-channel-settings" />
            </svg></button>`;
        }
    } else {
        form_html = `
        <span class="channel-name">${channel.channel_name}</span>
        <button class="button invite" role="button" aria-label="Invite"><svg>
            <use xlink:href="#icon-invite" />
        </svg></button>
        <button class="button setting" role="button" aria-label="settings"><svg>
            <use xlink:href="#icon-channel-settings" />
            </svg></button>
    `;
    }
    new_channel.setAttribute("class", channel.channel_name == "Lobby" ? "channel focusable channel-text active" : "channel focusable channel-text");
    new_channel.innerHTML = form_html;
    channel_list.appendChild(new_channel);
}

function changeUserInfo() {
    const user_info = document.getElementById("user_info");
    const form_html = `<span class="username">${username}</span>
                <span class="tag">${tag}</span>`;
    user_info.innerHTML = form_html;
}


// mike added start
// Opening the channel creation dialog
document.getElementById('channelAdder').addEventListener('click', () => {
    document.getElementById('channelCreationDialog').showModal();
});

// Handling dialog cancellation (optional, if you want to do something when it's cancelled)
document.getElementById('cancelChannelCreation').addEventListener('click', () => {
    document.getElementById('channelCreationDialog').close();
});


// Handling dialog cancellation (optional, if you want to do something when it's cancelled)
document.getElementById('cancelInvite').addEventListener('click', () => {
    document.getElementById('inviteUserDialog').close();
});

// Handling the form submission for creating a new channel
document.querySelector('#channelCreationDialog form').addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent the form from submitting in the traditional way
    const channelName = document.getElementById('channelName').value;
    const channelPassword = document.getElementById('channelPassword').value;

    if (channelName) { // Check if the channel name is not empty
        // Emit the create_channel event to the server with the channel name and password
        socketio.emit('create_channel', {channelName, channelPassword});
        document.getElementById('channelCreationDialog').close(); // Close the dialog
        socketio.on('channel_failed_created', function (data) {
            document.getElementById('channelCreationDialog').close();
        });
        socketio.on('alert', function () {
            alert('Cannot create two Channels with same name');
        });
    } else {
        alert('Channel name is required!');
    }
});

document.querySelector('#inviteUserDialog form').addEventListener('submit', (event) => {
    event.preventDefault(); // Prevent the form from submitting in the traditional way
    const channelName2 = document.getElementById("invite_channel").value;
    const UserName2 = document.getElementById('Username').value;


    if (channelName2 && UserName2) {
        // Emit the create_channel event to the server with the channel name and password
        socketio.emit('invite_user', {channel_name: channelName2, username: UserName2});
        document.getElementById('channelCreationDialog').close(); // Close the dialog
        socketio.on('channel_failed_invite', function (data) {
            document.getElementById('channelCreationDialog').close();
        });
        socketio.on('alert2', function () {
            alert('Invite Failed, user already in');
        });
        socketio.on('alert3', function () {
            alert('Invite Failed, no such channel');
        });
        socketio.on('alert4', function () {
            alert('Invite Failed, no such user');
        });
    } else {
        alert('Channel name and Username are required!');
    }
});
socketio.on('channel_invited', function (data) {
    document.getElementById('channelCreationDialog').close();
    socketio.emit("channel users request", {channel_name: data.channel});
    socketio.emit("channel messages request", {channel_name: data.channel});
    const channel_list = document.getElementById("channel_list");
    while (channel_list.firstChild) {
        channel_list.removeChild(channel_list.firstChild)
    }
    const channels = data.channels;
    for (let i = 0; i < channels.length; i++) {
        appendChannel(channels[i]);
    }
    updateEventListeners();
});

socketio.on('channel_created', function (data) {
    const {newChannel} = data;
    appendChannel(newChannel); // Assuming appendChannel is your existing function to add channels to the UI
    updateEventListeners();
});
//mike added done


document.getElementById('send-btn').addEventListener('click', function (event) {
    event.preventDefault();
    const message = document.getElementById("message-input").value;
    const current_channel = document.getElementById("current_channel").textContent;
    let toUser = null;
    const userSelection = document.getElementsByClassName("user focusable clicked");
    if (userSelection.length > 0) {
        toUser = userSelection[0].textContent;
    }
    let newMessage = {
        user: username,
        channel: current_channel,
        content: message,
        toUser: toUser
    };
    socketio.emit("user sent message", {message: newMessage});
    document.getElementById("message-input").value = "";
    socketio.once("timeout fail to send message", function (){
       alert("Failed to send the message, because you are permanently timeout by the creator of the channel.");
    });
});

document.getElementById('kick-btn').addEventListener('click', function (event){
    event.preventDefault();
    let selected_user = null;
    const selections = document.getElementById('kick').childNodes;
    selections.forEach(function (selection){
        if (selection.selected){
            selected_user = selection.value;
        }
    });
    const current_channel = document.getElementById("operation_channel").value;
    socketio.emit("kick user request", {kicked_user: selected_user, channel: current_channel});
    document.getElementsByClassName("dialog")[0].style.display = "none";
    socketio.once("failed to kick user", function (){
       alert("Sorry, you are not allowed to kick any user out of this channel!");
    });
    socketio.once("kick succeeded", function (data){
        alert("You have successfully kicked " + data.user + " from channel #" + data.channel);
    });
})

socketio.on("kicked out from channel", function (data){
    socketio.emit("channel users request", {channel_name: "Lobby"});
    socketio.emit("channel messages request", {channel_name: "Lobby"});
    document.getElementsByClassName("channel-text active")[0].classList.remove("active");
    document.getElementById("channel_list").childNodes[0].classList.add("active");
    document.getElementById("current_channel").innerHTML = "Lobby";
    document.getElementById("message-input").placeholder = "Message #" + "Lobby";
    alert("You have been removed from the channel #" + data.channel + " by the creator!");
});

document.getElementById('ban-btn').addEventListener('click', function (event){
    event.preventDefault();
    let selected_user = null;
    const selections = document.getElementById('ban').childNodes;
    selections.forEach(function (selection){
        if (selection.selected){
            selected_user = selection.value;
        }
    });
    const current_channel = document.getElementById("operation_channel").value;
    socketio.emit("ban user request", {banned_user: selected_user, channel: current_channel});
    document.getElementsByClassName("dialog")[0].style.display = "none";
    socketio.once("failed to ban user", function (){
        alert("Sorry, you are not allowed to ban any user from joining this channel!");
    });
    socketio.once("banned succeeded", function (data){
        alert("You have successfully banned " + data.user + " from channel #" + data.channel);
    });
});

socketio.on("banned from channel", function (data){
    const channel_list = document.getElementById("channel_list");
    while (channel_list.firstChild) {
        channel_list.removeChild(channel_list.firstChild)
    }
    const channels = data.channels;
    for (let i = 0; i < channels.length; i++) {
        appendChannel(channels[i]);
    }
    updateEventListeners();
    socketio.emit("channel users request", {channel_name: "Lobby"});
    socketio.emit("channel messages request", {channel_name: "Lobby"});
    document.getElementsByClassName("channel-text active")[0].classList.remove("active");
    document.getElementById("channel_list").childNodes[0].classList.add("active");
    document.getElementById("current_channel").innerHTML = "Lobby";
    document.getElementById("message-input").placeholder = "Message #" + "Lobby";
    alert("You have been permanently banned from the channel #" + data.channel + " by the creator!");
});

document.getElementById('timeout-btn').addEventListener('click', function (event){
    event.preventDefault();
    let selected_user = null;
    const selections = document.getElementById('timeout').childNodes;
    selections.forEach(function (selection){
        if (selection.selected){
            selected_user = selection.value;
        }
    });
    const current_channel = document.getElementById("operation_channel").value;
    socketio.emit("timeout user request", {timeout_user: selected_user, channel: current_channel});
    document.getElementsByClassName("dialog")[0].style.display = "none";
    socketio.once("failed to timeout user", function (){
        alert("Sorry, you are not allowed to timeout any user in this channel!");
    });
    socketio.once("timeout succeeded", function (data){
        alert("You have successfully timeout " + data.user + " in channel #" + data.channel);
    });
})

socketio.on("timeout in channel", function (data){
    alert("You have been timeout in the channel #" + data.channel + " by the creator!");
});

socketio.on("user list update", function (data){
    const current_channel = document.getElementById("current_channel").textContent;
    if(current_channel == data.channel){
        socketio.emit("channel users request", {channel_name: current_channel});
    }
});

function updateEventListeners() {
    const $ = document.querySelectorAll.bind(document);

    $(".focusable, .button").forEach(el => {
        // blur only on mouse click
        // for accessibility, keep focus when keyboard focused
        el.addEventListener("mousedown", e => e.preventDefault());
        el.setAttribute("tabindex", "0");
    });


    $(".channel-text").forEach(el => {
        el.addEventListener("click", () => {
            let channel_name;
            if (el.childNodes.length == 7) {
                channel_name = el.childNodes[1].textContent;
                socketio.emit("channel join request", {
                    user: {
                        username: username,
                        tag: tag,
                        id: id
                    },
                    channel_name: channel_name,
                    password: null
                });
            } else if (el.childNodes.length == 8) {
                channel_name = el.childNodes[3].textContent;
                const password_input = prompt("Please enter the password!", "");
                if (password_input != null && password_input != "") {
                    socketio.emit("channel join request", {
                        user: {
                            username: username,
                            tag: tag,
                            id: id
                        },
                        channel_name: channel_name,
                        password: password_input,
                    });
                }
            } else {
                channel_name = el.childNodes[4].textContent;
                socketio.emit("channel users request", {channel_name: channel_name});
                socketio.emit("channel messages request", {channel_name: channel_name});
                $(".channel-text.active")[0].classList.remove("active");
                el.classList.add("active");
                document.getElementById("current_channel").innerHTML = channel_name;
                document.getElementById("message-input").placeholder = "Message #" + channel_name;
            }

            socketio.once("banned fail to join", function (){
               alert("Failed to join the channel, because you are permanently banned by the creator of the channel.");
            });

            socketio.once("channel join approved", function (data) {
                if (channel_name == data.channel_name) {
                    socketio.emit("channel users request", {channel_name: channel_name});
                    socketio.emit("channel messages request", {channel_name: channel_name});
                    $(".channel-text.active")[0].classList.remove("active");
                    el.classList.add("active");
                    if (el.childNodes.length == 8) {
                        const form_html = `<svg class="lock"><use xlink:href="#icon-lock-unlocked" /></svg>
                                                <span></span>
                                                <span class="channel-name">${channel_name}</span>
                                                <button class="button invite" role="button" aria-label="Invite"><svg>
                                                    <use xlink:href="#icon-invite" />
                                                </svg></button>
                                                <button class="button setting" role="button" aria-label="settings"><svg>
                                                    <use xlink:href="#icon-channel-settings" />
                                                    </svg></button>`;
                        el.innerHTML = form_html;
                    }
                    document.getElementById("current_channel").innerHTML = channel_name;
                    document.getElementById("message-input").placeholder = "Message #" + channel_name;
                }
            });
        });
    })

    $(".user").forEach(el => {
        el.addEventListener('click', function () {
            const current_channel = document.getElementById("current_channel").textContent;
            if ($(".user.clicked").length > 0) {
                if ($(".user.clicked")[0] === el) {
                    el.classList.toggle('clicked');
                    document.getElementById("message-input").placeholder = "Message #" + current_channel;
                } else {
                    $(".user.clicked")[0].classList.remove("clicked");
                    el.classList.toggle('clicked');
                    document.getElementById("message-input").placeholder = "Message #" + current_channel + " to " + el.textContent;
                }

            } else {
                el.classList.toggle('clicked');
                document.getElementById("message-input").placeholder = "Message #" + current_channel + " to " + el.textContent;
            }
        });
    });

    $(".button.setting").forEach(el => {
        el.addEventListener('click', function (){
            const current_channel = el.previousElementSibling.previousElementSibling.textContent;
            $(".dialog")[0].style.display = 'block';
            const kick_selector = document.getElementById("kick");
            const ban_selector = document.getElementById("ban");
            const timeout_selector = document.getElementById("timeout");
            socketio.emit("get user list", {channel_name: current_channel, request_user_id: id});
            socketio.once("response user list", function (userlist){
                while(kick_selector.firstChild){kick_selector.removeChild(kick_selector.firstChild);}
                while (ban_selector.firstChild){ban_selector.removeChild(ban_selector.firstChild);}
                while (timeout_selector.firstChild){timeout_selector.removeChild(timeout_selector.firstChild);}

                const channel_indicator = document.getElementById("operation_channel");
                channel_indicator.value = current_channel;
                let default_option = document.createElement("option");
                default_option.setAttribute("value", "");
                default_option.selected = true;
                default_option.appendChild(document.createTextNode("Kick a user temporarily out of the channel"));
                kick_selector.appendChild(default_option);
                default_option = document.createElement("option");
                default_option.setAttribute("value", "");
                default_option.selected = true;
                default_option.appendChild(document.createTextNode("Permanently ban a user from joining the channel"));
                ban_selector.appendChild(default_option);
                default_option = document.createElement("option");
                default_option.setAttribute("value", "");
                default_option.selected = true;
                default_option.appendChild(document.createTextNode("Permanently timeout a user in the channel"));
                timeout_selector.appendChild(default_option);
                userlist.forEach(function (user){
                    if (user.username != username){
                        const option_kick = document.createElement("option");
                        option_kick.setAttribute("value", user.id);
                        option_kick.appendChild(document.createTextNode(user.username));
                        const option_ban = document.createElement("option");
                        option_ban.setAttribute("value", user.id);
                        option_ban.appendChild(document.createTextNode(user.username));
                        const option_timeout = document.createElement("option");
                        option_timeout.setAttribute("value", user.id);
                        option_timeout.appendChild(document.createTextNode(user.username));
                        kick_selector.appendChild(option_kick);
                        ban_selector.appendChild(option_ban);
                        timeout_selector.appendChild(option_timeout);
                    }
                });
            });
        });
    });

    $(".close")[0].addEventListener("click", function (){
        $(".dialog")[0].style.display = 'none';
    });

    //Mike's part
    $(".button.invite").forEach(el => {
        el.addEventListener('click', () => {
            document.getElementById('inviteUserDialog').showModal();
            document.getElementById("invite_channel").value = el.previousElementSibling.textContent;
        });

    });
}
