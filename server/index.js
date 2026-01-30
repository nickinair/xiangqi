require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const socketHandler = require('./socket');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, lock down in prod
        methods: ["GET", "POST"]
    }
});

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
let supabase = null;

if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase initialized');
} else {
    console.warn('Supabase credentials missing. DB features will be disabled.');
}

// Routes
app.get('/', (req, res) => {
    res.send('Xiangqi Server is running');
});

// Socket.io
socketHandler(io, supabase);

const PORT = process.env.PORT || 3005;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
