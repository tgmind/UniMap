# 🌌 UniMap — Real-Time Universal Cross-Device Data Map & Study Vault

UniMap is an ultra-fast, real-time cross-device study vault and interactive knowledge map built for students preparing for exams across **Windows, Linux, tablets, and mobile phones**.

It synchronizes code snippets, lecture notes, textbook diagrams, rich links, and small HTML documents in sub-30ms with **zero lifetime operating cost**.

---

## ✨ Key Capabilities

1. **Click-to-Run HTML in Browser**:
   - Save small HTML files, calculators, formula sheets, or widgets.
   - Click to immediately launch and run the HTML directly in the browser with full script and CSS execution.
   - 1-click download button to save the original `.html` file locally anytime.
2. **SmartCompress Zero-Blur Image Engine**:
   - Preserves up to **2560px (2.5K/3K)** resolution for handwritten notes, equations, and diagrams.
   - Normalizes background sensor grain and enhances edge contrast.
   - Drops 8–12 MB camera photos to ~350 KB with zero blur on equations, allowing **3,000+ study photos in Supabase's 1 GB free storage limit**.
3. **The Universal Data Map (3 Exploration Views)**:
   - **2D Spatial Canvas Map**: Infinite pan-zoom canvas with draggable cards, coordinates, and constellation links.
   - **Bento Grid View**: Modern dashboard with quick action bars, media lightboxes, and 1-click downloads.
   - **Chronological Timeline**: Date-grouped river (Today, Yesterday, Earlier) tagged with device origin badges.
4. **Device Fleet Hub & Quick QR Login**:
   - Auto-detects hardware and OS (**Windows**, **Linux**, **Android**, **iPadOS/iOS**).
   - Shows active connected machines with live pulsing beacons.
   - Remote Kill Switch: 1-click revoke to immediately kick/sign-out any device remotely.
   - QR Quick Pair: Scan QR code from your phone to authenticate a new tablet or PC in 1 second without passwords.
5. **Live Free Tier Quota Health Center**:
   - Real-time gauge for the **1 GB (1,000 MB)** Supabase storage limit and **500 MB** DB limit.
   - Color alerts (Green < 70%, Amber 70-90%, Red > 90%).
   - Storage Janitor: View items sorted by file size, bulk-download and delete to free up cloud space on the fly.
6. **5 Luxury Design Themes**:
   - **Midnight Obsidian (OLED)**: Pure black `#050508` with electric violet & cyan.
   - **Tokyo Night**: Deep indigo cyber `#0F111A` with soft lavender.
   - **Paper Scholar**: Warm cream `#181614` with amber editorial aesthetics.
   - **Nordic Aurora**: Slate glass `#070D14` with mint emerald & ice blue.
   - **Retro Terminal**: Neo-brutalist pure monochrome with phosphor green.

---

## 🛠️ Step-by-Step Manual Setup Guide (100% Free Lifetime)

### Step 1: Create Free Supabase Project (1 Minute)
1. Go to [supabase.com](https://supabase.com) and create a free project (e.g. named `unimap`).
2. Open the **SQL Editor** tab on the left sidebar.
3. Open `supabase/schema.sql` from this repository, paste the entire SQL content into the SQL Editor, and click **Run**.
4. Go to **Storage** on the left sidebar:
   - Click **New Bucket**.
   - Bucket name: `user-media`
   - Toggle **Public bucket** to **ON**.
   - Click **Save**.

### Step 2: Connect Supabase to UniMap
You have two easy ways to connect:
- **Option A (In-App UI — Recommended)**: Open UniMap, click your avatar on the top right, select **Supabase Cloud Config**, paste your Project URL and Anon Key, and click **Save & Connect Cloud**.
- **Option B (.env file)**: Create a `.env` file in the root folder:
  ```env
  VITE_SUPABASE_URL=https://your-project.supabase.co
  VITE_SUPABASE_ANON_KEY=your-anon-key-here
  ```

### Step 3: Deploy to Netlify (Free Lifetime)
1. Push your repository to GitHub.
2. Log into [netlify.com](https://netlify.com) with your GitHub account.
3. Click **Add new site** → **Import an existing project** → select your **UniMap** repository.
4. Build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
5. Click **Deploy UniMap**. Your PWA is live with free HTTPS and atomic deployments!

### Step 4: Anti-Pause Keep-Alive (Never Pause)
Supabase free tier pauses after 7 days of inactivity. UniMap includes a free GitHub Action (`.github/workflows/keep-alive.yml`):
1. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**.
2. Add Repository Secrets:
   - `VITE_SUPABASE_URL`: your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY`: your Supabase anon key
3. The workflow automatically pings Supabase every 4 days, keeping your free database awake permanently!

---

## 💻 Development & Local Build

```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Production build
npm run build
```
