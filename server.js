const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const socketIo = require('socket.io');
const bcrypt = require('bcrypt');
const cors = require('cors');

const User = require('./models/User');
const GroupMessage = require('./models/GroupMessage');
const PrivateMessage = require('./models/PrivateMessage');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(cors());
app.use(express.json());
app.use(express.static('view'));

mongoose.connect('mongodb://127.0.0.1:27017/chatApp')
.then(() => console.log("MongoDB Connected"))
.catch(err => console.log(err));


app.post('/signup', async (req, res) => {
    const { username, firstname, lastname, password } = req.body;

    try {
        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = new User({
            username,
            firstname,
            lastname,
            password: hashedPassword
        });

        await newUser.save();
        res.json({ message: "User Created" });

    } catch (error) {
        res.status(400).json({ error: "Username already exists" });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await User.findOne({ username });

    if (!user) {
        return res.status(400).json({ error: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
    }

    res.json({ message: "Login successful", username });
});

io.on('connection', (socket) => {

    socket.on('joinRoom', (room) => {
        socket.join(room);
    });

    socket.on('chatMessage', async (data) => {
        const newMessage = new GroupMessage(data);
        await newMessage.save();
        io.to(data.room).emit('message', data);
    });

    socket.on('typing', (data) => {
        socket.to(data.room).emit('typing', data.username);
    });

});

server.listen(3000, () => {
    console.log("Server running on port 3000");
});


