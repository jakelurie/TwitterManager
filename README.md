# Perch

A private, responsive X account manager built with React, Tailwind CSS, Express, and SQLite. Upload media, set a goal and voice, generate image-aware plans, edit and approve scheduled posts, review replies, and inspect decision history.

## Run

Requires Node 22.13+ (tested with Node 26).

```sh
npm install
npm run build
npm start
```

The app listens on `http://127.0.0.1:4330`. The Vite development UI is available with `npm run dev` while the backend runs separately. `PORT` and `DATA_DIR` can override the server port and storage directory.

## Connect and use

1. Open **Control center**. Set your goal, tone, daily posting limit, daytime window, and IANA timezone.
2. Connect an OpenAI API key. The model is configurable (default `gpt-5-mini`). Model access is verified when connecting. Photos are resized and sent with your goal and media notes to the Responses API with storage disabled. Video captions depend on the descriptive notes you supply; video frames are not analyzed.
3. Connect your X developer app’s API key, API key secret, user access token, and user access token secret. The app needs Read and Write user permissions and access/credits for account lookup, v2 media upload, posting, mentions, and metrics. The app verifies the account with `/2/users/me`; entering a handle alone does not authorize account access.
4. Upload JPG, PNG, WebP, GIF, MP4, or MOV files (100 MB per file, up to 20 per batch). X may impose additional format, duration, or account-specific limits. WebP is converted to JPEG for publication. Add context, particularly for videos.
5. Generate a plan (up to six unused assets at a time) or create a manual draft from a media card. AI captions and selection reasons use your goal and available measured performance. Scheduling uses your timezone, posting window, daily cap, and at least three hours between posts. Initial scheduling is exploratory rather than a claim of proven optimal timing.
6. Review and approve posts, then enable **Live posting**. **Auto-approve AI posts** applies only to newly generated AI plans; leave it off to review each post. Live mode checks due posts every 15 seconds, syncs hourly, and replenishes a low queue using unused media.
7. Sync the reply inbox to see recent direct replies to posts published through this app. Generate a suggestion or write your own, then explicitly approve and send. Fully automated AI replies are intentionally not enabled: X requires prior written approval and relevant consent for AI reply bots. See [X automation rules](https://help.x.com/en/rules-and-policies/x-automation).

The laptop must remain awake, online, and running the server. Posts over 30 minutes late are held for rescheduling. Publication with an uncertain network outcome is held for manual inspection rather than retried automatically. Pausing stops future publications; it cannot recall a request already sent to X. Engagement improvements are not guaranteed. The inbox is a recent-mentions view (20 mentions per sync), not an exhaustive historical archive.

## Storage and access

SQLite, uploaded media, the AES-256-GCM encryption key, and encrypted credentials live in `data/`, which is gitignored. Credentials are never returned to the browser. The database and key use owner-only file permissions; the key must be included with an encrypted backup if restoring credentials. Encryption does not protect against someone who can access both files. Back up the whole data directory while the server is stopped.

This is a single-owner local/Tailscale app. It trusts devices that can reach its port; there is no separate app login. Keep access limited to trusted devices through Tailscale ACLs. The server binds only to loopback, rejects cross-origin browser mutations, and does not enable CORS. Do not expose it through public Funnel or a public reverse proxy without adding authentication.

## Private phone access

Use a separate Tailscale Serve HTTPS port; never replace the harness’s 80, 443, or 8787 entries:

```sh
tailscale --socket=$HOME/.tailscale-harness/tailscaled.sock serve --bg --https=8443 http://127.0.0.1:4330
```

- Phone / away from home: `https://jakes-harness.tail5785a3.ts.net:8443` (Tailscale required).
- Laptop itself: `http://127.0.0.1:4330`.

## Verification

```sh
npm test
npm run build
PLAYWRIGHT_BROWSERS_PATH=0 npx playwright install chromium
npm run test:e2e
```

Browser tests run on port 4332 with workers disabled and isolated storage in `data/test-browser`. Tests cover desktop uploads and persistence, context, drafts, blocked publication without credentials, cancellation, deletion, phone navigation and overflow, and API input/origin validation. External AI/X requests require real credentials and are not covered by those tests.

AI API reference: [OpenAI Responses](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/responses/methods/create). X SDK: [twitter-api-v2](https://github.com/PLhery/node-twitter-api-v2).
