const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.json());
app.use(cors());

const USERS_FILE = path.join(__dirname, 'users.json');

// دالة لقراءة المستخدمين من الملف
function getUsers() {
    if (!fs.existsSync(USERS_FILE)) return [];
    try {
        return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
    } catch (e) {
        return [];
    }
}

// دالة لحفظ المستخدمين في الملف
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const users = getUsers();
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    users.push({ name, email, password, role });
    saveUsers(users);
    res.json({ message: 'تم إنشاء الحساب بنجاح' });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const users = getUsers();
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) {
        return res.status(400).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' });
    }
    res.json({ token: 'mock-token-123', role: user.role });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});