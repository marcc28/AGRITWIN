# Garden tasks

Related work: #106.

## What the user sees

The **Calendar** tab shows a month, then yesterday, today and tomorrow.
Tapping a day opens the day screen:

- The date is at the top. The arrows go to the day before and the day after.
- Notices (recommendations) come first. The user can mark them as seen or turn
  them into a task.
- Tasks are in groups: red (high), orange (medium), green (low) and done.
- The round box marks a task as done. Tapping the card opens it to edit.
- The **+** button creates a task: title, details, priority and day.
- Every day shows a small moon with its phase, in the month and on the day
  screen. It is worked out on the phone from the average lunar month, so it
  needs no server and can be off by about a day.

## Who can change what

| Task                         | Edit | Delete |
| ---------------------------- | ---- | ------ |
| Created by the user          | yes  | yes    |
| Created by the AI            | yes  | no     |
| Created by the AI and edited | yes  | no     |

When the user edits an AI task it becomes the user's task (`source = 'user'`).
The AI never changes or repeats it after that. Tasks made from a notice are
not deleted by the user either, but they can be marked as done.

## How the AI works

- One table, `garden_tasks`. `kind` is `task` or `recommendation`.
- `signature` is the key the AI gives to what it creates. With the day it is
  unique (`uq_garden_tasks_ai_key_day`), so the same advice is never saved twice.
- `fields.ai_checked_at` says when a garden was last reviewed. A garden is
  claimed before the call to Gemini, so two requests never review it twice.
  If Gemini fails, the claim is released and it is tried again after 30 minutes.
- Pending AI tasks older than 7 days are deleted. Tasks of the user never are.
- Without sensors the AI only gives weather notices.

## When it runs

1. **Opening the Calendar**: if the garden was not reviewed in the last 12 hours.
   The screen asks again after 8 seconds (up to two times) to show the result.
2. **Cron**: every day at 08:00 and 20:00 (Spain), with
   `.github/workflows/garden_tasks.yml`. It calls
   `POST /api/v1/tasks/generate` and reviews gardens not reviewed in the last
   6 hours.

## Setting up the cron

Do this only after the backend with the endpoint is deployed.

1. Make a secret: `openssl rand -hex 32`.
2. Render, service `backend`, **Environment**: add `TASKS_CRON_SECRET` with that
   value and save (Render restarts the service).
3. GitHub, **Settings → Secrets and variables → Actions → New repository
   secret**: name `TASKS_CRON_SECRET`, same value.
4. GitHub, **Actions → Garden tasks → Run workflow**. A good answer is
   `{"gardens":N,"reviewed":M}`.

If it fails: `401` means the two secrets are different. `404` means the backend
with the endpoint is not deployed yet.

## Database

Run `backend/migrations/20261111_garden_tasks.sql` in Supabase. It is safe to
run it more than once.
