This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 24 and PostgreSQL 17. Create a local PostgreSQL database, then apply the schema and load the sample content before starting the development server.

```bash
npm ci
export DATABASE_URL='postgresql://<user>:<password>@localhost:5432/<database>'
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/schema.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/dev-seed.sql
npm run dev
```

Next.js also reads `DATABASE_URL` from `.env.local`. Use your actual connection string and keep it out of version control.

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Database and builds

`npm run build` reads PostgreSQL to prerender pages. Apply `db/schema.sql` and load at least one topic and one published article before building. Use the same database at runtime to keep prerendered content and search results consistent.

When transferring existing MongoDB content, use each document's `slug` as the primary key and omit `_id`. Map topic `order` and `parentSlug` to `sort_order` and `parent_slug`, using `NULL` for top-level topics. Map article `topicSlug` and `bodyText` to `topic_slug` and `body_text`. Store the TipTap body as JSON and preserve the `updated` timestamp. PostgreSQL generates the search index data from the article fields.

## Docker

Both Compose services join the external `proxy` network. If it does not already exist, create it once.

```bash
docker network create proxy
```

Give each stack a distinct Compose project name. The database hostname on `proxy` is `<project>-db` and the app hostname is `<project>-app`. A reverse proxy on that network can reach the app at `<project>-app:3000`. Each project has its own PostgreSQL volume.

Create `.env.dev` for development and `.env.prod` for production. Replace the password placeholders with distinct passwords. Set the raw password in `POSTGRES_PASSWORD` and percent-encode any reserved URL characters in the password portion of `DATABASE_URL`. Keep both files out of version control.

`.env.dev`

```dotenv
POSTGRES_DB=knowledge_base_dev
POSTGRES_USER=kb_dev
POSTGRES_PASSWORD='replace-with-dev-password'
DATABASE_URL='postgresql://kb_dev:replace-with-dev-password@unewhaven-kb-dev-db:5432/knowledge_base_dev'
APP_PORT=3080
```

`.env.prod`

```dotenv
POSTGRES_DB=knowledge_base_prod
POSTGRES_USER=kb_prod
POSTGRES_PASSWORD='replace-with-prod-password'
DATABASE_URL='postgresql://kb_prod:replace-with-prod-password@unewhaven-kb-prod-db:5432/knowledge_base_prod'
APP_PORT=3081
POSTGRES_SEED_FILE=./db/prod-seed.sql
```

For production, provide a SQL file at `POSTGRES_SEED_FILE` that loads your content, including at least one topic and one published article for prerendering. Compose applies `db/schema.sql` and the seed when it initializes a new database volume. The default seed is `./db/dev-seed.sql`.

Start each stack with its matching environment file and project name. Run these commands from a shell without exported database or port settings, since Compose gives shell variables precedence over the environment file.

```bash
docker compose --env-file .env.dev -p unewhaven-kb-dev up -d --build
docker compose --env-file .env.prod -p unewhaven-kb-prod up -d --build
```

The app uses host port `APP_PORT`, which defaults to 3080. If you set the project name with `COMPOSE_PROJECT_NAME` instead of `-p`, use that same name in the database hostname in `DATABASE_URL`.

If upgrading a deployment that used the old `postgres` service name, run `docker compose rm --stop --force postgres` with the old configuration and its original project name. Deploy the updated configuration with the same project name so it can reuse the existing `postgres-data` volume. Keep the database, username, and password that the existing volume was initialized with, and update `DATABASE_URL` to use the project's new database hostname.

To build a standalone production image, export `DATABASE_URL` for an initialized database reachable during the build and at runtime.

```bash
docker build --secret id=database_url,env=DATABASE_URL -t unewhaven-kb .
docker run --rm -p 3080:3000 --env DATABASE_URL unewhaven-kb
```

Add `--no-cache-filter builder` to the build command when the database content has changed and you need fresh prerendered pages.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
