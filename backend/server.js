const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const compression = require('compression');
const { Server } = require('socket.io');
const path = require('path');

dotenv.config();

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);
const io = new Server(server, {
    cors: { 
        origin: true, 
        methods: ["GET", "POST"] 
    }
});
app.set('io', io);

io.on('connection', (socket) => {
    // Socket client connected
});

// Middleware
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
    frameguard: false
}));
app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Custom Request Logger
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Primary Database Connection (Atlas for Admins, Colleges, Categories, Logs)
const primaryMongoUri = process.env.MONGODB_URI || process.env.VENDOR_MONGODB_URI;
mongoose.connect(primaryMongoUri, { family: 4, serverSelectionTimeoutMS: 30000 })
    .then(() => console.log('Connected to Primary MongoDB Atlas'))
    .catch(err => console.error('MongoDB initial connection error:', err.message));

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection runtime error:', err.message);
});

// Process-level unhandled rejection guard
process.on('unhandledRejection', (reason) => {
    console.warn('[Process Warn] Unhandled Rejection:', reason && reason.message ? reason.message : reason);
});

// Initialize Vendor DB Connection
const vendorDb = require('./config/vendorDb');

const db = mongoose.connection;

db.once('open', () => {
    console.log('Database Connected Successfully. Vendor Admin running.');

    // Automatically ensure all ALLOWED_ADMIN_EMAILS exist in Admin collection with correct roles
    try {
        const Admin = require('./models/Admin');
        const superAdmins = ['yashwanthkumar87657@gmail.com', 'dhanushsunny00@gmail.com'];
        const allowedEmails = (process.env.ALLOWED_ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        allowedEmails.forEach(async (email) => {
            try {
                const existing = await Admin.findOne({ email });
                const expectedRole = superAdmins.includes(email) ? 'superadmin' : 'admin';
                if (!existing) {
                    const newAdmin = new Admin({
                        email,
                        password: 'Spheronix@123$',
                        role: expectedRole
                    });
                    await newAdmin.save();
                    console.log(`[AUTH INIT] Auto-seeded admin account: ${email} as ${expectedRole}`);
                } else if (existing.role !== expectedRole) {
                    await Admin.updateOne({ _id: existing._id }, { $set: { role: expectedRole } });
                    console.log(`[AUTH INIT] Updated role for ${email} to ${expectedRole}`);
                }
            } catch (seedErr) {
                console.warn(`[AUTH INIT] Note for ${email}:`, seedErr.message);
            }
        });
    } catch (adminSyncErr) {
        console.warn('[AUTH INIT] Admin sync runner warning:', adminSyncErr.message);
    }
});



// Vendor Change Streams for Live Updates
const { clearDashboardCache } = require('./controllers/analyticsController');
const VendorRegistration = require('./models/VendorRegistration');

vendorDb.once('open', () => {
    try {
        console.log('Starting Vendor Change Stream watcher...');
        const vendorStream = VendorRegistration.watch();
        vendorStream.on('change', (change) => {
            console.log('Vendor Registration Change Detected:', change.operationType);
            try { clearDashboardCache(); } catch (e) {}
            if (change.operationType === 'insert') {
                io.emit('vendorRegistrationAdded');
                io.emit('newPayment');
            } else {
                io.emit('vendorRegistrationUpdated');
                io.emit('registrationUpdated');
            }
        });
        vendorStream.on('error', (err) => {
            console.warn('Vendor Stream Warning:', err.message);
        });
    } catch (err) {
        console.warn('Failed to initialize vendor change stream:', err.message);
    }
});

// Route imports
const authRoutes = require('./routes/auth');
const vendorRoutes = require('./routes/vendor');
const collegesRoutes = require('./routes/colleges');
const categoriesRoutes = require('./routes/categories');
const paymentRoutes = require('./routes/payments');
const analyticsRoutes = require('./routes/analytics');
const adminLogsRoutes = require('./routes/adminLogs');

const { verifyToken } = require('./middleware/authMiddleware');
const activityLogger = require('./middleware/activityLogger');

app.use(activityLogger);

// Authentication Routes
app.use('/api/auth', authRoutes);

// Protected Core Routes
app.use('/api/vendor', verifyToken, vendorRoutes);
app.use('/api/vender', verifyToken, vendorRoutes);
app.use('/api/colleges', verifyToken, collegesRoutes);
app.use('/api/categories', verifyToken, categoriesRoutes);
app.use('/api/payments', verifyToken, paymentRoutes);
app.use('/api/analytics', verifyToken, analyticsRoutes);
app.use('/api/admin-logs', adminLogsRoutes);

app.get('/', (req, res) => res.json({ message: 'Vendor Admin Backend API is running.', status: 'online' }));

const PORT = process.env.PORT || 5051;

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${PORT} is already in use by another process.`);
        console.error(`To kill the process using port ${PORT}, run this in PowerShell:`);
        console.error(`  Stop-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess -Force\n`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
});

server.listen(PORT, '0.0.0.0', () => console.log(`Backend running on port ${PORT} across all interfaces (0.0.0.0)`));
