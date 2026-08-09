# User Profile Editor
The app lacks a mean for the user to manage their own profile.

# Requirements
- When the 'profile' logo (above the main menu) is clicked, a popup menu should appear with the following options.
	- `Login...` if the user is not logged in, otherwise `Logout`
	- `Create an account...`
	- `Edit my profile...`: only visible if the user is logged in
- The `Login...` option should open a login form similar to the current one, but in a drawer similar to that of the main menu `Notation - Open...`.
- The `Create an account...` should open a form requesting the user's first and last name, email address and password. There should be a second password field to confirm that the password is entered correctly. If both password fields differ, the field should display a warning. All fields should have a SchemaModel that checks for the correctness of the field input. The Form should have a `Register` and `Cancel` button. If the user clicks `Register` and some field content is incorrect, a message should be displayed near the erroneous fields using the SchemaModel's default error check. There should also be a check that the email address is not in use by another registered user. Otherwise an email should be sent to the user's email address with a confirmation link with a limited validity period. If the confirmation link is clicked within the time limit, a new user should be created.
- The `Edit my profile...` should enable the user to edit user's first and last name, email address and password. If the password is edited, an email should be sent to the user's email address informing them that the password was changed. The message should contain a link enabling the user to set a new password in case the password change was not requested by the user.
- A `Manage users...` option, **only visible to logged-in `admin` users**, opens a drawer that
  lists all users, lets the admin select a user and change their role (`viewer`/`editor`/`admin`),
  and offers a "delete user" action (with confirmation). Guarded by an admin-only backend
  endpoint; an admin should not be able to remove their own admin role / delete themselves
  in a way that locks out all admins.

# Mail settings

**Mail server**
mail.tabuh.studio

**SMTP**
- Port 587: TLS encrypted connection.
- Port 465: TLS/SSL encrypted connection.

