# Peer Tutoring Finder

A beginner-friendly full-stack web application that helps students find peer tutors, publish subjects they can teach, and send or manage tutoring requests.

## 1. Problem and objectives

Students may need help with a course but may not know who can explain it. Peer Tutoring Finder provides a searchable directory of student tutors and a simple workflow for requesting study support.

Objectives:
- Help learners search tutor listings by subject and skill level.
- Let students publish the subjects they can teach and their availability.
- Let learners send requests and tutors accept or decline them.
- Store accounts, listings, and requests in Supabase PostgreSQL.
- Demonstrate a complete frontend, REST API, authentication, and database workflow.

## 2. Users and implemented features

Any registered student can act as a learner and a tutor. There is no separate administrator dashboard in this MVP.

Implemented features:
- Supabase Auth email/password registration and sign-in.
- Search and filter active tutor listings by subject and level.
- Publish tutor listings.
- Send tutoring requests with an optional message.
- View incoming and outgoing requests.
- Tutors accept or decline; learners cancel pending requests.
- Input validation, authentication checks, ownership checks, rate limiting, security headers, and database constraints.

Not included in this MVP: chat, calendar integration, notifications, ratings, payments, video calls, and admin moderation. The application does not schedule an actual calendar appointment; it tracks a request and availability text.

## 3. Technology stack

- HTML5, CSS3, Vanilla JavaScript
- Node.js 20 or newer, Express 5
- Supabase Auth and Supabase PostgreSQL
- Git and GitHub
- Required npm packages: `express`, `@supabase/supabase-js`, `dotenv`, `helmet`, and `express-rate-limit`

## 4. Folder structure

```text
peer-tutoring-finder/
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── backend/
│   ├── server.js
│   ├── supabase.js
│   ├── middleware/
│   │   └── auth.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── tutors.js
│   │   └── requests.js
│   ├── package.json
│   ├── .env.example
│   └── .gitignore
├── database/
│   └── schema.sql
├── .gitignore
└── README.md
```

## 5. Prerequisites and installation

Install these tools on Windows:
- Node.js LTS: https://nodejs.org/
- Visual Studio Code: https://code.visualstudio.com/
- Git: https://git-scm.com/downloads
- A Supabase account: https://supabase.com/

Open a terminal in the root `peer-tutoring-finder` directory. Check installations:

```bash
node --version
npm --version
git --version
```

Node should be version 20 or newer.

## 6. Create and initialize the Supabase database

1. Sign in to https://supabase.com/ and create a new project.
2. Wait until the database is ready.
3. Open **SQL Editor** in the Supabase dashboard.
4. Open `database/schema.sql` in VS Code, copy the complete SQL, paste it into a new SQL Editor query, and run it.
5. Open **Table Editor** and confirm that `profiles`, `tutor_listings`, and `tutoring_requests` exist.
6. Open **Project Settings → API** (the labels may vary). Copy the Project URL and the publishable/anon key. Obtain the service-role/secret key only for server-side use. Never place the service-role key in frontend files or GitHub.
7. In Supabase Auth settings, decide whether email confirmation is enabled. If it is enabled, a new student must confirm the email before signing in. For a local classroom demo, you can disable confirmation temporarily in the project’s Auth settings, if appropriate, and re-enable it before any real deployment.

The `profiles.id` field references Supabase's `auth.users.id`. Registration writes a profile when an immediate session is returned; the login route can create a missing profile after authentication as a fallback.

## 7. Configure environment variables

From the root directory, copy the example file:

Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
```

Windows Command Prompt:

```bat
copy backend\.env.example backend\.env
```

Edit `backend/.env` and replace placeholders with your own values:

```dotenv
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_ONLY_SERVICE_ROLE_KEY
```

- `PORT`: local Express port.
- `NODE_ENV`: use `development` locally; set `production` on a production host.
- `SUPABASE_URL`: project URL from Supabase.
- `SUPABASE_ANON_KEY`: public/publishable key used by the server for Supabase Auth sign-up/sign-in.
- `SUPABASE_SERVICE_ROLE_KEY`: privileged server-only key used for database operations after backend authorization checks.

`.env` contains your real local secrets and is ignored by Git. `.env.example` documents variable names with placeholders and is safe to commit. Do not copy the service-role key into `frontend/app.js` or any browser code.

## 8. Install dependencies and start the app

From the project root:

```bash
cd backend
npm install
npm run dev
```

The terminal should show `Peer Tutoring Finder running at http://localhost:3000`. Open http://localhost:3000 in your browser. Stop the server with `Ctrl+C`. For normal start instead of development watch mode, run `npm start` inside `backend/`.

Check the backend health endpoint by opening http://localhost:3000/api/health. Expected response:

```json
{"status":"ok","application":"Peer Tutoring Finder"}
```

## 9. Architecture and workflows

1. The browser loads `frontend/index.html`, `styles.css`, and `app.js` from Express static-file serving.
2. Browser JavaScript calls `/api/...` endpoints with `fetch()`.
3. Public tutor search reads active listings and their public profile details.
4. Registration and login use Supabase Auth. The browser keeps the access token in `sessionStorage` for this student-demo implementation and sends it as a Bearer token.
5. `requireAuth` asks Supabase Auth to verify the token. Private routes use the verified user ID, not a user ID supplied by the browser.
6. The server uses the service-role Supabase client for SQL operations and explicitly checks request ownership. RLS is enabled with no browser-access policies because the browser only calls the Express API.

