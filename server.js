
const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// File paths for JSON storage
const USERS_FILE = './data/users.json';
const APPS_FILE = './data/apps.json';
const BADGES_FILE = './data/badges.json';
const ADMIN_FILE = './data/admin.json';

// Ensure data directory exists
if (!fs.existsSync('./data')) {
    fs.mkdirSync('./data');
}

// Helper functions for file operations
function loadJsonFile(filePath, defaultValue = []) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        }
        return defaultValue;
    } catch (error) {
        console.error(`Error loading ${filePath}:`, error);
        return defaultValue;
    }
}

function saveJsonFile(filePath, data) {
    try {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error(`Error saving ${filePath}:`, error);
        return false;
    }
}

// Data management functions
function loadUsers() {
    return loadJsonFile(USERS_FILE, []);
}

function saveUsers(users) {
    return saveJsonFile(USERS_FILE, users);
}

function loadApps() {
    return loadJsonFile(APPS_FILE, []);
}

function saveApps(apps) {
    return saveJsonFile(APPS_FILE, apps);
}

function loadBadges() {
    return loadJsonFile(BADGES_FILE, []);
}

function saveBadges(badges) {
    return saveJsonFile(BADGES_FILE, badges);
}

function loadAdminConfig() {
    return loadJsonFile(ADMIN_FILE, {
        adminUser: 'AlzzTech',
        primaryPin: '7070',
        securityPin: '6060',
        securityQuestion: 'What year?',
        securityAnswer: '2015'
    });
}

function saveAdminConfig(config) {
    return saveJsonFile(ADMIN_FILE, config);
}

// Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Middleware
app.use(express.json());
app.use(express.static('.'));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// User registration
app.post('/api/register', async (req, res) => {
    try {
        const { username, password, email } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const users = loadUsers();
        
        // Check if user exists
        const existingUser = users.find(u => u.username === username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Create user
        const newUser = {
            id: generateId(),
            username,
            password: hashedPassword,
            email: email || `${username}@acuestore.com`,
            created_at: new Date().toISOString(),
            is_banned: false
        };
        
        users.push(newUser);
        saveUsers(users);
        
        res.json({
            message: 'User created successfully',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// User login
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }
        
        const users = loadUsers();
        const user = users.find(u => u.username === username);
        
        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        // Check if banned
        if (user.is_banned) {
            return res.status(403).json({ error: 'Your account has been banned. Please contact support.' });
        }
        
        // Check password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all users (admin only)
app.get('/api/admin/users', async (req, res) => {
    try {
        const users = loadUsers();
        const safeUsers = users.map(u => ({
            id: u.id,
            username: u.username,
            email: u.email,
            created_at: u.created_at,
            is_banned: u.is_banned
        }));
        res.json(safeUsers);
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Ban/unban user
app.put('/api/admin/users/:username/ban', async (req, res) => {
    try {
        const { username } = req.params;
        const { banned } = req.body;
        
        const users = loadUsers();
        const userIndex = users.findIndex(u => u.username === username);
        
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        users[userIndex].is_banned = banned;
        saveUsers(users);
        
        res.json({ message: `User ${username} has been ${banned ? 'banned' : 'unbanned'}` });
    } catch (error) {
        console.error('Ban user error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get all apps with badges
app.get('/api/apps', async (req, res) => {
    try {
        const apps = loadApps();
        const badges = loadBadges();
        
        // Merge apps with their badges
        const appsWithBadges = apps.map(app => {
            const appBadges = badges.filter(b => b.app_id === app.id).map(b => b.badge_type);
            return {
                ...app,
                badges: appBadges
            };
        });
        
        res.json(appsWithBadges);
    } catch (error) {
        console.error('Get apps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add new app
app.post('/api/admin/apps', async (req, res) => {
    try {
        const { id, name, developer, category, rating, description, icon, download_url, is_hot } = req.body;
        
        const apps = loadApps();
        
        // Check if app with this ID already exists
        const existingApp = apps.find(a => a.id === id);
        if (existingApp) {
            return res.status(400).json({ error: 'App with this ID already exists' });
        }
        
        const newApp = {
            id,
            name,
            developer,
            category,
            rating: parseFloat(rating),
            description,
            icon,
            download_url,
            is_hot: is_hot || false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        apps.push(newApp);
        saveApps(apps);
        
        res.json(newApp);
    } catch (error) {
        console.error('Add app error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update app
app.put('/api/admin/apps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, developer, category, rating, description, icon, download_url, is_hot } = req.body;
        
        const apps = loadApps();
        const appIndex = apps.findIndex(a => a.id === id);
        
        if (appIndex === -1) {
            return res.status(404).json({ error: 'App not found' });
        }
        
        apps[appIndex] = {
            ...apps[appIndex],
            name,
            developer,
            category,
            rating: parseFloat(rating),
            description,
            icon,
            download_url,
            is_hot: is_hot || false,
            updated_at: new Date().toISOString()
        };
        
        saveApps(apps);
        
        res.json(apps[appIndex]);
    } catch (error) {
        console.error('Update app error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete app
app.delete('/api/admin/apps/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const apps = loadApps();
        const appIndex = apps.findIndex(a => a.id === id);
        
        if (appIndex === -1) {
            return res.status(404).json({ error: 'App not found' });
        }
        
        apps.splice(appIndex, 1);
        saveApps(apps);
        
        // Also remove badges for this app
        const badges = loadBadges();
        const filteredBadges = badges.filter(b => b.app_id !== id);
        saveBadges(filteredBadges);
        
        res.json({ message: 'App deleted successfully' });
    } catch (error) {
        console.error('Delete app error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Add badge to app
app.post('/api/admin/apps/:id/badges', async (req, res) => {
    try {
        const { id } = req.params;
        const { badge_type } = req.body;
        
        const badges = loadBadges();
        
        // Check if badge already exists
        const existingBadge = badges.find(b => b.app_id === id && b.badge_type === badge_type);
        if (existingBadge) {
            return res.json({ message: 'Badge already exists' });
        }
        
        const newBadge = {
            id: generateId(),
            app_id: id,
            badge_type,
            created_at: new Date().toISOString()
        };
        
        badges.push(newBadge);
        saveBadges(badges);
        
        res.json({ message: 'Badge added successfully' });
    } catch (error) {
        console.error('Add badge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Remove badge from app
app.delete('/api/admin/apps/:id/badges/:badgeType', async (req, res) => {
    try {
        const { id, badgeType } = req.params;
        
        const badges = loadBadges();
        const badgeIndex = badges.findIndex(b => b.app_id === id && b.badge_type === badgeType);
        
        if (badgeIndex === -1) {
            return res.status(404).json({ error: 'Badge not found' });
        }
        
        badges.splice(badgeIndex, 1);
        saveBadges(badges);
        
        res.json({ message: 'Badge removed successfully' });
    } catch (error) {
        console.error('Remove badge error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get admin settings
app.get('/api/admin/settings', async (req, res) => {
    try {
        const settings = loadAdminConfig();
        res.json(settings);
    } catch (error) {
        console.error('Get admin settings error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Force reload apps from config
app.post('/api/admin/reload-apps', async (req, res) => {
    try {
        await initializeApps(true);
        res.json({ message: 'Apps reloaded from config successfully' });
    } catch (error) {
        console.error('Reload apps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Public endpoint to reload apps (for development)
app.get('/api/reload-apps', async (req, res) => {
    try {
        await initializeApps(true);
        res.json({ message: 'Apps reloaded from config successfully' });
    } catch (error) {
        console.error('Reload apps error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Initialize apps from config
async function initializeApps(forceReload = false) {
    try {
        const apps = loadApps();
        
        if (apps.length === 0 || forceReload) {
            console.log(forceReload ? 'Force reloading apps from config...' : 'Apps file is empty, populating with default apps...');
            
            // Clear require cache to ensure fresh data
            delete require.cache[require.resolve('./apps-config.js')];
            
            // Import apps data directly
            const configModule = require('./apps-config.js');
            const appsData = global.appsData || [];
            
            if (appsData && appsData.length > 0) {
                // Clear existing data if force reload
                if (forceReload) {
                    saveApps([]);
                    saveBadges([]);
                }
                
                const newApps = [];
                const newBadges = [];
                
                // Process each app
                for (const app of appsData) {
                    const appData = {
                        id: app.id,
                        name: app.name,
                        developer: app.developer,
                        category: app.category,
                        rating: app.rating,
                        description: app.description,
                        icon: app.icon,
                        download_url: app.downloadUrl,
                        is_hot: app.isHot || false,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    };
                    
                    newApps.push(appData);
                    
                    // Process badges
                    if (app.badges && app.badges.length > 0) {
                        for (const badge of app.badges) {
                            newBadges.push({
                                id: generateId(),
                                app_id: app.id,
                                badge_type: badge,
                                created_at: new Date().toISOString()
                            });
                        }
                    }
                }
                
                saveApps(newApps);
                saveBadges(newBadges);
                
                console.log(`${forceReload ? 'Reloaded' : 'Populated'} storage with ${newApps.length} apps`);
            } else {
                console.log('No apps data found in config file');
            }
        } else {
            console.log(`Storage already has ${apps.length} apps`);
        }
    } catch (error) {
        console.error('Error initializing apps:', error);
    }
}

// Initialize admin config
function initializeAdminConfig() {
    try {
        const config = loadAdminConfig();
        // Save it to ensure the file exists
        saveAdminConfig(config);
        console.log('Admin configuration initialized');
    } catch (error) {
        console.error('Admin config initialization error:', error);
    }
}

// Start server
app.listen(port, '0.0.0.0', async () => {
    console.log(`Server running on port ${port}`);
    console.log('Using JSON file storage');
    initializeAdminConfig();
    await initializeApps();
});