**POP/POP3**
- Port 995: SSL encrypted connection.
- (Only SMTP is needed for sending; POP3 is for receiving and isn't used here.)

# Decisions (agreed)

- **Email-link landing:** front-end reads the one-time token from the URL (`?token=…&type=…`)
  on load and opens the matching flow, then strips the token from the address bar. No router
  dependency. Tokens are single-use, short-lived, and stored hashed server-side.
- **Editing the email address:** the new address must be **verified before it takes effect**
  (a confirmation link is sent to the new address; the change applies only when confirmed).
- **Forgot-password:** add a standalone "Forgot password?" flow on the login form (reuses the
  reset-token mechanism), in addition to the "you didn't change this?" reset link.
- **Roles:** three roles — `viewer`, `editor`, `admin`. Self-registered users default to
  `viewer`. An `admin` can change any user's role (see "Manage users" below).
- **Account deletion:** include a GDPR-compliant "delete my account" option (removes the user
  and cascades their scores).
- **Mobile:** the mobile layout stays fully public (no authentication there); the
  login/profile entry is desktop-only (Sidenav header).
- **DB name field:** the live `users` table has a `name` column (the seed script
  `backend/src/seed/MySQLDB-schema.sql` is out of date and omits it). Replace `name` with
  `first_name` / `last_name`, and update the seed script to match.

# Phasing

1. Profile popup menu + login-as-drawer + `GET /auth/me` + session restore.
2. Registration + email confirmation (mailer, token table, register drawer, verify landing).
3. Edit profile (incl. verified email change) + change-password notification + forgot-password
   reset flow + GDPR account deletion.
4. Admin "Manage users" drawer (list users, change role, delete user) + admin-only backend
   endpoints.

# Phase 1 — as built

- **Backend:** `GET /api/auth/me` (behind `requireAuth`) returns the current user from the DB
  (fresh name/email/role). `GET /api/auth/*` now uses the generous read rate-limit while the
  POST auth routes keep the strict auth limit (so `/me` on every page load can't trip it).
- **Frontend:** `apiMe()` added; `AuthContext` now restores the session on load
  (`refresh → /me → setUser`) so the name/role survive a reload. The Sidenav profile icon
  opens a **Whisper + Popover overlay menu** (floats over the menu instead of pushing it down,
  since an rsuite Dropdown inside a Sidenav expands inline) — Login…/Logout (functional) plus
  disabled "Create an account…", "Edit my profile…", and (admin-only) "Manage users…"
  placeholders (enabled in phases 2–4). The login form moved from a Modal to a **Drawer**
  (matching the Notation → Open… drawer).
- Not yet done: registration, email confirmation, profile editing, password reset, mailer,
  DB migration to `first_name`/`last_name`, and the token table — all phases 2/3.
- Needs `npm run build` (frontend) and the backend restart to verify.

# Phase 2 — as built (registration + email confirmation)

## Database
- Seed schema (`MySQLDB-schema.sql`) updated: `users` now has `first_name`, `last_name`,
  `updated_at`, roles `ENUM('viewer','editor','admin')` default `viewer`. New `auth_tokens`
  table (single-use, hashed tokens; `user_id` NULL + `payload` JSON for pending signups).
- Migration for the live DB: `backend/src/seed/migrations/002_user_profile.sql` (split
  `name` → first/last, `public` → `viewer`, add `auth_tokens`). **Run it once.**

## Backend
- `mailer.ts` (nodemailer): reads `MAIL_*` env; when `MAIL_HOST` is unset it runs in **dev
  mode** and logs the email (incl. the link) instead of sending — so registration works
  locally without SMTP. Added `nodemailer` + `@types/nodemailer` to `package.json` (**run
  `npm install`**).
- `auth.ts`: `login` and `/me` now return `{ id, firstName, lastName, name, email, role }`
  (JWT payloads carry only `{ id, email, role }`). New `POST /auth/register` (checks email
  isn't taken, stores a pending signup + hashed `verify_email` token, emails the confirmation
  link, TTL `VERIFY_TTL_HOURS`, default 24h) and `POST /auth/verify-email` (consumes the token,
  creates the `users` row with role `viewer`). Confirmation link →
  `${APP_URL}/?token=…&type=verify`.

## Frontend
- `apiService`: `apiRegister`, `apiVerifyEmail`; `ApiUser`/`AuthUser` gained `firstName`/
  `lastName` (kept `name` for display).
- `RegisterDrawer` (rsuite Form + SchemaModel): first/last name, email, password + confirm
  (confirm uses `addRule` to match); shows inline errors and a server-error banner; on success
  shows a "check your email" message. Wired to the profile menu's **Create an account…** item.
- `EmailLinkHandler` (rendered in `App`): on load, reads `?token=…&type=verify` from the URL,
  strips it from the address bar, calls `apiVerifyEmail`, and toasts success/failure. (`reset`
  is phase 3.)

## Required `.env` (backend) — add these
```
APP_URL=https://tabuh.studio            # front-end base for email links (dev: http://localhost:5173)
MAIL_HOST=mail.tabuh.studio             # omit to run the mailer in dev/log mode
MAIL_PORT=587                           # 587 STARTTLS or 465 SSL
MAIL_USER=...                           # SMTP username
MAIL_PASS=...                           # SMTP password
MAIL_FROM=Tabuh Studio <no-reply@tabuh.studio>
VERIFY_TTL_HOURS=24                     # confirmation-link validity (optional)
```

## Manual steps to run Phase 2
1. `cd backend && npm install` (nodemailer + types).
2. Apply `backend/src/seed/migrations/002_user_profile.sql` to the database.
3. Add the `.env` vars above (or leave `MAIL_HOST` unset to log links in dev).
4. `npm run build` (frontend) + restart the backend.

## Notes / decisions
- Confirmation does **not** auto-login (avoids magic-link login surface); the user logs in
  after confirming. Tokens are hashed at rest, single-use, and expire.
- The register endpoint returns "email already registered" (per the spec) — a deliberate,
  minor email-enumeration trade-off for clearer UX.
- Phases remaining: 3 (edit profile incl. verified email change, change-password notice,
  forgot-password reset, GDPR delete) and 4 (admin "Manage users").

# Phase 3 — as built (edit profile, email/password change, forgot-password, GDPR delete)

No DB change needed — reuses the `auth_tokens` table (types `change_email` / `reset_password`).

## Backend (`auth.ts` + `mailer.ts`)
- `PATCH /auth/profile` (auth) — update first/last name immediately; returns the fresh user.
- `POST /auth/change-email` (auth) — checks the new address is free, stores a `change_email`
  token, emails a confirmation link to the **new** address, and a heads-up notice to the
  **current** one. The address only changes on confirmation.
- `POST /auth/confirm-email-change` (public, token) — applies the new email.
- `POST /auth/change-password` (auth) — verifies the current password, updates it, and emails
  a "was this you?" notice containing a reset link.
- `POST /auth/forgot-password` (public) — always responds `{ok:true}` (no email enumeration);
  emails a reset link if the address exists.
- `POST /auth/reset-password` (public, token) — sets a new password.
- `POST /auth/delete-account` (auth) — verifies the password, deletes the user (scores +
  tokens cascade), clears the auth cookies. GDPR.
- New mail templates: email-change confirm/notice, password-reset, password-changed. Reset
  links use `?type=reset`; email-change links use `?type=change_email`.

## Frontend
- `EditProfileDrawer` — four sections (name / email / password / delete account), each with its
  own submit + inline success/error. Delete requires the password and a confirm step.
- `ResetPasswordDrawer` — set-new-password form, opened by `EmailLinkHandler` for `?type=reset`.
- `LoginDialog` now shows login errors and has a **Forgot password?** mode (email → reset link).
- `EmailLinkHandler` handles `verify` (phase 2), `change_email` (auto-confirm + toast) and
  `reset` (opens the reset drawer).
- `AuthContext`: added `updateProfile` and `deleteAccount`; `apiService` gained the matching
  calls (`apiUpdateProfile`, `apiChangeEmail`, `apiConfirmEmailChange`, `apiChangePassword`,
  `apiForgotPassword`, `apiResetPassword`, `apiDeleteAccount`).
- Profile menu **Edit my profile…** is wired (logged-in only).

## Env (backend) — one addition
```
RESET_TTL_HOURS=2        # password-reset / password-changed link validity (optional, default 2)
```

## Session invalidation on password change/reset — as built
Implemented via `users.token_version` (migration `003_token_version.sql`). The value is embedded
as the `tv` claim in the JWTs at login; `/auth/refresh` re-reads it from the DB and rejects any
token whose `tv` is stale. `reset-password` bumps `token_version` (killing sessions that existed
before the reset — e.g. an attacker who prompted it); `change-password` bumps it too but
re-issues the actor's own cookies so they stay logged in. Access tokens are stateless (no
per-request DB check), so revocation of other sessions takes effect at their next `/refresh`
(≤ the 15-min access-token lifetime). The 401→refresh interceptor below drives that `/refresh`,
so an evicted session is cleared on its next API call rather than only on reload.

## Manual steps to run Phase 3
1. `npm run build` (frontend) + restart the backend. (No new deps, no migration.)
2. Optionally set `RESET_TTL_HOURS` in `backend/.env`.

# Phase 4 — as built (admin: manage users)

No DB change, no new deps.

## Backend (`auth.ts`, all guarded by `requireRole('admin')`)
- `GET /auth/users` — list all users (id, first/last name, name, email, role, createdAt).
- `PATCH /auth/users/:id/role` — set a user's role (`viewer`/`editor`/`admin`). Rejects
  changing your **own** role (prevents locking out the last admin).
- `DELETE /auth/users/:id` — delete a user (scores + tokens cascade). Rejects deleting
  **yourself** (use "Edit my profile" for that).

## Frontend
- `ManageUsersDrawer` — lists users with a per-row role `SelectPicker` and a delete button
  (delete asks for confirmation in a modal). The admin's own row is locked (role disabled, no
  delete, marked "(you)"). Errors show in a banner; changes update the list in place.
