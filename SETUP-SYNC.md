# Turn on login + sync (about 10 minutes, free)

The app works without this. Until you do it, the Profile → Account row says "Not set up yet".

1. Go to https://supabase.com, sign up, and click **New project** (any name, any region near you, set a database password and keep it somewhere safe).
2. When the project is ready, open **SQL Editor → New query**, paste everything from `supabase.sql`, click **Run**. This makes one private table; each account can only read and write its own row.
3. Open **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
4. Open `config.js` in this project and paste them between the quotes:
   `window.SYNC_CONFIG={url:"https://xxxx.supabase.co",anonKey:"eyJ..."};`
   These two values are public by design. **Never** paste the `service_role` key anywhere.
5. In Supabase open **Authentication → URL Configuration**. Set **Site URL** to your Vercel address (e.g. `https://your-app.vercel.app`) and add the same address under **Redirect URLs**. This makes confirmation and password-reset links come back to the app.
6. Optional: in **Authentication → Providers → Email**, turn off "Confirm email" if you don't want to confirm by email when you sign up.
7. Commit and push `config.js` (and the other new files) to GitHub. Vercel redeploys.
8. On each device: Profile → Account → Sync across devices → Create account / Sign in.

How it behaves
- Works offline; changes upload a few seconds after you make them and download when you open or return to the app.
- First sign-in on a device that already has data asks whether to merge, use the account's data, or use this device's.
- If two devices edit at the same time, data is merged (nothing is deleted). When one device simply edits an existing entry, the newest save wins.
- Photos stay on the device where they were added (they're too big to sync for free).
- Sign out keeps the data on that device.
