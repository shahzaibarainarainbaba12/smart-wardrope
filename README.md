# SmartWardrobe Backend v2

Express.js + MongoDB backend for SmartWardrobe. No Docker is used.

## Important: the terminal output you showed
If `npm run dev` stops after the dotenv line and does not print `MongoDB connected`, the API is waiting for MongoDB. This version uses a 5-second connection timeout and prints a clear MongoDB error instead of appearing frozen.

### Local MongoDB
Make sure the MongoDB service is running, then use:
```env
MONGODB_URI=mongodb://127.0.0.1:27017/smartwardrobe
```

### MongoDB Atlas
Use your Atlas connection string in `MONGODB_URI` instead.

## Install
```bash
npm install
copy .env.example .env
npm run dev
```

Expected startup:
```text
Connecting to MongoDB: mongodb://127.0.0.1:27017/smartwardrobe
MongoDB connected: 127.0.0.1
Plan catalogue ready
SmartWardrobe API running: http://localhost:5000/api
```

Health endpoint: `GET http://localhost:5000/api/health`

## Modules
- Auth / Users / Profile
- Household
- Wardrobe
- Collections
- Types
- Items
- Laundry
- Planner
- Outfits
- Plans / Subscriptions
- Notifications
- AI Assistant + AI conversations

## Trial rule
Every new account starts on a 8-day Trial plan. AI Assistant is disabled during the trial. Paid Individual, Couple and Family plans have AI enabled.

## AI Assistant
The AI module supports:
- conversational wardrobe help
- complete event / mood outfit suggestions from the user's actual ready items
- optional saved AI-generated outfits
- image-first item intake entirely inside chat
- conversation history

For richer natural-language and image understanding add `OPENAI_API_KEY` in `.env`. The integration uses the Responses API. Without a key, the guided assistant flow and deterministic outfit fallback still work, but image understanding and free-form AI chat are limited.

See `docs/AI_ASSISTANT_FLOW.md` for API examples.

## Project architecture
```text
Route -> Validation -> Middleware -> Controller -> Service -> Model -> MongoDB
```


## Admin testing + EasyPaisa
Set `ADMIN_EMAILS=your@email.com` in `.env`. That account is promoted to admin and receives a free active Family entitlement for AI testing. Trial length defaults to 8 days. Admins can upload an EasyPaisa QR at `PATCH /api/payments/admin/config`; users can scan it, submit proof, and an admin can approve the payment to activate the selected plan.
