// Data Storage
let currentUser = null;
let currentChapterId = null;
let currentChartView = 'day';
let firebaseInitialized = false;
let userListeners = {}; // Track active listeners
let isSaving = false; // ⭐ NEW: Flag to prevent overwrites during save
let pointsChartInstance = null;
let currentChatFriend = null; // Current chat friend
let chatListener = null; // Chat listener
let unreadMessages = {}; // Track unread messages per friend
let allChatsListener = null; // Listener for all chats

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded');
    // Wait for Firebase
    waitForFirebase();
});

function waitForFirebase() {
    if (window.firebaseReady) {
        firebaseInitialized = true;
        console.log('✅ Firebase is ready!');
        initApp();
    } else {
        console.log('Waiting for Firebase...');
        setTimeout(waitForFirebase, 500);
    }
}

function initApp() {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
        loadUserFromFirebase(savedUserId);
    }
    generateUserId();
}

// Generate unique user ID
function generateUserId() {
    const id = 'ST' + Math.random().toString(36).substr(2, 6).toUpperCase();
    document.getElementById('userIdInput').value = id;
}

// Firebase Operations
async function saveUserToFirebase(user) {
    try {
        isSaving = true; // ⭐ Set flag before saving
        const userRef = window.dbRef(window.db, 'users/' + user.id);
        await window.dbSet(userRef, user);
        console.log('✅ User saved');
        
        // ⭐ Wait a bit before allowing overwrites
        setTimeout(() => {
            isSaving = false;
        }, 500);
        
        return true;
    } catch (error) {
        isSaving = false;
        console.error('❌ Save error:', error);
        alert('Error saving: ' + error.message);
        return false;
    }
}

async function loadUserFromFirebase(userId) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + userId);
        const snapshot = await window.dbGet(userRef);
        
        if (snapshot.exists()) {
            currentUser = snapshot.val();
            
            // ⭐ FIX: Ensure all required fields exist
            if (!currentUser.chapters) {
                currentUser.chapters = [];
            }
            if (!currentUser.friends) {
                currentUser.friends = [];
            }
            if (!currentUser.pointsHistory) {
                currentUser.pointsHistory = { daily: {}, weekly: {}, monthly: {} };
            }
            if (currentUser.points === undefined) {
                currentUser.points = 0;
            }
            
            // Save the complete structure back to Firebase
            await saveUserToFirebase(currentUser);
            
            localStorage.setItem('currentUserId', userId);
            showDashboard();
            
            // ⭐ NEW: Start listening for real-time updates
            setupRealtimeSync(userId);
        } else {
            localStorage.removeItem('currentUserId');
            logout();
        }
    } catch (error) {
        console.error('❌ Load error:', error);
        logout();
    }
}

// ⭐ NEW: Real-time sync for current user
function setupRealtimeSync(userId) {
    const userRef = window.dbRef(window.db, 'users/' + userId);
    
    // Listen for changes to the current user's data
    window.dbOnValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const updatedUser = snapshot.val();
            
            // ⭐ FIX: Don't overwrite if we're currently saving
            if (isSaving) {
                console.log('⏸️ Skipping sync - currently saving');
                return;
            }
            
            // ⭐ FIX: Ensure all required fields exist
            if (!updatedUser.chapters) {
                updatedUser.chapters = [];
            }
            if (!updatedUser.friends) {
                updatedUser.friends = [];
            }
            if (!updatedUser.pointsHistory) {
                updatedUser.pointsHistory = { daily: {}, weekly: {}, monthly: {} };
            }
            
            // Only update if data actually changed
            if (JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
                console.log('🔄 User data updated from Firebase');
                currentUser = updatedUser;
                
                // Update all UI elements
                updatePoints();
                renderChapters();
                renderStats();
                renderLeaderboard(); // This will also refresh friend data
            }
        }
    });
}

// ⭐ NEW: Real-time sync for friends
function setupFriendsRealtimeSync() {
    // Clean up old listeners
    if (userListeners.friends) {
        userListeners.friends.forEach(unsubscribe => unsubscribe());
        userListeners.friends = [];
    }
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
        return;
    }
    
    userListeners.friends = [];
    
    // Listen to each friend's data
    currentUser.friends.forEach(friendId => {
        const friendRef = window.dbRef(window.db, 'users/' + friendId);
        
        const unsubscribe = window.dbOnValue(friendRef, (snapshot) => {
            if (snapshot.exists()) {
                console.log('🔄 Friend data updated:', friendId);
                // Refresh friends list and leaderboard
                renderFriends();
                renderLeaderboard();
            }
        });
        
        userListeners.friends.push(unsubscribe);
    });
}

