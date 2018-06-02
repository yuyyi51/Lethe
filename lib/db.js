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
};