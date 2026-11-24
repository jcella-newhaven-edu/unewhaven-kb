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

Run `docker compose up --build` for a local preview on port 3080. Compose initializes a PostgreSQL volume with the schema and sample data, then builds and starts the app. The initialization files run when the PostgreSQL volume is first created.

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
