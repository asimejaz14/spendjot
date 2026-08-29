# Voice expenses with Siri + Shortcuts

Add expenses by talking to Siri — no need to open the app.

```
"Hey Siri, add expense"
  → Siri: "What did you spend?"
  → you: "twelve hundred fuel yesterday"
  → Siri: "Saved 1,200 rupees for Bike/Car Maintenance."
```

The Shortcut sends your dictated phrase to Spend Jot; the server uses **Azure
OpenAI** to extract `{name, amount, category, date}`, saves the expense, and
returns a line for Siri to read back. If Azure isn't configured, the server
falls back to a built-in rule-based parser, so the flow still works.

---

## 1. Generate a token (in the app)

**Settings → Voice access → Generate token.** Copy the `sj_live_…` value shown
(you only see it once). It's a long-lived, revocable token scoped to creating
expenses only — it can't touch the rest of your account.

## 2. Build the Shortcut (once)

Open the **Shortcuts** app → **+** → name it **Add expense**, then add:

1. **Dictate Text**
2. **Text** — set its value to the JSON body (tap the variable chips for
   `Dictated Text` and `Current Date`):
   ```json
   {
     "text": "Dictated Text",
     "client_now": "Current Date",
     "client_tz": "Asia/Karachi"
   }
   ```
   *(In Shortcuts, insert `Dictated Text` and `Current Date` as variables rather
   than literal strings. For `Current Date`, set its format to ISO 8601.)*
3. **Get Contents of URL**
   - URL: `https://<your-app-domain>/api/v1/voice/expense`
     (e.g. `https://spendjot.vercel.app/api/v1/voice/expense`)
   - Method: **POST**
   - Headers:
     - `Authorization` = `Bearer sj_live_…your token…`
     - `Content-Type` = `application/json`
   - Request Body: **File** → the **Text** from step 2
4. **Get Dictionary Value** → key `spoken` (from the URL response)
5. **Speak Text** → the value from step 4

Then: **Add to Siri / "Hey Siri"** so you can trigger it hands-free.

### Optional: "Add another?" loop

After **Speak Text**, add **Ask for Confirmation** ("Add another?"). If yes,
run the shortcut again (add the shortcut itself via **Run Shortcut**, or wrap
steps 1–5 in a **Repeat** with an exit condition).

## 3. What the API expects and returns

`POST /api/v1/voice/expense` — auth: `Authorization: Bearer sj_live_…`

Request:
```json
{ "text": "twelve hundred fuel yesterday", "client_now": "2026-08-27T21:30:00+05:00", "client_tz": "Asia/Karachi" }
```

Response (always HTTP 200 so Siri can speak the result):
```json
{
  "saved": true,
  "spoken": "Saved 1,200 rupees for Bike/Car Maintenance.",
  "expense": { "id": "…", "name": "Fuel", "amount": "1200.00", "category": { "name": "Bike/Car Maintenance", "…": "…" }, "…": "…" }
}
```
If no amount could be understood, `saved` is `false` and `spoken` asks you to
try again (nothing is saved).

---

## Server configuration (Azure OpenAI)

Set these on the API service (Render dashboard or `render.yaml`):

| Env var | Example | Notes |
| --- | --- | --- |
| `AZURE_OPENAI_ENDPOINT` | `https://my-res.openai.azure.com` | secret |
| `AZURE_OPENAI_API_KEY` | `…` | secret — never commit |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-4o-mini` | your deployment name |
| `AZURE_OPENAI_API_VERSION` | `2024-10-21` | |

Leaving the endpoint/key blank keeps the feature working via the rule-based
parser (just less flexible with messy phrasing).

### Creating the Azure resource (~5 min)

1. Azure Portal → **Create a resource → Azure OpenAI** (needs an approved
   subscription). Note the **Endpoint** and a **Key**.
2. Open **Azure AI Foundry / OpenAI Studio → Deployments → Deploy model →
   `gpt-4o-mini`.** The **deployment name** you choose is `AZURE_OPENAI_DEPLOYMENT`.
3. Put the four values above into Render and redeploy.
