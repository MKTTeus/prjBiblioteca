const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const bodyParser = require('body-parser'); // Import body-parser
const fs = require('fs');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files (optional)
app.use(express.static(path.join(__dirname, '..', 'public')));

// Load user data from JSON file
const users = JSON.parse(fs.readFileSync(path.join(__dirname, 'user.json'), 'utf8'));

// Example usage of users in the login route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (user) {
        return res.json({ token: 'dummy-jwt-token', user });
    }
    return res.status(401).json({ error: 'Invalid credentials' });
});
const books = [];
let nextId = 1;

//main login route
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    // Dummy authentication logic (replace with real user validation)
    if (email === 'admin' && password === 'password123') {
        return res.json({ token: 'dummy-jwt-token', user: { id: 1, name: 'Admin', email } });
    }
}); 
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

// Example API endpoints
app.get('/api/books', (req, res) => {
    res.json(books);
});

app.get('/api/books/:id', (req, res) => {
    const b = books.find(x => x.id === Number(req.params.id));
    if (!b) return res.status(404).json({ error: 'Not found' });
    res.json(b);
});

app.post('/api/books', (req, res) => {
    const { title, author } = req.body;
    if (!title || !author) return res.status(400).json({ error: 'title and author required' });
    const book = { id: nextId++, title, author, createdAt: new Date().toISOString() };
    books.push(book);
    res.status(201).json(book);
});

app.put('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);
    const idx = books.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const { title, author } = req.body;
    if (title) books[idx].title = title;
    if (author) books[idx].author = author;
    res.json(books[idx]);
});

app.delete('/api/books/:id', (req, res) => {
    const id = Number(req.params.id);
    const idx = books.findIndex(x => x.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    const [deleted] = books.splice(idx, 1);
    res.json(deleted);
});

// 404 handler
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});

// Graceful shutdown
const shutdown = () => {
    console.log('Shutting down server...');
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

module.exports = app;