# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

## Google Sign-In Setup

Google Sign-In is implemented for login and uses these endpoints/components:

- Backend route: `POST /api/auth/google`
- Frontend login page: `src/pages/Index.tsx`

### 1. Configure environment files

Create `.env` files from the examples:

```sh
copy .env.example .env
copy backend\.env.example backend\.env
```

Update the values:

- Root `.env`
  - `VITE_API_URL`
  - `VITE_GOOGLE_CLIENT_ID`
- `backend/.env`
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_ALLOWED_DOMAIN`
  - `JWT_SECRET`, `DATABASE_URL`, and other backend values

Important: `VITE_GOOGLE_CLIENT_ID` and backend `GOOGLE_CLIENT_ID` must be the same Google OAuth Web Client ID.

### 2. Google Cloud Console settings

Create an OAuth 2.0 Web Client and add Authorized JavaScript origins:

- `http://localhost:8080`
- your deployed frontend origin

For LAN/device testing with Google Sign-In, use a public HTTPS URL (for example, ngrok) instead of local IP origins.

### 2.1 Optional: ngrok setup for Google Sign-In testing

```sh
# terminal 1 (frontend)
npm run dev

# terminal 2 (start tunnel)
npm run tunnel
```

Copy the HTTPS forwarding URL from ngrok and set it in root `.env`:

```env
PUBLIC_FRONTEND_URL=https://your-subdomain.ngrok-free.app
```

Then resync env values:

```sh
npm run sync:env
```

Finally, add the same ngrok URL in Google Cloud Console as an Authorized JavaScript origin.

### 3. Run frontend and backend

```sh
# terminal 1
cd backend
npm install
npm run dev

# terminal 2
cd ..
npm install
npm run dev
```

### 4. Domain restriction behavior

Backend enforces `GOOGLE_ALLOWED_DOMAIN` (default: `darshan.ac.in`).
Only Google accounts from that domain can sign in.
