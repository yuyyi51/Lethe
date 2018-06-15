var MessageStore = function(){
    this.chats = new Map();
};
MessageStore.prototype.StoreHistory = function(name , messages){
    this.chats.set(name, messages);
};
MessageStore.prototype.AppendMessage = function(name , message){
    if (this.Exist(name) === undefined)
        this.StoreHistory(name, []);
    this.chats.get(name).push(message);
};
MessageStore.prototype.GetMessage = function(name) {
    return this.chats.get(name);
};
MessageStore.prototype.Exist = function (name) {
    return this.chats.get(name) !== undefined;
};