async function getUserFromFirebase(userId) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + userId);
        const snapshot = await window.dbGet(userRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('❌ Get user error:', error);
        return null;
    }
}

// Authentication
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const userId = document.getElementById('userIdInput').value;
    
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    if (!window.firebaseReady) {
        alert('Please wait, connecting to Firebase...');
        setTimeout(login, 1000);
        return;
    }
    
    try {
        const existingUser = await getUserFromFirebase(userId);
        
        if (existingUser) {
            currentUser = existingUser;
        } else {
            currentUser = {
                id: userId,
                username: username,
                points: 0,
                chapters: [],
                friends: [],
                pointsHistory: { daily: {}, weekly: {}, monthly: {} }
            };
            await saveUserToFirebase(currentUser);
        }
        
        localStorage.setItem('currentUserId', userId);
        showDashboard();
        
        // ⭐ NEW: Start real-time sync after login
        setupRealtimeSync(userId);
        setupFriendsRealtimeSync();
        
        showToast('Welcome, ' + username + '!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

function logout() {
    // Clean up listeners
    if (userListeners.friends) {
        userListeners.friends.forEach(unsubscribe => unsubscribe());
        userListeners.friends = [];
    }
    
    localStorage.removeItem('currentUserId');
    currentUser = null;
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('usernameInput').value = '';
    generateUserId();
}

function showDashboard() {
    // Switch screens
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    
    // ⭐ FIX: Reset scroll position to the top
    window.scrollTo({
        top: 0,
        behavior: 'smooth' // Optional: adds a nice smooth transition
    });
    
    // Update user info
    document.getElementById('navUsername').textContent = currentUser.username;
    document.getElementById('navUserId').textContent = currentUser.id;
    updatePoints();
    
    renderChapters();
    renderFriends();
    renderLeaderboard();
    renderStats();
    
    // Start monitoring for new messages
    startNotificationMonitoring();
}

function updatePoints() {
    document.getElementById('navPoints').textContent = currentUser.points + ' pts';
}

// Navigation
function showSection(section) {
    document.querySelectorAll('.menu-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    
    event.target.classList.add('active');
    
    if (section === 'chapters') {
        document.getElementById('chaptersSection').classList.add('active');
    } else if (section === 'friends') {
        document.getElementById('friendsSection').classList.add('active');
    } else if (section === 'chat') {
        document.getElementById('chatSection').classList.add('active');
        loadChatList();
        // Hide notification badge when opening chat section
        document.getElementById('chatNotificationBadge').style.display = 'none';
    } else if (section === 'leaderboard') {
        document.getElementById('leaderboardSection').classList.add('active');
    } else if (section === 'stats') {
        document.getElementById('statsSection').classList.add('active');
        renderChart(currentChartView);
    }
}

// Chapters Management
function openAddChapterModal() {
    console.log('🔵 Opening chapter modal');
    const modal = document.getElementById('addChapterModal');
    modal.classList.add('active');
    console.log('Modal classes:', modal.className);
}

function closeAddChapterModal() {
    console.log('🔴 Closing chapter modal');
    document.getElementById('addChapterModal').classList.remove('active');
    document.getElementById('chapterName').value = '';
    document.getElementById('chapterDescription').value = '';
}

async function addChapter() {
    const name = document.getElementById('chapterName').value.trim();
    const description = document.getElementById('chapterDescription').value.trim();
    
    console.log('Adding chapter:', name);
    console.log('Current user:', currentUser); // Debug log
    
    if (!name) {
        alert('Please enter a chapter name');
        return;
    }
    
    // ⭐ FIX: Check if user is logged in
    if (!currentUser) {
        alert('Error: Not logged in. Please refresh the page and login again.');
        console.error('currentUser is null!');
        return;
    }
    
    const chapter = {
        id: Date.now(),
        name: name,
        description: description,
        completed: false,
        points: 10,
        completedDate: null
    };
    
    // ⭐ FIX: Initialize chapters array if it doesn't exist
    if (!currentUser.chapters) {
        currentUser.chapters = [];
    }
    
    currentUser.chapters.push(chapter);
    console.log('Total chapters:', currentUser.chapters.length);
    
    const saved = await saveUserToFirebase(currentUser);
    
    if (saved) {
        closeAddChapterModal();
        renderChapters();
        renderStats();
        showToast('✅ Chapter added!', 'success');
    }
}

function renderChapters() {
    const grid = document.getElementById('chaptersGrid');
    
    if (!currentUser.chapters || currentUser.chapters.length === 0) {
        grid.innerHTML = '<div class="empty-state"><p>📚 No chapters yet. Add your first chapter to start earning points!</p></div>';
        return;
    }
    
    grid.innerHTML = currentUser.chapters.map(chapter => `
        <div class="chapter-card ${chapter.completed ? 'completed' : ''}">
            <div class="chapter-header">
                <div class="chapter-title">${chapter.name}</div>
                <div class="chapter-status ${chapter.completed ? 'completed' : 'pending'}">
                    ${chapter.completed ? '✓ Completed' : 'Pending'}
                </div>
            </div>
            ${chapter.description ? `<div class="chapter-description">${chapter.description}</div>` : ''}
            <div class="chapter-footer">
                <div class="chapter-points">🏆 ${chapter.points} points</div>
                <button class="btn-complete" 
                        onclick="openQuizModal(${chapter.id})" 
                        ${chapter.completed ? 'disabled' : ''}>
                    ${chapter.completed ? 'Completed' : 'Mark as Done'}
                </button>
            </div>
        </div>
    `).join('');
}

// Quiz Modal
function openQuizModal(chapterId) {
    currentChapterId = chapterId;
    document.getElementById('quizModal').classList.add('active');
}

function closeQuizModal() {
    document.getElementById('quizModal').classList.remove('active');
    document.querySelectorAll('input[name="completed"]').forEach(input => {
        input.checked = false;
    });
    currentChapterId = null;
}

function submitQuiz() {
    const selected = document.querySelector('input[name="completed"]:checked');
    
    if (!selected) {
        alert('Please select an option');
        return;
    }
    
    if (selected.value === 'yes') {
        completeChapter(currentChapterId);
    } else {
        showToast('Keep studying! 💪', 'success');
    }
    
    closeQuizModal();
}

async function completeChapter(chapterId) {
    const chapter = currentUser.chapters.find(c => c.id === chapterId);
    
    if (chapter && !chapter.completed) {
        chapter.completed = true;
        chapter.completedDate = new Date().toISOString();
        currentUser.points += chapter.points;
        
        // Update history
        const today = new Date().toISOString().split('T')[0];
        if (!currentUser.pointsHistory.daily[today]) {
            currentUser.pointsHistory.daily[today] = 0;
        }
        currentUser.pointsHistory.daily[today] += chapter.points;
        
        const week = getWeekNumber(new Date());
        if (!currentUser.pointsHistory.weekly[week]) {
            currentUser.pointsHistory.weekly[week] = 0;
        }
        currentUser.pointsHistory.weekly[week] += chapter.points;
        
        const month = new Date().toISOString().slice(0, 7);
        if (!currentUser.pointsHistory.monthly[month]) {
            currentUser.pointsHistory.monthly[month] = 0;
        }
        currentUser.pointsHistory.monthly[month] += chapter.points;
        
        await saveUserToFirebase(currentUser);
        
        updatePoints();
        renderChapters();
        renderLeaderboard();
        renderStats();
        
        showToast('🎉 You earned ' + chapter.points + ' points!', 'success');
    }
}

// Friends Management
function openAddFriendModal() {
    document.getElementById('addFriendModal').classList.add('active');
}

function closeAddFriendModal() {
    document.getElementById('addFriendModal').classList.remove('active');
    document.getElementById('friendId').value = '';
}

async function addFriend() {
    const friendId = document.getElementById('friendId').value.trim().toUpperCase();
    
    if (!friendId) {
        alert('Please enter a friend ID');
        return;
    }
    
    if (friendId === currentUser.id) {
        alert('You cannot add yourself');
        return;
    }
    
    if (currentUser.friends && currentUser.friends.includes(friendId)) {
        alert('Friend already added');
        return;
    }
    
    const friend = await getUserFromFirebase(friendId);
    
    if (!friend) {
        alert('User not found with this ID');
        return;
    }
    
    if (!currentUser.friends) {
        currentUser.friends = [];
    }
    
    currentUser.friends.push(friendId);
    await saveUserToFirebase(currentUser);
    
    // ⭐ NEW: Setup real-time sync for the new friend
    setupFriendsRealtimeSync();
    
    closeAddFriendModal();
    renderFriends();
    renderLeaderboard();
    showToast('Friend added!', 'success');
}

async function renderFriends() {
    const container = document.getElementById('friendsList');
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>👥 No friends added yet. Add friends to compete!</p></div>';
        return;
    }
    
    const friendsData = await Promise.all(
        currentUser.friends.map(friendId => getUserFromFirebase(friendId))
    );
    
    container.innerHTML = friendsData.filter(f => f).map(friend => `
        <div class="friend-card">
            <div class="friend-info">
                <div class="friend-avatar">${friend.username.charAt(0).toUpperCase()}</div>
                <div class="friend-details">
                    <h3>${friend.username}</h3>
                    <p>ID: ${friend.id}</p>
                </div>
            </div>
            <div class="friend-actions">
                <div class="friend-points">${friend.points} pts</div>
                <button class="btn-view-chapters" onclick="viewFriendChapters('${friend.id}', '${friend.username}')">
                    📖 View Chapters
                </button>
            </div>
        </div>
    `).join('');
}

// Leaderboard
async function renderLeaderboard() {
    const container = document.getElementById('leaderboard');
    const leaderboardUsers = [currentUser];
    
    if (currentUser.friends && currentUser.friends.length > 0) {
        const friendsData = await Promise.all(
            currentUser.friends.map(friendId => getUserFromFirebase(friendId))
        );
        leaderboardUsers.push(...friendsData.filter(f => f));
    }
    
    leaderboardUsers.sort((a, b) => b.points - a.points);
    
    if (leaderboardUsers.length === 1) {
        container.innerHTML = '<div class="empty-state"><p>Add friends to see the leaderboard!</p></div>';
        return;
    }
    
    container.innerHTML = leaderboardUsers.map((user, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const isYou = user.id === currentUser.id;
        
        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-left">
                    <div class="rank">${medal || rank}</div>
                    <div class="leaderboard-user">
                        ${user.username} ${isYou ? '(You)' : ''}
                    </div>
                </div>
                <div class="leaderboard-points">${user.points} pts</div>
            </div>
        `;
    }).join('');
}

// Statistics
function renderStats() {
    const total = currentUser.chapters ? currentUser.chapters.length : 0;
    const completed = currentUser.chapters ? currentUser.chapters.filter(c => c.completed).length : 0;
    
    document.getElementById('totalChapters').textContent = total;
    document.getElementById('completedChapters').textContent = completed;
    document.getElementById('totalPoints').textContent = currentUser.points;
}

function switchChart(view) {
    currentChartView = view;
    document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    renderChart(view);
}

function renderChart(view) {
    const ctx = document.getElementById('pointsChart').getContext('2d');
    
    let labels = [];
    let data = [];
    const history = currentUser.pointsHistory || { daily: {}, weekly: {}, monthly: {} };
    
    // 1. Prepare Data
    if (view === 'day') {
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            data.push(history.daily[dateStr] || 0);
        }
    } else if (view === 'week') {
        for (let i = 3; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - (i * 7));
            const week = getWeekNumber(date);
            labels.push('Week ' + week);
            data.push(history.weekly[week] || 0);
        }
    } else {
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = date.toISOString().slice(0, 7);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            data.push(history.monthly[monthStr] || 0);
        }
    }

    // 2. Destroy old chart if it exists
    if (pointsChartInstance) {
        pointsChartInstance.destroy();
    }

    // 3. Create shadcn-style Chart
    pointsChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Points Earned',
                data: data,
                backgroundColor: '#2563eb', // shadcn primary blue
                borderRadius: 6,           // Rounded bars
                borderSkipped: false,
                barPercentage: 0.6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }, // Hide legend for cleaner look
                tooltip: {
                    backgroundColor: '#18181b', // Dark shadcn tooltip
                    padding: 12,
                    titleFont: { size: 14, weight: '600' },
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false }, // Clean X-axis
                    ticks: { color: '#71717a', font: { size: 12 } }
                },
                y: {
                    beginAtZero: true,
                    border: { display: false, dash: [4, 4] }, // Dashed grid lines
                    grid: { color: '#e4e4e7' },
                    ticks: { 
                        color: '#71717a',
                        font: { size: 12 },
                        stepSize: 10 
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}
function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// Friend Chapters Viewing
async function viewFriendChapters(friendId, friendName) {
    const friend = await getUserFromFirebase(friendId);
    
    if (!friend) {
        showToast('Unable to load friend data', 'error');
        return;
    }
    
    // Update modal title
    document.getElementById('friendChaptersTitle').textContent = `${friendName}'s Chapters`;
    
    // Render chapters
    const container = document.getElementById('friendChaptersContent');
    
    if (!friend.chapters || friend.chapters.length === 0) {
        container.innerHTML = `
            <div class="friend-chapters-empty">
                <p>📚 ${friendName} hasn't added any chapters yet.</p>
            </div>
        `;
    } else {
        const completedChapters = friend.chapters.filter(c => c.completed);
        const pendingChapters = friend.chapters.filter(c => !c.completed);
        
        let html = '';
        
        // Show completed chapters first
        if (completedChapters.length > 0) {
            html += '<h4 style="color: #2ecc71; margin-bottom: 15px;">✅ Completed Chapters (' + completedChapters.length + ')</h4>';
            html += '<div class="friend-chapters-list">';
            html += completedChapters.map(chapter => `
                <div class="friend-chapter-item completed">
                    <div class="friend-chapter-header">
                        <span class="friend-chapter-name">${chapter.name}</span>
                        <span class="friend-chapter-badge completed">✓ Completed</span>
                    </div>
                    ${chapter.description ? `<p class="friend-chapter-description">${chapter.description}</p>` : ''}
                </div>
            `).join('');
            html += '</div>';
        }
        
        // Show pending chapters
        if (pendingChapters.length > 0) {
            html += '<h4 style="color: #856404; margin: 20px 0 15px 0;">⏳ Pending Chapters (' + pendingChapters.length + ')</h4>';
            html += '<div class="friend-chapters-list">';
            html += pendingChapters.map(chapter => `
                <div class="friend-chapter-item">
                    <div class="friend-chapter-header">
                        <span class="friend-chapter-name">${chapter.name}</span>
                        <span class="friend-chapter-badge pending">⏳ Pending</span>
                    </div>
                    ${chapter.description ? `<p class="friend-chapter-description">${chapter.description}</p>` : ''}
                </div>
            `).join('');
            html += '</div>';
        }
        
        container.innerHTML = html;
    }
    
    // Show modal
    document.getElementById('friendChaptersModal').classList.add('active');
}

function closeFriendChaptersModal() {
    document.getElementById('friendChaptersModal').classList.remove('active');
}

// Chat Functions
async function loadChatList() {
    const container = document.getElementById('chatList');
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Add friends to start chatting!</p></div>';
        return;
    }
    
    const friendsData = await Promise.all(
        currentUser.friends.map(friendId => getUserFromFirebase(friendId))
    );
    
    container.innerHTML = friendsData.filter(f => f).map(friend => {
        const hasUnread = unreadMessages[friend.id] && unreadMessages[friend.id] > 0;
        const unreadClass = hasUnread ? 'has-unread' : '';
        const unreadBadge = hasUnread ? '<span class="unread-badge"></span>' : '';
        
        return `
            <div class="chat-list-item ${unreadClass}" onclick="openChat('${friend.id}', '${friend.username}')">
                <div class="chat-list-avatar">${friend.username.charAt(0).toUpperCase()}</div>
                <div class="chat-list-info">
                    <div class="chat-list-name">${friend.username}</div>
                    <div class="chat-list-preview">Click to start chatting</div>
                </div>
                ${unreadBadge}
            </div>
        `;
    }).join('');
}

function getChatId(userId1, userId2) {
    // Always create chat ID in alphabetical order to ensure same chat room
    return [userId1, userId2].sort().join('_');
}

async function openChat(friendId, friendName) {
    currentChatFriend = friendId;
    
    // Clear unread messages for this friend
    if (unreadMessages[friendId]) {
        unreadMessages[friendId] = 0;
        updateNotificationBadge();
        loadChatList(); // Refresh to remove unread indicator
    }
    
    // Update UI
    document.getElementById('chatEmptyState').style.display = 'none';
    document.getElementById('chatWindow').style.display = 'flex';
    
    // Update header
    document.getElementById('chatAvatar').textContent = friendName.charAt(0).toUpperCase();
    document.getElementById('chatUsername').textContent = friendName;
    
    // Highlight active chat
    document.querySelectorAll('.chat-list-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.chat-list-item').classList.add('active');
    
    // Load messages
    loadChatMessages(friendId);
}

async function loadChatMessages(friendId) {
    const chatId = getChatId(currentUser.id, friendId);
    const messagesRef = window.dbRef(window.db, 'chats/' + chatId + '/messages');
    
    // Clean up old listener
    if (chatListener) {
        chatListener();
    }
    
    // Initialize deletedMessages if not exists
    if (!currentUser.deletedMessages) {
        currentUser.deletedMessages = {};
    }
    const deletedMessageIds = currentUser.deletedMessages[chatId] || [];
    
    // Listen for new messages in real-time
    chatListener = window.dbOnValue(messagesRef, (snapshot) => {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = '';
        
        if (snapshot.exists()) {
            const messages = [];
            snapshot.forEach((childSnapshot) => {
                const msgId = childSnapshot.key;
                
                // Skip if message was deleted by current user
                if (!deletedMessageIds.includes(msgId)) {
                    messages.push({
                        id: msgId,
                        ...childSnapshot.val()
                    });
                }
            });
            
            // Sort by timestamp
            messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Render messages
            messages.forEach(msg => {
                const messageDiv = document.createElement('div');
                const isSent = msg.senderId === currentUser.id;
                messageDiv.className = `chat-message ${isSent ? 'sent' : 'received'}`;
                messageDiv.setAttribute('data-message-id', msg.id);
                
                const time = new Date(msg.timestamp).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                
                const deleteOptions = isSent ? `
                    <div class="message-actions">
                        <button class="message-delete-btn" onclick="showDeleteOptions('${msg.id}')" title="Delete message">
                            <span>⋮</span>
                        </button>
                    </div>
                    <div class="delete-options" id="deleteOptions_${msg.id}" style="display: none;">
                        <button onclick="deleteMessageForMe('${chatId}', '${msg.id}')" class="delete-option">
                            🗑️ Delete for me
                        </button>
                        <button onclick="deleteMessageForEveryone('${chatId}', '${msg.id}')" class="delete-option">
                            ❌ Delete for everyone
                        </button>
                        <button onclick="hideDeleteOptions('${msg.id}')" class="delete-option-cancel">
                            Cancel
                        </button>
                    </div>
                ` : '';
                
                messageDiv.innerHTML = `
                    <div class="message-bubble">
                        <p class="message-text">${escapeHtml(msg.text)}</p>
                        <div class="message-time">${time}</div>
                    </div>
                    ${deleteOptions}
                `;
                
                messagesContainer.appendChild(messageDiv);
            });
            
            // Scroll to bottom
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
            
            // Mark messages as seen
            markMessagesAsSeen(friendId);
        }
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text || !currentChatFriend) {
        console.log('No text or no friend selected');
        return;
    }
    
    const chatId = getChatId(currentUser.id, currentChatFriend);
    const messageId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    
    const message = {
        text: text,
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: Date.now()
    };
    
    try {
        // Try to write to chats location
        const messageRef = window.dbRef(window.db, `chats/${chatId}/messages/${messageId}`);
        await window.dbSet(messageRef, message);
        
        console.log('Message sent successfully');
        input.value = '';
        input.focus();
    } catch (error) {
        console.error('Error sending message:', error);
        console.error('Error details:', error.message, error.code);
        
        // Show instructions to user
        showToast('Database permission error. Check console for details.', 'error');
        
        // Log helpful message
        console.log('%c📝 Firebase Database Rules Error', 'color: red; font-size: 16px; font-weight: bold');
        console.log('%cTo fix this, go to Firebase Console → Realtime Database → Rules', 'color: orange; font-size: 14px');
        console.log('%cAnd update rules to:', 'color: orange; font-size: 14px');
        console.log(`%c{
  "rules": {
    "users": {
      ".read": true,
      ".write": true
    },
    "chats": {
      ".read": true,
      ".write": true
    }
  }
}`, 'background: #f4f4f4; padding: 10px; font-family: monospace; color: #333');
    }
}

function handleChatKeyPress(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Message Deletion Functions
function showDeleteOptions(messageId) {
    // Hide all other delete options first
    document.querySelectorAll('.delete-options').forEach(opt => {
        opt.style.display = 'none';
    });
    
    // Show the clicked one
    const deleteOptions = document.getElementById('deleteOptions_' + messageId);
    if (deleteOptions) {
        deleteOptions.style.display = 'block';
    }
}

function hideDeleteOptions(messageId) {
    const deleteOptions = document.getElementById('deleteOptions_' + messageId);
    if (deleteOptions) {
        deleteOptions.style.display = 'none';
    }
}

async function deleteMessageForMe(chatId, messageId) {
    try {
        // Add to user's deleted messages list
        if (!currentUser.deletedMessages) {
            currentUser.deletedMessages = {};
        }
        if (!currentUser.deletedMessages[chatId]) {
            currentUser.deletedMessages[chatId] = [];
        }
        currentUser.deletedMessages[chatId].push(messageId);
        
        await saveUserToFirebase(currentUser);
        
        // Hide the message locally
        const messageElement = document.querySelector(`[data-message-id="${messageId}"]`);
        if (messageElement) {
            messageElement.style.display = 'none';
        }
        
        hideDeleteOptions(messageId);
        showToast('Message deleted for you', 'success');
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Failed to delete message', 'error');
    }
}

async function deleteMessageForEveryone(chatId, messageId) {
    try {
        const messageRef = window.dbRef(window.db, `chats/${chatId}/messages/${messageId}`);
        await window.dbSet(messageRef, null); // Delete from Firebase
        
        hideDeleteOptions(messageId);
        showToast('Message deleted for everyone', 'success');
    } catch (error) {
        console.error('Error deleting message:', error);
        showToast('Failed to delete message', 'error');
    }
}

// Mark messages as seen
async function markMessagesAsSeen(friendId) {
    const chatId = getChatId(currentUser.id, friendId);
    
    if (!currentUser.seenMessages) {
        currentUser.seenMessages = {};
    }
    
    currentUser.seenMessages[chatId] = Date.now();
    
    // Save to Firebase
    try {
        await saveUserToFirebase(currentUser);
        
        // Clear unread count for this friend
        if (unreadMessages[friendId]) {
            unreadMessages[friendId] = 0;
            updateNotificationBadge();
        }
    } catch (error) {
        console.error('Error marking messages as seen:', error);
    }
}

// Notification System
function startNotificationMonitoring() {
    if (!currentUser || !currentUser.friends || currentUser.friends.length === 0) {
        return;
    }
    
    // Initialize seenMessages if not exists
    if (!currentUser.seenMessages) {
        currentUser.seenMessages = {};
    }
    
    // Monitor all chats for new messages
    currentUser.friends.forEach(friendId => {
        const chatId = getChatId(currentUser.id, friendId);
        const messagesRef = window.dbRef(window.db, 'chats/' + chatId + '/messages');
        
        window.dbOnValue(messagesRef, (snapshot) => {
            if (snapshot.exists()) {
                let unseenCount = 0;
                const lastSeenTime = currentUser.seenMessages[chatId] || 0;
                
                snapshot.forEach((childSnapshot) => {
                    const msg = childSnapshot.val();
                    
                    // Count unseen messages from friend (not sent by current user)
                    if (msg.senderId === friendId && msg.timestamp > lastSeenTime) {
                        // Only count if we're not currently viewing this chat
                        if (currentChatFriend !== friendId) {
                            unseenCount++;
                        }
                    }
                });
                
                // Update unseen count for this friend
                unreadMessages[friendId] = unseenCount;
                updateNotificationBadge();
            }
        });
    });
}

function updateNotificationBadge() {
    const badge = document.getElementById('chatNotificationBadge');
    
    // Calculate total unseen messages
    let totalUnseen = 0;
    for (let friendId in unreadMessages) {
        totalUnseen += unreadMessages[friendId];
    }
    
    // Show or hide badge
    if (totalUnseen > 0) {
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
    
    // Update chat list if it's visible
    const chatSection = document.getElementById('chatSection');
    if (chatSection && chatSection.classList.contains('active')) {
        loadChatList();
    }
}
