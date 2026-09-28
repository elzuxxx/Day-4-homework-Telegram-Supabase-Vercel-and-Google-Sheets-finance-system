# Friends Included finance system

Production-ready Day 4 homework app. Supabase is the financial source of truth; Google Sheets is a readable projection and Telegram is an input/notification channel.

## Set up

1. Create a Supabase project and run `supabase/migrations/001_finance.sql` in the SQL editor.
2. Copy `.env.example` to `.env.local` and fill every value. Generate `APP_INTERNAL_TOKEN` and `TELEGRAM_WEBHOOK_SECRET` with long random strings.
3. In Google Cloud, enable Google Sheets API, create a service-account key, put its compact JSON in `GOOGLE_SERVICE_ACCOUNT_JSON`, create a spreadsheet with `Sales` and `Expenses` tabs, and share it **Editor** with the service account email. Give the instructor Viewer access.
4. Create a Telegram bot with BotFather. Set `TELEGRAM_BOT_TOKEN`, deploy the app, then set the webhook:
   `https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<your-domain>/api/telegram/webhook&secret_token=<TELEGRAM_WEBHOOK_SECRET>`.
   Each testing user must press Start in a private bot chat first.
5. `npm install && npm run dev`. Deploy to Vercel and add the same environment variables there. Set `NEXT_PUBLIC_*` link values to your deployed public resources.

## Use and test

The home page has a **Demonstration role** selector. Salespeople submit sales, Kevin submits expenses, and Svetlana reviews and approves/corrects proposals. The browser sends the selected fictional employee ID to the API only for this homework demo; the API repeats every role check and never trusts hidden UI.

Manager setup maps an existing Telegram numeric user ID to an employee. It is deliberately unavailable through Telegram. Bot submissions retain the original chat ID on the transaction; changing the mapping later does not redirect decision notifications.

`POST /api/seed?mode=test1` and `mode=test2` require `x-internal-token` and are optional deterministic data helpers. They submit through the same ledger layer; do not use them for the required Telegram S01/E01 demonstration.

## Operational notes

- An approved sale is immutable and idempotent: a second approval changes nothing.
- An allocated expense has already reduced company result from submission, so allocation only changes project attribution.
- Sync and notification delivery are tracked independently. Use manager retry controls; retries upsert by reference and never create financial duplicates.
- For real identities, replace the demonstration header with Supabase Auth and derive the acting employee from a signed session. The server-side processing checks in this project remain the boundary for all writes.
