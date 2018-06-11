
var Interface = function(name) {
    //arguments为实际传进来的参数
    if(arguments.length != 2) throw new Error("创建的接口不符合标准,必须有俩个参数,第二个参数是接口的方法");
    this.name = name;
    this.methods = [];
    //获取方法数组
    var methods = arguments[1];
    for(var i = 1; i < methods.length; i++) {
        this.methods.push(methods[i]);
    }
};
Interface.checkImplements = function(obj) {
    if(arguments.length < 2) throw new Error("要检查的接口必须传入接口对象的参数,参数的个数必须大于等于2");
    for(var i = 1; i < arguments.length; i++) {
        var intObj = arguments[i];
        if(intObj.constructor != Interface) throw new Error(intObj + "接口的对象不正确");
        //检查方法是否符合要求
        var cmethods = intObj.methods;
        for(var j =0; j < cmethods.length; j++) {
            if(!obj[cmethods[j]] || typeof obj[cmethods[j]] != "function") throw new Error("必须实现:" + cmethods[j] + "这个方法");
        }
    }
};

var MessageBuilder = new Interface('MessageBuilder', ['createMessage', 'createHTML', 'createHTMLFromPlain']);

var TextMessageBuilder = function () {
    Interface.checkImplements(this, MessageBuilder);
};

TextMessageBuilder.prototype.createMessage = function (plain_message, sender, target) {
    let message = {
        sender: sender,
        content: plain_message,
        timestamp: new Date()
    };
    let data = {
        sender: sender,
        target: target,
        message: message
    };
    return data;
};

TextMessageBuilder.prototype.createHTML = function (message, selfname) {
    let content = message.message.content;
    let sender = message.message.sender;
    let html = document.createElement('article');
    if (selfname === sender)
        html.className = 'right';
    html.innerHTML = '<div class="avatar">' +
        '<img alt="' + sender + '" src=' + $$('avatar:'+sender).src + ' />' + '</div>' +
        '<div class="msg">' + ' <div class="tri"></div>' +
        '<div class="msg_inner">' + content + '</div>' + ' </div>';
    return html;
};

TextMessageBuilder.prototype.createHTMLFromPlain = function (plain_message) {
    let html = document.createElement('article');
    html.className = 'right';
    html.innerHTML = '<div class="avatar">' +
        '<img alt="user" src=' + $$('user_avatar').src + ' />' + '</div>' +
        '<div class="msg">' + ' <div class="tri"></div>' +
        '<div class="msg_inner">' + plain_message + '</div>' + ' </div>';
    return html;
};

var ImageMessageBuilder = function () {
    Interface.checkImplements(this, MessageBuilder);
};

ImageMessageBuilder.prototype.createMessage = function(plain_message, sender, target){
    let message = {
        sender: sender,
        content: plain_message,
        timestamp: new Date()
    };
    let data = {
        sender: sender,
        target: target,
        message: message
    };
    return data;
};

ImageMessageBuilder.prototype.createHTML = function (message, selfname) {
    let image_url = message.message.content.match(/\[img:(\S*)\]/)[1];
    let sender = message.message.sender;
    let html = document.createElement('article');
    if (selfname === sender)
        html.className = 'right';
    html.innerHTML = '<div class="avatar">' +
        '<img alt="user" src=' + $$('avatar:'+sender).src + ' />' + '</div>' +
        '<div class="msg">' + ' <div class="tri"></div>' +
        '<div class="msg_inner">' + '<img style="max-width: 600px" src=' + url_base + image_base + image_url + ' />' + '</div>' + ' </div>';
    return html;
};

ImageMessageBuilder.prototype.createHTMLFromPlain = function(image){
    let html = document.createElement('article');
    let image_url = image.match(/\[img:(\S*)\]/)[1];
    html.className = 'right';
    html.innerHTML = '<div class="avatar">' +
        '<img alt="user" src=' + $$('user_avatar').src + ' />' + '</div>' +
        '<div class="msg">' + ' <div class="tri"></div>' +
        '<div class="msg_inner">' + '<img style="max-width: 600px" src=' + url_base + image_base + image_url + ' />' + '</div>' + ' </div>';
    return html;
};

var MessageDirector = function () {
    this.textBuilder = new TextMessageBuilder();
    this.imageBuilder = new ImageMessageBuilder();
};

MessageDirector.prototype.createMessage = function (content, sender, target) {
    if (content.match(/\[img:(\S*)\]/) !== null){
        //image
        return this.imageBuilder.createMessage(content, sender, target);
    }
    else {
        return this.textBuilder.createMessage(content, sender, target);
    }
};

MessageDirector.prototype.createHTML = function (message, self) {
    if (message.message.content.match(/\[img:(\S*)\]/) !== null) {
        //image
        return this.imageBuilder.createHTML(message, self);
    }
    else{
        return this.textBuilder.createHTML(message, self);
    }
};

MessageDirector.prototype.createHTMLFromPlain = function (content) {
    if (content.match(/\[img:(\S*)\]/) !== null){
        //image
        return this.imageBuilder.createHTMLFromPlain(content);
    }
    else {
        return this.textBuilder.createHTMLFromPlain(content);
    }
};

MessageDirector.GetInstance = (function () {
    var instance = null;
    return function () {
        if ( !instance ) {
            instance = new MessageDirector();
        }
        return instance;
    }();
})();
