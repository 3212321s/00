
class AcueStore {
    constructor() {
        this.apps = [];
        this.categories = window.categories || {};
        this.currentFilter = '';
        this.currentSearchTerm = '';
        this.currentPage = 'today';
        this.deviceInfo = this.detectDevice();
        this.isOlderDevice = this.detectOlderDevice();
        this.currentUser = null;

        if (this.isOlderDevice) {
            this.optimizeForOlderDevices();
        }

        this.loadUserSession();
        this.loadAppsFromStorage();
        this.setupAuthHandlers();
        this.setupAdminAuthHandlers();
        this.checkAdminStatus();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updatePageTitle();
        this.setTodayDate();
        this.initModals();
        // Render apps after they're loaded
        if (this.apps && this.apps.length > 0) {
            this.renderHotApps();
            this.renderPopularApps();
            this.renderAllApps();
            this.renderEditorsChoice();
            this.renderFeaturedApps();
            this.renderTrendingApps();
            this.renderNewApps();
        }
    }

    setupEventListeners() {
        // Bottom navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchToPage(page);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearchTerm = e.target.value.toLowerCase().trim();
                this.handleSearch();
            });
        }

        // Category chips
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const category = chip.dataset.category;
                this.filterByCategory(category);
                this.updateActiveCategoryChip(chip);
            });
        });

        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfileModal();
            });
        }

        // Authentication form handlers
        this.setupAuthHandlers();
    }

    setupNavigation() {
        // Set initial active state
        this.switchToPage('today');
    }

    switchToPage(pageName) {
        // Hide all pages
        const pages = document.querySelectorAll('.page-section');
        pages.forEach(page => page.classList.remove('active'));

        // Show selected page
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentPage = pageName;
        this.updatePageTitle();
    }

    updatePageTitle() {
        const pageTitle = document.getElementById('pageTitle');
        if (!pageTitle) return;

        const titles = {
            today: 'Today',
            apps: 'Apps',
            search: 'Search'
        };

        pageTitle.textContent = titles[this.currentPage] || 'Nexora Store';
    }

    setTodayDate() {
        const todayDate = document.getElementById('todayDate');
        if (todayDate) {
            const today = new Date();
            const options = { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            };
            todayDate.textContent = today.toLocaleDateString('en-US', options).toUpperCase();
        }
    }

    loadAppsFromStorage() {
        // Load from localStorage or fall back to config
        const storedApps = localStorage.getItem('nexoraStoreApps');
        if (storedApps) {
            this.apps = JSON.parse(storedApps);
        } else {
            // Initialize from config data
            this.apps = window.appsData || [];
            this.saveAppsToStorage();
        }
        console.log('Apps loaded from localStorage:', this.apps.length);
    }

    saveAppsToStorage() {
        localStorage.setItem('nexoraStoreApps', JSON.stringify(this.apps));
    }

    renderHotApps() {
        const hotApps = this.apps.filter(app => app.is_hot === true || app.isHot === true).slice(0, 8);
        const container = document.getElementById('hotAppsContainer');

        console.log('Rendering hot apps:', hotApps.length, 'total apps:', this.apps.length);

        if (!container) {
            console.error('Hot apps container not found');
            return;
        }

        if (hotApps.length === 0) {
            container.innerHTML = '<div class="no-apps">No hot apps available</div>';
            return;
        }

        container.innerHTML = hotApps.map(app => this.createHotAppCard(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(hotApps[index]);
            });
        });
    }

    createHotAppCard(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };

        return `
            <div class="hot-app-card">
                <div class="hot-app-header">
                    <div class="hot-app-icon">
                        <i class="${app.icon}"></i>
                    </div>
                    <div class="hot-app-info">
                        <h4>${app.name}</h4>
                        <p>${app.developer}</p>
                    </div>
                </div>
                <div class="hot-app-footer">
                    <span class="hot-app-category">${categoryInfo.name}</span>
                    <button class="get-btn">GET</button>
                </div>
            </div>
        `;
    }

    renderAllApps() {
        let appsToRender = [...this.apps];

        if (this.currentFilter) {
            appsToRender = appsToRender.filter(app => app.category === this.currentFilter);
        }

        console.log('Rendering all apps:', appsToRender.length, 'filtered by:', this.currentFilter);

        const container = document.getElementById('appsGrid');
        if (!container) {
            console.error('Apps grid container not found');
            return;
        }

        container.innerHTML = appsToRender.map(app => this.createAppRow(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(appsToRender[index]);
            });
        });

        // Add badge event listeners
        const badges = container.querySelectorAll('.app-badge');
        badges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const badgeType = badge.dataset.badgeType;
                this.showBadgeModal(badgeType);
            });
        });
    }

    createAppRow(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };
        const stars = this.generateStars(app.rating);
        const badges = this.createAppBadges(app.badges || []);

        return `
            <div class="app-row">
                <div class="app-icon-small">
                    <i class="${app.icon}"></i>
                </div>
                <div class="app-details">
                    <div class="app-name">${app.name}</div>
                    <div class="app-developer">${app.developer}</div>
                    <div class="app-rating">
                        <span class="rating-stars">${stars}</span>
                        <span class="rating-value">${app.rating}</span>
                    </div>
                    ${badges}
                </div>
                <button class="get-btn">GET</button>
            </div>
        `;
    }

    renderPopularApps() {
        const popularApps = this.apps
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 6);

        const container = document.getElementById('popularApps');
        if (!container) return;

        container.innerHTML = popularApps.map(app => this.createPopularAppCard(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(popularApps[index]);
            });
        });
    }

    createPopularAppCard(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };

        return `
            <div class="popular-app-card">
                <div class="popular-app-icon">
                    <i class="${app.icon}"></i>
                </div>
                <div class="popular-app-name">${app.name}</div>
                <div class="popular-app-category">${categoryInfo.name}</div>
                <button class="get-btn" style="margin-top: 8px;">GET</button>
            </div>
        `;
    }

    filterByCategory(category) {
        this.currentFilter = category;
        this.renderAllApps();
    }

    updateActiveCategoryChip(activeChip) {
        const chips = document.querySelectorAll('.category-chip');
        chips.forEach(chip => chip.classList.remove('active'));
        activeChip.classList.add('active');
    }

    handleSearch() {
        if (!this.currentSearchTerm) {
            // Show popular apps
            document.getElementById('popularApps').style.display = 'grid';
            document.getElementById('searchResults').style.display = 'none';
            return;
        }

        let filteredApps = this.apps.filter(app =>
            app.name.toLowerCase().includes(this.currentSearchTerm) ||
            app.developer.toLowerCase().includes(this.currentSearchTerm) ||
            app.description.toLowerCase().includes(this.currentSearchTerm) ||
            app.category.toLowerCase().includes(this.currentSearchTerm)
        );

        // Sort by relevance
        filteredApps.sort((a, b) => {
            const aNameIndex = a.name.toLowerCase().indexOf(this.currentSearchTerm);
            const bNameIndex = b.name.toLowerCase().indexOf(this.currentSearchTerm);

            if (aNameIndex === 0 && bNameIndex !== 0) return -1;
            if (bNameIndex === 0 && aNameIndex !== 0) return 1;

            return 0;
        });

        // Hide popular apps, show search results
        document.getElementById('popularApps').style.display = 'none';
        const searchResults = document.getElementById('searchResults');
        searchResults.style.display = 'block';

        if (filteredApps.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <h3>No Results</h3>
                    <p>Try a different search term</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = filteredApps.map(app => this.createAppRow(app)).join('');

            // Add event listeners to search results
            const getButtons = searchResults.querySelectorAll('.get-btn');
            getButtons.forEach((button, index) => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleDownload(filteredApps[index]);
                });
            });
        }
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    createAppBadges(badges) {
        if (!badges || badges.length === 0) return '';

        const badgeTypes = window.badgeTypes || {};

        const badgeHtml = badges.map(badgeType => {
            const badge = badgeTypes[badgeType];
            if (!badge) return '';

            return `<span class="app-badge badge-${badgeType}" data-badge-type="${badgeType}">${badge.icon}</span>`;
        }).join('');

        return badgeHtml ? `<div class="app-badges">${badgeHtml}</div>` : '';
    }

    handleDownload(app) {
        if (!this.isBrowserAvailable()) {
            this.showBrowserError();
            return;
        }

        const downloadUrl = app.downloadUrl || app.download_url;
        console.log(`Downloading ${app.name} from ${downloadUrl}`);
        window.open(downloadUrl, '_blank', 'noopener,noreferrer');
    }

    isBrowserAvailable() {
        if (typeof window === 'undefined' || typeof window.open !== 'function') {
            return false;
        }

        const userAgent = navigator.userAgent.toLowerCase();
        const browsers = ['chrome', 'firefox', 'safari', 'opers', 'opera air', 'samsung', 'ucbrowser'];

        return browsers.some(browser => userAgent.includes(browser)) || 
               userAgent.includes('mozilla') || 
               userAgent.includes('webkit');
    }

    showBrowserError() {
        alert('Error 671: Browser Not Supported\n\nPlease have a Web Browser ready to download the app.');
    }

    initModals() {
        // Profile modal
        const profileModal = document.getElementById('profileModal');
        const closeProfileModal = document.getElementById('closeProfileModal');
        const aboutStoreBtn = document.getElementById('aboutStoreBtn');
        const rememberingBtn = document.getElementById('rememberingBtn');
        const settingsBtn = document.getElementById('settingsBtn');
        const adminPanelBtn = document.getElementById('adminPanelBtn');

        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => {
                this.hideProfileModal();
            });
        }

        if (aboutStoreBtn) {
            aboutStoreBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showBadgeModal('store-info');
            });
        }

        if (rememberingBtn) {
            rememberingBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showRememberingModal();
            });
        }

        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showSettingsModal();
            });
        }

        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showAdminPanel();
            });
        }

        // Admin panel menu button
        const adminPanelMenuBtn = document.getElementById('adminPanelMenuBtn');
        if (adminPanelMenuBtn) {
            adminPanelMenuBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showAdminAuthModal();
            });
        }

        // Settings modal
        const closeSettingsModal = document.getElementById('closeSettingsModal');
        if (closeSettingsModal) {
            closeSettingsModal.addEventListener('click', () => {
                this.hideSettingsModal();
            });
        }

        // Admin modal
        const closeAdminModal = document.getElementById('closeAdminModal');
        if (closeAdminModal) {
            closeAdminModal.addEventListener('click', () => {
                this.hideAdminPanel();
            });
        }

        // Remembering modal
        const closeRememberingModal = document.getElementById('closeRememberingModal');
        if (closeRememberingModal) {
            closeRememberingModal.addEventListener('click', () => {
                this.hideRememberingModal();
            });
        }

        // Badge modal
        const badgeModalClose = document.getElementById('badgeModalClose');
        if (badgeModalClose) {
            badgeModalClose.addEventListener('click', () => {
                this.hideBadgeModal();
            });
        }

        this.setupSettingsControls();
        this.setupAdminControls();
        this.checkAdminStatus();
        this.loadBackgroundTheme();

        // Close modals on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-modal')) {
                this.hideProfileModal();
            }
            if (e.target.classList.contains('remembering-modal')) {
                this.hideRememberingModal();
            }
            if (e.target.classList.contains('badge-modal')) {
                this.hideBadgeModal();
            }
            if (e.target.classList.contains('settings-modal')) {
                this.hideSettingsModal();
            }
            if (e.target.classList.contains('admin-modal')) {
                this.hideAdminPanel();
            }
        });
    }

    showProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            this.updateProfileUI();
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showRememberingModal() {
        const modal = document.getElementById('rememberingModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideRememberingModal() {
        const modal = document.getElementById('rememberingModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showBadgeModal(badgeType) {
        const modal = document.getElementById('badgeModal');
        const title = document.getElementById('badgeModalTitle');
        const body = document.getElementById('badgeModalBody');
        const icon = document.getElementById('badgeModalIcon');

        if (!modal || !title || !body || !icon) return;

        const badgeInfo = {
            'data-sharing': {
                title: 'Data Sharing Notice',
                icon: '🌐',
                content: `
                    <p><strong>This app may share data with third parties.</strong></p>
                    <p>The app developer has indicated that this application may collect, use, or share the following types of data:</p>
                    <ul>
                        <li>Personal information (name, email, etc.)</li>
                        <li>Usage data and analytics</li>
                        <li>Device information</li>
                        <li>Location data (if applicable)</li>
                    </ul>
                    <p>Please review the app's privacy policy before downloading to understand how your data will be used.</p>
                `
            },
            'unstable': {
                title: 'Unstable App Warning',
                icon: '⚠️',
                content: `
                    <p><strong>This app may be unstable or contain bugs.</strong></p>
                    <p>Users have reported the following potential issues:</p>
                    <ul>
                        <li>App crashes or freezes</li>
                        <li>Performance issues</li>
                        <li>Feature limitations</li>
                        <li>Compatibility problems</li>
                    </ul>
                    <p>Download at your own risk. Consider looking for alternative apps with better stability ratings.</p>
                `
            },
            'store-info': {
                title: 'About Store',
                icon: 'ⓘ',
                content: `
                    <div class="store-info-content">
                        <p><strong>Store Information</strong></p>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Store UI:</span>
                                <span class="info-value">4.0</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Security Patch:</span>
                                <span class="info-value">July 12, 2025</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">ASPFU Version:</span>
                                <span class="info-value">Beta-S6000ASPFUV918</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Build:</span>
                                <span class="info-value">S6000Y25MJYD13SU04</span>
                            </div>
                        </div>
                        <p>Nexora Store provides safe and verified APK downloads from APKPure. All apps are scanned for security before being made available.</p>
                    </div>
                `
            }
        };

        const info = badgeInfo[badgeType];
        if (info) {
            title.textContent = info.title;
            icon.textContent = info.icon;
            body.innerHTML = info.content;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideBadgeModal() {
        const modal = document.getElementById('badgeModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    detectDevice() {
        const userAgent = navigator.userAgent;
        return {
            type: /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop',
            os: /Android/i.test(userAgent) ? 'Android' : 
                /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS' : 'Other'
        };
    }

    detectOlderDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;

        const olderDevices = [
            'sm-g935', 'sm-g930', 'sm-g925', 'sm-g920',
            'iphone 6', 'iphone 7', 'iphone 8'
        ];

        const isOlderDevice = olderDevices.some(device => userAgent.includes(device));
        const hasLowMemory = memory < 4;
        const hasLowCores = cores < 4;

        return isOlderDevice || hasLowMemory || hasLowCores;
    }

    optimizeForOlderDevices() {
        console.log('Optimizing for older device...');

        // Reduce animations
        const style = document.createElement('style');
        style.textContent = `
            * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }

            .horizontal-scroll {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: auto;
            }
        `;
        document.head.appendChild(style);
    }

    setupAuthHandlers() {
        // Show/hide form toggles
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');

        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            });
        }

        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            });
        }

        // Form submissions
        const loginFormElement = document.getElementById('loginFormElement');
        const registerFormElement = document.getElementById('registerFormElement');

        if (loginFormElement) {
            loginFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        if (registerFormElement) {
            registerFormElement.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.handleLogout();
            });
        }
    }

    loadUserSession() {
        const savedUser = localStorage.getItem('nexoraStoreUser');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
            this.updateProfileUI();
        }
    }

    saveUserSession() {
        if (this.currentUser) {
            localStorage.setItem('nexoraStoreUser', JSON.stringify(this.currentUser));
        } else {
            localStorage.removeItem('nexoraStoreUser');
        }
    }

    handleLogin() {
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            alert('Please fill in all fields');
            return;
        }

        // Load users from localStorage
        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        const user = users.find(u => u.username === username && u.password === password);

        if (!user) {
            alert('Invalid username or password');
            return;
        }

        if (user.is_banned) {
            alert('Your account has been banned. Please contact support.');
            return;
        }

        this.currentUser = {
            id: user.id,
            username: user.username,
            email: user.email
        };
        this.saveUserSession();
        this.updateProfileUI();
        this.hideProfileModal();
        this.showSuccessMessage('Login successful!');
    }

    handleRegister() {
        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!username || !password || !confirmPassword) {
            alert('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        // Load existing users
        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        
        // Check if user exists
        if (users.find(u => u.username === username)) {
            alert('Username already exists');
            return;
        }

        // Create new user
        const newUser = {
            id: Date.now().toString(),
            username,
            password, // In real app, this should be hashed
            email: `${username}@nexorastore.com`,
            created_at: new Date().toISOString(),
            is_banned: false
        };

        users.push(newUser);
        localStorage.setItem('nexoraStoreUsers', JSON.stringify(users));

        // Auto-login
        this.currentUser = {
            id: newUser.id,
            username: newUser.username,
            email: newUser.email
        };
        this.saveUserSession();
        this.updateProfileUI();
        this.hideProfileModal();
        this.showSuccessMessage('Account created successfully!');
    }

    handleLogout() {
        this.currentUser = null;
        this.saveUserSession();
        this.updateProfileUI();
        this.hideProfileModal();
        this.showSuccessMessage('Logged out successfully!');
    }

    updateProfileUI() {
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const loginForm = document.getElementById('loginForm');
        const registerForm = document.getElementById('registerForm');
        const logoutSection = document.getElementById('logoutSection');

        if (this.currentUser) {
            // User is logged in
            profileName.textContent = this.currentUser.username;
            profileEmail.textContent = this.currentUser.email;
            loginForm.style.display = 'none';
            registerForm.style.display = 'none';
            logoutSection.style.display = 'block';
        } else {
            // User is not logged in
            profileName.textContent = 'Guest User';
            profileEmail.textContent = 'Not logged in';
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            logoutSection.style.display = 'none';
        }
    }

    showSuccessMessage(message) {
        // Create a temporary success message
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--success-color);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 3000;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);

        // Remove after 3 seconds
        setTimeout(() => {
            if (successDiv.parentNode) {
                successDiv.parentNode.removeChild(successDiv);
            }
        }, 3000);
    }

    // Admin Authentication Handlers
    setupAdminAuthHandlers() {
        // Close admin auth modal
        const closeAdminAuthModal = document.getElementById('closeAdminAuthModal');
        if (closeAdminAuthModal) {
            closeAdminAuthModal.addEventListener('click', () => {
                this.hideAdminAuthModal();
            });
        }

        // Step 1: Primary PIN
        const step1Btn = document.getElementById('step1Btn');
        const primaryPinInput = document.getElementById('primaryPin');
        if (step1Btn) {
            step1Btn.addEventListener('click', () => {
                this.validatePrimaryPin();
            });
        }
        if (primaryPinInput) {
            primaryPinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validatePrimaryPin();
                }
            });
        }

        // Step 2: Security PIN
        const step2Btn = document.getElementById('step2Btn');
        const securityPinInput = document.getElementById('securityPin');
        if (step2Btn) {
            step2Btn.addEventListener('click', () => {
                this.validateSecurityPin();
            });
        }
        if (securityPinInput) {
            securityPinInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validateSecurityPin();
                }
            });
        }

        // Step 3: Security Question
        const step3Btn = document.getElementById('step3Btn');
        const securityAnswerInput = document.getElementById('securityAnswer');
        if (step3Btn) {
            step3Btn.addEventListener('click', () => {
                this.validateSecurityAnswer();
            });
        }
        if (securityAnswerInput) {
            securityAnswerInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.validateSecurityAnswer();
                }
            });
        }
    }

    showAdminAuthModal() {
        const modal = document.getElementById('adminAuthModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            this.resetAdminAuthSteps();
        }
    }

    hideAdminAuthModal() {
        const modal = document.getElementById('adminAuthModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
            this.resetAdminAuthSteps();
        }
    }

    resetAdminAuthSteps() {
        // Reset all steps
        document.querySelectorAll('.auth-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById('step1').classList.add('active');

        // Clear inputs
        document.getElementById('primaryPin').value = '';
        document.getElementById('securityPin').value = '';
        document.getElementById('securityAnswer').value = '';
    }

    validatePrimaryPin() {
        const primaryPin = document.getElementById('primaryPin').value;
        if (primaryPin === window.adminConfig.primaryPin) {
            this.goToStep(2);
        } else {
            alert('Invalid primary PIN');
            document.getElementById('primaryPin').value = '';
        }
    }

    validateSecurityPin() {
        const securityPin = document.getElementById('securityPin').value;
        if (securityPin === window.adminConfig.securityPin) {
            this.goToStep(3);
        } else {
            alert('Invalid security PIN');
            document.getElementById('securityPin').value = '';
        }
    }

    validateSecurityAnswer() {
        const securityAnswer = document.getElementById('securityAnswer').value.trim();
        if (securityAnswer === window.adminConfig.securityAnswer) {
            window.adminConfig.isAdmin = true;
            this.hideAdminAuthModal();
            this.showAdminPanel();
        } else {
            alert('Invalid answer');
            document.getElementById('securityAnswer').value = '';
        }
    }

    goToStep(stepNumber) {
        // Hide all steps
        document.querySelectorAll('.auth-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show target step
        document.getElementById(`step${stepNumber}`).classList.add('active');
    }

    // Settings
    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    setupSettingsControls() {
        const resetPasswordBtn = document.getElementById('resetPasswordBtn');
        const backgroundOptions = document.querySelectorAll('.background-option');

        if (resetPasswordBtn) {
            resetPasswordBtn.addEventListener('click', () => {
                this.resetPassword();
            });
        }

        backgroundOptions.forEach(option => {
            option.addEventListener('click', () => {
                const themeType = option.dataset.theme;
                this.changeBackgroundTheme(themeType);
                this.updateActiveBackground(option);
            });
        });
    }

    resetPassword() {
        if (!this.currentUser) {
            alert('Please log in first');
            return;
        }

        const newPassword = prompt('Enter new password (minimum 6 characters):');
        if (!newPassword) return;

        if (newPassword.length < 6) {
            alert('Password must be at least 6 characters long');
            return;
        }

        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        const userIndex = users.findIndex(u => u.username === this.currentUser.username);

        if (userIndex !== -1) {
            users[userIndex].password = newPassword;
            localStorage.setItem('nexoraStoreUsers', JSON.stringify(users));
            this.showSuccessMessage('Password reset successfully!');
        }
    }

    changeBackgroundTheme(themeType) {
        // Remove all theme classes
        document.body.classList.remove('theme-pink', 'theme-blue', 'theme-green', 'theme-purple', 'theme-white');

        // Add new theme class (default doesn't need a class)
        if (themeType !== 'default') {
            document.body.classList.add('theme-' + themeType);
        }

        // Save to localStorage
        localStorage.setItem('nexoraStoreTheme', themeType);
    }

    updateActiveBackground(activeOption) {
        const options = document.querySelectorAll('.background-option');
        options.forEach(option => option.classList.remove('active'));
        activeOption.classList.add('active');
    }

    loadBackgroundTheme() {
        const savedTheme = localStorage.getItem('nexoraStoreTheme') || 'default';
        this.changeBackgroundTheme(savedTheme);

        const activeOption = document.querySelector(`[data-theme="${savedTheme}"]`);
        if (activeOption) {
            this.updateActiveBackground(activeOption);
        }
    }

    // Admin Panel
    checkAdminStatus() {
        // Admin status is now set through PIN authentication
        window.adminConfig.isAdmin = false;
    }

    showAdminPanel() {
        if (!window.adminConfig.isAdmin) {
            alert('Access denied. Admin privileges required.');
            return;
        }

        const modal = document.getElementById('adminModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
            this.loadAdminData();
            this.populateAdminSelects();
        }
    }

    hideAdminPanel() {
        const modal = document.getElementById('adminModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    setupAdminControls() {
        const adminTabs = document.querySelectorAll('.admin-tab');
        const addAppBtn = document.getElementById('addAppBtn');
        const addBadgeBtn = document.getElementById('addBadgeBtn');
        const updateRatingBtn = document.getElementById('updateRatingBtn');

        adminTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                this.switchAdminTab(tabName);
                this.updateActiveTab(tab);
            });
        });

        if (addAppBtn) {
            addAppBtn.addEventListener('click', () => {
                this.addNewApp();
            });
        }

        if (addBadgeBtn) {
            addBadgeBtn.addEventListener('click', () => {
                this.addBadgeToApp();
            });
        }

        if (updateRatingBtn) {
            updateRatingBtn.addEventListener('click', () => {
                this.updateAppRating();
            });
        }
    }

    populateAdminSelects() {
        const badgeAppSelect = document.getElementById('badgeAppSelect');
        const ratingAppSelect = document.getElementById('ratingAppSelect');

        // Clear existing options
        if (badgeAppSelect) {
            badgeAppSelect.innerHTML = '<option value="">Select App</option>';
        }
        if (ratingAppSelect) {
            ratingAppSelect.innerHTML = '<option value="">Select App</option>';
        }

        // Add apps to selects
        this.apps.forEach(app => {
            const option = `<option value="${app.id}">${app.name}</option>`;
            if (badgeAppSelect) {
                badgeAppSelect.innerHTML += option;
            }
            if (ratingAppSelect) {
                ratingAppSelect.innerHTML += option;
            }
        });
    }

    switchAdminTab(tabName) {
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => section.classList.remove('active'));

        const targetSection = document.getElementById(tabName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }
    }

    updateActiveTab(activeTab) {
        const tabs = document.querySelectorAll('.admin-tab');
        tabs.forEach(tab => tab.classList.remove('active'));
        activeTab.classList.add('active');
    }

    loadAdminData() {
        this.loadUsersList();
        this.loadAppsManagement();
        this.loadBadgesList();
        this.loadRatingsList();
    }

    loadBadgesList() {
        const badgesList = document.getElementById('badgesList');
        if (!badgesList) return;

        const appsWithBadges = this.apps.filter(app => app.badges && app.badges.length > 0);

        badgesList.innerHTML = appsWithBadges.map(app => {
            const badgeItems = app.badges.map(badge => `
                <span class="badge-item-display">${badge}</span>
            `).join('');

            return `
                <div class="badge-item">
                    <div class="badge-info">
                        <h5>${app.name}</h5>
                        <p>Badges: ${badgeItems}</p>
                    </div>
                    <div class="badge-actions">
                        <button class="admin-btn" onclick="window.acueStore.manageBadges('${app.id}')">
                            Manage Badges
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadRatingsList() {
        const ratingsList = document.getElementById('ratingsList');
        if (!ratingsList) return;

        ratingsList.innerHTML = this.apps.map(app => {
            return `
                <div class="rating-item">
                    <div class="rating-info">
                        <h5>${app.name}</h5>
                        <p>Current Rating: ${app.rating}/5</p>
                    </div>
                    <div class="rating-actions">
                        <button class="admin-btn" onclick="window.acueStore.quickUpdateRating('${app.id}', ${Math.max(1, app.rating - 0.5)})">
                            Lower Rating
                        </button>
                        <button class="admin-btn" onclick="window.acueStore.quickUpdateRating('${app.id}', ${Math.min(5, app.rating + 0.5)})">
                            Raise Rating
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    quickUpdateRating(appId, newRating) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        const oldRating = app.rating;
        app.rating = Math.round(newRating * 10) / 10; // Round to 1 decimal place
        this.saveAppsToStorage();

        // Refresh views
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();
        this.loadAppsManagement();
        this.loadRatingsList();

        this.showSuccessMessage(`Rating updated for ${app.name} from ${oldRating} to ${app.rating}`);
    }

    loadAppsManagement() {
        const appsManagementList = document.getElementById('appsManagementList');
        if (!appsManagementList) return;

        appsManagementList.innerHTML = this.apps.map(app => {
            const badgesList = (app.badges || []).map(badge => `
                <span class="admin-badge badge-${badge}">${window.badgeTypes[badge]?.icon || '🏷️'} ${badge}</span>
            `).join('');

            return `
                <div class="app-management-item" data-app-id="${app.id}">
                    <div class="app-management-header">
                        <div class="app-icon-admin">
                            <i class="${app.icon}"></i>
                        </div>
                        <div class="app-management-info">
                            <h5>${app.name}</h5>
                            <p>${app.developer} • ${app.category}</p>
                            <div class="app-status">
                                <span class="status-indicator ${this.isAppOnline(app) ? 'online' : 'offline'}">
                                    ${this.isAppOnline(app) ? '🟢 Online' : '🔴 Offline'}
                                </span>
                                <span class="rating-display">⭐ ${app.rating}/5</span>
                            </div>
                            <div class="app-badges-admin">
                                ${badgesList}
                            </div>
                        </div>
                        <div class="app-management-actions">
                            <button class="admin-btn-small" onclick="window.acueStore.editApp('${app.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="admin-btn-small" onclick="window.acueStore.manageBadges('${app.id}')">
                                <i class="fas fa-tags"></i>
                            </button>
                            <button class="admin-btn-small danger" onclick="window.acueStore.removeApp('${app.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="app-details-expandable" id="details-${app.id}" style="display: none;">
                        <div class="app-detail-row">
                            <strong>Description:</strong> ${app.description}
                        </div>
                        <div class="app-detail-row">
                            <strong>Download URL:</strong> 
                            <a href="${app.downloadUrl || app.download_url}" target="_blank" class="download-link">${app.downloadUrl || app.download_url}</a>
                        </div>
                        <div class="app-detail-row">
                            <strong>Hot App:</strong> ${app.isHot || app.is_hot ? 'Yes' : 'No'}
                        </div>
                        <div class="app-detail-row">
                            <strong>Last Checked:</strong> ${new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        // Add click handlers for expanding details
        const appItems = appsManagementList.querySelectorAll('.app-management-item');
        appItems.forEach(item => {
            const header = item.querySelector('.app-management-header');
            const details = item.querySelector('.app-details-expandable');

            header.addEventListener('click', (e) => {
                if (e.target.closest('.app-management-actions')) return;

                const isExpanded = details.style.display === 'block';
                details.style.display = isExpanded ? 'none' : 'block';
                header.classList.toggle('expanded', !isExpanded);
            });
        });
    }

    isAppOnline(app) {
        // Simulate online status check - in real app, you'd ping the URL
        const onlineApps = ['youtube', 'whatsapp', 'instagram', 'tiktok', 'spotify', 'facebook', 'telegram'];
        return onlineApps.includes(app.id) || Math.random() > 0.3;
    }

    editApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        const modal = this.createEditAppModal(app);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createEditAppModal(app) {
        const modal = document.createElement('div');
        modal.className = 'edit-app-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Edit App: ${app.name}</h3>
                    <button class="close-btn" onclick="this.closest('.edit-app-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="edit-form">
                        <div class="form-group">
                            <label>App Name</label>
                            <input type="text" id="editAppName" value="${app.name}">
                        </div>
                        <div class="form-group">
                            <label>Developer</label>
                            <input type="text" id="editAppDeveloper" value="${app.developer}">
                        </div>
                        <div class="form-group">
                            <label>Rating (1-5)</label>
                            <input type="number" id="editAppRating" value="${app.rating}" min="1" max="5" step="0.1">
                        </div>
                        <div class="form-group">
                            <label>Description</label>
                            <textarea id="editAppDescription">${app.description}</textarea>
                        </div>
                        <div class="form-group">
                            <label>Category</label>
                            <select id="editAppCategory">
                                <option value="social" ${app.category === 'social' ? 'selected' : ''}>Social</option>
                                <option value="entertainment" ${app.category === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                                <option value="games" ${app.category === 'games' ? 'selected' : ''}>Games</option>
                                <option value="productivity" ${app.category === 'productivity' ? 'selected' : ''}>Productivity</option>
                                <option value="photography" ${app.category === 'photography' ? 'selected' : ''}>Photography</option>
                                <option value="music" ${app.category === 'music' ? 'selected' : ''}>Music</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Download URL</label>
                            <input type="url" id="editAppUrl" value="${app.downloadUrl || app.download_url}">
                        </div>
                        <div class="form-group">
                            <label>
                                <input type="checkbox" id="editAppHot" ${(app.isHot || app.is_hot) ? 'checked' : ''}>
                                Hot App
                            </label>
                        </div>
                        <div class="form-actions">
                            <button class="admin-btn" onclick="window.acueStore.saveAppChanges('${app.id}')">
                                Save Changes
                            </button>
                            <button class="admin-btn" onclick="this.closest('.edit-app-modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    saveAppChanges(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        // Update app properties
        app.name = document.getElementById('editAppName').value;
        app.developer = document.getElementById('editAppDeveloper').value;
        app.rating = parseFloat(document.getElementById('editAppRating').value);
        app.description = document.getElementById('editAppDescription').value;
        app.category = document.getElementById('editAppCategory').value;
        app.downloadUrl = document.getElementById('editAppUrl').value;
        app.download_url = document.getElementById('editAppUrl').value;
        app.isHot = document.getElementById('editAppHot').checked;
        app.is_hot = document.getElementById('editAppHot').checked;

        this.saveAppsToStorage();
        this.loadAppsManagement();
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();

        document.querySelector('.edit-app-modal').remove();
        this.showSuccessMessage('App updated successfully!');
    }

    manageBadges(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        const modal = this.createBadgeManagementModal(app);
        document.body.appendChild(modal);
        modal.classList.add('show');
    }

    createBadgeManagementModal(app) {
        const modal = document.createElement('div');
        modal.className = 'badge-management-modal';

        const availableBadges = Object.keys(window.badgeTypes);
        const appBadges = app.badges || [];

        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Manage Badges: ${app.name}</h3>
                    <button class="close-btn" onclick="this.closest('.badge-management-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="badge-management">
                        <h4>Available Badges</h4>
                        <div class="available-badges">
                            ${availableBadges.map(badgeType => {
                                const badge = window.badgeTypes[badgeType];
                                const isSelected = appBadges.includes(badgeType);
                                return `
                                    <div class="badge-option ${isSelected ? 'selected' : ''}" data-badge="${badgeType}">
                                        <span class="badge-icon">${badge.icon}</span>
                                        <span class="badge-name">${badge.name}</span>
                                        <input type="checkbox" ${isSelected ? 'checked' : ''}>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                        <div class="current-badges">
                            <h4>Current Badges</h4>
                            <div class="current-badges-list" id="currentBadgesList">
                                ${appBadges.map(badgeType => {
                                    const badge = window.badgeTypes[badgeType];
                                    return `<span class="current-badge">${badge.icon} ${badge.name}</span>`;
                                }).join('')}
                            </div>
                        </div>
                        <div class="form-actions">
                            <button class="admin-btn" onclick="window.acueStore.saveBadgeChanges('${app.id}')">
                                Save Changes
                            </button>
                            <button class="admin-btn" onclick="this.closest('.badge-management-modal').remove()">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add event listeners for badge selection
        const badgeOptions = modal.querySelectorAll('.badge-option');
        badgeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const checkbox = option.querySelector('input[type="checkbox"]');
                checkbox.checked = !checkbox.checked;
                option.classList.toggle('selected', checkbox.checked);
                this.updateCurrentBadgesList(modal, app.id);
            });
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        return modal;
    }

    updateCurrentBadgesList(modal, appId) {
        const selectedBadges = Array.from(modal.querySelectorAll('.badge-option.selected'))
            .map(option => option.dataset.badge);

        const currentBadgesList = modal.querySelector('#currentBadgesList');
        currentBadgesList.innerHTML = selectedBadges.map(badgeType => {
            const badge = window.badgeTypes[badgeType];
            return `<span class="current-badge">${badge.icon} ${badge.name}</span>`;
        }).join('');
    }

    saveBadgeChanges(appId) {
        const modal = document.querySelector('.badge-management-modal');
        const selectedBadges = Array.from(modal.querySelectorAll('.badge-option.selected'))
            .map(option => option.dataset.badge);

        const app = this.apps.find(a => a.id === appId);
        if (app) {
            app.badges = selectedBadges;
            this.saveAppsToStorage();
            this.loadAppsManagement();
            this.renderHotApps();
            this.renderAllApps();
            this.renderPopularApps();
            this.renderEditorsChoice();
            this.renderFeaturedApps();
            this.renderTrendingApps();
            this.renderNewApps();
        }

        modal.remove();
        this.showSuccessMessage('Badges updated successfully!');
    }

    addNewApp() {
        const appName = document.getElementById('appName').value;
        const appRating = parseFloat(document.getElementById('appRating').value);
        const appBio = document.getElementById('appBio').value;
        const appCategory = document.getElementById('appCategory').value;
        const appDownloadLink = document.getElementById('appDownloadLink').value;

        if (!appName || !appRating || !appBio || !appCategory || !appDownloadLink) {
            alert('Please fill in all fields');
            return;
        }

        if (appRating < 1 || appRating > 5) {
            alert('Rating must be between 1 and 5');
            return;
        }

        const newApp = {
            id: appName.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
            name: appName,
            developer: 'User Added',
            category: appCategory,
            rating: appRating,
            description: appBio,
            icon: 'fas fa-mobile-alt',
            downloadUrl: appDownloadLink,
            download_url: appDownloadLink,
            isHot: false,
            is_hot: false,
            badges: []
        };

        this.apps.push(newApp);
        this.saveAppsToStorage();

        // Clear form
        document.getElementById('appName').value = '';
        document.getElementById('appRating').value = '';
        document.getElementById('appBio').value = '';
        document.getElementById('appCategory').value = '';
        document.getElementById('appDownloadLink').value = '';

        this.loadAppsManagement();
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();

        this.showSuccessMessage('App added successfully!');
    }

    removeApp(appId) {
        if (!confirm('Are you sure you want to remove this app?')) return;

        const appIndex = this.apps.findIndex(a => a.id === appId);
        if (appIndex !== -1) {
            this.apps.splice(appIndex, 1);
            this.saveAppsToStorage();
            this.loadAppsManagement();
            this.renderHotApps();
            this.renderAllApps();
            this.renderPopularApps();
            this.renderEditorsChoice();
            this.renderFeaturedApps();
            this.renderTrendingApps();
            this.renderNewApps();
            this.showSuccessMessage('App removed successfully!');
        }
    }

    addBadgeToApp() {
        const selectedAppId = document.getElementById('badgeAppSelect').value;
        const selectedBadgeType = document.getElementById('badgeType').value;

        if (!selectedAppId || !selectedBadgeType) {
            alert('Please select an app and badge type');
            return;
        }

        const app = this.apps.find(a => a.id === selectedAppId);
        if (!app) {
            alert('App not found');
            return;
        }

        if (!app.badges) {
            app.badges = [];
        }

        if (app.badges.includes(selectedBadgeType)) {
            alert('This badge is already assigned to this app');
            return;
        }

        app.badges.push(selectedBadgeType);
        this.saveAppsToStorage();

        // Clear form
        document.getElementById('badgeAppSelect').value = '';
        document.getElementById('badgeType').value = '';

        this.loadAppsManagement();
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();
        this.renderEditorsChoice();
        this.renderFeaturedApps();
        this.renderTrendingApps();
        this.renderNewApps();

        this.showSuccessMessage(`Badge "${selectedBadgeType}" added to ${app.name}`);
    }

    updateAppRating() {
        const selectedAppId = document.getElementById('ratingAppSelect').value;
        const newRating = parseFloat(document.getElementById('newRating').value);

        if (!selectedAppId || !newRating) {
            alert('Please select an app and enter a rating');
            return;
        }

        if (newRating < 1 || newRating > 5) {
            alert('Rating must be between 1 and 5');
            return;
        }

        const app = this.apps.find(a => a.id === selectedAppId);
        if (!app) {
            alert('App not found');
            return;
        }

        const oldRating = app.rating;
        app.rating = newRating;
        this.saveAppsToStorage();

        // Clear form
        document.getElementById('ratingAppSelect').value = '';
        document.getElementById('newRating').value = '';

        this.loadAppsManagement();
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();

        this.showSuccessMessage(`Rating updated for ${app.name} from ${oldRating} to ${newRating}`);
    }

    renderEditorsChoice() {
        const editorsChoiceApps = this.apps.filter(app => app.badges && app.badges.includes('editors-choice'));
        const uniqueEditorsChoiceApps = editorsChoiceApps.filter((app, index, arr) => 
            arr.findIndex(a => a.id === app.id) === index
        ).slice(0, 8);
        this.renderBadgeSection(uniqueEditorsChoiceApps, 'editorsChoiceContainer', 'Editor\'s Choice');
    }

    renderFeaturedApps() {
        const featuredApps = this.apps.filter(app => app.badges && app.badges.includes('featured'));
        const uniqueFeaturedApps = featuredApps.filter((app, index, arr) => 
            arr.findIndex(a => a.id === app.id) === index
        ).slice(0, 8);
        this.renderBadgeSection(uniqueFeaturedApps, 'featuredAppsContainer', 'Featured');
    }

    renderTrendingApps() {
        const trendingApps = this.apps.filter(app => app.badges && app.badges.includes('trending'));
        const uniqueTrendingApps = trendingApps.filter((app, index, arr) => 
            arr.findIndex(a => a.id === app.id) === index
        ).slice(0, 8);
        this.renderBadgeSection(uniqueTrendingApps, 'trendingAppsContainer', 'Trending');
    }

    renderNewApps() {
        const newApps = this.apps.filter(app => app.badges && app.badges.includes('new'));
        const uniqueNewApps = newApps.filter((app, index, arr) => 
            arr.findIndex(a => a.id === app.id) === index
        ).slice(0, 8);
        this.renderBadgeSection(uniqueNewApps, 'newAppsContainer', 'New');
    }

    renderBadgeSection(apps, containerId, sectionName) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (apps.length === 0) {
            container.innerHTML = `<div class="no-apps">No ${sectionName.toLowerCase()} apps available</div>`;
            return;
        }

        container.innerHTML = apps.map(app => this.createHotAppCard(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(apps[index]);
            });
        });
    }

    loadUsersList() {
        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        const usersList = document.getElementById('usersList');

        if (!usersList) return;

        usersList.innerHTML = users.map(user => {
            return `
                <div class="user-item">
                    <div class="user-info">
                        <h5>${user.username}</h5>
                        <p>${user.email}</p>
                        <p>Created: ${new Date(user.created_at).toLocaleDateString()}</p>
                    </div>
                    <div class="user-actions">
                        <span class="user-status ${user.is_banned ? 'banned' : 'active'}">
                            ${user.is_banned ? 'Banned' : 'Active'}
                        </span>
                        <button class="admin-btn ${user.is_banned ? '' : 'danger'}" 
                                onclick="window.acueStore.${user.is_banned ? 'unbanUser' : 'banUser'}('${user.username}')">
                            ${user.is_banned ? 'Unban' : 'Ban'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    banUser(username) {
        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex !== -1) {
            users[userIndex].is_banned = true;
            localStorage.setItem('nexoraStoreUsers', JSON.stringify(users));
            this.loadUsersList();
            this.showSuccessMessage(`User ${username} has been banned`);
        }
    }

    unbanUser(username) {
        const users = JSON.parse(localStorage.getItem('nexoraStoreUsers') || '[]');
        const userIndex = users.findIndex(u => u.username === username);

        if (userIndex !== -1) {
            users[userIndex].is_banned = false;
            localStorage.setItem('nexoraStoreUsers', JSON.stringify(users));
            this.loadUsersList();
            this.showSuccessMessage(`User ${username} has been unbanned`);
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.acueStore = new AcueStore();
});
