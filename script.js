// Data Storage
let currentUser = null;
let currentChapterId = null;
let currentChartView = 'day';

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
        loadUserFromFirebase(savedUserId);
    }
    generateUserId();
});

// Generate unique user ID
function generateUserId() {
    const id = 'ST' + Math.random().toString(36).substr(2, 6).toUpperCase();
    document.getElementById('userIdInput').value = id;
}

// Firebase Operations
async function saveUserToFirebase(user) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + user.id);
        await window.dbSet(userRef, user);
    } catch (error) {
        console.error('Error saving user:', error);
        showToast('Error saving data. Please check your Firebase configuration.', 'error');
    }
}

async function loadUserFromFirebase(userId) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + userId);
        const snapshot = await window.dbGet(userRef);
        
        if (snapshot.exists()) {
            currentUser = snapshot.val();
            localStorage.setItem('currentUserId', userId);
            showDashboard();
        } else {
            localStorage.removeItem('currentUserId');
            logout();
        }
    } catch (error) {
        console.error('Error loading user:', error);
        showToast('Error loading data. Please check your connection.', 'error');
        logout();
    }
}

async function getUserFromFirebase(userId) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + userId);
        const snapshot = await window.dbGet(userRef);
        
        if (snapshot.exists()) {
            return snapshot.val();
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        return null;
    }
}

async function updateUserInFirebase(updates) {
    try {
        const userRef = window.dbRef(window.db, 'users/' + currentUser.id);
        await window.dbUpdate(userRef, updates);
        
        // Update local copy
        Object.assign(currentUser, updates);
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error updating data. Please try again.', 'error');
    }
}

// Authentication
async function login() {
    const username = document.getElementById('usernameInput').value.trim();
    const userId = document.getElementById('userIdInput').value;
    
    if (!username) {
        showToast('Please enter a username', 'error');
        return;
    }
    
    // Check if user exists in Firebase
    const existingUser = await getUserFromFirebase(userId);
    
    if (existingUser) {
        currentUser = existingUser;
        showToast('Welcome back, ' + username + '!', 'success');
    } else {
        // Create new user
        currentUser = {
            id: userId,
            username: username,
            points: 0,
            chapters: [],
            friends: [],
            pointsHistory: {
                daily: {},
                weekly: {},
                monthly: {}
            }
        };
        
        await saveUserToFirebase(currentUser);
        showToast('Account created! Welcome, ' + username + '!', 'success');
    }
    
    localStorage.setItem('currentUserId', userId);
    showDashboard();
}

function logout() {
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
    document.getElementById('navPoints').textContent = currentUser.points + ' pts';
    
    renderChapters();
    renderFriends();
    renderLeaderboard();
    renderStats();
    
    // Setup real-time listener for current user updates
    setupUserListener();
}

function setupUserListener() {
    const userRef = window.dbRef(window.db, 'users/' + currentUser.id);
    window.dbOnValue(userRef, (snapshot) => {
        if (snapshot.exists()) {
            const updatedUser = snapshot.val();
            currentUser = updatedUser;
            
            // Update UI
            document.getElementById('navPoints').textContent = currentUser.points + ' pts';
            renderChapters();
            renderFriends();
            renderLeaderboard();
            renderStats();
        }
    });
}

