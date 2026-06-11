# 🏗️ Site Manager

A **Progressive Web App (PWA)** for labour contractors and civil engineers to manage construction site operations — workers, attendance, tasks, payroll, expenses, and more. Works fully offline. Installable on Android & iOS.

> Built with vanilla HTML + CSS + JS. No framework. No backend. No database. Just deploy and use.

---

## 📱 Live Demo

Deploy to Netlify in 30 seconds — drag & drop `index.html` at [app.netlify.com/drop](https://app.netlify.com/drop)

Or host on GitHub Pages (see [Setup](#setup) below).

---

## ✨ Features

### 👷 Workers & Attendance
- Add workers with photo, phone, Aadhaar (last 4)
- **Skill tags** — Mason, Bar Bender, Carpenter, Plumber, etc.
- Worker type (Karigar / Labour) **auto-detected from skills**
- **Per Day** or **Per Piece** rate types
- Mark Full / Half / Absent per date
- Bulk "All Present" button
- Smart alerts — absent streaks, advance overflow, unpaid salary

### 💰 Payroll & Payments
- Auto-calculated wages (daily rate × days worked)
- Overtime tracking at 1.5× rate
- Salary payment recording — Cash / UPI / Bank Transfer
- **UTR / Transaction ID** field for audit trail
- Per-worker payment history
- Advance money tracking (separate from salary)
- **Daily Wage Slip** — one tap → pre-filled WhatsApp message to worker

### ✅ Tasks
- Assign tasks to **multiple workers** at once
- **BOQ quantity tracking** — Total sqft / unit + done → auto % progress bar
- Task status cycle: Pending → In Progress → Done
- **Before/after photo proof** per task (camera capture)
- Piece rate workers: done quantity auto-feeds into earnings

### 📋 Site Diary
- Daily weather log (tap chips — Sunny, Rainy, etc.)
- Work done notes + visitor / inspection log
- Per-date entries, recent 7 entries shown

### 📐 Site Planner
- Add work items with quantity (sqft, sqm, rft, nos, bags, cum)
- Progress bar per work item
- **Productivity rates** — sqft/day per karigar and labour
- **Deadline tracker** — set target date → app shows ✅ on track / 🔴 behind / ⚠️ overdue
- Auto estimates days remaining based on present workers

### 📊 Finance
- **Month-wise filter** — October only, November only, All Time
- Per-worker breakdown — wages, OT, advance, paid, balance
- My Expenses — categorised (Tools, Safety, Transport, Food, etc.)
- Bill photo capture per expense
- Overall project cost summary
- Month-filtered **Print Payroll** (opens print dialog)
- **Excel Export (.xlsx)** — 4 sheets: Attendance, Payroll, Expenses, Work Progress

### 🏗️ Multi-Site Support
- Unlimited sites — each fully isolated data
- Site switcher bar at top
- Add / delete sites independently

### ☁️ Google Drive Backup *(optional setup)*
- Export site data as JSON to Drive
- Restore from Drive backup
- OAuth 2.0 — no backend needed

### 📲 PWA — Installable App
- Works fully offline after first load
- Installable on Android (Chrome) and iOS (Safari)
- Looks and feels like a native app

---

## 🗂️ File Structure

```
site-manager/
├── index.html        # App shell — HTML structure only
├── site_manager.css  # All styles
├── site_manager.js   # All logic (1600+ lines, section-commented)
└── README.md
```

### JS Code Map (Ctrl+F the tag in `site_manager.js`)

| Tag | What it does |
|---|---|
| `§PWA` | Service worker, manifest, install banner |
| `§STATE` | siteMeta, state object, BLANK_SITE |
| `§STORAGE` | loadData, saveData, multi-site switch |
| `§CALC` | calcWages, calcOT, calcAdvance, calcEarned |
| `§ALERTS` | Smart alerts — absent streak, advance overflow |
| `§WORKERS` | renderWorkers, markAllPresent |
| `§WORKERDETAIL` | Worker detail sheet, salary payment |
| `§TASKS` | renderTasks, photo proof |
| `§DIARY` | Site diary, weather, notes |
| `§FINANCE` | Finance overview, month filter |
| `§MORE` | Site Planner, Advance, Quick Actions |
| `§PLANNER` | Work items, BOQ, productivity |
| `§WAGESLIP` | WhatsApp wage slip per worker |
| `§DEADLINE` | Deadline tracker, on-track logic |
| `§DRIVE` | Google Drive OAuth, export, import |
| `§EXCEL` | SheetJS .xlsx export, 4 sheets |

---

## 🚀 Setup

### Option 1 — GitHub Pages (Recommended)

```bash
# 1. Fork or clone this repo
git clone https://github.com/YOUR_USERNAME/site-manager.git

# 2. Push to GitHub
git add . && git commit -m "init" && git push

# 3. Go to repo Settings → Pages → Source: main branch → Save
# 4. URL: https://YOUR_USERNAME.github.io/site-manager
```

Open that URL on phone Chrome → 3 dots → **Install app** ✅

### Option 2 — Netlify Drop (30 seconds)

1. Go to [app.netlify.com/drop](https://app.netlify.com/drop)
2. Drag the whole folder → drop
3. Get permanent URL → open on phone → install

### Option 3 — Any Static Host

Upload all 3 files (`index.html`, `site_manager.css`, `site_manager.js`) to any static host. Must be HTTPS for PWA install to work.

---

## ☁️ Google Drive Setup *(optional)*

Required only if you want cloud backup.

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create project → **Enable Google Drive API**
3. OAuth consent screen → External → fill app name + email
4. Credentials → **Create OAuth Client ID** → Web application
5. Add your hosted URL as **Authorised JavaScript origin**
6. Copy Client ID
7. In app → More tab → Connect Google Drive → paste Client ID

> ⚠️ Won't work on `file://` — must be hosted on HTTPS URL.

---

## 📦 Tech Stack

| What | Tool |
|---|---|
| Framework | None — vanilla JS |
| Icons | [Tabler Icons](https://tabler.io/icons) (CDN) |
| Excel export | [SheetJS](https://sheetjs.com) (CDN) |
| Google auth | Google Identity Services (CDN) |
| Storage | localStorage (per site, per device) |
| Offline | Service Worker (PWA) |

---

## 🔒 Data & Privacy

- All data stored **locally on device** in `localStorage`
- No server, no database, no analytics
- Google Drive backup is **optional** and uses your own Google account
- Worker photos and bill photos stored as base64 in localStorage

---

## 🛣️ Roadmap

- [ ] PIN lock screen + AES encryption
- [ ] Material tracking (cement, steel, sand)
- [ ] Worker digital signature on joining
- [ ] Role-based access (Engineer / Contractor / Owner)
- [ ] Firebase sync for multi-device

---

## 👨‍💻 Author

**Het Soni** — [@Hetsoni798](https://github.com/Hetsoni798)

Built for real use on civil construction sites in India.

---

## 📄 License

MIT — free to use, modify, and deploy.
