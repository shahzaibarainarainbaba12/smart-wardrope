# SmartWardrobe AI Assistant flow

## Access rule
- New accounts receive a 8-day Free Trial.
- The Free Trial can use wardrobe, collections, types, laundry and planner.
- AI Assistant endpoints return HTTP 403 during the trial.
- AI Assistant is unlocked only after the user has an active paid plan with `aiEnabled: true`.

## Add an item entirely inside AI Assistant
1. `POST /api/ai/item-intake` as multipart/form-data with field `image`.
2. Assistant analyzes the picture when an AI key is configured and asks for collection(s).
3. `POST /api/ai/item-intake/:conversationId` body `{ "message": "Office, Party" }`.
4. Assistant asks for Type and returns the type list.
5. Call the same endpoint with `{ "message": "Dress" }`.
6. The backend creates the wardrobe item. No manual Add Item screen is required.

## Complete outfit suggestion
`POST /api/ai/suggest-outfit`

Example body:
```json
{
  "occasion": "friend's wedding",
  "mood": "elegant but comfortable",
  "notes": "evening event",
  "save": true
}
```
The service only chooses items that are currently `ready`. It can save the suggestion as an Outfit.

## General AI chat
`POST /api/ai/chat`

```json
{
  "message": "I have a dinner party tonight. What should I wear?"
}
```
The assistant receives the user's wardrobe inventory as context so it can respond using actual items.
