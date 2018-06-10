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

TextMessageBuilder.prototype.createHTML = function (message) {

};

TextMessageBuilder.prototype.createHTMLFromPlain = function (plain_message) {

};

var ImageMessageBuilder = function () {
    Interface.checkImplements(this, MessageBuilder);
};

ImageMessageBuilder.prototype.createMessage = function(plain_message, sender, target){
    let message = {
        sender: sender,
        content: '[img:' + plain_message + ']',
        timestamp: new Date()
    };
    let data = {
        sender: sender,
        target: target,
        message: message
    };
    return data;
};

ImageMessageBuilder.prototype.createHTML = function (message) {

};

ImageMessageBuilder.prototype.createHTMLFromPlain = function(image_url){

};

