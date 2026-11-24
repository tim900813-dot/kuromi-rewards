# KUROMI PURPLE REWARDS

A mobile-first 30-point reward website built with Next.js and Supabase.

## Features

- Anyone with the URL can view points, reward name, and recent redemption/activity history.
- Only an authenticated administrator can add/remove points, edit the reward name, and redeem at 30 points.
- Points and event history are stored in Supabase.
- Redeeming resets points to zero and increments the redemption counter.
- Live updates via Supabase Realtime (enable the two tables in the publication as described below).

## 1. Create the Supabase project

1. Create a project at https://supabase.com/.
2. Open **SQL Editor** and run the full contents of `supabase/schema.sql`.
3. Open **Project Settings → API** and copy the Project URL and `anon` / publishable key.
4. In **Authentication → Users**, create your administrator user with your own email and a strong password.
5. Open that user's details / edit user metadata and set **App Metadata** to:
   ```json
   { "role": "admin" }
   ```
   Important: set this in **App Metadata**, not User Metadata. Users cannot edit App Metadata themselves.
6. In **Database → Publications**, enable `supabase_realtime` for `rewards_state` and `point_events` if you want live updates.

## 2. Configure locally

1. Copy `.env.example` to `.env.local`.
2. Fill in:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
   ```
3. Install and run:
   ```bash
   npm install
   npm run dev
   ```
4. Open http://localhost:3000. The public page is viewable without login. Open **管理員專區** to sign in.

## 3. Deploy to Vercel

1. Create a GitHub repository and upload the contents of this project folder.
2. Go to https://vercel.com/ and import the repository.
3. Add the two environment variables from `.env.local` in Vercel → Project → Settings → Environment Variables.
4. Deploy. Vercel will provide a public `*.vercel.app` URL.
5. Test the public page in a private/incognito window. Confirm it can read points but cannot see the admin controls until an admin logs in.
6. Log in as the admin and test +1, -1, reward-name update, and redemption.

## Security notes

- Do not put a Supabase `service_role` key in this project or in any `NEXT_PUBLIC_` variable.
- The public anonymous key is designed to be exposed in browser apps; Row Level Security and the SQL functions enforce write permissions.
- Only users whose **App Metadata** contains `role: admin` can invoke write functions.
- Do not share the administrator password. Use a unique, strong password.
- If you need to remove an administrator, delete/disable that user in Supabase Auth or remove the `role` value from App Metadata.

## Customization

- Main UI: `app/page.tsx`
- Colors and responsive layout: `app/globals.css`
- Reward default: `supabase/schema.sql` (`神秘專屬獎勵`)
