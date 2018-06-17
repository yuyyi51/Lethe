// Part 1: public util function & globals
function $$(id) { return document.getElementById(id); }
const socket = io.connect();
socket.on('disconnect', () => { socket.open(); });
var url_base = socket.io.uri; // 'http://localhost:3000'
var image_base = '/data/images/';
let authinfo, user;
let upload_image = {};
let change_avater = false;
let avater_md5 = null;
let is_group_chat = false;
let selected_receiver = null;

function appendMessage(html) {
    $$('messages').appendChild(html);
}

function isImage(content) {
    return content.match(/\[img:.*\]/) !== null;
}

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
    window.location.reload();
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
  let img = document.createElement('img');
  img.style.display = 'none';
  img.src = $$('user_avatar').src;
  img.id = authinfo.username + '_avatar';
  $$('user_avatar').appendChild(img);
  socket.emit('user:get_avatar',{user: authinfo.username});
  socket.emit('user:get_userinfo', authinfo, (userinfo) => {
    let user = userinfo;
    console.log(user);
    let div_user_username = $$('user_username');
    div_user_username.textContent = user.username;
    if(user.friends) for (let i = 0; i < user.friends.length; ++i) {
      socket.emit('user:get_friends_avatar',{user: user.friends[i]});
    }
    if(user.ingroup) for (let i = 0; i < user.ingroup.length; ++i){
        socket.emit('user:get_groups',{groupid: user.ingroup[i]});
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
    };
    reader.readAsDataURL(image);
    $$('change_avatar').value = "";
});
// Part 3: chat control
const chats = new Map();  // username => [messages]
const message_store = new MessageStore();
const input = $$('input');
const messages = $$('messages');  // 当前窗口的消息
//let receiver;                     // 当前窗口的发送对象
let receiver = 'test2' ;      //测试用
var messageBox = document.getElementById('messages');

socket.on('chat:message', (msg) => {
    if (message_store.Exist(msg.sender)) {
        message_store.AppendMessage(msg.sender, msg.message);
    }
    if(receiver === msg.sender)
        appendMessage(MessageDirector.GetInstance.createHTML(msg.message, authinfo.username));
    messageBox.scrollTop = messageBox.scrollHeight;
});

socket.on('groupchat:message', (msg) => {
    if (message_store.Exist(msg.target)) {
        message_store.AppendMessage(msg.target, msg.message);
    }
    if(receiver === msg.target && msg.sender !== authinfo.username)
        appendMessage(MessageDirector.GetInstance.createHTML(msg.message, authinfo.username));
    messageBox.scrollTop = messageBox.scrollHeight;
});

socket.on('user:get_groups', (res)=>{
    let groupinfo = res;
    let path = 'data/avatar/group.png';
    let onclick_group = function () {
        $$('input').readOnly = false;
        if (selected_receiver === this.id){
            return;
        }
        if (selected_receiver !== null){
            $$(selected_receiver).style.backgroundColor = "";
        }
        $$(this.id).style.backgroundColor = "#2626ff";
        selected_receiver = this.id;
        is_group_chat = true;
        console.log(this.id + ' tag clicked');
        let main = $$('main');
        main.style.visibility = 'visible';
        receiver = Number(this.id.replace('group_', ''));
        console.log(user + ' chats with group' + receiver);
        // 2. main: retrieve history
        while (messages.firstChild) {
            messages.removeChild(messages.firstChild);
        }
        let history = message_store.GetMessage(receiver);
        console.log(history);
        for (let i = 0; i < history.length; ++i){
            let tmpMessage = history[i];
            let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, user);
            messages.appendChild(msg_html);
        }
        messageBox.scrollTop = messageBox.scrollHeight;
    };
    let ul_groups = $$('friends');
    let li_groups = document.createElement('li');
    li_groups.id = 'group_' + groupinfo.groupid;
    li_groups.style.height="60px";
    li_groups.style.padding="10px";
    li_groups.innerHTML =
        '<button type="button" '+' id="delete_group_'+groupinfo.groupid+'" data-dismiss="modal" '+'class="close" '+'name='+ 'group_' +groupinfo.groupid +' style="float: left; width: 10%" > '+
        ' <span aria-hidden="true" style="color: white">×</span>' +
        '<span class="sr-only">Close</span>'+
        '</button>'+
        '<div class="avatar" style="float: left; margin-left: 1em; width: 25%">' +
        '<img alt="avatar" id=' + 'group_' + groupinfo.groupid + '_avatar src= "/' + path + '"/>' +
        '</div >' +
        '<div class="main_li" style="width: 50%">' +
        '<div class="username">' + '群组_' + groupinfo.groupid + '</div>';
    li_groups.onclick = onclick_group;
    message_store.StoreHistory(groupinfo.groupid, groupinfo.messages);
    message_store.StoreHistory('group_members_' + groupinfo.groupid, groupinfo.members);
    ul_groups.appendChild(li_groups);
    $('#delete_group_'+groupinfo.groupid).click(
        ()=>{
            let confirm_res=confirm('你确定要退出该群聊吗？');
            if (confirm_res){
                let del_info={
                    requestUserName: user,
                    requestGroupId:groupinfo.groupid
                };
                socket.emit('group:del',del_info);
            }
        }
    );
});

