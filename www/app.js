// Part 1: public util function & globals
function $$(id) { return document.getElementById(id); }

const socket = io.connect();
let url_base = 'http://localhost:3000'; // TODO: 我猜这个也可以从socket对象取得
let authinfo = store.get('authinfo'); // 用户登陆信息 { username: str, password: str }
let user = authinfo ? authinfo.username : null; // 暂存用户名

// Part 2: authinfo status control
function change_login_status(status) {
  if(status) {
    store.set('authinfo', authinfo);
    user = authinfo ? authinfo.username : null;
    $$('entry').style.display = 'none';
    $$('container').style.visibility = 'visible';
  } else {
    authinfo = null;
    user = null;
    store.remove('authinfo');
    $$('entry').style.display = 'block';
    $$('container').style.visibility = 'hidden';
  }
}

$$('btn_register').onclick = () => {
  authinfo = { username: $$('username').value, password: $$('password').value };
  socket.emit('register', authinfo);
};
socket.on('register', (res) => {
  if(res === true) {
    alert(authinfo.username + " register succeed, please login.");
  } else {
    alert(authinfo.username + " register failed.");
  }
});

$$('btn_login').onclick = () => {
  authinfo = { username: $$('username').value, password: $$('password').value };
  socket.emit('login', authinfo);
};
socket.on('login', (res) => {
  if(res === false) {
    alert(authinfo.username + " login failed.");
    store.remove('authinfo');
    return;
  }

  change_login_status(true);
  socket.emit('get_userinfo', authinfo, (userinfo) => {
    let user = userinfo;
    console.log(user);

    // use authinfo info to build UI:
    // 1. aside: self-profile & friends

    let div_user_username = $$('user_username');
    div_user_username.textContent = user.username;
    let img_user_avatar = $$('user_avatar');
    img_user_avatar.src = 'data/avatar/' + user.username + '.png';

    let ul_friends = $$('friends');
    let onclick_friend = function () {
      console.log(this.id + ' tag clicked');
      let main = $$('main');
      main.style.visibility = 'visible';
      receiver = this.id.replace('friend_', '');
      console.log(user + ' chats with ' + receiver);

      // 2. main: retrieve history
      let sel = { sender: user, receiver: receiver };
      socket.emit('get_history', sel, (history) => {
        console.log(history);
        while (messages.firstChild) {
          messages.removeChild(messages.firstChild);
        }

        for (i = 0; i < history.length; ++i) {
          let message = history[i]; // formated pure text

          // find the sender, if not sender, place message in the left
          let search_result = message.search('alt="' + user + '"');
          // if not found, then it's not the message we sent
          if (search_result === -1) {
            message = message.replace('class="right"', " ");
          }
          messages.innerHTML += message;
        }
      });
    };

    if(user.friends) for (let i = 0; i < user.friends.length; ++i) {
      let li_friend = document.createElement('li');
      let friend_account = user.friends[i].account;
      li_friend.id = 'friend_' + friend_account;
      li_friend.innerHTML = '<div class="avatar">' +
          '<img alt="avatar" id=' + friend_account + '_avatar src= "avatar/' + friend_account + '.png"/>' +
          '</div >' +
          '<div class="main_li">' +
          '<div class="username">' + friend_account + '</div>' +
          '</div >';
      li_friend.onclick = onclick_friend;
      ul_friends.appendChild(li_friend);
    }
  });
});

$$('div_avatar').onclick = () => {  // as logout btn
  if (confirm('are you sure to logout?')) {
    change_login_status(false);
  }
};

// Part 3: chat control
const messages = $$('messages');  // todo: 用store每个对话保存为一组记录，便于切换
const emojis = $$('emojis');
const input = $$('input');
let receiver;

class message { // TODO: 需要改善
  constructor(sender, receiver, content) {
    console.log('construct a message');
    this.sender = sender;
    this.receiver = receiver;
    this.content = content;

    // replace [emoji:..] with <img...
    let match;
    let result = this.content;
    let reg = /\[emoji:\d+\]/g;
    while (match = reg.exec(this.content)) {
      let emoji_index = match[0].slice(7, -1);
      let emoji_amount = emojis.children.length;
      if (emoji_index <= emoji_amount) {
        result = result.replace(match[0], '<img class="emoji" src="data/emoji/' + emoji_index + '.gif" />');
      }
    }
    this.content = result;
  }

  get_formated_message() {
    let message = document.createElement('p');
    message.className = 'right';
    message.innerHTML = '<div class="avatar">' +
        '<img alt="' + this.sender + '" src=' + $$('user_avatar').src + ' />' + '</div>' +
        '<div class="msg">' + ' <div class="tri"></div>' +
        '<div class="msg_inner">' + this.content + '</div>' + ' </div>';
    return message;
  }
}

socket.on('append_to_chat', (message) => {
  // if receiver is chatting exatly with sender, then append to chat window
  let formated = message.formated;
  let target = message.receiver;

  console.log('is chatting with ' + receiver);
  console.log('receiver is ' + target);
  if (target === receiver) {
    let tmp = document.createElement('div');
    tmp.innerHTML = formated.replace('class="right"', " ");
    messages.appendChild(tmp.firstChild);
  }
});
$$('select_emoji').addEventListener('click', (evt) => {
  emojis.style.display = 'block';
  evt.stopPropagation();
}, false);
$$('send').onclick = () => {
  console.log('send message to ' + receiver);

  let message = new message(user, receiver, input.value);
  input.value = '';

  let formated = message.get_formated_message();
  messages.appendChild(formated);

  socket.emit('chat', {
    sender: message.sender,
    receiver: message.receiver,
    formated: formated.outerHTML
  });
};

// Part 3: picture-related control
$$('open_file').addEventListener('change', function () {
  if (this.files.length === 0) return;
  let image = this.files[0];
  if(!image.type.startsWith('image')) {
    alert('this is not a image file.');
    return;
  }
  let reader = new FileReader();
  if (!reader) {
    console.log('error init FileReader.');
    return;
  }
  reader.onload = (evt) => {
    console.log('send image to ' + receiver);

    let img = document.createElement('img');
    img.src = evt.receiver.result;
    img.style.maxHeight = '99%';
    img.style.maxWidth = '99%';

    let message = new message(user, receiver, img.outerHTML);
    let formated = message.get_formated_message();
    messages.appendChild(formated);

    socket.emit('chat', {
      sender: message.sender,
      receiver: message.receiver,
      formated: formated.outerHTML
    });
  };
  reader.readAsDataURL(image);
}, false);
$$('select_image').onclick = () => {
  $("#open_file").trigger("click");
};

// Finally: main start
/* init emoji */
for(let i = 1 ; i <= 5; ++i) { // TODO: 不能这样写死
  let emoji_item = document.createElement('img');
  emoji_item.src = 'data/emoji/' + i + '.gif';
  emoji_item.title = i;
  emoji_item.onclick = () => {
    input.value += '[emoji:' + i + ']';
    emojis.style.display = 'none';
  };
  emojis.appendChild(emoji_item);
}
/* auto login */
if(authinfo) {
  console.log('[Init] try auto login');
  socket.emit('login', authinfo);
}
/* ok, now show body*/
$$('body').style.visibility = 'visible';