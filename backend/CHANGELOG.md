# Tabuh Studio backend

## Instructions

- `Added` for new features.
- `Changed` for changes in existing functionality.
- `Deprecated` for soon-to-be removed features.
- `Removed` for now removed features.
- `Fixed` for any bug fixes.
- `Security`

## 1.0.0 2026-07-27

Initial release

## 1.1.0 2026-06-28

- `Changed` Redesigned mobile version

## 1.1.1 2026-08-06

- `Added` NodeMailer mailing package
- `Added` Facility to create/update user profile
- `Added` DB Table auth_tokens
- `Changed` DB Table `user`: added columns `firstname`, `lastname`, `created_at` and `updated_at`

## 1.1.2 2026-08-12

- `Changed` DB table `user` added column `preferences`
- `Changed` in auth.ts: `defaultFocus` -> `defaultFocusByOrchestra`
- `Added` DB tables `music_groups`, `group_scores`, `group_managers`, `user_group_subscriptions`
- `Added` groups endpoints
- `Changed` score list endpoint: filter on group
