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
 