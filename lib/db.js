module.exports = class mongodb {

  constructor(config) {
    this.db_url = 'mongodb://' + config.host + ':' + config.port.toString() + '/' + config.db;
    this.mongo_client = require('mongodb').MongoClient;
    this.assert = require('assert');
  }

  register(user, fn) {
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection("user").findOne(user, (err, res) => {
        this.assert.equal(err, null);
        if(res) {
          fn(false);
          cli.close();
        } else {
          cli.db().collection("user").insertOne(user, (err, res) => {
            this.assert.equal(err, null);
            fn(res !== null);
            cli.close();
          });
        }
      });
    });
  }

  login(user, fn) {
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection("user").findOne(user, (err, res) => {
        this.assert.equal(err, null);
        fn(res !== null);
        cli.close();
      });
    });
  }

  // TODO: 换个函数名
  get_userinfo(user, fn) {
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection("auth").findOne(user, (err, res) => {
        this.assert.equal(err, null);
        fn(res);
        cli.close();
      });
    });
  }

  // TODO: 换个函数名
  get_history(from, to, fn) {
    this.mongo_client.connect(this.db_url, function (err, client) {
      let dbo = client.db('db_chat');
      dbo.collection("user_info").findOne({ account: from }, (err, res) => {
        this.assert.equal(err, null);
        let friends = res.friends;
        let result = friends.find(function (element) {
          return element.account === to;
        });

        if (result !== undefined) {
          dbo.collection("chat_info").findOne({ chat_id: result.chat_id }, function (err, record) {
            let history = record.history;
            fn(history);
            client.close();
          });
        }
      });
    });
  }

  // TODO: 换个函数名
  append_chat_history(from, to, message) {
    this.mongo_client.connect(this.db_url, function (err, client) {
      let dbo = client.db('db_chat');
      dbo.collection("user_info").findOne({ account: from }, function (err, record) {
        this.assert.equal(err, null);
        let friends = record.friends;
        let result = friends.find(function (element) {
          return element.account === to;
        });

        if (result !== undefined) {
          dbo.collection("chat_info").findOne({ chat_id: result.chat_id }, function (err, record) {
            record.history.push(message);
            dbo.collection("chat_info").updateOne({ chat_id: record.chat_id }, { $set: { history: record.history } }, function (err, result) {
              if (err) throw err;
              console.log('update chat history succeed.');
              client.close();
            });
          });
        }
      });
    });
  }

  check_image_md5(md5, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection('image').findOne(md5, (err, res) => {
        this.assert.equal(err, null);
        //console.log(res);
        fn(res);
        cli.close();
      });
    });
  }

  upload_image(image, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection('image').insertOne(image, (err, res) => {
        this.assert.equal(err, null);
        fn(res !== null);
        cli.close();
      });
    });
  }
  change_avatar(user, md5, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection('image').findOne({md5:md5}, (err, res) => {
          this.assert.equal(err, null);
          if (res === null){
            fn(null);
            cli.close();
            return ;
          }
          cli.db().collection('user').updateOne({username:user}, {$set: {avatar:md5}}, (err, res) => {
            this.assert.equal(err, null);
            cli.close();
          });
      });
    });
  }
  get_avatar(username, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection('user').findOne({username:username}, (err, res) => {
        let md5 = res.avatar;
        if (md5 === null){
          fn(null);
          cli.close();
          return;
        }
        cli.db().collection('image').findOne({md5:md5}, (err, res) => {
          this.assert.equal(err, null);
          if (res == null){
            fn(null);
            cli.close();
            return;
          }
          fn(res.md5 + '.' + res.suffix);
          cli.close();
          return;
        });
      });
    });
  }

  //插入新的添加好友数据
  appand_friend(username, friendname, fn){
      this.mongo_client.connect(this.db_url, (err, cli) => {
          this.assert.equal(err, null);
          cli.db().collection('user').findOne({username:friendname}, (err, res) =>{         //查询该好友是否存在
              this.assert.equal(err, null);
              if (res === null){        //该账号不存在
                  fn(null);
                  cli.close();
                  return;
              }
              else {                //该好友存在，更改数据
                  cli.db().collection('user').findOne({username:username}, (err, res) => {       //查询是否已经是好友
                      this.assert.equal(err, null);
                      let count=0;
                      for(let index=0;index<res.friends.length;++index){
                          if (res.friends[index]===friendname){
                              count=count+1;
                              break;
                          }
                      }
                      if (count === 0){        //还未添加好友
                          cli.db().collection('user').updateOne({username:username}, {$addToSet: {friends:friendname }}, (err, res) => {     //为username添加好友
                              this.assert.equal(err, null);
                          });
                          cli.db().collection('user').updateOne({username:friendname}, {$addToSet: {friends:username }}, (err, res) => {     //为friendname添加好友
                              this.assert.equal(err, null);
                          });
                          let newchat={
                              members:[username,friendname],
                              messages:[]
                          };
                          cli.db().collection("chat").insertOne(newchat, (err, res) => {        //向chat中插入新数据
                              this.assert.equal(err, null);
                              fn('success');
                              cli.close();
                              return;
                          });
                          cli.close();
                          return;
                      }
                      else {            //已加好友,不能再加
                          fn('exist');
                          cli.close();
                          return;
                      }

                  });
              }
          });

      });
  }
};