For production, consider moving authentication to secure, HttpOnly cookies, adding CSRF protection as appropriate, adding a persistent rate-limit store, auditing dependencies, and reviewing database policies and deployment settings. This classroom MVP is not a security certification.

## 10. REST API reference

All responses are JSON. Private endpoints require `Authorization: Bearer <Supabase access token>`.

| Method | Endpoint | Purpose | Auth | Body / query |
|---|---|---|---|---|
| GET | `/api/health` | Check server status | No | None |
| POST | `/api/auth/register` | Create account | No | `{ "fullName": "A Student", "email": "student@example.com", "password": "at-least-8-chars" }` |
| POST | `/api/auth/login` | Sign in | No | `{ "email": "student@example.com", "password": "..." }` |
| GET | `/api/auth/me` | Read current profile | Yes | None |
| GET | `/api/tutors?q=math&level=Beginner` | Search active tutor listings | No | Optional `q`, `level` |
| POST | `/api/tutors` | Publish a listing | Yes | `{ "subject": "C Programming", "level": "Beginner", "availability": "Weekdays after 4 PM", "description": "Loops and functions" }` |
| DELETE | `/api/tutors/:id` | Deactivate your listing | Yes; owner only | None |
| GET | `/api/requests` | List requests involving current user | Yes | None |
| POST | `/api/requests` | Send tutoring request | Yes | `{ "tutorListingId": "UUID", "message": "Help with loops" }` |
| PATCH | `/api/requests/:id` | Accept, decline, or cancel a pending request | Yes; role-dependent | `{ "status": "accepted" }`, `declined`, or `cancelled` |

Typical errors: `400` invalid input, `401` missing/invalid authentication, `403` not allowed, `404` missing record, `409` duplicate/conflicting request, `429` too many authentication attempts, `500` unexpected server/database failure. Error responses use `{ "error": "Friendly explanation" }`.

## 11. Manual testing checklist

1. Open `/api/health`; expect `status: ok`.
2. Register a student with a valid name, email, and password; expect account creation or an email-confirmation message.
3. Sign in; expect the navigation to show the student's first name and sign-out action.
4. Publish a tutor listing; expect it to appear under Find Tutors.
5. Search the subject and select a skill level; expect matching listings only.
6. Register/sign in as a second student and request the first student's listing; expect the request to appear in the second student's outgoing requests and the first student's incoming requests.
7. As the tutor, accept or decline a pending request; expect the status to change.
8. As the learner, cancel a pending request; expect the status to change to cancelled.
9. Try an empty subject, invalid level, too-long description, or invalid email; expect a validation error.
10. Try requesting your own listing; expect rejection.
11. Try updating a request using the wrong account or role; expect `403`.
12. Try sending a duplicate request to the same listing; expect a conflict response.
13. Refresh the browser; tutor listings and requests should still exist because they are stored in PostgreSQL.
14. Test at desktop and mobile widths; forms and cards should adapt to the screen.

## 12. Troubleshooting

- **Missing environment variables:** Check that `backend/.env` exists, has the right names, and contains no surrounding quotes unless required. Restart Node after changing it.
- **Invalid API key / project URL:** Copy values from the correct Supabase project; do not use a database password as an API key.
- **Email confirmation required:** Confirm the email or review the Supabase Auth confirmation setting.
- **Table not found:** Run `database/schema.sql` in the correct project's SQL Editor and verify the three tables.
- **Profile not found:** Check that registration completed and `profiles` has the matching Supabase Auth user UUID.
- **No tutors appear:** Publish a listing from a signed-in account; check that it is active and search filters are not too restrictive.
- **Port already in use:** Change `PORT` in `backend/.env` to another free port, then restart.
- **Server cannot start:** Run `npm install` from `backend/`, confirm Node is version 20+, and read the terminal's first error.
- **401 after waiting:** Sign in again; access tokens expire.

## 13. GitHub upload

Create a new empty repository at https://github.com/ (do not upload `.env`). In a terminal at the project root:

```bash
git init
git status
git add .
git status
git commit -m "Build Peer Tutoring Finder"
git branch -M main
git remote add origin YOUR_GITHUB_REPOSITORY_URL
git push -u origin main
```

Replace `YOUR_GITHUB_REPOSITORY_URL` with the repository URL shown by GitHub. Confirm `backend/.env` and `node_modules/` are not listed by `git status`; `.env.example` should be included. If a secret was committed, `.gitignore` alone is not enough: rotate the exposed key immediately and remove it from repository history as needed.

## 14. Security notes and limitations

- Passwords are managed by Supabase Auth, not stored in the project's own tables.
- The service-role key must remain on the server. Never expose it to the browser or repository.
- Private endpoints validate the Supabase access token and enforce ownership checks.
- The access token is stored in `sessionStorage` for simplicity in this educational MVP; XSS can expose browser storage, so production authentication should be reviewed and hardened.
- RLS is enabled, and there are no direct browser table policies. Database access is through the Express API only.
- Email notifications, scheduling/calendar integration, chat, ratings, payments, and administrative moderation are future enhancements.

## 15. Future improvements

- Add real time-slot booking with conflict prevention.
- Add request notifications and secure student messaging.
- Add tutor ratings and verified campus email status.
- Add pagination, stronger subject search, and accessibility testing.
- Deploy the backend securely and add automated API tests.
