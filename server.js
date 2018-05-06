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
http.listen(config.http.port, function() {
  console.log('listening on *:' + config.http.port);
});

// socket.io
const socket_user = new Map(); // socket.id -> username, TODO: 如果能消息发送失败时能cacth err则可以省略此map
const user_socket = new Map(); // username -> socket
io.on('connection', function (socket) {

  // Chat
  socket.on('disconnect', () => {
    if (socket_user.has(socket.id)) {
      console.log(socket_user.get(socket.id) + ' disconnected.');
      user_socket.delete(socket_user.get(socket.id));
      socket_user.delete(socket.id);
    }
  });

  socket.on('register', (payload) => { // payload = { username: str, password: str }
    db.register(payload, (res) => {
      if (res === true) {
        console.log(payload.username + " register succeed.");
      } else {
        console.log(payload.username + " register failed.");
      }
      socket.emit('register', res);
    });
  });

  socket.on('login', (payload) => { // payload = { username: str, password: str }
    db.login(payload, (res) => {
      if (res === true) {
        console.log(payload.username + " login succeed.");
        socket_user.set(socket.id, payload.username);
        user_socket.set(payload.username, socket);
      } else {
        console.log(payload.username + " login failed.");
      }
      socket.emit('login', res);
    });
  });

  socket.on('get_userinfo', function (user, callback) {
    db.get_userinfo(user, function (user) {
      callback(user);
    });
  });

  socket.on('get_history', function (data, callback) {
    db.get_history(data.sender, data.receiver, function (history) {
      callback(history);
    });
  });

  // TODO: 事件名字改为message
  socket.on('chat', function (msg) {
    db.append_chat_history(msg.sender, msg.receiver, msg.formated);
    let target_socket = user_socket.get(msg.receiver);
    if (target_socket) {
      target_socket.emit('append_to_chat', { formated: msg.formated, receiver: msg.sender });
    }
  });

  // Picture
  socket.on('picture:query', function (msg) {

  });

  socket.on('picture:upload', function (msg) {

  });

  socket.on('emoji:list', function (msg) {

  });

});
