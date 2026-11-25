This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

Use Node.js 24 and PostgreSQL 19. Create a local PostgreSQL database, then apply the schema and load the sample content before starting the development server.

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

`npm run build` reads PostgreSQL to prerender published pages. Apply `db/schema.sql` before building, and use the same database at runtime to keep prerendered content and search results consistent.

When transferring existing MongoDB content, use each document's `slug` as the primary key and omit `_id`. Map topic `order` and `parentSlug` to `sort_order` and `parent_slug`, using `NULL` for top-level topics. Map article `topicSlug` and `bodyText` to `topic_slug` and `body_text`. Store the TipTap body as JSON and preserve the `updated` timestamp. PostgreSQL generates the search index data from the article fields.

## Docker

Both Compose services join the external `proxy` network. If it does not already exist, create it once.

```bash
docker network create proxy
```

Give each stack a distinct Compose project name. The database hostname on `proxy` is `<project>-db` and the app hostname is `<project>-app`. A reverse proxy on that network can reach the app at `<project>-app:3000`. Each project uses its own `<project>_postgres-19-data` volume, mounted at `/var/lib/postgresql`.

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

For production, set `POSTGRES_SEED_FILE` to a SQL file that loads your initial topics and any articles you want to publish. The article editor uses existing topics. Use a path relative to the repository root and include the file in the Docker build context. For Git-based deployments, include the file in the branch that the deployment checks out. The default seed is `./db/dev-seed.sql`.

Compose builds the PostgreSQL image from `db/Dockerfile` with the schema, selected seed, and admin migration. PostgreSQL runs these files when it initializes a fresh database volume. Rerun the matching `up -d --build` command below to package SQL changes for future fresh volumes.

Start each stack with its matching environment file and project name. Run these commands from a shell without exported database or port settings, since Compose gives shell variables precedence over the environment file.

```bash
docker compose --env-file .env.dev -p unewhaven-kb-dev up -d --build --wait
docker compose --env-file .env.prod -p unewhaven-kb-prod up -d --build --wait
```

The app uses host port `APP_PORT`, which defaults to 3080. If you set the project name with `COMPOSE_PROJECT_NAME` instead of `-p`, use that same name in the database hostname in `DATABASE_URL`.

### Nginx Proxy Manager

Attach Nginx Proxy Manager to the same external `proxy` Docker network as the app. For a project named `dev-knowledge-base`, use these settings in its Proxy Host. [Nginx Proxy Manager networking](https://nginxproxymanager.com/advanced-config/)

| Proxy Host setting | Value |
| --- | --- |
| Forward Scheme | `http` |
| Forward Hostname / IP | `dev-knowledge-base-app` |
| Forward Port | `3000` |

Use `<project>-app` for other project names. Configure public HTTPS in the Proxy Host's SSL tab. If Nginx Proxy Manager runs on a separate Docker host, use the app host's reachable IP and the stack's published `APP_PORT` instead.

Next.js builds its pages before listening, so requests can return 502 during startup. The `--wait` option waits for the Compose health checks to pass. If 502 persists, check the application logs and confirm the proxy can reach the upstream. Set `NPM_CONTAINER` to the name of your Nginx Proxy Manager container.

```bash
docker logs --tail 80 dev-knowledge-base-nextjs-1
docker exec "$NPM_CONTAINER" curl --fail --verbose --max-time 5 http://dev-knowledge-base-app:3000/
```

If the app reports `Ready` and the hostname fails to resolve from the proxy, inspect the `proxy` network to confirm both containers are attached.

### Standalone image

To build a standalone production image, export `DATABASE_URL` for an initialized database reachable during the build and at runtime.

```bash
docker build --secret id=database_url,env=DATABASE_URL -t unewhaven-kb .
docker run --rm -p 3080:3000 --env DATABASE_URL unewhaven-kb
```

Add `--no-cache-filter builder` to the build command when the database content has changed and you need fresh prerendered pages.

## Knowledge base administration

Open `/admin` to sign in with Microsoft. The knowledge base creates or updates the account in PostgreSQL at successful sign-in. It identifies each account by its Entra tenant ID and object ID, and reads permissions from the Entra ID token.

| Entra app role value | Permissions |
| --- | --- |
| `KB.Editor` | Create and edit articles and topics, change article URLs, save drafts, publish and unpublish |
| `KB.Admin` | All editor permissions plus delete articles and topics |

Article URLs are set in the editor. When an article URL changes, update links that used its previous URL. Use **Topics** in the admin navigation to manage topics and subtopics. Before deleting a topic, reassign its articles and move or delete its subtopics.

In Microsoft Entra, create a single-tenant app registration. Add a **Web** redirect URI ending in `/api/admin/auth/callback` and create the two app roles above with **Users/Groups** as the allowed member type. Assign users or groups to those roles in the associated enterprise application. For separate dev and prod stacks, register their exact redirect URIs and use the matching origin in each stack. [Microsoft Entra app role setup](https://learn.microsoft.com/en-us/entra/identity-platform/howto-add-app-roles-in-apps)

Set these server-side variables in the stack or in `.env.local` for local development. Compose passes them to the app at runtime.

| Variable | Value |
| --- | --- |
| `ADMIN_ORIGIN` | The public origin, such as `https://kb.example.edu`, or `http://localhost:3000` for local development |
| `ENTRA_TENANT_ID` | The directory (tenant) ID |
| `ENTRA_CLIENT_ID` | The application (client) ID |
| `ENTRA_CLIENT_SECRET` | The client secret value from the app registration |

For example, the redirect URI for `https://kb.example.edu` is `https://kb.example.edu/api/admin/auth/callback`. Forward the public host and protocol through your reverse proxy so browser requests and server actions use the same origin.

For an existing database, apply the admin migration once before signing in. The migration can be run again safely.

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f db/migrations/001-admin-auth.sql
```

For an existing Compose deployment, rebuild the database image and run the included migration using the same environment file and project name as the running stack.

```bash
docker compose --env-file .env.dev -p unewhaven-kb-dev up -d --build
docker compose --env-file .env.dev -p unewhaven-kb-dev exec -T unewhaven-kb-db sh -c \
  'psql -X -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f /docker-entrypoint-initdb.d/03-admin-auth.sql'
```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