- `apiService`: `apiListUsers`, `apiSetUserRole`, `apiDeleteUser` (+ `AdminUser` type).
- Profile menu **Manage users…** is wired (visible only to `admin`).

## Manual steps to run Phase 4
1. `npm run build` (frontend) + restart the backend.

# Silent token refresh (401 → refresh → retry) — as built

Frontend-only; no backend or DB change.

Problem it fixes: the access-token cookie lives ~15 min, but the app only refreshed it on
mount (`AuthContext`). After sitting idle past that window, the next protected call (e.g. saving
a score) hit `requireAuth` with an expired/absent access token and returned 401 ("access
denied"). A page reload silently refreshed the token via the 7-day refresh cookie, which is why
the reload "fixed" it and the user was still logged in.

Implementation (`services/apiService.ts` + `context/AuthContext.tsx`):
- The `request` helper now intercepts a `401`: on the **first** 401 for a protected call it
  calls `/auth/refresh` once and, on success, transparently replays the original request (a
  `retried` flag caps it at one retry). `/auth/refresh` and `/auth/login` are excluded so a 401
  there stays terminal and can't recurse.
- Concurrent 401s (common after idle — several calls fire at once) share a single in-flight
  `refreshPromise`, so only one `/auth/refresh` is sent.
- If the refresh itself fails (refresh token truly gone/expired), `request` invokes an
  `onAuthExpired` callback and rethrows. `AuthContext` registers it via `setAuthExpiredHandler`
  to `setUser(null)`, dropping the UI to logged-out so the user is prompted to log in again.

Net effect: the idle-then-save case re-authenticates behind the scenes (no reload); the user is
only bounced when the refresh token is also expired — the correct moment to require a login.

Manual step: `npm run build` (frontend) + restart. No new deps, no migration.

---
All four phases of the user-profile feature are now implemented, plus the `token_version`
session-invalidation hardening and the silent 401→refresh→retry interceptor (see the two
"as built" sections above).

Manual step for the token_version change: apply `backend/src/seed/migrations/003_token_version.sql`,
then rebuild/restart. No new deps.
 