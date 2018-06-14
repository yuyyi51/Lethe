module.exports = class MessageMediator{
    constructor()
    {
        this.socket_user=new Map();
        this.user_socket=new Map();
    }
    AddUser(user,socket)
    {
        this.socket_user.set(socket.id, user);
        this.user_socket.set(user, socket);
    }
    DeleteUser(socket)
    {
        let u = this.GetUserFromSocket(socket);
        if ( u !== undefined )
        {
            this.user_socket.delete(u);
            this.socket_user.delete(socket.id);
            return true;
        }
        return false;
    }
    GetUserFromSocket(socket)
    {
        return this.socket_user.get(socket.id);
    }
    GetSocketFromUser(user){
        return this.user_socket.get(user);
    }
    SendMessageTo(user, message)
    {
        if(this.GetSocketFromUser(user) !== undefined)
        {
            this.GetSocketFromUser(user).emit('chat:message', message);
            return true;
        }
        return false;
    }
};