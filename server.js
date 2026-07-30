const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.json());
app.use(cors());

const USERS_FILE = path.join(__dirname, 'users.json');

function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/register', (req, res) => {
    const { name, password, role } = req.body;
    const email = req.body.email.toLowerCase();
    const users = getUsers();
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    users.push({ name, email, password, role });
    saveUsers(users);
    res.json({ message: 'تم إنشاء الحساب بنجاح' });
});

app.post('/login', (req, res) => {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    res.json({ token: 'mock-token-123', role: user.role });
});

// إعداد Socket.io لربط الكاميرات وغرف التسميع
io.on('connection', (socket) => {
    console.log('جهاز جديد اتصل بالنظام:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
    });

    socket.on('offer', (data) => {
        socket.to(data.room).emit('offer', data);
    });

    socket.on('answer', (data) => {
        socket.to(data.room).emit('answer', data);
    });

    socket.on('ice-candidate', (data) => {
        socket.to(data.room).emit('ice-candidate', data);
    });

    socket.on('disconnect', () => {
        console.log('جهاز غادر النظام');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});