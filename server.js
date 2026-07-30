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
app.use(express.static(__dirname)); // تفعيل قراءة صفحات الواجهة (HTML)

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

// 1. تسجيل مستخدم جديد مع تحديد الباقة ورصيد الحصص
app.post('/register', (req, res) => {
    const { name, password, role, plan } = req.body;
    const email = req.body.email.toLowerCase();
    const users = getUsers();
    
    if (users.find(u => u.email === email)) {
        return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }

    // تحديد عدد الحصص وحالة الدفع بناءً على الباقة المختارة
    let sessions_left = 1; // حصة مجانية افتراضية (للباقة التجريبية)
    let is_paid = false;
    let current_plan = plan || 'trial';

    if (current_plan === 'basic') { sessions_left = 4; is_paid = true; }
    else if (current_plan === 'pro') { sessions_left = 8; is_paid = true; }
    else if (current_plan === 'premium') { sessions_left = 12; is_paid = true; }
    else { current_plan = 'trial'; sessions_left = 1; is_paid = false; }

    users.push({ name, email, password, role, plan: current_plan, sessions_left, is_paid });
    saveUsers(users);
    res.json({ message: 'تم إنشاء الحساب بنجاح' });
});

// 2. تسجيل الدخول
app.post('/login', (req, res) => {
    const { password } = req.body;
    const email = req.body.email.toLowerCase();
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    
    if (!user) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    // سنستخدم الإيميل كـ Token مؤقت لمعرفة المستخدم الحالي
    res.json({ token: user.email, role: user.role, name: user.name });
});

// 3. جلب بيانات المستخدم الحالي لعرضها في لوحة الطالب
app.get('/user-info', (req, res) => {
    const email = req.headers.authorization; // نستقبل التوكن (الإيميل)
    const users = getUsers();
    const user = users.find(u => u.email === email);
    
    if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });
    
    // نرسل بيانات المستخدم بدون إرسال كلمة المرور للأمان
    const { password, ...userInfo } = user;
    res.json(userInfo);
});

// 4. خصم حصة عند دخول الغرفة
app.post('/consume-session', (req, res) => {
    const email = req.headers.authorization;
    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === email);
    
    if (userIndex === -1) return res.status(404).json({ error: 'المستخدم غير موجود' });

    if (users[userIndex].sessions_left > 0) {
        users[userIndex].sessions_left -= 1; // خصم حصة واحدة
        saveUsers(users);
        res.json({ success: true, sessions_left: users[userIndex].sessions_left });
    } else {
        res.status(400).json({ error: 'لا يوجد رصيد حصص كافي، يرجى تجديد الاشتراك.' });
    }
});

// إعداد Socket.io لربط الكاميرات
io.on('connection', (socket) => {
    console.log('جهاز جديد اتصل بالنظام:', socket.id);
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        socket.to(roomId).emit('user-joined', socket.id);
    });
    socket.on('offer', (data) => { socket.to(data.room).emit('offer', data); });
    socket.on('answer', (data) => { socket.to(data.room).emit('answer', data); });
    socket.on('ice-candidate', (data) => { socket.to(data.room).emit('ice-candidate', data); });
    socket.on('disconnect', () => { console.log('جهاز غادر النظام'); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});