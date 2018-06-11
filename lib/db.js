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

  get_userinfo(username, fn) {
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection("user").findOne(username, (err, res) => {
        this.assert.equal(err, null);
        fn(res);
        cli.close();
      });
    });
  }

  get_chat_history(from, to, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      let chatting_room = [from, to];
      cli.db().collection("chat").findOne({members:chatting_room}, (err, res) => {
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
  append_chat_history(data) {
    this.mongo_client.connect(this.db_url, (err, client) => {
      this.assert.equal(err, null);
      let sender = data.sender;
      let target = data.target;
      let id1 = sender < target ? sender : target;
      let id2 = sender < target ? target : sender;
      client.db().collection('chat').updateOne(
      { members: [id1,id2] },
      { $push: {messages : data.message} },
      { upsert: true }, (err, res) => {
        this.assert.equal(err, null);

      });
    })
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
            fn(true);
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
  get_id_by_username(username, fn){
    this.mongo_client.connect(this.db_url, (err, cli) => {
      this.assert.equal(err, null);
      cli.db().collection('user').findOne({username: username}, (err, res) => {
        this.assert.equal(err, null);
        console.log("get_id_by_username ");
        console.log(username);
        console.log(res);
        fn(res._id);
      });
    });
  }
};