const fs = require('fs');
const axios = require('axios');
const SparkMD5 = require('spark-md5');
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

const config = require('./lib/config');
const mongodb = require('./lib/db');
const db = new mongodb(config.db);
const message_mediator = require('./lib/message_mediator');
let wallpapar_url;

// const cache trick
axios.get('https://cn.bing.com/HPImageArchive.aspx?format=js&n=1', {
  timeout: 5000,
  responseType: 'json',
  headers: {'X-Requested-With': 'XMLHttpRequest'}
}).then((r) => {
  wallpapar_url = 'https://cn.bing.com' + r.data.images[0].url.replace('1920x1080', '800x600');
}).catch((err) => {
  console.log('[Wallpaper] failed.');
});

// http
app.use('/', express.static(__dirname + '/www'));
app.use('/wallpaper', (req, res) => {
  res.send(wallpapar_url);
});
http.listen(config.http.port, () => {
  console.log('listening on *:' + config.http.port);
});

const mediator = new message_mediator();

// socket.io
const socket_user = new Map(); // socket.id -> username
const user_socket = new Map(); // username -> socket
io.on('connection', (socket) => {
  console.log('visitor connected.');

  socket.on('disconnect', () => {
    let u = mediator.GetUserFromSocket(socket);
    if(u !== undefined) console.log(u + ' disconnected.');
    mediator.DeleteUser(socket);
    /*
    let u = socket_user.get(socket.id);
    if(u !== undefined) console.log(u + ' disconnected.');
    user_socket.delete(u);
    socket_user.delete(socket.id);
    */
  });

  function getUsername(){
    return mediator.GetUserFromSocket(socket);
  }

  /*****************/
  /* Part 1 : User */
  /*****************/

  // desc:  注册
  // on:    { username: str, password: str }
  // emit:  bool
  socket.on('user:register', (data) => {
    data.password = SparkMD5.hash(config.salt + data.password + config.salt);
    db.register(data, (res) => {
      console.log(data.username + " register " +
          (res === true ? "succeed." : "failed."));
      socket.emit('user:register', res);
    });
  });

  // desc:  登陆
  // on:    { username: str, password: str }
  // emit:  { user_id: str, username: str, avatar: uri }
  socket.on('user:login', (data) => {
    data.password = SparkMD5.hash(config.salt + data.password + config.salt);
    db.login(data, (res) => {
      if (res === true) {

        //防止重复登录
        if (mediator.GetSocketFromUser(data.username) !== undefined){
            //重复登录
            let s = mediator.GetSocketFromUser(data.username);
            s.emit('user:offline');
            mediator.DeleteUser(s);
        }
        //////////////////

        mediator.AddUser(data.username, socket);
        /*
        socket_user.set(socket.id, data.username);
        user_socket.set(data.username, socket);
        */
      }
      console.log(data.username + " login " +
          (res === true ? "succeed." : "failed."));
      socket.emit('user:login', res);
    });
  });

  socket.on('get_all_info', ()=>{
      db.get_user_to_avatar((res)=>{
          socket.emit('get_all_info', res);
      });
  });

  // desc:  更换头像
  // on:    { user: str, md5: str }
  // emit:  { avatar: url }
  socket.on('user:avatar', (data) => {
    db.change_avatar(data.user, data.md5, data.suffix, (res) => {
      socket.emit('user:avatar', res);
    });
  });
    // desc:  获取头像
    // on:    { user: str }
    // emit:  { avatar: uri }
  socket.on('user:get_avatar', (data) => {
    // console.log(data);
    db.get_avatar(data.user, (res) => {
      socket.emit('user:get_avatar', res);
    });
  });

  socket.on('user:get_friends', (data) => {
      // console.log(data);
      db.get_avatar(data.user, (res) => {
          socket.emit('user:get_friends',data.user, res);
      });
  });

  socket.on('user:get_groups', (data, fn) => {
      db.get_group_info(data.groupid, (res) => {
          // if(res == null)
          //   return;
          // socket.emit('user:get_groups', res);
          fn(res);
      });
  });
  // desc:  搜索用户
  // on:    { username: str }
  // emit:  { username: str: avatar: uri }
  socket.on('user:search', (data) => {

  });


  /*****************/
  /* Part 2 : Chat */
  /*****************/

  // desc:  好友列表(会话列表)
  // on:    null
  // emit:  [{ user_id: str, username: str: avatar: uri, chat_id: str }]
  socket.on('chat:list', () => {

  });

    // desc:  新增好友(新增会话)
    // on:    { requestUserName: str ,requestFriendName: str}
    // emit:  result
    socket.on('chat:add', (data) => {
        db.appand_friend(data.requestUserName, data.requestFriendName, (res) => {
            socket.emit('chat:add', res);          //返回客户端结果
        });
    });

    // desc: 删除好友(删除会话)
    // on: { requestUserName: str ,requestFriendName: str}
    // emit: bool
    socket.on('chat:del', (data) => {
        db.delete_friend(data.requestUserName, data.requestFriendName, (res) => {
            if (res) {
                socket.emit('chat:del', true);
            }
        });
    });

    //desc: 创建群聊
    //on: requestUsername: str
    //emit: bool
    socket.on('group:create',(requestUsername)=>{
        db.create_group(requestUsername, (res)=>{
            socket.emit('group:crate',res);
        });
    });

    //desc: 加入群聊
    //on：{requestUserName: str ,requestGroupId: int}
    //emit: result
    socket.on('group:add', (data) => {
        db.join_group(data.requestUserName, data.requestGroupId, (res) => {
            socket.emit('group:add', res);
        });
    });

    //desc: 退出群聊
    //on: {requestUserName: str ,requestGroupId: int}
    //emit: bool
    socket.on('group:del',(data)=>{
        db.exit_group(data.requestUserName,data.requestGroupId,(res)=>{
            socket.emit('group:del',res);
        })
    });

  // desc:  获取某个会话的历史记录
  // on:    { chat_id: str, limit: int }
  // emit:  [{ sender: @user, content: str }]
  socket.on('chat:history', (data, fn) => {
    let sender = data.sender;
    let receiver = data.receiver;
    let id1 = sender < receiver ? sender : receiver;
    let id2 = sender < receiver ? receiver : sender;
    db.get_chat_history(id1, id2, (res) =>{
      fn(res);
    });
  });

  socket.on('groupchat:history', (data, fn) => {
      db.get_group_chat_history(data, (res) =>{
          fn(res);
      });
  });

  socket.on('user:get_userinfo',(data,fn) =>{
    db.get_userinfo({username:data.username},(res)=>{
      if(res!=null)
        fn(res);
      else
        alert('error findings!');
    });
  });

  // desc:  在某个会话中新增消息
  // on:    {
    // sender: str,
    // target: str,
    // message: {
    // 	  sender: str,
    //    content: str,
    //    timestamp: datetime }
    // }
  // emit:  bool
  socket.on('chat:message', (data) => {
    data.timestamp = new Date();
    db.append_chat_history(data);
    mediator.SendMessageTo(data.target, data);
  });

  socket.on('groupchat:message', (message, members)=>{
      message.timestamp = new Date();
      db.append_group_chat_history(message);
      mediator.SendMessageToGroup(members, message);
  });

  //********Group Management*********//

    // desc:  调整群聊名称
    // on:    { chat_id: str, name: str }

  socket.on('groupchat:rename', (data) => {
      console.log("Rename: " + data.name + " " + data.chat_id);
      db.rename_group(data.chat_id, data.name)
  });

    // desc:  群主踢人
    // on:    { chat_id: str, name: str }
  socket.on('groupchat:kick', (data) => {
      console.log("Kick: " + data.name + " " + data.chat_id);
      db.kick_group(data.chat_id, data.name)
  });

    // desc:  添加群成员
    // on:    { chat_id: str, name: str }
    socket.on('groupchat:add', (data) => {
        console.log("Add: " + data.name + " " + data.chat_id);
        db.add_group(data.chat_id, data.name)
    });

  /**********************/
  /* Part 3 : Resources */
  /**********************/

  // 按md5查询图片存在性
  // on: { md5: str }
  // emit: uri
  socket.on('picture:query', (data) => {
    //console.log(data);
    db.check_image_md5(data, (res) => {
      socket.emit('picture:query', res);
    });
  });

  // 上传图片
  // on: { pic: str(base64), suffix: str, md5: str }
  // emit: uri
  socket.on('picture:upload', (data) => {
    //存储文件
    //console.log(data);
    let filename = data.md5 + '.' + data.suffix;
    let imagebuffer = new Buffer(data.pic.replace(/^data:image\/\w+;base64,/, ""), 'base64');
    let wstream = fs.createWriteStream(__dirname + config.image.path + filename, {
      flags : 'w',
      encoding: 'binary'
    });
    wstream.on('open', () => {
      wstream.write(imagebuffer);
      wstream.end();
    });
    wstream.on('close', () => {
      db.upload_image({md5: data.md5, suffix: data.suffix}, (res) => {
          socket.emit('picture:upload', res);
      });
    });

  });
});