socket.on('user:get_friends_avatar', (data,res) => {
    let path = 'data/avatar/user.png';
    if (res !== null){
        path = url_base + image_base + res ;
    }
    let onclick_friend = function () {
        $$('input').readOnly = false;
        if (selected_receiver === this.id){
            return;
        }
        if (selected_receiver !== null){
            $$(selected_receiver).style.backgroundColor = "";
        }
        $$(this.id).style.backgroundColor = "#2626ff";
        selected_receiver = this.id;
        is_group_chat = false;
        console.log(this.id + ' tag clicked');
        let main = $$('main');
        main.style.visibility = 'visible';
        receiver = this.id.replace('friend_', '');
        console.log(user + ' chats with ' + receiver);

        // 2. main: retrieve history
        let sel = { sender: user, receiver: receiver };
        if (message_store.Exist(receiver)) {
            //已有聊天记录
            while (messages.firstChild) {
                messages.removeChild(messages.firstChild);
            }
            let history = message_store.GetMessage(receiver);
            for (let i = 0; i < history.length; ++i){
                let tmpMessage = history[i];
                let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, user);
                messages.appendChild(msg_html);
            }
            messageBox.scrollTop = messageBox.scrollHeight;
        }
        else{
            socket.emit('chat:history', sel, (history) => {
                while (messages.firstChild) {
                    messages.removeChild(messages.firstChild);
                }
                if (history === null){
                    message_store.StoreHistory(receiver,[]);
                    return;
                }
                for (var i = 0; i < history.messages.length; ++i) {
                    let tmpMessage = history.messages[i];
                    let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, user);
                    messages.appendChild(msg_html);
                }
                messageBox.scrollTop = messageBox.scrollHeight;
                message_store.StoreHistory(receiver,history.messages);
            });
        }
    };
    let friend_name = data;
    let ul_friends = $$('friends');
    let li_friend = document.createElement('li');
    li_friend.id = 'friend_' + friend_name;
    li_friend.style.height="60px";
    li_friend.style.padding="10px";
    li_friend.innerHTML =
        '<button type="button" '+' id="delete_friend_'+friend_name+'" data-dismiss="modal" '+'class="close" '+'name='+friend_name+' style="float: left; width: 10%" > '+
        ' <span aria-hidden="true" style="color: white">×</span>' +
        '<span class="sr-only">Close</span>'+
        '</button>'+
            '<div class="avatar" style="float: left; margin-left: 1em; width: 25%">' +
                '<img alt="avatar" id=' + friend_name + '_avatar src= "/' + path + '"/>' +
            '</div >' +
            '<div class="main_li" style="width: 50%">' +
                '<div class="username">' + friend_name + '</div>';
    li_friend.onclick = onclick_friend;
    ul_friends.appendChild(li_friend);
    $('#delete_friend_'+friend_name).click(
        ()=>{
            let confirm_res=confirm('你确定要删除该好友吗？');
            if (confirm_res){
                let del_info={
                    requestUserName: user,
                    requestFriendName:friend_name
                };
                socket.emit('chat:del',del_info);
            }
        }
    );

});

socket.on('user:get_avatar', (res) => {
  console.log(res);
  let path = 'data/avatar/user.png';
  if (res !== null){
    path = url_base + image_base + res ;
  }
  let img_user_avatar = $$('user_avatar');
  img_user_avatar.src = path;
  $$(authinfo.username+'_avatar').src = path;
  console.log($$(authinfo.username+'_avatar'));
});

