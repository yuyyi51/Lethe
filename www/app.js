// Part 1: public util function & globals
function $$(id) { return document.getElementById(id); }
const socket = io.connect();
socket.on('disconnect', () => { socket.open(); });
//let url_base = socket.io.uri; // 'http://localhost:3000'
let authinfo, user;
let upload_image = {};
let change_avater = false;
let avater_md5 = null;
let url_base = 'D://images/';

// Part 2: login status control
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
  authinfo = {
    username: $$('username').value,
    password: SparkMD5.hash($$('password').value)
  };
  socket.emit('user:register', authinfo);
};
socket.on('user:register', (res) => {
  alert(authinfo.username +
      (res === true
          ? " register succeed, please login."
          : " register failed."));
});
$$('btn_login').onclick = () => {
  authinfo = {
    username: $$('username').value,
    password: SparkMD5.hash($$('password').value)
  };
  socket.emit('user:login', authinfo);
};
socket.on('user:login', (res) => {
  if(res === false) {
    alert(authinfo.username + " login failed.");
    store.remove('authinfo');
    return;
  }

  change_login_status(true);
    socket.emit('user:get_avatar',{user: authinfo.username});
  socket.emit('user:get_userinfo', authinfo, (userinfo) => {
    let user = userinfo;
    console.log(user);

    // use authinfo info to build UI:
    // 1. aside: self-profile & friends

    let div_user_username = $$('user_username');
    div_user_username.textContent = user.username;

    /*
    let img_user_avatar = $$('user_avatar');
    mg_user_avatar.src = 'data/avatar/' + user.username + '.png';
    */

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
$$('log_out').onclick = () => {  // as logout btn
  if (confirm('are you sure to logout?')) {
    change_login_status(false);
  }
};
$$('user_avatar').onclick = () => {
  $("#change_avatar").trigger("click");
};
$$('change_avatar').addEventListener('change', function () {
    if (this.files.length === 0) return;
    let image = this.files[0];
    if(!image.type.startsWith('image')) {
        alert('this is not a image file.');
        return;
    }
    upload_image.suffix = image.name.toLowerCase().split('.').splice(-1)[0];
    let reader = new FileReader();
    if (!reader) {
        console.log('error init FileReader.');
        return;
    }
    change_avater = true;
    reader.onload = (evt) => {
        //console.log(evt.srcElement.result);
        upload_image.md5 = SparkMD5.hash(evt.srcElement.result);
        avater_md5 = upload_image.md5;
        socket.emit('picture:query', {md5: upload_image.md5});
        upload_image.pic = evt.srcElement.result;
        //console.log(upload_image);

        let img = document.createElement('img');
        img.src = evt.srcElement.result;
        img.style.maxHeight = '99%';
        img.style.maxWidth = '99%';
    };
    reader.readAsDataURL(image);
    $$('change_avatar').value = "";
});
// Part 3: chat control
const chats = new Map();  // username => [messages]
const input = $$('input');
const messages = $$('messages');  // 当前窗口的消息
let receiver;                     // 当前窗口的发送对象

// FIXME: 需要改善
function message2escape(content) {  // RAW to DB-format
  // replace [emoji:..] with <img...
  //let match;
  let result = content;
  /*let reg = /\[emoji:\d+\]/g;
  while (match = reg.exec(content)) {
    let emoji_index = match[0].slice(7, -1);
    let emoji_amount = emojis.children.length;
    if (emoji_index <= emoji_amount) {
      result = result.replace(match[0], '<img class="emoji" src="data/emoji/' + emoji_index + '.gif" />');
    }
  }*/
  return result;
}
function message2html(content, sender) {  // DB-format to HTML
  let message = document.createElement('article');
  message.className = 'right';
  message.innerHTML = '<div class="avatar">' +
      '<img alt="' + sender + '" src=' + $$('user_avatar').src + ' />' + '</div>' +
      '<div class="msg">' + ' <div class="tri"></div>' +
      '<div class="msg_inner">' + content + '</div>' + ' </div>';
  return message;
}

socket.on('chat:message', (msg) => {
  // 1.存入chats中
  // 2.如果是当前目标，同时加入messages中
  console.log('message received from ' + msg.sender + ' to ' + msg.receiver);
  if (msg.receiver === receiver) {
    let div = document.createElement('div');
    div.innerHTML = message2html(msg.content, msg.sender);
    messages.appendChild(div.firstChild); // FIXME: or use <p> ?
  }
});

socket.on('user:get_avatar', (res) => {
  console.log(res);
  let path = 'data/avatar/user.png';
  if (res !== null){
    path = url_base + res ;
  }

  let img_user_avatar = $$('user_avatar');
  img_user_avatar.src = path;
});

$$('send').onclick = () => {
  console.log('message to sent to ' + receiver + ' from ' + user);

  let msg_escape = message2escape(input.value);
  let msg_html = message2html(input.value);
  messages.appendChild(msg_html);
  input.value = '';

  socket.emit('chat:message', {
    sender: user,
    receiver: receiver,
    formated: msg_escape
  });
};

// Part 3: picture-related control
socket.on('picture:query', (res) => {
  if (res){
    //图片已存在，发送消息
    console.log('image exists');
    if (change_avater){
        socket.emit('user:avatar',{user: authinfo.username, md5: avater_md5});
        change_avater = false;
        avater_md5 = null;
        return
    }
    //TODO: 发送图片消息

    upload_image = {};
  }
  else {
    //图片不存在，上传图片
    console.log('image not exists');
    socket.emit('picture:upload', upload_image);
  }
});

socket.on('picture:upload', (res) => {
  if (res){
    //上传成功，发送消息
    console.log('upload success');

    //TODO: 发送图片消息

    upload_image = {};
  }
  else {
    //上传出错
    console.log('upload fail');
    upload_image = {};
  }
  if (change_avater){
    socket.emit('user:avatar',{user: authinfo.username, md5: avater_md5});
    change_avater = false;
    avater_md5 = null;
  }
});

$$('open_file').addEventListener('change', function () {
  if (this.files.length === 0) return;
  let image = this.files[0];
  if(!image.type.startsWith('image')) {
    alert('this is not a image file.');
    return;
  }
  console.log(image);
  upload_image.suffix = image.name.toLowerCase().split('.').splice(-1)[0];
  let reader = new FileReader();
  if (!reader) {
    console.log('error init FileReader.');
    return;
  }
  reader.onload = (evt) => {
    console.log('send image to ' + receiver);
    //console.log(evt.srcElement.result);
    upload_image.md5 = SparkMD5.hash(evt.srcElement.result);
    socket.emit('picture:query', {md5: upload_image.md5});
    upload_image.pic = evt.srcElement.result;
    //console.log(upload_image);

    let img = document.createElement('img');
    img.src = evt.srcElement.result;
    img.style.maxHeight = '99%';
    img.style.maxWidth = '99%';
    /*
    let message = new message(user, receiver, img.outerHTML);
    let formated = message.get_formated_message();
    messages.appendChild(formated);
    */
    /*
    socket.emit('chat:message', {
      sender: message.sender,
      receiver: message.receiver,
      formated: formated.outerHTML
    });
    */
  };
  reader.readAsDataURL(image);
  $$('open_file').value = "";
}, false);
$$('select_image').onclick = () => {
  $("#open_file").trigger("click");
};


/*
socket.on('emoji:list', (data) => {
  for(let i = 1 ; i <= data.length; ++i) {
    let emoji_item = document.createElement('img');
    emoji_item.src = url_base + data[i];
    emoji_item.onclick = () => {
      input.value += '[emoji:' + data[i] + ']';
      emojis.style.display = 'none';
    };
    emojis.appendChild(emoji_item);
  }
});
*/
// Finally: main start
/* init emoji */
//socket.emit('emoji:list');
/* auto login */
authinfo = store.get('authinfo'); // 用户登陆信息 { username: str, password: str }
user = authinfo ? authinfo.username : null; // 暂存用户名
if(authinfo) {
  console.log('[Init] try auto login');
  socket.emit('user:login', authinfo);
}
/* ok, now show HTML body*/
$$('body').style.visibility = 'visible';

/*by Gouyiqin*/
function add_emoji(e) {
    //$('#input').val( $('#input').val()+e.innerText);
    //IE
    if (document.selection) {
        let sel = document.selection.createRange();
        sel.text = e.innerText;
    }
    //Else
    else if
    (typeof $$('input').selectionStart === 'number' && typeof $$('input').selectionEnd === 'number') {
        let startPos = $$('input').selectionStart,
            endPos = $$('input').selectionEnd,
            cursorPos = startPos,
            str = $$('input').value;
        $$('input').value = str.substring(0, startPos) + e.innerText + str.substring(endPos, str.length);
        cursorPos += e.innerText.length;
        $$('input').selectionStart = $$('input').selectionEnd = cursorPos
    }
    //无光标位置
    else {
        $$('input').value += str;
    }
}
function insertText(obj,str) {

}

function get_emoji_list() {
    let emoji=
        "😀\n" +
        "😁\n" +
        "😂\n" +
        "😃\n" +
        "😄\n" +
        "😅\n" +
        "😆\n" +
        "😇\n" +
        "😈\n" +
        "😉\n" +
        "😊\n" +
        "😋\n" +
        "😌\n" +
        "😍\n" +
        "😎\n" +
        "😏\n" +
        "😐\n" +
        "😑\n" +
        "😒\n" +
        "😓\n" +
        "😔\n" +
        "😕\n" +
        "😖\n" +
        "😗\n" +
        "😘\n" +
        "😙\n" +
        "😚\n" +
        "😛\n" +
        "😜\n" +
        "😝\n" +
        "😞\n" +
        "😟\n" +
        "😠\n" +
        "😡\n" +
        "😢\n" +
        "😣\n" +
        "😤\n" +
        "😥\n" +
        "😦\n" +
        "😧\n" +
        "😨\n" +
        "😩\n" +
        "😪\n" +
        "😫\n" +
        "😬\n" +
        "😭\n" +
        "😮\n" +
        "😯\n" +
        "😰\n" +
        "😱\n" +
        "😲\n" +
        "😳\n" +
        "😴\n" +
        "😵\n" +
        "😶\n" +
        "😷\n" +
        "😸\n" +
        "😹\n" +
        "😺\n" +
        "😻\n" +
        "😼\n" +
        "😽\n" +
        "😾\n" +
        "😿\n" +
        "🙀\n" +
        "🙅\n" +
        "🙆\n" +
        "🙇\n" +
        "🙈\n" +
        "🙉\n" +
        "🙊\n" +
        "🙋\n" +
        "🙌\n" +
        "🙍\n" +
        "🙎\n" +
        "🙏";
    let emojilist=[];
    //console.log(emoji.split("\n").length)
    for(let i=0;i<emoji.split("\n").length;i=i+4)
    {
        emojilist+="<div>"+
            "  <button type=\"button\" class=\"btn btn-default\" onclick=\"add_emoji(this)\">" +emoji.split("\n")[i]+
            "</button>\n" +
            "  <button type=\"button\" class=\"btn btn-default\" onclick=\"add_emoji(this)\">" +emoji.split("\n")[i+1]+
            "</button>\n" +
            "  <button type=\"button\" class=\"btn btn-default\" onclick=\"add_emoji(this)\">" +emoji.split("\n")[i+2]+
            "</button>\n" +
            "  <button type=\"button\" class=\"btn btn-default\" onclick=\"add_emoji(this)\">" +emoji.split("\n")[i+3]+
            "</button>\n" +
                "</div>";
    }
    return emojilist;
}
$(document).ready(function () {
    $('#select_emoji').popover(
        {
            trigger:'click',
            title:"Choose emoji",
            html:true,
            content:get_emoji_list(),
            placement:'top',
            container:'body'
        }
    )
})

// $$('select_emoji').addEventListener('click', (evt) => {
//     //emojis.style.display = 'block';
//     //evt.stopPropagation()
//     //$('[data-toggle="popover"]').popover('toggle');
//
// }, false);

//弹窗隐藏
document.body.addEventListener('click', function (event)
{
    var target = $(event.target);
    if (!target.hasClass('popover') //弹窗内部点击不关闭
        && target.parent('.popover-content').length === 0
        && target.parent('.popover-title').length === 0
        && target.parent('.popover').length === 0
        && target.data("toggle") !== "popover"
        && (target.id != "select_emoji"))
    {
        $('#select_emoji').popover('hide');
    }
});
