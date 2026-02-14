# 📚 Study Tracker - Compete with Friends

A gamified study tracking web application that helps students stay motivated by competing with friends while learning!

![Study Tracker](https://img.shields.io/badge/Status-Live-brightgreen)
![Firebase](https://img.shields.io/badge/Backend-Firebase-orange)
![License](https://img.shields.io/badge/License-MIT-blue)

## 🌟 Features

- 📖 **Chapter Management** - Add and track your study chapters
- 🏆 **Points System** - Earn 10 points for every completed chapter
- 👥 **Friend System** - Add friends using unique IDs and compete together
- 📊 **Real-time Leaderboard** - See rankings update instantly
- 📈 **Progress Analytics** - View your points earned by day, week, and month with interactive charts
- ✅ **Checkpoint Quizzes** - Confirm chapter completion before earning points
- 🔄 **Real-time Sync** - All data synced across devices using Firebase
- 📱 **Responsive Design** - Works seamlessly on mobile, tablet, and desktop

## 🚀 Live Demo

**Try it here:** [https://aaryaveer20.github.io/Study-tracker/](https://aaryaveer20.github.io/Study-tracker/)

## 🎮 How to Use

1. **Create Account** - Enter your username and get a unique ID
2. **Add Chapters** - List all the chapters you need to complete
3. **Study & Complete** - Mark chapters as done after studying
4. **Earn Points** - Get 10 points for each completed chapter
5. **Add Friends** - Share your ID with friends and add them
6. **Compete** - Check the leaderboard to see who's leading!

## 🛠️ Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Backend:** Firebase Realtime Database
- **Hosting:** GitHub Pages
- **Design:** Custom CSS with gradient themes

## 📸 Screenshots

### Login Screen
Clean and simple authentication

### Dashboard
Track your chapters and progress

### Leaderboard
Compete with friends in real-time

### Statistics
Visualize your study progress

## 🔧 Installation & Setup

### For Users:
Simply visit the [live website](https://aaryaveer20.github.io/Study-tracker/) - no installation needed!

### For Developers:

1. **Clone the repository**
```bash
   git clone https://github.com/Aaryaveer20/Study-tracker.git
   cd Study-tracker
```

2. **Set up Firebase**
   - Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
   - Enable Realtime Database
   - Copy your Firebase config

3. **Update Configuration**
   - Open `index.html`
   - Replace the Firebase config (around line 215) with your own

4. **Run Locally**
   - Simply open `index.html` in your browser
   - Or use a local server:
```bash
     python -m http.server 8000
```

5. **Deploy**
   - Push to GitHub
   - Enable GitHub Pages in repository settings

## 📁 File Structure
```
Study-tracker/
├── index.html          # Main HTML file with Firebase SDK
├── style.css           # Styling and responsive design
├── script.js           # JavaScript logic and Firebase integration
└── README.md           # Documentation
```

## 🎯 Features in Detail

### Points System
- Each chapter is worth 10 points
- Points are tracked daily, weekly, and monthly
- History is stored in Firebase for persistence

### Friend System
- Unique ID generation for each user
- Add friends by their ID
- Real-time leaderboard updates

### Data Visualization
- Interactive bar charts
- View progress by day (last 7 days)
- View progress by week (last 4 weeks)
- View progress by month (last 6 months)

## 🔐 Firebase Database Structure
```json
{
  "users": {
    "ST5X7ABC": {
      "id": "ST5X7ABC",
      "username": "John",
      "points": 50,
      "chapters": [...],
      "friends": ["ST9Y2XYZ"],
      "pointsHistory": {...}
    }
  }
}
```

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork the repository
2. Create a new branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 Future Enhancements

- [ ] Study streaks and achievements
- [ ] Subject categorization
- [ ] Study time tracking
- [ ] Mobile app version
- [ ] Group study rooms
- [ ] Custom point values per chapter
- [ ] Push notifications for friend achievements
- [ ] Export study statistics

## 📄 License

This project is licensed under the MIT License - feel free to use it for your own projects!

## 👨‍💻 Author

**Aaryaveer**
- GitHub: [@Aaryaveer20](https://github.com/Aaryaveer20)

## 🙏 Acknowledgments

- Firebase for the awesome backend services
- GitHub Pages for free hosting
- All the students who need motivation to study! 📚

## 📞 Support

If you have any questions or run into issues:
- Open an [Issue](https://github.com/Aaryaveer20/Study-tracker/issues)
- Star ⭐ the repository if you found it helpful!

---

Made with ❤️ for students who want to make studying more fun and competitive!
```

## 🏷️ Topics to Add (in repository settings):
```
study-tracker
firebase
javascript
html-css-javascript
education
gamification
realtime-database
web-app
student-productivity
leaderboard
progress-tracking
github-pages
