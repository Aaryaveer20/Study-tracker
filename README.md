# 📚 Study Tracker - Gamified Learning Platform

A full-featured web application that transforms studying into a competitive, social experience. Track your progress, compete with friends, stay motivated, and chat in real-time while learning!

## 🌟 Features Overview

### 🔐 Secure Authentication
- **Sign Up & Log In** system with unique ID generation
- **Data Persistence** - all progress saved permanently
- **Session Management** - automatic login for returning users

### 📖 Chapter Management  
- Add unlimited chapters with descriptions
- Mark chapters complete with checkpoint quizzes
- Earn 10 points per completed chapter
- Real-time sync across devices

### 👥 Social Features
- Add friends using unique IDs
- View friends' completed chapters
- Real-time leaderboard with rankings
- Compete and stay motivated together

### 💬 Real-Time Chat
- WhatsApp-style instant messaging
- Delete messages (for me / for everyone)
- Smart notifications with red dot badges
- Message timestamps and seen status

### 📊 Advanced Analytics
- Interactive charts (daily/weekly/monthly)
- Points history tracking
- Study pattern visualization
- Progress insights

### 🎨 Modern Design
- Beautiful gradient UI
- Fully responsive (mobile/tablet/desktop)
- Smooth animations
- Intuitive navigation

## 🚀 Live Demo

**Try it here:** [https://aaryaveer20.github.io/Study-tracker/](https://aaryaveer20.github.io/Study-tracker/)

## 🎯 Quick Start Guide

### First Time (Sign Up)
1. Enter your username
2. Get unique ID (e.g., ST5X7ABC) - **Save this!**
3. Click "Create Account"
4. Start adding chapters

### Returning (Log In)  
1. Click "Log In" tab
2. Enter your saved ID
3. All data restored instantly!

### Daily Usage
1. **Add chapters** you need to study
2. **Mark complete** after studying
3. **Earn 10 points** per chapter
4. **Add friends** to compete
5. **Chat** and stay motivated
6. **Track progress** in Stats section

## 🛠️ Tech Stack

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Firebase Realtime Database
- **Charts**: Chart.js
- **Hosting**: GitHub Pages
- **Icons**: Font Awesome

## 📁 Project Structure

```
Study-tracker/
├── index.html    # Main HTML (319 lines)
├── style.css     # Styling (1400+ lines)
├── script.js     # Logic (1300+ lines)
└── README.md     # Documentation
```

## 🔧 Setup for Developers

### 1. Clone Repository
```bash
git clone https://github.com/Aaryaveer20/Study-tracker.git
cd Study-tracker
```

### 2. Configure Firebase
1. Create project at [Firebase Console](https://console.firebase.google.com)
2. Enable Realtime Database
3. Update database rules:
```json
{
  "rules": {
    "users": { ".read": true, ".write": true },
    "chats": { ".read": true, ".write": true }
  }
}
```
4. Copy your config to `index.html` (line ~256)

### 3. Run Locally
```bash
python -m http.server 8000
# Open http://localhost:8000
```

### 4. Deploy to GitHub Pages
1. Push to GitHub
2. Settings → Pages
3. Select branch → Save
4. Access at `username.github.io/Study-tracker`

## 📊 Firebase Database Structure

```javascript
{
  "users": {
    "ST5X7ABC": {
      "id": "ST5X7ABC",
      "username": "John",
      "points": 50,
      "chapters": [...],
      "friends": ["ST9Y2XYZ"],
      "pointsHistory": {
        "daily": {"2026-02-15": 20},
        "weekly": {"8": 50},
        "monthly": {"2026-02": 100}
      },
      "seenMessages": {...},
      "deletedMessages": {...}
    }
  },
  "chats": {
    "ST3A4BCD_ST5X7ABC": {
      "messages": {...}
    }
  }
}
```

## 💡 Key Features Explained

### Authentication System
- **Sign Up**: Creates user with auto-generated unique ID
- **Log In**: Validates ID and loads all saved data
- **Security**: ID acts as password
- **Persistence**: Uses localStorage + Firebase

### Points & Gamification
- 10 points per completed chapter
- Points tracked by day/week/month
- Real-time leaderboard
- Visual progress charts
- Competitive rankings with medals 🥇🥈🥉

### Chat System
- Real-time messaging via Firebase
- Delete for me (local only)
- Delete for everyone (removes from Firebase)
- Smart notifications (only for unseen messages from others)
- Three-dot menu on all messages

### Notification Logic
```javascript
Show red dot when:
✅ Friend sends message
✅ You haven't seen it
✅ You're not in that chat

Hide when:
✅ You open chat
✅ Message marked as seen
```

## 🐛 Troubleshooting

### Firebase Connection Error
- Check internet connection
- Verify config in `index.html`
- Ensure database rules allow read/write

### Messages Not Sending
- Update Firebase rules (see Setup step 2.3)
- Click "Publish" in Firebase Console
- Refresh page

### Notifications Not Working
- Open console (F12) for debug logs
- Ensure friend sent a message
- Not in active chat (notifications hide for current chat)
- Try refreshing page

### Can't Log In
- Verify ID is correct (case-sensitive)
- Check account exists in Firebase Console
- Clear browser cache
- Use correct ID (must start with ST)

## 🤝 Contributing

Contributions welcome! 

1. Fork the repository
2. Create feature branch (`git checkout -b feature/Amazing`)
3. Commit changes (`git commit -m 'Add feature'`)
4. Push to branch (`git push origin feature/Amazing`)
5. Open Pull Request

### Areas to Contribute
- 🎨 UI/UX improvements
- ⚡ Performance optimizations
- 🐛 Bug fixes
- 📝 Documentation
- 🌍 Translations
- ✨ New features

## 📝 Roadmap

### Completed ✅
- [x] Authentication (Sign Up/Log In)
- [x] Chapter management
- [x] Points system
- [x] Friend system
- [x] Real-time chat
- [x] Notifications
- [x] Leaderboard
- [x] Statistics & charts

### Planned 🚀
- [ ] Study streaks
- [ ] Achievement badges
- [ ] Dark mode
- [ ] Pomodoro timer
- [ ] Flashcards
- [ ] Mobile app
- [ ] AI study suggestions

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

Free to use, modify, and distribute!

## 👨‍💻 Author

**Aaryaveer**
- GitHub: [@Aaryaveer20](https://github.com/Aaryaveer20)
- Project: [Study-tracker](https://github.com/Aaryaveer20/Study-tracker)

## 🙏 Acknowledgments

- [Firebase](https://firebase.google.com/) - Backend services
- [Chart.js](https://www.chartjs.org/) - Data visualization
- [Font Awesome](https://fontawesome.com/) - Icons
- [GitHub Pages](https://pages.github.com/) - Hosting

## 📞 Support

- 🐛 [Report Bug](https://github.com/Aaryaveer20/Study-tracker/issues)
- 💡 [Request Feature](https://github.com/Aaryaveer20/Study-tracker/issues)
- 💬 [Discussions](https://github.com/Aaryaveer20/Study-tracker/discussions)

## 🏆 Perfect For

- 📚 Students tracking study progress
- 🎓 Study groups and peer learning
- 🏫 Educational institutions
- 💻 Learning web development
- 🚀 Hackathon projects
- 📱 Portfolio showcase

---

<div align="center">

**Made with ❤️ for students who want to make studying fun!**

If this helped you, please ⭐ star the repository!

[Live Demo](https://aaryaveer20.github.io/Study-tracker/) • [Documentation](#) • [Report Bug](https://github.com/Aaryaveer20/Study-tracker/issues)

</div>
