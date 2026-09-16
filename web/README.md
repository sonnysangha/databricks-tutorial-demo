# PapaEats Next.js application

Start with the [complete tutorial](../docs/SETUP.md#8-connect-the-application). Its starter configures the app, notebooks, and job definitions consistently for your workspace.

Use Node.js 24+. In your configured app directory:

```bash
npm ci
npm test
npm run lint
npm run build
npx next dev -p 3017 -H 127.0.0.1
```

Open `http://127.0.0.1:3017`; `APP_ORIGIN` must match. The app requires Databricks SQL for analysis, Lakebase for operational storage, and an app-specific Lakeflow Job for submissions. There is no mock-data fallback.

See [integration details](INTEGRATION.md) for the data flow and permissions.
