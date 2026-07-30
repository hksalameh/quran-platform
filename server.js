const express = require('express');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

const users = [];

app.post('/register', (req, res) => {
    const { name, email, password, role } = req.body;
    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ error: 'البريد الإلكتروني مستخدم مسبقاً' });
    }
    users.push({ name, email, password, role });
    res.json({ message: 'تم إنشاء الحساب بنجاح' });
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
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