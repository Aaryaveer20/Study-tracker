// Data Storage
let currentUser = null;
let currentChapterId = null;
let currentChartView = 'day';
let firebaseInitialized = false;
let userListeners = {}; // Track active listeners
let isSaving = false; // Flag to prevent overwrites during save

// Timer variables
let timerInterval = null;
let timerSeconds = 0;
let currentTimerChapterId = null;

// Chat variables
let activeChatFriend = null;
let chatListener = null;

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
        isSaving = true; // Set flag before saving
        const userRef = window.dbRef(window.db, 'users/' + user.id);
        await window.dbSet(userRef, user);
        console.log('✅ User saved');
        
        // Wait a bit before allowing overwrites
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
            
            // Ensure all required fields exist
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
            
            // Start listening for real-time updates
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

// Real-time sync for current user
function setupRealtimeSync(userId) {
    const userRef = window.dbRef(window.db, 'users/' + userId);
    
    // Listen for changes to the current user's data
    window.dbOnValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const updatedUser = snapshot.val();
            
            // Don't overwrite if we're currently saving
            if (isSaving) {
                console.log('⏸️ Skipping sync - currently saving');
                return;
            }
            
            // Ensure all required fields exist
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
                renderLeaderboard();
            }
        }
    });
}

// Real-time sync for friends
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
                renderChatFriendsList();
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
        
        // Start real-time sync after login
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
    
    // Clean up chat listener
    if (chatListener) {
        chatListener();
        chatListener = null;
    }
    
    localStorage.removeItem('currentUserId');
    currentUser = null;
    document.getElementById('authScreen').classList.add('active');
    document.getElementById('dashboardScreen').classList.remove('active');
    document.getElementById('usernameInput').value = '';
    generateUserId();
}

function showDashboard() {
    document.getElementById('authScreen').classList.remove('active');
    document.getElementById('dashboardScreen').classList.add('active');
    
    document.getElementById('navUsername').textContent = currentUser.username;
    document.getElementById('navUserId').textContent = currentUser.id;
    updatePoints();
    
    renderChapters();
    renderFriends();
    renderLeaderboard();
    renderStats();
    renderChatFriendsList();
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
        renderChatFriendsList();
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
    console.log('Current user:', currentUser);
    
    if (!name) {
        alert('Please enter a chapter name');
        return;
    }
    
    // Check if user is logged in
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
        completedDate: null,
        timeSpent: 0 // Time in seconds
    };
    
    // Initialize chapters array if it doesn't exist
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

function formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
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
            <div class="chapter-time">
                ⏱️ Time spent: <strong>${formatTime(chapter.timeSpent || 0)}</strong>
            </div>
            <div class="chapter-footer">
                <div class="chapter-points">🏆 ${chapter.points} points</div>
                <div class="chapter-actions">
                    <button class="btn-timer" 
                            onclick="openTimerModal(${chapter.id})"
                            ${chapter.completed ? 'disabled' : ''}>
                        ⏱️ ${chapter.timeSpent > 0 ? 'Continue' : 'Start'} Timer
                    </button>
                    <button class="btn-complete" 
                            onclick="openQuizModal(${chapter.id})" 
                            ${chapter.completed ? 'disabled' : ''}>
                        ${chapter.completed ? 'Completed' : 'Mark as Done'}
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Timer Functions
function openTimerModal(chapterId) {
    currentTimerChapterId = chapterId;
    const chapter = currentUser.chapters.find(c => c.id === chapterId);
    
    if (!chapter) return;
    
    document.getElementById('timerChapterName').textContent = chapter.name;
    timerSeconds = 0;
    updateTimerDisplay();
    
    document.getElementById('timerModal').classList.add('active');
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
    document.getElementById('stopBtn').disabled = true;
}

function closeTimerModal() {
    if (timerInterval) {
        pauseTimer();
    }
    document.getElementById('timerModal').classList.remove('active');
    currentTimerChapterId = null;
    timerSeconds = 0;
}

function startTimer() {
    if (timerInterval) return;
    
    timerInterval = setInterval(() => {
        timerSeconds++;
        updateTimerDisplay();
    }, 1000);
    
    document.getElementById('startBtn').disabled = true;
    document.getElementById('pauseBtn').disabled = false;
    document.getElementById('stopBtn').disabled = false;
}

function pauseTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    document.getElementById('startBtn').disabled = false;
    document.getElementById('pauseBtn').disabled = true;
}

async function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    const chapter = currentUser.chapters.find(c => c.id === currentTimerChapterId);
    
    if (chapter && timerSeconds > 0) {
        chapter.timeSpent = (chapter.timeSpent || 0) + timerSeconds;
        
        await saveUserToFirebase(currentUser);
        renderChapters();
        renderStats();
        
        showToast(`⏱️ Saved ${formatTime(timerSeconds)} to ${chapter.name}`, 'success');
    }
    
    closeTimerModal();
}

