# Railway autodeploy runbook

Production is Railway project `lattice_animal`, environment `production`,
service `lattice_animal`, domain `latticeanimal-production.up.railway.app`.

Stable IDs:

- Project: `fe7750c0-6fca-4456-80ac-13e97378756d`
- Service: `406500ff-a843-4dc1-abb1-2c9e59ec590e`
- Environment: `1fed76fc-750f-4fb3-9e90-4413aea4357f`

The service deploys from GitHub, not from local uploads. A GitHub-sourced
service deploys when a new commit lands on the linked branch. For this
repo that branch is `main`.

A mapvest-style webhook fallback lives at `.github/workflows/deploy.yml`.
If the `RAILWAY_WEBHOOK` repo secret is set, every push to `main` POSTs
it. If the secret is missing, the workflow exits cleanly and the Railway
GitHub App is the deploy path.

## Expected shape

- GitHub repo: `jawauntb/lattice-animal`
- GitHub branch: `main`
- Config file: `/railway.json`
- Start command: `npm start`

## Repair the branch trigger

```bash
railway service source connect \
  --project fe7750c0-6fca-4456-80ac-13e97378756d \
  --repo jawauntb/lattice-animal \
  --branch main \
  --service lattice_animal \
  --environment production \
  --json
```

A healthy reconnect reports the repo and branch, then Railway should
queue a GitHub-sourced deployment for the latest `main` commit.

## Verify

```bash
git fetch origin main
git rev-parse origin/main

railway deployment list \
  --project fe7750c0-6fca-4456-80ac-13e97378756d \
  --environment production \
  --service lattice_animal \
  --limit 5 --json
```

The accepted deployment should be `SUCCESS`, GitHub-sourced, and match
`origin/main`. If `commitHash` is null while `cliCaller` is present, the
running build came from `railway up` and does not prove the GitHub
trigger is healthy.

Avoid `railway up` for ordinary production deploys. Use it only when
the GitHub App cannot fire (permissions, first connect, emergency).
