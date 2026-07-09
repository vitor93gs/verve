# Verve Dashboard

Next.js admin dashboard for Verve Marketing with MongoDB-backed persistence.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

3. Set your MongoDB connection:

   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017
   MONGODB_DB=verve
   APP_LOGIN_USERNAME=verve
   APP_LOGIN_PASSWORD=replace-with-a-secure-password
   AUTH_SECRET=replace-with-a-long-random-string
   ```

   `MONGODB_URI` can also be a MongoDB Atlas connection string.
   The login page uses `APP_LOGIN_USERNAME` and `APP_LOGIN_PASSWORD`.

4. Start the app:

   ```bash
   npm run dev
   ```

The first request to `/api/bootstrap` seeds example clients, team members, demands, and Instagram metrics when the `clients` collection is empty.

## Persistent Data

The dashboard persists these actions through API routes:

- Move a client through the monthly process stages.
- Change a client stage from the client detail page.
- Add a new demand for a client.
- Mark a demand as done or pending.

Main API routes:

- `GET /api/bootstrap`
- `PATCH /api/clients/[id]/stage`
- `POST /api/demands`
- `PATCH /api/demands/[id]`
