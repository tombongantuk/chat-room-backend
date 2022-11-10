const express = require('express')
const cors=require('cors')
const {createServer} = require('http')
const { Server } = require('socket.io')
const mongoose=require('mongoose')

let users= []
let messagesArr = []
let index = 0
const app = express()
const http = createServer(app)
const io = new Server(http, {
    cors: {
        origin: 'http://localhost:5173'
    }
})
app.use(express.json())
app.use(cors())

const ChatSchema = new mongoose.Schema({
    username: String,
    roomID: String,
});

const ChatModel = mongoose.model("chat", ChatSchema);

app.post('/join',async(req,res)=>{
    const { username, roomID } = req.body;
    const findUser = await ChatModel.findOne({ username }).where({ roomID }).exec()
    if (findUser) {
        return res.status(401).json({
            status: 401,
            message: 'you already in the room '+roomID
        })
    }
    const newUser = new ChatModel({
        username:username,
        roomID:roomID
    })
    newUser.save()
        .then(result => {
            res.status(201).json({
                status: 201,
                message: 'Login Success',
                username:newUser.username,
                roomID:newUser.roomID
            })
        })
        .catch(err => {
            console.log(err)
        })
})
app.post('/exit', async(req, res) =>{
    const { username } = req.body;
    const findUser = await ChatModel.findOne({ username }).exec()
    if (!findUser) return res.status(404).json({
        status: 404,
        message:'User not found'
    })
    const deleteUser = await ChatModel.deleteOne({ username }).exec()
    if (!deleteUser) return res.status(400).json({status: 400,message: 'User failed exit room'})
    return res.status(200).json({
        status: 200,
        message: 'User has left room'
    })
})
io.on('connection', (socket) => {
    console.log(`user ${socket.id} is connected`)
    socket.emit('loggedInUser')

    socket.on('user', (username) => { 
        console.log(`${username} has login`)
        socket.username = username;
        // users.push(socket)

        // io.emit('userOnline',socket.username)
    })
    socket.on('send-message', (messages) => {
        console.log(messages)
        // messages.push(message)
        messagesArr =messages
        socket.broadcast.emit('recieve-message',messages)
        // console.log('from server',messages)
    })
    // socket.on('message', (msg) => {
    //     let message = {
    //         index,
    //         username: socket.username,
    //         msg
    //     }
    //     messages.push(message)
    //     io.emit('msg', message)
    //     index++
    // })
    //Disconnect
    socket.on('disconnect', () => {
        console.log(`${socket.username} has left`)
        io.emit('user left', socket.username)
        // users.splice(users.indexOf(socket),1)
    })
})
mongoose.connect('mongodb://localhost:27017/db_chat')
    .then(result => {
        http.listen(3000,() => {
            console.log("Listen to port 3000")
        })
    }).catch(err => {
        console.log(err)
    })