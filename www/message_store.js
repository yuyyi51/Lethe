var MessageStore = function(){
    this.chats = new Map();
};
MessageStore.prototype.StoreHistory = function(name , messages){
    if(messages !== undefined)
        this.chats.set(name, messages);
    else
        this.chats.set(name, []);
};
MessageStore.prototype.AppendMessage = function(name , message){
    if (this.Exist(name) === undefined)
        this.StoreHistory(name, []);
    this.chats.get(name).push(message);
};
MessageStore.prototype.AppendMembers = function(name , member){
    if (this.Exist(name) === undefined)
        this.StoreHistory(name, []);
    this.chats.get(name).push(member);
};
MessageStore.prototype.DeleteMembers = function(name , member){
    let tmpArray = this.chats.get(name);
    for(let i=0;i<tmpArray.length;i++){
        if(tmpArray[i] === member){
            this.chats.get(name).remove(i);
            break;
        }
    }
};
MessageStore.prototype.GetMessage = function(name) {
    return this.chats.get(name);
};
MessageStore.prototype.Exist = function (name) {
    return this.chats.get(name) !== undefined;
};