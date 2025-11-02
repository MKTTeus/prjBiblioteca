const express = require('express');
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const fs = require('fs');
const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

// Use express JSON parser
router.use(express.json());

// Mock user store with hashed passwords (for demo only)
const users = [
    { id: 1, username: 'admin', password: bcrypt.hashSync('123456', 8) },
    { id: 2, username: 'aluno', password: bcrypt.hashSync('123456', 8) }
];

// POST /auth/login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }

        // Load users from user.json
        const usersData = JSON.parse(fs.readFileSync('user.json', 'utf8'));
        const user = usersData.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const passwordMatches = await bcrypt.compare(password, user.password);
        if (!passwordMatches) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({
            message: 'Login successful',
            token,
            user: { id: user.id, username: user.username },
            redirectUrl: '/biblioteca'
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// POST /auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: 'Username and password required' });
        }

        if (users.find(u => u.username === username)) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 8);
        const newUser = { id: users.length + 1, username, password: hashedPassword };
        users.push(newUser);

        const token = jwt.sign(
            { id: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(201).json({
            message: 'User registered successfully',
            user: { id: newUser.id, username: newUser.username },
            token,
            redirectUrl: '/SingUp'
        });
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});
export const setToken = (token, user, remember = false) => {
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem("authToken", token);
  storage.setItem("user", JSON.stringify(user));
};

export const getToken = () => {
  return localStorage.getItem("authToken") || sessionStorage.getItem("authToken");
};

export const removeToken = () => {
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("authToken");
  sessionStorage.removeItem("user");
};

export const isLoggedIn = () => !!getToken();


module.exports = router;