$$('send').onclick = () => {
  if (input.value.length === 0) return;
  console.log('message to sent to ' + receiver + ' from ' + user);
  let msg_html = MessageDirector.GetInstance.createHTMLFromPlain(input.value);
  //let msg_escape = message2escape(input.value);
  //let msg_html = message2html(input.value);
  messages.appendChild(msg_html);
  messageBox.scrollTop = messageBox.scrollHeight;

  //let builder_msg = new TextMessageBuilder().createHTMLFromPlain(input.value);
  //messages.appendChild(builder_msg);
  let message = MessageDirector.GetInstance.createMessage(input.value, authinfo.username, receiver);
  if(is_group_chat === false)
      socket.emit('chat:message', message);
  else
      socket.emit('groupchat:message', message, message_store.GetMessage('group_members_' + receiver));
  // message_store.AppendMessage(receiver,message.message);
  input.value = '';
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
    //发送图片消息
      let imagemessage = '[img:' + upload_image.md5 + '.' + upload_image.suffix + ']';
      let imagehtml = MessageDirector.GetInstance.createHTMLFromPlain(imagemessage);
      appendMessage(imagehtml);
      messageBox.scrollTop = messageBox.scrollHeight;
      let message = MessageDirector.GetInstance.createMessage(imagemessage,authinfo.username,receiver);
      socket.emit('chat:message', message);
      message_store.AppendMessage(receiver, message.message);
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
  if (change_avater){
      socket.emit('user:avatar',{user: authinfo.username, md5: avater_md5});
      change_avater = false;
      avater_md5 = null;
      return
  }
    //发送图片消息
    let imagemessage = '[img:' + upload_image.md5 + '.' + upload_image.suffix + ']';
    let imagehtml = MessageDirector.GetInstance.createHTMLFromPlain(imagemessage);
    appendMessage(imagehtml);
    messageBox.scrollTop = messageBox.scrollHeight;
    let message = MessageDirector.GetInstance.createMessage(imagemessage,authinfo.username,receiver);
    socket.emit('chat:message', message);
    message_store.AppendMessage(receiver, message.message);
    upload_image = {};
  }
  else {
    //上传出错
    console.log('upload fail');
    upload_image = {};
  }
});

socket.on('user:avatar', (res) => {
    if (res){
        socket.emit('user:get_avatar', {user: authinfo.username});
    }
    else {
        alert('修改头像错误，请稍后再试');
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
  };
  reader.readAsDataURL(image);
  $$('open_file').value = "";
}, false);
$$('select_image').onclick = () => {
  $("#open_file").trigger("click");
};


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


// part 4: friends and groups controll
//add
$$('add-btn').onclick = () =>{
    $('#add-body').show();
    $('#add-bg').show();
    $('#add-friend-name').attr("autofocus", "autofocus");
}

$$('add-close').onclick = ()=>{
    $('#add-body').hide();
    $('#add-bg').hide();
    //清空保存的好友名和提示信息
    $('#add-friend-name').val('');
    $('#add-friend-msg').empty();
    $('#add-friend-msg').hide();
    //清空保留的群聊名
    $('#add-group-name').val('');

}

$$('add-friend').onclick=()=>{
    $('#add-friend-name').attr("autofocus", "autofocus");
    $('#add-friend-body').show();
    $('#add-group-body').hide();
}

$$('add-group').onclick=()=>{
    $('#add-group-name').attr("autofocus", "autofocus");
    $('#add-friend-body').hide();
    $('#add-group-body').show();
}

$$('add-friend-btn').onclick =()=>{
    // console.log($('#add-friend-name').val().length);
    if ($('#add-friend-name').val().length===0){     //输入的添加好友的账号为空
        $('#add-friend-msg').html('添加好友账号不能为空！');
        $('#add-friend-msg').show();
    }
    else {
        $('#add-friend-msg').empty();
        var data={
            requestUserName: user,
            requestFriendName:$('#add-friend-name').val()
        };
        $('#add-friend-msg').hide();
        socket.emit('chat:add',data);
        // window.location.reload(true);
    }
}

socket.on('chat:add', (res) => {        //处理返回结果
        if (res === null) {
            alert("该账号不存在！");
        }
        else if (res === 'exist') {
            alert("已是好友！");
        }
        else if (res === 'success') {
            window.location.reload(true);
            alert("添加成功");
        }
        else {
            alert("其它错误！");
        }
    }
);

socket.on('chat:del',(res)=>{
    if (res){
        alert('删除成功');
        window.location.reload(true);
    }
});

//group controll

//创建群聊
$$('create-group-btn').onclick=()=>{
    socket.emit('group:create',user);
}

socket.on('group:crate',(res)=>{
    if (res){
        window.location.reload(true);
        alert('创建群聊成功！');
    }
});

//加入群聊
$$('add-group-btn').onclick=()=>{
    if ($('#add-group-name').val().length===0){             //群聊账号不能为空
        $('#add-group-msg').html('添加的群聊账号不能为空！');
        $('#add-group-msg').show();
    }
    else {
        $('#add-group-msg').empty();
        var data={
            requestUserName: user,
            requestGroupId: Number($('#add-group-name').val())
        };
        if (isNaN(data.requestGroupId)){
            $('#add-group-msg').html('输入的账号应为数字！');
            $('#add-group-msg').show();
            return;
        }
        $('#add-group-msg').hide();
        socket.emit('group:add',data);
    }
}

socket.on('group:add', (res) => {
    if (res===null){
        alert('该群聊不存在！');
    }
    else if (res==='success'){
        window.location.reload(true);
        alert("添加成功");
    }
    else {
        alert("其它错误！");
    }
});

socket.on('group:del',(res)=>{
   if (res){
       window.location.reload(true);
       alert('成功退出群聊！');
   }
});

// Finally: main start
/* auto login */

//TODO: 为了测试把自动登录关掉了
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
});

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
        && target.attr("class") !== "btn btn-default")
    {
        $('#select_emoji').popover('hide');
    }
});
