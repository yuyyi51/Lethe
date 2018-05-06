let MongoClient = require("mongodb").MongoClient;
let assert = require('assert');
let url = 'mongodb://lab.iriscraft.tk:27017/test';

MongoClient.connect("mongodb://lab.iriscraft.tk:27017/test", {native_parser:true}, function(err, db) {
  assert.equal(null, err);
  db.collection('auth').insert({a:1}, {upsert: true}, function(err, result) {
    assert.equal(null, err);
    assert.equal(1, result);
  });
  db.close();
});

let find = (col, sel, fn) => {
  col.find(sel).toArray((err, res) => {
    try{ assert.equal(err, null); } catch(e) { console.log(err); res = []; }
    fn(res);
  });
};

let insert = (col, docs, fn) => {
  let len = docs instanceof Array ? docs.length : 1;
  let insert_fn = docs instanceof Array ? col.insertMany : col.insertOne;
  insert_fn(docs, {upsert: true}, (err, res) => {
    assert.equal(err, null);
    assert.equal(res.result.n, len);
    assert.equal(res.ops.length, len);
    fn(res);
  });
};

let delete_one = (col, sel, fn) => {
  col.deleteOne(sel, (err, res) => {
    assert.equal(err, null);
    fn(res);
  });
};

let delete_all = (col, sel, fn) => {
  col.deleteMany(sel, (err, res) => {
    assert.equal(err, null);
    fn(res);
  });
};

let update = (col, sels, fn) => {
  col.updateOne(sels[0], sels[1], (err, res) => {
    assert.equal(err, null);
    assert.equal(res.result.n, 1);
    fn(res);
  });
};

let methods = {
  find:       find,
  insert:     insert,
  update:     update,
  delete_one: delete_one,
  delete_all: delete_all,
};

module.exports = (act, col, sel, fn) => {
  MongoClient.connect(url, function(err, cli) {
    assert.equal(err, null);
    let c = cli.db().collection(col);
    methods[act](c, sel, fn);
    cli.close();
  });
};



const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
const url = 'mongodb://localhost:27017/lethe';

// Use connect method to connect to the server
let add_user = () => {
  MongoClient.connect(url, function(err, cli) {
    assert.equal(null, err);
    cli.db().collection('test').insertMany([
      {a : 1}, {a : 2}, {a : 3}
    ], function(err, result) {
      assert.equal(err, null);
      assert.equal(3, result.result.n);
      assert.equal(3, result.ops.length);
      console.log("Inserted 3 documents into the collection");
      console.log("got data, do more things");
      cli.close();
    });
  });
};

module.exports = {
  user(id) {
    return {
      list_all(fn) {
        MongoClient.connect(url, function(err, cli) {
          assert.equal(null, err);
          cli.db().collection('auth').find(function(err, res) {
            assert.equal(err, null);
            console.log("got data");
            fn(res);
            cli.close();
          });
        });
      },
      register(username, password) {

      },
      login(username, password) {

      },
      exsits(username) {

      },
      get() {

      },
      add_frined() { /* T/F */ },
      del_frined() { /* T/F */ },
      get_frineds() { /* [uid] */ },
      get_groups() { /* [gid] */ },
      enroll_group(gid) { /* T/F */ },
      leave_group(gid) { /* T/F */ },
    }
  },
  group: {
    list_all() { /* [{gid, name}] */ }
    create(name, members) { /* T/F */ },
    destroy(gid) { /* T/F */ },
    rename(gid, name) { /* T/F */ },
    get(uid) {  /* group */  },
    add_member(uid) { /* T/F */ },
    del_member(uid) { /* T/F */ },
  },
  message: {
    get_from_friend(uid, fuid, offset, count) {},
    get_from_group(uid, fuid, offset, count) {},
    send_to_friend(uid, fuid, msg) {},
    send_to_group(uid, gid, msg) {},
  }
};


db = {
  user(id) {
    return {
      list_all(fn) {
        MongoClient.connect(url, function (err, cli) {
          assert.equal(null, err);
          cli.db().collection('auth').find(function (err, res) {
            assert.equal(err, null);
            fn(res);
            cli.close();
          });
        });
      },
      register(username, password, fn) {
        MongoClient.connect(url, function (err, cli) {
          assert.equal(null, err);
          let data = {
            username: username,
            password: password
          };
          cli.db().collection('auth').insertOne(data, (err, res) => {
            assert.equal(err, null);
            fn(res);
            cli.close();
          });
        });
      },
      login(username, password, fn) {
        MongoClient.connect(url, function (err, cli) {
          assert.equal(null, err);
          let data = {
            username: username,
            password: password
          };
          cli.db().collection('auth').findOne(data, (err, res) => {
            assert.equal(err, null);
            fn(res);
            cli.close();
          });
        });
      },
      exsits(username, fn) {
        MongoClient.connect(url, function (err, cli) {
          assert.equal(null, err);
          let data = { username: username };
          cli.db().collection('auth').findOne(data, (err, res) => {
            assert.equal(err, null);
            fn(res);
            cli.close();
          });
        });
      },
      get() {
        MongoClient.connect(url, function (err, cli) {
          assert.equal(null, err);
          let data = { _id: require('mongodb').ObjectID(id) };
          cli.db().collection('auth').findOne(data, (err, res) => {
            assert.equal(err, null);
            fn(res);
            cli.close();
          });
        });
      },
      add_frined() { /* T/F */
      },
      del_frined() { /* T/F */
      },
      get_frineds() { /* [uid] */
      },
      get_groups() { /* [gid] */
      },
      enroll_group(gid) { /* T/F */
      },
      leave_group(gid) { /* T/F */
      },
    }
  },
  message(id) {}
};

show = (data) => {
  console.log(data);
};