# End-to-end test against a real n8n

The unit tests answer with invented data. This test starts a real n8n, puts five workflows on it,
runs them, installs the packaged program in an empty folder and scans the instance with a key that
can only read.

| Workflow | What it does | What a scan has to say |
| --- | --- | --- |
| E2E silent failure | A step that fails every time, set to continue with its regular output | a critical silent error on that step |
| E2E error output, not connected | The same step, set to continue using its error output, which leads nowhere | a critical silent error on that step |
| E2E error output, connected | The same, with the error output connected to a step that handles it | a critical silent error as well: the scan reads what a node produced, not what the rest of the workflow does with it |
| E2E healthy | A step that works | nothing, and the workflow is healthy |
| E2E never run | Switched on and never called | no history, so nothing is judged |

It also checks what the scan relies on from the API: the list of workflows, the type of each node,
the runs with their status and times, and what each node produced in a run. These are what could
change between versions of n8n, which is why the test runs on more than one.

The checks that depend on the passing of time (drift, silence and frequency drop) are not part of
this test, because a fresh instance has no history to judge. They are covered by the unit tests
with invented histories, and by the synthetic instance in `examples/`.

## Running it

The CI does this for each version listed in `.github/workflows/e2e.yml`. To do it by hand you need
Docker and the package:

```bash
npm ci
npm run build
node scripts/check-package.mjs --out /tmp/greenlight-package

docker run --detach --name n8n --publish 127.0.0.1:5678:5678 \
  --env N8N_DIAGNOSTICS_ENABLED=false --env N8N_SECURE_COOKIE=false n8nio/n8n:2.45.7

node e2e/run.mjs --url http://127.0.0.1:5678 --package /tmp/greenlight-package/greenlight-n8n-*.tgz --n8n 2.45.7
docker rm --force n8n
```

The test creates a user, two keys and the workflows on the instance it is given, so it refuses any
address that is not on this machine (`guard.mjs`). Use an instance you can throw away, never one
that has your workflows in it.
