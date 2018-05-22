const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');

const config = require('./lib/config');
const mongodb = require('./lib/db');
const db = new mongodb(config.db);

// http
app.use('/', express.static(__dirname + '/www'));
http.listen(config.http.port, () => {
  console.log('listening on *:' + config.http.port);
});

// socket.io
const socket_user = new Map(); // socket.id -> username
const user_socket = new Map(); // username -> socket
io.on('connection', (socket) => {
  console.log('visitor connected.');
  socket.on('disconnect', () => {
    let u = socket_user.get(socket.id);
    if(u !== undefined) console.log(u + ' disconnected.');
    user_socket.delete(u);
    socket_user.delete(socket.id);
  });


  /*****************/
  /* Part 1 : User */
  /*****************/

  // desc:  注册
  // on:    { username: str, password: str }
  // emit:  bool
  socket.on('user:register', (data) => {
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
    db.login(data, (res) => {
      if (res === true) {
        socket_user.set(socket.id, data.username);
        user_socket.set(data.username, socket);
      }
      console.log(data.username + " login " +
          (res === true ? "succeed." : "failed."));
      socket.emit('user:login', res);
    });
  });

  // desc:  更换头像
  // on:    { avatar: str(base64) }
  // emit:  { avatar: uri }
  socket.on('user:avatar', (data) => {

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
  // on:    { username: str }
  // emit:  { username: str: avatar: uri, chat_id: str }
  socket.on('chat:add', (data) => {

  });

  // desc: 删除好友(删除会话)
  // on: { username: str }
  // emit: bool
  socket.on('chat:del', (data) => {

  });

  // desc:  获取某个会话的历史记录
  // on:    { chat_id: str, limit: int }
  // emit:  [{ sender: @user, content: str }]
  socket.on('chat:history', (data) => {

  });

  // desc:  在某个会话中新增消息
  // on:    { chat_id: str, sender: str, receiver: str, content: str }
  // emit:  bool
  socket.on('chat:message', (data) => {
    db.append_chat_history(data);
    let recv_sock = user_socket.get(data.receiver);
    if (recv_sock !== undefined) {
      recv_sock.emit('chat:message', {
        sender: data.sender,
        receiver: data.receiver,
        content: data.content
      });
    }
  });


  /**********************/
  /* Part 3 : Resources */
  /**********************/

  // 按md5查询图片存在性
  // on: { md5: str }
  // emit: uri
  socket.on('picture:query', (data) => {

  });

  // 上传图片
  // on: { pic: str(base64) }
  // emit: uri
  socket.on('picture:upload', (data) => {

  });

  // 查询预定义表情符号列表
  // on: null
  // emit: [uri]
  socket.on('emoji:list', (data) => {

  });

});
