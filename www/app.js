// Part 1: public util function & globals
function $$(id) {
    return document.getElementById(id);
}

const socket = io.connect();
socket.on('disconnect', () => {
    socket.open();
});
var url_base = socket.io.uri; // 'http://localhost:3000'
var image_base = '/data/images/';
let authinfo, user;
let upload_image = {};
let change_avater = false;
let avater_md5 = null;
let is_group_chat = false;
let avatar_store = new Map();
let selected_receiver = null;
let group_config = null;
let group_members = [];
var nowreceiver = null;
var nowreceivergroup = null;
var hiddenProperty = 'hidden' in document ? 'hidden' :
    'webkitHidden' in document ? 'webkitHidden' :
        'mozHidden' in document ? 'mozHidden' :
            null;
var being_at = false;

// wallpaper

function appendMessage(html) { $$('messages').appendChild(html); }

// Part 2: login status control
function change_login_status(status) {
    if (status) {
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
  let u = $$('username').value;
  let p = $$('password').value;
  if (u === '' || u === undefined
      || p === '' || p === undefined) return;
  authinfo = {
    username: u,
    password: SparkMD5.hash(p),
  };
  socket.emit('user:register', authinfo);
};
socket.on('user:register', (res) => {
  alert(authinfo.username +
      (res === true
          ? " 注册成功，请登录"
          : " 注册失败"));
});
socket.on('user:offline', () => {
    alert("检测到有其它终端登录该账号，您已被强制下线");
    change_login_status(false);
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
    alert(authinfo.username + " 登陆失败");
    store.remove('authinfo');
    return;
  }
  change_login_status(true);
  let img = document.createElement('img');
  img.style.display = 'none';
  img.src = $$('user_avatar').src;
  img.id = authinfo.username + '_avatar';
  $$('user_avatar').appendChild(img);
  socket.emit('get_all_info');
  socket.emit('user_store:list',authinfo.username);
  // socket.emit('user:get_avatar',{user: authinfo.username});
  // socket.emit('user:get_userinfo', authinfo, (userinfo) => {
  //   let user = userinfo;
  //   console.log(user);
  //   let div_user_username = $$('user_username');
  //   div_user_username.textContent = user.username;
  //   if(user.friends) for (let i = 0; i < user.friends.length; ++i) {
  //     socket.emit('user:get_friends',{user: user.friends[i]});
  //   }
  //   if(user.ingroup) for (let i = 0; i < user.ingroup.length; ++i){
  //       socket.emit('user:get_groups',{groupid: user.ingroup[i]});
  //   }
  // });
});

