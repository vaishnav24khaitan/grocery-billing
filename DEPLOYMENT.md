# Deployment Guide — Vercel + GitHub

## 1. Set up MongoDB Atlas (free tier)

1. Create an account at https://www.mongodb.com/atlas and create a **free M0 cluster**.
2. Under **Database Access**, create a database user (username + password).
3. Under **Network Access**, add IP `0.0.0.0/0` (allow from anywhere) so Vercel's serverless functions can connect.
4. Click **Connect → Drivers** and copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/grocery?retryWrites=true&w=majority
   ```
   Replace `<user>` / `<password>`, and add a database name (e.g. `grocery`) before the `?`.

## 2. Push the code to GitHub

From the project folder:

```bash
git add .
git commit -m "Grocery billing app"
git branch -M main
git remote add origin https://github.com/<your-username>/grocery-billing.git
git push -u origin main
```

## 3. Deploy on Vercel

1. Go to https://vercel.com and sign in with GitHub.
2. **Add New → Project**, import the `grocery-billing` repository.
3. Framework preset is auto-detected as **Next.js**. Leave build settings default.
4. Before deploying, add **Environment Variables** (Settings → Environment Variables), matching `.env.example`:
   - `MONGODB_URI` — your Atlas connection string
   - `ADMIN_PASSWORD` — a strong password for the admin screen
   - `NEXT_PUBLIC_SHOP_NAME` — your shop name
5. Click **Deploy**.

## 4. Seed products (optional)

Run the seed script locally against the same Atlas database:

```bash
# .env.local must contain the production MONGODB_URI
npm run seed
```

Or just add products manually via the `/admin` screen after deployment.

## 5. Use it

- Billing: `https://<your-app>.vercel.app/`
- Admin: `https://<your-app>.vercel.app/admin`

## Updating

Every `git push` to `main` triggers an automatic redeploy on Vercel.
