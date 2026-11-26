# FormFlow

A simple green-and-white page for adding a user with an email and password. A successful submission displays **User added.** Passwords are stored as scrypt hashes.

## Run the backend

Start PostgreSQL, then from `backend/` run:

```sh
npm install
npm start
```

The backend uses `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` for the database connection. The frontend is served by Nginx and forwards `/api/` requests to the backend.