$$('log_out').onclick = () => {
  if (confirm('确认注销吗?')) change_login_status(false);
};
$$('user_avatar').onclick = () => {
    $("#change_avatar").trigger("click");
};
$$('change_avatar').addEventListener('change', function () {
    if (this.files.length === 0) return;
    let image = this.files[0];
    if(!image.type.startsWith('image')) {
        alert('格式错误：请选择图片文件！');
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
let receiver = 'test2';      //测试用
var messageBox = document.getElementById('messages');
var timer = null;


function FlashTitle(title,content) {
    var index = 0;
    clearInterval(timer);
    timer = setInterval(function () {
        if (index % 2) {
            $('title').text('【　　　】from ' + title);//这里是中文全角空格，其他不行
        } else {
            if(being_at == false)
                $('title').text('【新消息】from '+title );
            else {
                $('title').text('【有人@你】from ' + title);
            }
        }
        index++;

        if (index > 20) {
            clearInterval(timer);
            document.title = "Lethe";
        }
    }, 500);
    if (!document[hiddenProperty]) {
        //document.title='被发现啦(*´∇｀*)';
        //document.title="Lethe";
    } else{ }
}

function clearTitle() {
    clearInterval(timer);
    document.title = "Lethe";
}

function newNotification(title, options) {
    console.log("createNotification");
    title = title || '新的消息';
    if(being_at)
        title = '【有人@你】' + title;
    options = options || {
        body: '默认消息',
        icon: 'https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1529265914393&di=d7674e59ceee8914874e00178d2160e4&imgtype=0&src=http%3A%2F%2Fpic.58pic.com%2F10%2F81%2F55%2F47bOOOPIC9f.jpg'
    }
    return new Notification(title, options);
}

socket.on('chat:message', (msg) => {
    let notiflag = 0;
    let checkat = '@' + authinfo.username + ' ';
        if(msg.message.content.indexOf(checkat)!= -1) {
            being_at = true;
        }
        else
            being_at = false;
    console.log(msg.message.content);
    FlashTitle(msg.sender,msg.message.content);
    var a = {
        body: msg.message.content,
        icon: 'https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1529265914393&di=d7674e59ceee8914874e00178d2160e4&imgtype=0&src=http%3A%2F%2Fpic.58pic.com%2F10%2F81%2F55%2F47bOOOPIC9f.jpg'
    }
    if(document[hiddenProperty]){
        notiflag = 1;
        newNotification(msg.sender+' send you a message!',a);
    }
    if(nowreceiver !=msg.sender)
    {

        $$('friend_unreadTag_' + msg.sender).style.display = "block";
        var num = $$('friend_unreadNum_' + msg.sender).innerHTML;
        var numInt = parseInt(num) + 1;
        $$('friend_unreadNum_' + msg.sender).innerHTML = numInt;
        if(notiflag!=1) {
            newNotification(msg.sender + ' send you a message!', a);
        }
    }
    if (message_store.Exist(msg.sender)) {
        message_store.AppendMessage(msg.sender, msg.message);
    }
    if (receiver === msg.sender)
        appendMessage(MessageDirector.GetInstance.createHTML(msg.message, avatar_store.get(msg.sender), authinfo.username));
    messageBox.scrollTop = messageBox.scrollHeight;
});


socket.on('groupchat:message', (msg) => {
    let notiflag = 0;
    if(msg.sender!=$$('user_username').innerText){
        var checkat = '@' + authinfo.username + ' ';
        if(msg.message.content.indexOf(checkat) != -1) {
            being_at = true;
        }
        else
            being_at = false;
        FlashTitle("新群聊消息",msg.content);
    }

    var a = {
        body: "快去看看！",
        icon: 'https://timgsa.baidu.com/timg?image&quality=80&size=b9999_10000&sec=1529265914393&di=d7674e59ceee8914874e00178d2160e4&imgtype=0&src=http%3A%2F%2Fpic.58pic.com%2F10%2F81%2F55%2F47bOOOPIC9f.jpg'

    }
    if(document[hiddenProperty]) {
        notiflag = 1;
        newNotification("新群聊消息！", a);
    }
    if(nowreceivergroup!=msg.target && msg.sender!=$$('user_username').innerText) {
    if(notiflag!=1) {
        newNotification("新群聊消息！", a);
    }
    $$('group_unreadTag_' + msg.target).style.display = "block";
    var num = $$('group_unreadNum_' + msg.target).innerHTML;
    var numInt = parseInt(num) + 1;
    $$('group_unreadNum_' + msg.target).innerHTML = numInt;
}
    if(msg.sender !== authinfo.username){
        message_store.AppendMessage(msg.target, msg.message);
        if (receiver === msg.target)
            appendMessage(MessageDirector.GetInstance.createHTML(msg.message, avatar_store.get(msg.sender), authinfo.username));
    }
    messageBox.scrollTop = messageBox.scrollHeight;
});

socket.on('user_store:list',(data)=>{

    if(data) {
        for (let i = 0; i < data.length; ++i) {

            let friend_name = data[i];
            let ul_friends = $$('friends');
            let li_friend = document.createElement('li');
            li_friend.id = 'friend_' + friend_name;
            li_friend.style.height="60px";
            li_friend.style.padding="10px";
            li_friend.innerHTML =
                '<button type="button" '+' id="no_friend_'+friend_name+'" data-dismiss="modal" '+'class="close" '+'name='+friend_name+' style="float: left; width: 10%" > '+
                ' <span class="material-icons" aria-hidden="true" style="color: white">delete</span>' +
                '<span class="sr-only">Close</span>'+
                '</button>'+
                '<div class="main_li" style="width: 50%">' +
                '<div class="username"><span>' + friend_name + '<div style="float:right;display: none" >'+'<span style="border-radius: 50%;    height: 20px;    width: 20px;    display: inline-block;    background: #FA676A;      vertical-align: top;">'+
                '<span style="display: block;    color: #FFFFFF;    height: 20px;    line-height: 20px;    text-align: center" >0</span>'+
                '</span>'+'</div>'+ '</span><i style="float: right" class="material-icons" id="yes_friend_' + friend_name + '">check_circle_outline</i></div>'
            ul_friends.appendChild(li_friend);
            $('#no_friend_'+friend_name).click(
                ()=>{
                let confirm_res=confirm('你确定要拒绝该好友请求吗？');
            if (confirm_res){
                let del_info={
                    requestUserName: user,
                    requestFriendName:friend_name,
                    decision:'No'
                };
                socket.emit('user_insert:add',del_info);

            }
        }
        );
            $('#yes_friend_'+friend_name).click(
                ()=>{
                let confirm_res=confirm('你确定要同意该好友请求吗？');
            if (confirm_res){
                let del_info={
                    requestUserName: user,
                    requestFriendName:friend_name,
                    decision:'Yes'
                };
                socket.emit('user_insert:add',del_info);

            }
        }
        );

        }
    }
});

function addGroupsList(groupid) {
    socket.emit('user:get_groups', {groupid: groupid}, (res) => {
        let groupinfo = res;
        let path = 'data/avatar/group.png';
        let onclick_group = function () {
            $$('group_unreadTag_' + groupid).style.display = "none";
            $$('group_unreadNum_' + groupid).innerHTML = '0';
            nowreceiver = null;
            nowreceivergroup = groupid;
            $$('input').readOnly = false;
            $$('input').value = '';
            if (selected_receiver === this.id) return;
            if (selected_receiver !== null) {
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
            $$('chat_title').textContent = '在群组 ' + (groupinfo.groupname || receiver) + ' 内聊天';
            // 2. main: retrieve history
            while (messages.firstChild) {
                messages.removeChild(messages.firstChild);
            }
            let history = message_store.GetMessage(receiver);
            //console.log(history);
            for (let i = 0; i < history.length; ++i) {
                let tmpMessage = history[i];
                let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, avatar_store.get(tmpMessage.sender), user);
                messages.appendChild(msg_html);
            }
            messageBox.scrollTop = messageBox.scrollHeight;
        };
        let ul_groups = $$('friends');
        let li_groups = document.createElement('li');
        li_groups.id = 'group_' + groupinfo.groupid;
        li_groups.style.height = "60px";
        li_groups.style.padding = "10px";
        li_groups.innerHTML =
            '<button type="button" ' + ' id="delete_group_' + groupinfo.groupid + '" data-dismiss="modal" ' + 'class="close" ' + 'name=' + 'group_' + groupinfo.groupid + ' style="float: left; width: 10%" > ' +
            ' <span aria-hidden="true" style="color: white">×</span>' +
            '<span class="sr-only">Close</span>' +
            '</button>' +
            '<div class="avatar" style="float: left; margin-left: 1em; width: 25%">' +
            '<img alt="avatar" id=' + 'group_' + groupinfo.groupid + '_avatar src= "/' + path + '"/>' +
            '</div >' +
            '<div class="main_li" style="width: 50%">' +
            '<div class="username"><span>' + (groupinfo.groupname || ( "群组_"+groupinfo.groupid )) + '<div style="float:right;display: none"  id="group_unreadTag_'+  groupinfo.groupid +  '">'+'<span style="border-radius: 50%;    height: 20px;    width: 20px;    display: inline-block;    background: #FA676A;      vertical-align: top;">'+
            '<span style="display: block;    color: #FFFFFF;    height: 20px;    line-height: 20px;    text-align: center" id="group_unreadNum_'+groupinfo.groupid+'">0</span>'+
            '</span>'+'</div>'+ '</span><i style="cursor: pointer ;float: right" class="material-icons" id="conf_' + groupinfo.groupid + '">build</i></div>';
        li_groups.onclick = onclick_group;
        message_store.StoreHistory(groupinfo.groupid, groupinfo.messages);
        message_store.StoreHistory('group_members_' + groupinfo.groupid, groupinfo.members);
        ul_groups.appendChild(li_groups);
        $('#delete_group_'+groupinfo.groupid).click(()=>{
                let confirm_res=confirm('你确定要退出该群聊吗？');
                if (confirm_res){
                    let del_info={
                        requestUserName: user,
                        requestGroupId: groupinfo.groupid
                    };
                    socket.emit('group:del', del_info);
                }
            }
        );
        $('#conf_' + groupinfo.groupid).click(()=>{
                group_config = groupinfo.groupid;
                //console.log(group_config);
                socket.emit('groupchat:get_list', group_config);
                $('#conf-body').show();
            }
        );
    });
}

function addFriendsList(name) {
    let onclick_friend = function () {
        nowreceivergroup = null;
        nowreceiver = name;
        clearInterval(timer);
        document.title = "Lethe";
        $$('input').readOnly = false;
        $$('input').value = "";
        $$('friend_unreadTag_' + friend_name).style.display = "none";
        $$('friend_unreadNum_' + friend_name).innerHTML = '0';
        if (selected_receiver === this.id) return;
        if (selected_receiver !== null) {
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
        $$('chat_title').textContent = '与 ' + receiver + ' 聊天';

        // 2. main: retrieve history
        let sel = {sender: user, receiver: receiver};
        if (message_store.Exist(receiver)) {
            //已有聊天记录
            while (messages.firstChild) {
                messages.removeChild(messages.firstChild);
            }
            let history = message_store.GetMessage(receiver);
            for (let i = 0; i < history.length; ++i) {
                let tmpMessage = history[i];
                let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, avatar_store.get(tmpMessage.sender), user);
                messages.appendChild(msg_html);
            }
            messageBox.scrollTop = messageBox.scrollHeight;
        }
        else {
            socket.emit('chat:history', sel, (history) => {
                while (messages.firstChild) {
                    messages.removeChild(messages.firstChild);
                }
                if (history === null) {
                    message_store.StoreHistory(receiver, []);
                    return;
                }
                for (var i = 0; i < history.messages.length; ++i) {
                    let tmpMessage = history.messages[i];
                    let msg_html = MessageDirector.GetInstance.createHTML(tmpMessage, avatar_store.get(tmpMessage.sender), user);
                    messages.appendChild(msg_html);
                }
                messageBox.scrollTop = messageBox.scrollHeight;
                message_store.StoreHistory(receiver, history.messages);
            });
        }
    };
    let friend_name = name;
    let path = 'data/avatar/user.png';
    if (avatar_store.get(friend_name) !== 'default') {
        path = url_base + image_base + avatar_store.get(friend_name);
    }
    let ul_friends = $$('friends');
    let li_friend = document.createElement('li');
    li_friend.id = 'friend_' + friend_name;
    li_friend.style.height = "60px";
    li_friend.style.padding = "10px";
    li_friend.innerHTML =
        '<button type="button" ' + ' id="delete_friend_' + friend_name + '" data-dismiss="modal" ' + 'class="close" ' + 'name=' + friend_name + ' style="float: left; width: 10%" > ' +
        ' <span aria-hidden="true" style="color: white">×</span>' +
        '<span class="sr-only">Close</span>' +
        '</button>' +
        '<div class="avatar" style="float: left; margin-left: 1em; width: 25%">' +
        '<img alt="avatar" id=' + friend_name + '_avatar src= "' + path + '"/>' +
        '</div >' +
        '<div class="main_li" style="width: 50%">' +
        '<div class="username" style="float:left">' + friend_name + '</div>' +
        '<div style="float:right;display: none"  id="friend_unreadTag_' + friend_name + '">' + '<span style="border-radius: 50%;    height: 20px;    width: 20px;    display: inline-block;    background: #FA676A;      vertical-align: top;">' +
        '<span style="display: block;    color: #FFFFFF;    height: 20px;    line-height: 20px;    text-align: center" id="friend_unreadNum_' + friend_name + '">0</span>' +
        '</span>' + '</div>';
    li_friend.onclick = onclick_friend;
    ul_friends.appendChild(li_friend);
    $('#delete_friend_' + friend_name).click(
        () => {
            let confirm_res = confirm('你确定要删除该好友吗？');
            if (confirm_res) {
                let del_info = {
                    requestUserName: user,
                    requestFriendName: friend_name
                };
                socket.emit('chat:del', del_info);
            }
        }
    );
}

// socket.on('user:get_avatar', (res) => {
//   console.log(res);
//   let path = 'data/avatar/user.png';
//   if (res !== null){
//     path = url_base + image_base + res ;
//   }
//   let img_user_avatar = $$('user_avatar');
//   img_user_avatar.src = path;
//   $$(authinfo.username+'_avatar').src = path;
//   console.log($$(authinfo.username+'_avatar'));
// });

socket.on('get_all_info', (res) => {
    //console.log(res);
    avatar_store.clear();
    let tmpLen = res.length;
    let userIndex;
    for (let i = 0; i < tmpLen; i++) {
        if (res[i].avatar === undefined || res[i].avatar === null) {
            avatar_store.set(res[i].username, 'default');
        }
        else {
            avatar_store.set(res[i].username, res[i].avatar);
        }
        if (res[i].username === authinfo.username)
            userIndex = i;
    }

    let user = res[userIndex];
    //console.log(user);

    let path = 'data/avatar/user.png';
    if (avatar_store.get(authinfo.username) !== 'default') {
        path = url_base + image_base + user.avatar;
    }
    let img_user_avatar = $$('user_avatar');
    img_user_avatar.src = path;
    $$(authinfo.username + '_avatar').src = path;

    let div_user_username = $$('user_username');
    div_user_username.textContent = user.username;

    if (user.friends) for (let i = 0; i < user.friends.length; ++i) {
        addFriendsList(user.friends[i]);
    }
    if (user.ingroup) for (let i = 0; i < user.ingroup.length; ++i) {
        addGroupsList(user.ingroup[i]);
    }
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
    if (is_group_chat === false)
        socket.emit('chat:message', message);
    else
        socket.emit('groupchat:message', message, message_store.GetMessage('group_members_' + receiver));
    message_store.AppendMessage(receiver, message.message);
    input.value = '';
};

// Part 3: picture-related control
socket.on('picture:query', (res) => {
    if (res) {
        //图片已存在，发送消息
        console.log('image exists');
        if (change_avater) {
            socket.emit('user:avatar', {user: authinfo.username, md5: upload_image.md5, suffix: upload_image.suffix});
            change_avater = false;
            avater_md5 = null;
            return
        }
        //发送图片消息
        let imagemessage = '[img:' + upload_image.md5 + '.' + upload_image.suffix + ']';
        let imagehtml = MessageDirector.GetInstance.createHTMLFromPlain(imagemessage);
        appendMessage(imagehtml);
        messageBox.scrollTop = messageBox.scrollHeight;
        let message = MessageDirector.GetInstance.createMessage(imagemessage, authinfo.username, receiver);
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
    if (res) {
        //上传成功，发送消息
        console.log('upload success');
        if (change_avater) {
            socket.emit('user:avatar', {user: authinfo.username, md5: upload_image.md5, suffix: upload_image.suffix});
            change_avater = false;
            avater_md5 = null;
            return
        }
        //发送图片消息
        let imagemessage = '[img:' + upload_image.md5 + '.' + upload_image.suffix + ']';
        let imagehtml = MessageDirector.GetInstance.createHTMLFromPlain(imagemessage);
        appendMessage(imagehtml);
        messageBox.scrollTop = messageBox.scrollHeight;
        let message = MessageDirector.GetInstance.createMessage(imagemessage, authinfo.username, receiver);
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
    if (res) {
        avatar_store.set(authinfo.username, upload_image.md5 + '.' + upload_image.suffix);
        $$('user_avatar').src = url_base + image_base + avatar_store.get(authinfo.username);
    }
    else {
        alert('修改头像错误，请稍后再试');
    }
});

$$('open_file').addEventListener('change', function () {
    if (this.files.length === 0) return;
    let image = this.files[0];
    if (!image.type.startsWith('image')) {
        alert('this is not a image file.');
        $$('open_file').value = "";
        return;
    }
    //console.log(image);
    upload_image.suffix = image.name.toLowerCase().split('.').splice(-1)[0];
    let reader = new FileReader();
    if (!reader) {
        console.log('error init FileReader.');
        $$('open_file').value = "";
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


// part 4: friends and groups controll
//add
$$('add-btn').onclick = () => {
    $('#add-body').show();
    $('#add-bg').show();
    $('#add-friend-name').attr("autofocus", "autofocus");
};

$$('add-close').onclick = () => {
    $('#add-body').hide();
    $('#add-bg').hide();
    //清空保存的好友名和提示信息
    $('#add-friend-name').val('');
    $('#add-friend-msg').empty();
    $('#add-friend-msg').hide();
    //清空保留的群聊名
    $('#add-group-name').val('');

};

$$('add-friend').onclick = () => {
    $('#add-friend-name').attr("autofocus", "autofocus");
    $('#add-friend-body').show();
    $('#add-group-body').hide();
};

$$('add-group').onclick = () => {
    $('#add-group-name').attr("autofocus", "autofocus");
    $('#add-friend-body').hide();
    $('#add-group-body').show();
};

$$('add-friend-btn').onclick = () => {
    // console.log($('#add-friend-name').val().length);
    if ($('#add-friend-name').val().length === 0) {     //输入的添加好友的账号为空
        $('#add-friend-msg').html('添加好友账号不能为空！');
        $('#add-friend-msg').show();
    }
    else {
        $('#add-friend-msg').empty();
        var data = {
            requestUserName: user,
            requestFriendName: $('#add-friend-name').val()
        };
        $('#add-friend-msg').hide();
        socket.emit('user_store:add',data);
        // window.location.reload(true);
    }
};


$$('rename-group-btn').onclick = () => {
    if ($('#rename-group-name').val().length === 0) {     //输入为空
        $.alert("群名不能为空！");
    }
    let data = {
        chat_id: group_config,
        name: $('#rename-group-name').val()
    };
    socket.emit('groupchat:rename', data);
    $('li#group_' + group_config + ' div.username span').html($('#rename-group-name').val());
    $('#conf-body').hide();
    $('#add-bg').hide();
    $('#rename-group-name').val('');
};

$$('add-user-btn').onclick = () => {
    if ($('#conf-user-name').val().length === 0) {     //输入为空
        $.alert("不能为空！");
    }
    let data = {
        chat_id: group_config,
        name: $('#conf-user-name').val()
    };
    socket.emit('groupchat:add', data);
    $('#conf-body').hide();
    $('#add-bg').hide();
    $('#conf-user-name').val('');
};

$$('del-user-btn').onclick = () => {
    if ($('#conf-user-name').val().length === 0) {     //输入为空
        $.alert("不能为空！");
    }
    let data = {
        chat_id: group_config,
        name: $('#conf-user-name').val()
    };
    socket.emit('groupchat:kick', data);
    $('#conf-body').hide();
    $('#add-bg').hide();
    $('#conf-user-name').val('');
};

$$('conf-name').onclick = () => {
    $('#rename-group-body').attr("autofocus", "autofocus");
    $('#rename-group-body').show();
    $('#conf-user-body').hide();
};

$$('conf-user').onclick = () => {
    $('#conf-user-body').attr("autofocus", "autofocus");
    $('#rename-group-body').hide();
    $('#conf-user-body').show();
};

$$('conf-close').onclick = () => {
    $('#conf-body').hide();
    $('#add-bg').hide();
    $('#rename-group-name').val('');
};

socket.on('user_store:add', (res) => {        //处理返回结果
    if (res === null) {
    alert("该账号不存在！");
}
else if (res === 'exist1') {
    alert("已是好友！");
}
else if(res === 'exist2'){
    alert("对方还未回复！");
}
else if (res === 'success') {
    window.location.reload(true);
    alert("添加成功,请等待对方回复");
}
else {
    alert("其它错误！");
}
}
);

socket.on('chat:del', (res) => {
    if (res) {
        alert('删除成功');
        window.location.reload(true);
    }
});
socket.on('user_insert:add',(res)=>{
    if(res===true){
        alert('添加好友成功');
        window.location.reload(true);
    }
    else{
        alert('拒绝好友申请成功');
        window.location.reload(true);
    }
});
//group controll

//创建群聊
$$('create-group-btn').onclick = () => {
    socket.emit('group:create', user);
}

socket.on('group:crate', (res) => {
    if (res) {
        window.location.reload(true);
        alert('创建群聊成功！');
    }
});

//加入群聊
$$('add-group-btn').onclick = () => {
    if ($('#add-group-name').val().length === 0) {             //群聊账号不能为空
        $('#add-group-msg').html('添加的群聊账号不能为空！');
        $('#add-group-msg').show();
    }
    else {
        $('#add-group-msg').empty();
        var data = {
            requestUserName: user,
            requestGroupId: Number($('#add-group-name').val())
        };
        if (isNaN(data.requestGroupId)) {
            $('#add-group-msg').html('输入的账号应为数字！');
            $('#add-group-msg').show();
            return;
        }
        $('#add-group-msg').hide();
        socket.emit('group:add', data);
    }
}

socket.on('group:add', (res) => {
    if (res === null) {
        alert('该群聊不存在！');
    }
    else if (res === 'success') {
        alert("添加成功");
        addGroupsList(Number($('#add-group-name').val()));
    }
    else {
        alert("其它错误！");
    }
});

socket.on('group:del', (res) => {
    if (res) {
        window.location.reload(true);
        alert('成功退出群聊！');
    }
});

//更新群员缓存
socket.on('renew:members', (username, GID, type) => {
    let GroupMembersID = 'group_members_' + GID;
    if (type === 'add') {
        message_store.AppendMembers(GroupMembersID, username);
    }
    else if (type === 'delete') {
        message_store.DeleteMembers(GroupMembersID, username);
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

// ok, now show HTML body
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

function get_emoji_list() {
    let emojis=["😀", "😁","😂","😃","😄","😅","😆","😇",
      "😈","😉","😊","😋","😌","😍","😎","😏","😐","😑","😒",
      "😓","😔","😕","😖","😗","😘","😙","😚","😛","😜","😝",
      "😞","😟","😠","😡","😢","😣","😤","😥","😦","😧","😨",
      "😩","😪","😫","😬","😭","😮","😯","😰","😱","😲","😳",
      "😴","😵","😶","😷","😸","😹","😺","😻","😼","😽","😾",
      "😿","🙀","🙅","🙆","🙇","🙈","🙉","🙊","🙋","🙌","🙍",
      "🙎","🙏"];
    let emojilist="";
    for(let i=0;i<emojis.length/4;i++) {
        emojilist+="<div>";
        for (let j=0;j<=3;j++) {
          emojilist+="<button type=\"button\" class=\"btn btn-default\" onclick=\"add_emoji(this)\">"
              +emojis[i]+"</button>";
        }
        emojilist+="</div>";
    }
    return emojilist;
}

$(document).ready(function () {
    $('#select_emoji').popover(
        {
            trigger: 'click',
            title: "Choose emoji",
            html: true,
            content: get_emoji_list(),
            placement: 'top',
            container: 'body'
        }
    )
});
socket.on('groupchat:get_list', (res) => {
    console.log(res);
    group_members = res;
    show_group_members(group_members);

});
// $$('select_emoji').addEventListener('click', (evt) => {
//     //emojis.style.display = 'block';
//     //evt.stopPropagation()
//     //$('[data-toggle="popover"]').popover('toggle');
//
// }, false);

//弹窗隐藏
document.body.addEventListener('click', function (event) {
    var target = $(event.target);
    if (!target.hasClass('popover') //弹窗内部点击不关闭
        && target.parent('.popover-content').length === 0
        && target.parent('.popover-title').length === 0
        && target.parent('.popover').length === 0
        && target.data("toggle") !== "popover"
        && target.attr("class") !== "btn btn-default") {
        $('#select_emoji').popover('hide');
    }
});
window.onload = () => {
  if (window.Notification) {
    if (Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }
}

function show_group_members(members) {
    $$('member-ul').innerHTML = "";
    for (let i = 0; i < members.length; i++) {
        let friend_name = members[i];
        let path = 'data/avatar/user.png';
        if (avatar_store.get(friend_name) !== 'default') {
            path = url_base + image_base + avatar_store.get(friend_name);
        }
        let li_friend = document.createElement('li');
        li_friend.id = 'friend_' + friend_name;
        li_friend.style.height = "70px";
        li_friend.style.width = "50px";
        li_friend.style.cssFloat = "left";
        li_friend.style.borderRadius = "3px";
        li_friend.style.listStyleType = "none";
        li_friend.innerHTML =
            '<div class="avatar" style="display:table-cell;height: 45px;width:50px;text-align: center">' +
            '<img style="margin: auto" alt="avatar" id=' + friend_name + '_avatar src= "' + path + '"/>' +
            '</div >' +
            '<div class="main_li" style="height: 25px;text-align: center">' +
            '<span class="username" style="float:left;line-height: 20px;width: 50px">' + friend_name + '</span>';
        $$('member-ul').appendChild(li_friend);
        $('#friend_' + friend_name).click(
            () => {
                let confirm_res = confirm('你确定要添加该好友吗？');
                if (confirm_res) {
                    let add_info = {
                        requestUserName: user,
                        requestFriendName: friend_name
                    };
                    socket.emit('chat:add', add_info);
                }
            }
        ).hover(function () {
            $('#friend_' + friend_name).css("background-color", "whitesmoke");
            },function () {
            $('#friend_' + friend_name).css("background-color", "white");
            }
        );
    }
}

function addAtUser(username) {
    username = username.slice(1, length - 1);
    $('#add-body').show();
    $('#add-bg').show();
    $('#add-friend-name').val(username);
    $('#add-friend-name').attr("autofocus", "autofocus");
}