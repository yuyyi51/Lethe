# Lethe
    A toy project for online chat, build on node, websocket and mongodb.

## Get Start
  * `npm install`
  * `node server.js` or `npm start`
  * then open your browser at localhost:3000
  * also, you can modify this [config](/lib/config.js)
  
## Developers
### Convention
  * 优先使用下划线命名法
  * 缩进使用 2 个空格
  * IDE使用jetBrains WebStorm

### Tech ref
  * [Nodejs](https://www.runoob.com/nodejs/nodejs-tutorial.html)
  * [socket.io](https://socket.io/)
  * [store.js](https://github.com/marcuswestin/store.js)
  * [mongo.js](http://mongodb.github.io/node-mongodb-native/api-generated/mongoclient.html)
  * [mongo.js](https://github.com/mongodb/node-mongodb-native/blob/master/CHANGES_3.0.0.md)
  * [jQuery](http://api.jquery.com/)
  * [github markdown](https://guides.github.com/features/mastering-markdown/)

## TODO LIST
  - 用户账户
    - [ ] 注册：用户名查重，密码加密
    - [ ] 登陆：密码加密
    - [x] 注销
    - [ ] 修改头像
  - 好友
    - [ ] 搜索好友
    - [ ] 增加好友
    - [ ] 删除好友
  - 消息
    - [ ] 消息编解码组件(详见下文)
    - [ ] 发送混文本、超链接、表情符号消息
    - [ ] 发送自定义图片消息：图片md5查重
    - [ ] 获取并显示历史消息：建议进行分页，以20条为单位
    

## 数据库消息编码
    在客户端进行编码和解码

### 编码

类型      | 转义方式
---------| -------------
文本     | （无）
超链接   | [link:url]
表情符号 | [emoj:id]
图片    | [img:relative_path]

    例一(文本、超链、符号可以混排)： 
      开头是个普通文本，然后可以试试[link:www.bilibili.com]，大概这就是[emoji:233]吧，完了。
    例二(图片单独作为一个消息)：
      [img:/data/picture/xxx.jpg]
        
## 解码

类型      | 转义方式
---------| -------------
文本     | （无）
超链接   | <a href="url">url</a>
表情符号 | <img src"="url">
图片    | <img src"="url">，注意适当限制max-width

    相对url转绝对url通常在客户端完成，加个url_base就行了