function updateTimerDisplay() {
    const hours = String(Math.floor(timerSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((timerSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(timerSeconds % 60).padStart(2, '0');
    
    document.getElementById('timerDisplay').textContent = `${hours}:${minutes}:${seconds}`;
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
    
    // Setup real-time sync for the new friend
    setupFriendsRealtimeSync();
    
    closeAddFriendModal();
    renderFriends();
    renderLeaderboard();
    renderChatFriendsList();
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
            <div class="friend-points">${friend.points} pts</div>
        </div>
    `).join('');
}

// Chat Functions
async function renderChatFriendsList() {
    const container = document.getElementById('chatFriendsList');
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>Add friends to start chatting!</p></div>';
        return;
    }
    
    const friendsData = await Promise.all(
        currentUser.friends.map(friendId => getUserFromFirebase(friendId))
    );
    
    container.innerHTML = friendsData.filter(f => f).map(friend => `
        <div class="chat-friend-item ${activeChatFriend === friend.id ? 'active' : ''}" 
             onclick="openChat('${friend.id}', '${friend.username}')">
            <div class="friend-avatar">${friend.username.charAt(0).toUpperCase()}</div>
            <div class="friend-name">${friend.username}</div>
        </div>
    `).join('');
}

function openChat(friendId, friendName) {
    activeChatFriend = friendId;
    renderChatFriendsList();
    
    const chatWindow = document.getElementById('chatWindow');
    const chatRoomId = [currentUser.id, friendId].sort().join('_');
    
    chatWindow.innerHTML = `
        <div class="chat-header">
            <h3>💬 ${friendName}</h3>
        </div>
        <div class="chat-messages" id="chatMessages">
            <div class="loading">Loading messages...</div>
        </div>
        <div class="chat-input-container">
            <input type="text" id="chatInput" placeholder="Type a message..." onkeypress="if(event.key==='Enter') sendMessage()" />
            <button onclick="sendMessage()" class="btn-send">Send</button>
        </div>
    `;
    
    loadMessages(chatRoomId);
}

function loadMessages(chatRoomId) {
    // Clean up previous listener
    if (chatListener) {
        chatListener();
    }
    
    const messagesRef = window.dbRef(window.db, 'chats/' + chatRoomId);
    
    chatListener = window.dbOnValue(messagesRef, (snapshot) => {
        const messagesContainer = document.getElementById('chatMessages');
        
        if (!snapshot.exists()) {
            messagesContainer.innerHTML = '<div class="empty-state"><p>No messages yet. Say hi! 👋</p></div>';
            return;
        }
        
        const messages = [];
        snapshot.forEach(childSnapshot => {
            messages.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message ${msg.senderId === currentUser.id ? 'sent' : 'received'}">
                <div class="message-sender">${msg.senderName}</div>
                <div class="message-text">${escapeHtml(msg.text)}</div>
                <div class="message-time">${formatMessageTime(msg.timestamp)}</div>
            </div>
        `).join('');
        
        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

async function sendMessage() {
    const input = document.getElementById('chatInput');
    const text = input.value.trim();
    
    if (!text || !activeChatFriend) return;
    
    const chatRoomId = [currentUser.id, activeChatFriend].sort().join('_');
    const messagesRef = window.dbRef(window.db, 'chats/' + chatRoomId);
    
    const message = {
        text: text,
        senderId: currentUser.id,
        senderName: currentUser.username,
        timestamp: Date.now()
    };
    
    await window.dbPush(messagesRef, message);
    input.value = '';
}

function formatMessageTime(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return date.toLocaleDateString();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
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
    
    // Calculate total time spent
    const totalSeconds = currentUser.chapters ? 
        currentUser.chapters.reduce((sum, ch) => sum + (ch.timeSpent || 0), 0) : 0;
    const totalHours = Math.floor(totalSeconds / 3600);
    const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
    
    document.getElementById('totalChapters').textContent = total;
    document.getElementById('completedChapters').textContent = completed;
    document.getElementById('totalPoints').textContent = currentUser.points;
    document.getElementById('totalTimeSpent').textContent = 
        totalHours > 0 ? `${totalHours}h ${totalMinutes}m` : `${totalMinutes}m`;
}

function switchChart(view) {
    currentChartView = view;
    document.querySelectorAll('.chart-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');
    renderChart(view);
}

function renderChart(view) {
    const canvas = document.getElementById('pointsChart');
    const ctx = canvas.getContext('2d');
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    let labels = [];
    let data = [];
    const history = currentUser.pointsHistory || { daily: {}, weekly: {}, monthly: {} };
    
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
    
    drawChart(ctx, canvas, labels, data);
}

function drawChart(ctx, canvas, labels, data) {
    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxValue = Math.max(...data, 10);
    
    // Axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Bars
    const barWidth = chartWidth / labels.length;
    const barPadding = barWidth * 0.2;
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + (index * barWidth) + barPadding;
        const y = canvas.height - padding - barHeight;
        const width = barWidth - (barPadding * 2);
        
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);
        
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + width / 2, y - 5);
    });
    
    // Labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + (index * barWidth) + (barWidth / 2);
        const y = canvas.height - padding + 20;
        ctx.fillText(label, x, y);
    });
    
    // Y-axis
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxValue / 5) * i);
        const y = canvas.height - padding - ((chartHeight / 5) * i);
        ctx.fillText(value, padding - 10, y + 5);
    }
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
