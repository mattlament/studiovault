# Studio Vault

A curated archive of creative studios, agencies, and design inspiration. Browse and filter a collection of links by category, search by name or tag, and sort alphabetically or by date added.

## Dev

Install dependencies and start the local dev server:

```bash
yarn install
yarn start
```

This runs `live-server`, which serves the project with auto-reload on file save.

To preview exactly how the site will behave on Firebase Hosting before deploying:

```bash
yarn serve
```

To deploy to production:

```bash
yarn deploy
```

## Firebase Auth

Admin features (adding, editing, and deleting studios) are gated behind Firebase Authentication. The login page is not linked from the main UI — navigate to `/pages/login.html` directly.

To create an admin account, go to the [Firebase Console](https://console.firebase.google.com) → Authentication → Users → Add user.

Once logged in, a logout button appears in the header. Sessions persist across page refreshes via `localStorage` and remain active until you explicitly log out.

The `/pages/upload.html` seed script is also auth-gated and will redirect to the login page if accessed without a session.
