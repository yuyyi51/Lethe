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
                if (res) {
                    fn(false);
                    cli.close();
                } else {
                    user.friends = [];
                    user.avatar = null;
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

    get_chat_history(from, to, fn) {
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            let chatting_room = [from, to];
            cli.db().collection("chat").findOne({members: chatting_room}, (err, res) => {
                this.assert.equal(err, null);
                fn(res);
                cli.close();
            });
        });
    }

    get_group_chat_history(groupid, fn){
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection("groupchat").findOne(groupid, (err, res) => {
                this.assert.equal(err, null);
                fn(res);
                cli.close();
            });
        });
    }

    get_history(from, to, fn) {
        this.mongo_client.connect(this.db_url, function (err, client) {
            let dbo = client.db('db_chat');
            dbo.collection("user_info").findOne({account: from}, (err, res) => {
                this.assert.equal(err, null);
                let friends = res.friends;
                let result = friends.find(function (element) {
                    return element.account === to;
                });

                if (result !== undefined) {
                    dbo.collection("chat_info").findOne({chat_id: result.chat_id}, function (err, record) {
                        let history = record.history;
                        fn(history);
                        client.close();
                    });
                }
            });
        });
    }

    append_chat_history(data) {
        this.mongo_client.connect(this.db_url, (err, client) => {
            this.assert.equal(err, null);
            let sender = data.sender;
            let target = data.target;
            let id1 = sender < target ? sender : target;
            let id2 = sender < target ? target : sender;
            client.db().collection('chat').updateOne(
                {members: [id1, id2]},
                {$push: {messages: data.message}},
                {upsert: true}, (err, res) => {
                    this.assert.equal(err, null);

                });
        })
    }

    append_group_chat_history(data) {
        this.mongo_client.connect(this.db_url, (err, client) => {
            this.assert.equal(err, null);
            let groupid = data.target;
            client.db().collection('groupchat').updateOne(
                {groupid: groupid},
                {$push: {messages: data.message}},
                {upsert: true}, (err, res) => {
                    this.assert.equal(err, null);

                });
        })
    }

    check_image_md5(md5, fn) {
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

    upload_image(image, fn) {
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('image').insertOne(image, (err, res) => {
                this.assert.equal(err, null);
                fn(res !== null);
                cli.close();
            });
        });
    }

    change_avatar(user, md5, fn) {
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('image').findOne({md5: md5}, (err, res) => {
                this.assert.equal(err, null);
                if (res === null) {
                    fn(null);
                    cli.close();
                    return;
                }
                cli.db().collection('user').updateOne({username: user}, {$set: {avatar: md5}}, (err, res) => {
                    this.assert.equal(err, null);
                    fn(true);
                    cli.close();
                });
            });
        });
    }

    get_group_info(groupid, fn){
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('groupchat').findOne({groupid: groupid}, (err, res) => {
                fn(res);
            });
        });
    }

    get_avatar(username, fn) {
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('user').findOne({username: username}, (err, res) => {
                let md5 = res.avatar;
                if (md5 === null) {
                    fn(null);
                    cli.close();
                    return;
                }
                cli.db().collection('image').findOne({md5: md5}, (err, res) => {
                    this.assert.equal(err, null);
                    if (res == null) {
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
    appand_friend(username, friendname, fn) {
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('user').findOne({username: friendname}, (err, res) => {         //查询该好友是否存在
                this.assert.equal(err, null);
                if (res === null) {        //该账号不存在
                    fn(null);
                    cli.close();
                    return;
                }
                else {                //该好友存在，更改数据
                    cli.db().collection('user').findOne({username: username}, (err, res) => {       //查询是否已经是好友
                        this.assert.equal(err, null);
                        let count = 0;
                        for (let index = 0; index < res.friends.length; ++index) {
                            if (res.friends[index] === friendname) {
                                count = count + 1;
                                break;
                            }
                        }
                        if (count === 0) {        //还未添加好友
                            cli.db().collection('user').updateOne({username: username}, {$addToSet: {friends: friendname}}, (err, res) => {     //为username添加好友
                                this.assert.equal(err, null);
                            });
                            cli.db().collection('user').updateOne({username: friendname}, {$addToSet: {friends: username}}, (err, res) => {     //为friendname添加好友
                                this.assert.equal(err, null);
                            });
                            let id1 = username < friendname ? username : friendname;
                            let id2 = username < friendname ? friendname : username;
                            let newchat = {
                                members: [id1, id2],
                                messages: []
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
    };

    //删除好友数据
    delete_friend(username,friendname,fn){
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            //  删除username中的friendname
            cli.db().collection('user').findOne({username:username}, (err, res) => {
                this.assert.equal(err, null);
                if (res!==null){
                    var user_friends=res.friends;
                    var index=user_friends.indexOf(friendname);
                    user_friends.splice(index,1);
                    console.log('username'+username);
                    console.log('friendname'+friendname);
                    console.log('user-friends'+user_friends);
                    cli.db().collection('user').updateOne({username: username},{$set:{friends:user_friends}},(err, res) => {
                        this.assert.equal(err, null);
                    });
                }
                cli.close();
            });
        });

        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            //  删除friendname中的username
            cli.db().collection('user').findOne({username: friendname},(err, res) => {
                this.assert.equal(err, null);
                if (res!==null){
                    var friend_friends=res.friends;
                    var index=friend_friends.indexOf(username);
                    friend_friends.splice(index, 1);
                    cli.db().collection('user').updateOne({username: friendname},{$set:{friends:friend_friends}},(err, res) => {
                        this.assert.equal(err, null);
                    });
                    let id1 = username < friendname ? username : friendname;
                    let id2 = username < friendname ? friendname : username;
                    var del_members=[id1,id2];
                    cli.db().collection('chat').deleteOne({members:del_members}, (err, res) => {
                        this.assert.equal(err, null);
                    });
                }
                cli.close();
            });
            fn(true);
        });
    }

    //加入群聊
    join_group(username, groupid, fn){
        this.mongo_client.connect(this.db_url, (err, cli) => {
            this.assert.equal(err, null);
            cli.db().collection('groupchat').findOne({groupid: groupid}, (err, res) => {
                this.assert.equal(err, null);
                if (res!==null){
                    cli.db().collection('groupchat').updateOne({groupid: groupid}, {$addToSet: {members: groupid}}, (err, res) => {     //在groupchat中插入新成员
                        this.assert.equal(err, null);
                    });
                    cli.db().collection('user').updateOne({username: username}, {$addToSet: {ingroup: groupid}}, (err, res) => {     //在user的ingroup字段添加新的组
                        this.assert.equal(err, null);
                    });
                    fn('success');
                    cli.close();

                }
                else {
                    fn(null);
                    cli.close();
                }
            });
        });
    }

    get_id_by_username(username, fn) {
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
}