// Navigation
function showSection(section) {
    // Remove active from all buttons
    document.querySelectorAll('.menu-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Remove active from all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Add active to clicked button
    event.target.classList.add('active');
    
    // Show corresponding section
    if (section === 'chapters') {
        document.getElementById('chaptersSection').classList.add('active');
        renderChapters();
    } else if (section === 'friends') {
        document.getElementById('friendsSection').classList.add('active');
        renderFriends();
    } else if (section === 'leaderboard') {
        document.getElementById('leaderboardSection').classList.add('active');
        renderLeaderboard();
    } else if (section === 'stats') {
        document.getElementById('statsSection').classList.add('active');
        renderStats();
        renderChart(currentChartView);
    }
}

// Chapters Management
function openAddChapterModal() {
    document.getElementById('addChapterModal').classList.add('active');
}

function closeAddChapterModal() {
    document.getElementById('addChapterModal').classList.remove('active');
    document.getElementById('chapterName').value = '';
    document.getElementById('chapterDescription').value = '';
}

async function addChapter() {
    const name = document.getElementById('chapterName').value.trim();
    const description = document.getElementById('chapterDescription').value.trim();
    
    if (!name) {
        showToast('Please enter a chapter name', 'error');
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
    
    currentUser.chapters.push(chapter);
    await saveUserToFirebase(currentUser);
    
    closeAddChapterModal();
    renderChapters();
    renderStats();
    showToast('Chapter added successfully!', 'success');
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
        showToast('Please select an option', 'error');
        return;
    }
    
    if (selected.value === 'yes') {
        completeChapter(currentChapterId);
    } else {
        showToast('Keep studying! You can do it! 💪', 'success');
    }
    
    closeQuizModal();
}

async function completeChapter(chapterId) {
    const chapter = currentUser.chapters.find(c => c.id === chapterId);
    
    if (chapter && !chapter.completed) {
        chapter.completed = true;
        chapter.completedDate = new Date().toISOString();
        currentUser.points += chapter.points;
        
        // Update points history
        const today = new Date().toISOString().split('T')[0];
        if (!currentUser.pointsHistory.daily[today]) {
            currentUser.pointsHistory.daily[today] = 0;
        }
        currentUser.pointsHistory.daily[today] += chapter.points;
        
        // Update weekly
        const week = getWeekNumber(new Date());
        if (!currentUser.pointsHistory.weekly[week]) {
            currentUser.pointsHistory.weekly[week] = 0;
        }
        currentUser.pointsHistory.weekly[week] += chapter.points;
        
        // Update monthly
        const month = new Date().toISOString().slice(0, 7);
        if (!currentUser.pointsHistory.monthly[month]) {
            currentUser.pointsHistory.monthly[month] = 0;
        }
        currentUser.pointsHistory.monthly[month] += chapter.points;
        
        await saveUserToFirebase(currentUser);
        
        document.getElementById('navPoints').textContent = currentUser.points + ' pts';
        renderChapters();
        renderLeaderboard();
        renderStats();
        
        showToast('🎉 Congratulations! You earned ' + chapter.points + ' points!', 'success');
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
        showToast('Please enter a friend ID', 'error');
        return;
    }
    
    if (friendId === currentUser.id) {
        showToast('You cannot add yourself as a friend', 'error');
        return;
    }
    
    if (currentUser.friends && currentUser.friends.includes(friendId)) {
        showToast('This friend is already added', 'error');
        return;
    }
    
    // Check if user exists in Firebase
    const friend = await getUserFromFirebase(friendId);
    
    if (!friend) {
        showToast('User not found with this ID', 'error');
        return;
    }
    
    if (!currentUser.friends) {
        currentUser.friends = [];
    }
    
    currentUser.friends.push(friendId);
    await saveUserToFirebase(currentUser);
    
    closeAddFriendModal();
    renderFriends();
    renderLeaderboard();
    showToast('Friend added successfully!', 'success');
}

async function renderFriends() {
    const container = document.getElementById('friendsList');
    
    if (!currentUser.friends || currentUser.friends.length === 0) {
        container.innerHTML = '<div class="empty-state"><p>👥 No friends added yet. Add friends to compete!</p></div>';
        return;
    }
    
    // Fetch all friends data
    const friendsData = await Promise.all(
        currentUser.friends.map(friendId => getUserFromFirebase(friendId))
    );
    
    container.innerHTML = friendsData.filter(friend => friend !== null).map(friend => `
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

// Leaderboard
async function renderLeaderboard() {
    const container = document.getElementById('leaderboard');
    
    // Create array of all users (current user + friends)
    const leaderboardUsers = [currentUser];
    
    if (currentUser.friends && currentUser.friends.length > 0) {
        const friendsData = await Promise.all(
            currentUser.friends.map(friendId => getUserFromFirebase(friendId))
        );
        leaderboardUsers.push(...friendsData.filter(friend => friend !== null));
    }
    
    // Sort by points
    leaderboardUsers.sort((a, b) => b.points - a.points);
    
    if (leaderboardUsers.length === 1) {
        container.innerHTML = '<div class="empty-state"><p>Add friends to see the leaderboard!</p></div>';
        return;
    }
    
    container.innerHTML = leaderboardUsers.map((user, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? `rank-${rank}` : '';
        const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
        const isCurrentUser = user.id === currentUser.id;
        
        return `
            <div class="leaderboard-item ${rankClass}">
                <div class="leaderboard-left">
                    <div class="rank">${medal || rank}</div>
                    <div class="leaderboard-user">
                        ${user.username} ${isCurrentUser ? '(You)' : ''}
                    </div>
                </div>
                <div class="leaderboard-points">${user.points} pts</div>
            </div>
        `;
    }).join('');
}

// Statistics
function renderStats() {
    const totalChapters = currentUser.chapters ? currentUser.chapters.length : 0;
    const completedChapters = currentUser.chapters ? currentUser.chapters.filter(c => c.completed).length : 0;
    const totalPoints = currentUser.points || 0;
    
    document.getElementById('totalChapters').textContent = totalChapters;
    document.getElementById('completedChapters').textContent = completedChapters;
    document.getElementById('totalPoints').textContent = totalPoints;
}

function switchChart(view) {
    currentChartView = view;
    
    // Update tabs
    document.querySelectorAll('.chart-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');
    
    renderChart(view);
}

function renderChart(view) {
    const canvas = document.getElementById('pointsChart');
    const ctx = canvas.getContext('2d');
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    let labels = [];
    let data = [];
    
    const pointsHistory = currentUser.pointsHistory || { daily: {}, weekly: {}, monthly: {} };
    
    if (view === 'day') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            labels.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
            data.push(pointsHistory.daily[dateStr] || 0);
        }
    } else if (view === 'week') {
        // Last 4 weeks
        for (let i = 3; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - (i * 7));
            const week = getWeekNumber(date);
            labels.push('Week ' + week);
            data.push(pointsHistory.weekly[week] || 0);
        }
    } else if (view === 'month') {
        // Last 6 months
        for (let i = 5; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            const monthStr = date.toISOString().slice(0, 7);
            labels.push(date.toLocaleDateString('en-US', { month: 'short' }));
            data.push(pointsHistory.monthly[monthStr] || 0);
        }
    }
    
    drawChart(ctx, canvas, labels, data);
}

function drawChart(ctx, canvas, labels, data) {
    const padding = 50;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    // Find max value
    const maxValue = Math.max(...data, 10);
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
    
    // Draw bars
    const barWidth = chartWidth / labels.length;
    const barPadding = barWidth * 0.2;
    
    data.forEach((value, index) => {
        const barHeight = (value / maxValue) * chartHeight;
        const x = padding + (index * barWidth) + barPadding;
        const y = canvas.height - padding - barHeight;
        const width = barWidth - (barPadding * 2);
        
        // Draw bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, canvas.height - padding);
        gradient.addColorStop(0, '#667eea');
        gradient.addColorStop(1, '#764ba2');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, y, width, barHeight);
        
        // Draw value on top
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(value, x + width / 2, y - 5);
    });
    
    // Draw labels
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    labels.forEach((label, index) => {
        const x = padding + (index * barWidth) + (barWidth / 2);
        const y = canvas.height - padding + 20;
        ctx.fillText(label, x, y);
    });
    
    // Draw Y-axis labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
        const value = Math.round((maxValue / 5) * i);
        const y = canvas.height - padding - ((chartHeight / 5) * i);
        ctx.fillText(value, padding - 10, y + 5);
    }
}

// Helper Functions
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
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
