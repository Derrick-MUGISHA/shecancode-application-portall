# Secure website entry

The portal now **requires an entry session** for `/apply` and `POST /api/applications`. Roll out the website server routes and production environment settings together with the portal update, or existing direct Apply links will be blocked.

## Flow

1. A visitor clicks the Igire program’s normal Apply link, or presses the SheCanCode website’s POST form button.
2. That website's server calls `POST <portal>/api/application-entry/token` with its own server-only bearer secret and a fixed allowlisted `source`.
3. The issuer returns an encrypted entry URL, valid for five minutes. The AES-256-GCM payload contains the allowlisted source URL/domain, issue/expiry time, portal audience and a random one-time nonce.
4. The visitor confirms **Continue to application**. Only this POST consumes the link, so prefetching or link previews do not spend it.
5. The portal atomically registers the nonce hash and issues a private HttpOnly cookie. The entry session lasts 24 hours on that browser, permitting reload and draft resume.
6. Submission atomically reserves that session in the same transaction as cohort capacity and the application. It cannot submit twice; failed validation or a failed transaction does not consume the session. The session cookie is cleared only after success.

Entry documents use `Referrer-Policy: same-origin`: it prevents the token-bearing URL being sent to other websites while preserving the Origin header needed by native POST forms. Do not change these documents to `no-referrer`, which makes browser form posts send `Origin: null` and fail the origin check.

This establishes the authenticated **issuing website**, not the identity of the person clicking, and an unused bearer link can be shared until it is redeemed. The browser's Referer header is not trusted for attribution.

## Server settings

Portal:

- `APPLICATION_PORTAL_URL`: canonical HTTPS production origin, for example `https://apply.shecancodeschool.org`.
- `APPLICATION_ENTRY_ENCRYPTION_KEY`: independent 64-character hexadecimal key, portal server only.
- `IGIRE_APPLICATION_ENTRY_SECRET`: independent random secret shared only with the Igire server.
- `SHECANCODE_APPLICATION_ENTRY_SECRET`: independent random secret shared only with the SheCanCode server.

Generate missing **local** settings with `npm run entry:setup`. This writes the ignored `.env.local` with restricted permissions and never prints secrets. Configure the same website-specific secret on its server and the portal in your deployment settings. Do not prefix any secret with `NEXT_PUBLIC_`, commit it, put it in HTML or store it in browser storage. Set the production portal URL on both ends. Restart servers after changing environment variables.

The MongoDB `ApplicationEntry` collection needs unique indexes on `nonceHash` and `sessionHash`. Apply the additive Prisma schema with `npx prisma db push` (MongoDB; no data-loss flags). Existing applications have empty source fields and remain readable.

## Igire Rwanda

The confirmed repository `/home/derrick/Documents/GitHub/Work/igirerwanda-fe` has been connected:

- `src/app/api/application-entry/route.ts` (copy retained here as `igire-entry-route.ts`).
- `src/app/programs/[slug]/page.tsx` rewrites existing Apply hrefs using `src/lib/portal-entry-links.ts`, preserving their styling and labels. The links navigate in the current tab to `GET /api/application-entry?program=<slug>`, then to the portal; this avoids blocking by Igire’s existing `form-action self` policy. Closed-enrollment notices are preserved.
- Every GET navigation mints a fresh token without redeeming it or writing a session. Link previews cannot consume the token; only the portal confirmation POST does so. The previous POST endpoint remains available for compatible clients.
- Local ignored `.env.local` has the server secret and local portal origin. Production must receive these through its hosting environment settings.

Allowed sources:

| Source | Original page |
| --- | --- |
| `igire-backend` | https://www.igirerwanda.org/programs/advanced-java-backend-development |
| `igire-frontend` | https://www.igirerwanda.org/programs/advanced-frontend-development |
| `igire-fundamentals` | https://www.igirerwanda.org/programs/web-fundamentals |
| `shecancode` | https://www.shecancodeschool.org/ |

## SheCanCode School

The newly available repository `/home/derrick/Documents/GitHub/Work/new-shecancode` is connected:

- `src/app/api/application-entry/route.ts` (copy retained here as `shecancode-entry-route.ts`).
- Eight public Apply links across six components/pages use the shared `PortalApplicationButton` native POST form.
- The legacy marketing `/apply` page now leads to the same portal entry flow.
- Existing closed-course controls stay disabled.
- Local ignored `.env.local` has the matching SheCanCode server secret and local portal origin. Set the matching production secret and HTTPS portal origin in its host settings as well.

For future website buttons, use:

```html
<form action="/api/application-entry" method="post">
  <button type="submit">Start your application</button>
</form>
```

If another source website is not Next.js, its server must implement the equivalent POST request and redirect. A static browser-only website cannot keep the issuance secret confidential; do not insert the bearer secret into client JavaScript.

## Local development

With the portal running on `http://localhost:3000`, open `/entry/development`, press **Create test entry**, then **Continue to application**. This uses the same encrypted token, replay check, session and submission path. Its source is explicitly **Local development**. The page and issuer return 404 outside `NODE_ENV=development`, including production builds. It also requires a localhost request and matching origin.

For the Igire local website, use port 3001 (SheCanCode can use 3002) to avoid the portal's port 3000. Start Next directly (`next dev -p 3001`) using that project's installed dependencies; its existing startup hook is unrelated to this integration and was not executed or modified here.

## Tracking

The application detail/summary show the entry website, program page and issue time in Kigali time. The application table, analytics and export include the source website. These values come from the verified server session, never from submitted applicant fields. The random nonce and private session credential are not displayed or exported.
