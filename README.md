
# Contact Gain — GitHub‑Backed Contact Collector (Vercel)

A tiny, no‑database contact capture site you can deploy in minutes.  
Contacts are stored **in a GitHub repository** (as `data/contacts.json`) via the GitHub Contents API.  
Includes a clean single‑page UI (static) and two API routes on Vercel:

- `POST /api/contacts` — save a contact (name + phone).  
- `GET  /api/contacts` — return count and a health ping.  
- `GET  /api/export`   — export all saved contacts as a `.vcf` (vCard) file.

> Why GitHub? It’s simple, free for small projects, versioned, and easy to back up or inspect with PRs/commits.

---

## ✨ Features

- ⚡️ **Zero DB**: Uses GitHub as the storage layer (JSON file).
- 🧾 **vCard export**: Download all saved contacts as a `.vcf` in one click.
- 🔐 **Private by default**: You can keep the storage repo private; the site only needs a token with Contents access.
- 🧱 **Serverless**: API routes run on Vercel Functions.
- 🧰 **Minimal stack**: Just static HTML/CSS/JS + Node on the serverless side.
- 🧪 **Local dev** with `vercel dev`.

---

## 🗂 Project Structure

```
contact-gain-main/
├─ api/
│  ├─ contacts.js      # read/write contacts.json via GitHub Contents API
│  └─ export.js        # export .vcf built from contacts.json
├─ data/
│  └─ contacts.json    # seed shape (runtime copy lives in your GitHub repo)
├─ public/
│  └─ index.html       # the one‑page UI
├─ package.json
└─ vercel.json         # build & routing config
```

---

## 🛠️ Requirements

- Node.js 18+
- A **GitHub repo** to hold your contact data (can be private).
- A **GitHub token** with permission to read/write that repo’s contents.

### GitHub Token (recommended scopes)

- **Classic token**: `repo` (full) or at least `repo:contents` access to the storage repo.  
- **Fine‑grained token**: Give it **Read & Write** permission to **Contents** on the **single storage repository**.

> Store this token as an environment variable (see below). Never commit it.

---

## ⚙️ Environment Variables

Define these in your environment (Vercel dashboard → Project → Settings → Environment Variables) or a local `.env` when using `vercel dev`.

| Variable | Required | Example | Notes |
|---|:---:|---|---|
| `GITHUB_TOKEN` | ✅ | `ghp_xxx` | Token with permission to the storage repo contents. |
| `GITHUB_OWNER` | ✅ | `your‑github‑username` | Owner of the storage repo. |
| `GITHUB_REPO`  | ✅ | `contacts-storage` | Name of the storage repo. |
| `GITHUB_BRANCH` | ❌ | `main` | Branch to persist to (default: `main`). |
| `GITHUB_FILE_PATH` | ❌ | `data/contacts.json` | Path to JSON in the repo (default shown). |

**Optional (advanced):** you can change the export filename header by editing `/api/export.js` if you want a different `.vcf` name.

Create the file path in your repo (e.g., `data/contacts.json`) on first run; the API will overwrite with valid JSON. A safe initial content is:

```json
{
  "count": 0,
  "contacts": []
}
```

---

## ▶️ Run Locally

1. **Install deps**

   ```bash
   npm install
   ```

2. **Login to Vercel (once)**

   ```bash
   npx vercel login
   ```

3. **Set env vars for dev** (Vercel will read a `.env` file during `vercel dev`):

   ```bash
   # .env
   GITHUB_TOKEN=ghp_************************************
   GITHUB_OWNER=your-github-username
   GITHUB_REPO=contacts-storage
   GITHUB_BRANCH=main
   GITHUB_FILE_PATH=data/contacts.json
   ```

4. **Start the dev server**

   ```bash
   npx vercel dev
   ```

5. Open http://localhost:3000 — submit a test entry and check the commits on your storage repo.

---

## 🚀 Deploy to Vercel

1. Create a new Vercel project and import this repository.  
2. Set the **Environment Variables** (`GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, optional `GITHUB_BRANCH`, `GITHUB_FILE_PATH`).  
3. Deploy. Vercel will:
   - Build serverless functions from `api/*.js`.
   - Serve static assets from `public/*`.
   - Route `/api/...` to the functions (see `vercel.json`).

> **Tip:** Keep your storage repo **private**. The frontend never exposes the token; only the function uses it.

---

## 🌐 API Endpoints

### `GET /api/contacts`
Health/info endpoint. Returns stored count and file metadata.

**Response (example)**
```json
{
  "ok": true,
  "count": 42,
  "filePath": "data/contacts.json",
  "branch": "main"
}
```

### `POST /api/contacts`
Create a new contact entry.

**Body (JSON)**
```json
{
  "fullName": "Ada Lovelace",
  "number": "+2347025369036"
}
```

**Response**
```json
{
  "ok": true,
  "id": "clz8...",
  "count": 43,
  "message": "Contact saved successfully"
}
```

**Curl**
```bash
curl -X POST https://your-app.vercel.app/api/contacts \
  -H "Content-Type: application/json" \
  -d '{"fullName": "Seyori Seyori", "number": "+2347025369036"}'
```

### `GET /api/export`
Downloads a `.vcf` file built from all contacts.

- Content‑Type: `text/vcard`
- Header `X-Contact-Count`: total contacts exported

**Browser:** visit `https://your-app.vercel.app/api/export`

**Curl:**
```bash
curl -L https://your-app.vercel.app/api/export -o contacts.vcf
```

---

## 🧩 How It Works (GitHub Contents API)

- **Read**: `GET /repos/:owner/:repo/contents/:path?ref=:branch` → returns base64 content + SHA.  
- **Write**: `PUT /repos/:owner/:repo/contents/:path` with JSON body:
  ```json
  {
    "message": "feat: add contact",
    "content": "<base64-json>",
    "branch": "main",
    "sha": "<previous file sha>"
  }
  ```
- We keep and increment `count` and append to `contacts` with a generated `id` + `timestamp` (UTC).

> If two writes collide, GitHub will reject with a 409 unless you send the latest `sha`. The API code fetches the latest file before writing to minimize conflicts.

---

## 🔒 Security Notes

- **Never** expose `GITHUB_TOKEN` on the frontend; only store it in Vercel **Serverless Function** env.  
- Prefer a **Fine‑grained token** scoped to only the storage repo with **Contents: Read/Write**.  
- Consider enabling **branch protection** on the storage repo.  
- If you fork this project, change the default export filename inside `/api/export.js` to your brand.

---

## 🧰 Troubleshooting

- **401/403 when saving**: Check `GITHUB_TOKEN` validity and scopes; confirm `GITHUB_OWNER`, `GITHUB_REPO`, and `GITHUB_BRANCH`.  
- **404 on file**: Ensure `GITHUB_FILE_PATH` exists (or let the API create/initialize it).  
- **Rate limits**: GitHub API has rate limits; for heavy traffic, consider batching or moving to a DB.  
- **Inverted phone formats**: Normalize input on the client or add a sanitizer in `api/contacts.js`.

---

## 📄 License

MIT — do whatever, just keep the license notice.

---

## 🙌 Credits

- Creator: **Seyori**
- Serverless runtime: **Vercel**  
- vCard generation: **vcards-js**  
- Storage: **GitHub Contents API**

If you ship this publicly, star the repo so others can find it!

---

## Any other questions or problems ? You can contact me via [Telegram](https://t.me/s3yori)
