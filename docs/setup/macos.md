# macOS Setup

## Prerequisites

- `Xcode Command Line Tools`
- `Homebrew`
- `Node.js 20`
- `PostgreSQL 16`
- `Redis 7`

Install the required packages:

```bash
xcode-select --install
brew install node@20 postgresql@16 redis
brew services start postgresql@16
brew services start redis
```

If `node` is not on your shell path after Homebrew install:

```bash
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

## Database Bootstrap

Create the local database and role:

```bash
createuser -s aeterna || true
createdb -O aeterna aeterna || true
psql -d postgres -c "ALTER USER aeterna PASSWORD 'changeme';"
```

## Project Bootstrap

From the repository root:

```bash
cp .env.example .env
npm run bootstrap
cd server && npx prisma db push && cd ..
```

This installs the root workspace, installs all app dependencies, and generates the Prisma client.

## Install Test

Run the same checks used for local validation:

```bash
npm run install:test
```

If you want the full local verification path:

```bash
npm run verify
```

## Development Servers

Run each app in a separate terminal:

```bash
cd server && npm run dev
```

```bash
cd client && npm run dev
```

```bash
cd admin-dashboard && npm run dev
```

## Health Checks

- Server API: `http://localhost:3000/api/health`
- Client: `http://localhost:5173`
- Admin Dashboard: Vite default port from the admin app

## Notes

- `npm run bootstrap` depends on `server/prisma/schema.prisma`, so run it from the repository root.
- Docker-based staging and production scripts still assume Docker Desktop and additional tooling such as `jq`.
