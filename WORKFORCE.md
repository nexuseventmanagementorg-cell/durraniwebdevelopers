# Local AI Workforce and Template Production

## What is implemented

- Each batch creates work for all 50 registered workforce roles. Four roles use the concept/template/static-QA pipeline; the other 46 each run their own role-specific local Ollama request and save a reviewable summary, recommendations, and open questions in the batch state.
- The specialist briefs are drafts for human review, not proof of market research or real-world execution. Roles that normally contact people, book appointments, handle billing, or use external services produce offline recommendations only. They do not contact customers, spend money, change production, or deploy.
- A local Ollama provider discovers installed models and uses only the model selected in the authenticated admin page. It does not fall back to a cloud provider.
- A local worker queues one idempotent daily batch for the current Asia/Karachi date, with a default schedule of 09:00.
- Each successful batch uses the selected local model to create five distinct business concepts, run the 46 role-specific specialists, and generate Starter, Business, and Enterprise static-site editions for each concept. The additional Ollama requests mean a full 50-role batch takes longer than the previous four-role workflow.
- Each edition includes its source files, feature matrix, manifest, and static QA report. Browser smoke testing is explicitly marked NOT RUN.
- Batch state, all specialist outputs, retry count, task statuses, and events persist in `D:\website-projects-backup\Durrani_AI-Agents\state.json` by default. Generated projects are stored in `D:\website-projects-backup\Durrani_AI-Agents\generated-templates\`. Set `WORKFORCE_DATA_DIR` to use another local folder. Neither local data nor generated output is committed by default.
- Generated preview routes require an admin session and are disabled on Vercel. Production deployment is not part of this workflow.

The generated sites are static front-end drafts. Their contact form is a demonstration only. They do not include a connected database, payment, booking, authentication, or other production backend. The existing Gemini Requirements Analyst remains separate; this workforce batch does not call Gemini or any other cloud model.

## Windows setup

1. Install and start Ollama on the Windows PC. Confirm it responds at `http://127.0.0.1:11434`.
2. Pull or install a model through Ollama, then start the website:

   ```powershell
   cd D:\website-projects-backup\durrani-web-developers
   npm.cmd run dev
   ```

3. Sign in to the local admin area and open `/admin/workforce`.
4. Select an installed Ollama model. The selection and all batch outputs are persisted under `D:\website-projects-backup\Durrani_AI-Agents\`.
5. In a second PowerShell terminal, start the worker:

   ```powershell
   cd D:\website-projects-backup\durrani-web-developers
   npm.cmd run workforce:worker
   ```

6. Use **Run Today's Batch** in the admin page, or leave the worker running for the daily schedule. The first schedule check after 09:00 Asia/Karachi queues that date's batch. If the PC was offline for an earlier date, that date is logged as missed; only the current date is eligible for catch-up.
7. To perform one-off capability checks against an already-completed five-concept batch, run `npm.cmd run workforce:activate` in a separate terminal. These checks are recorded in `agent-readiness.json` and are not batch-task completions or proof that all roles independently build a complete website.

Optional local settings:

```powershell
$env:OLLAMA_BASE_URL = "http://127.0.0.1:11434"
$env:OLLAMA_MODEL = "an-installed-model-name"
$env:WORKFORCE_SCHEDULE_TIME = "09:00"
# Optional override; defaults to D:\website-projects-backup\Durrani_AI-Agents
$env:WORKFORCE_DATA_DIR = "D:\website-projects-backup\Durrani_AI-Agents"
# Only needed if running the local Next.js app with NODE_ENV=production; ignored on Vercel.
$env:WORKFORCE_LOCAL_ENABLED = "true"
npm.cmd run workforce:worker
```

Do not set provider credentials in client-side environment variables. The batch worker refuses to use non-loopback Ollama URLs and refuses to run on Vercel.

## Inquiry-specific website build test

`npm.cmd run workforce:inquiry` runs a separate, bounded local workflow for the explicitly authorized DW-944529 sample-project test. It executes Fashion UX Designer, Ecommerce Architect, Storefront Coder, Admin Dashboard Coder, and QA Reviewer tasks in sequence. Planning and QA default to `OLLAMA_MODEL`; the two coding tasks use `OLLAMA_CODER_MODEL` when set. Each task records its actual model and lifecycle in `agent-run.json`.

### Current DW-944529 run status (2026-10-28)

- Agency app is deployed on Vercel Production from GitHub commit `da7e3c96b465811adc7c042d801840d8614d53c9`. The hosted `/admin/workforce` page is available, but worker execution/artifacts require the local Windows PC; the Vercel API intentionally reports local-only and does not connect to Ollama.
- Latest run `agent-build-2026-10-27T22-21-11-980Z-16740` failed; it is not a completed website. The designer and architect completed with `llama3:latest`. The storefront coder (`qwen2.5-coder:7b`) failed after three attempts: the generated storefront did not pass product catalog and explicit international 2x price disclosure checks. Admin Dashboard Coder and QA Reviewer were not run.
- Current `ollama list` shows `llama3:latest` and `qwen2.5-coder:7b`; `qwen2.5-coder:14b` is not installed. Check available D: space and model status before any large pull.
- Run record and rejected attempt files are under `D:\website-projects-backup\Durrani_AI-Agents\projects\DW-944529-ahlam-collections-preview\agent-generated-store\agent-build-2026-10-27T22-21-11-980Z-16740\`. The top-level `latest-agent-run.json` points to this failure.
- Next: install/confirm a stronger local coding model if appropriate, then run `npm.cmd run workforce:inquiry` with `OLLAMA_MODEL=llama3:latest` and `OLLAMA_CODER_MODEL` set to the model that `ollama list` confirms. Do not mark the site ready until all five role tasks and acceptance/QA checks pass. The separate hand-authored preview is not an agent deliverable.
- The approval-triggered inquiry watcher, verified advance gate, live commerce integrations, local image generation, production deployment, and GitHub publishing are not implemented.

Install a local coding model with Ollama first, then run:

```powershell
ollama pull qwen2.5-coder:7b
$env:OLLAMA_MODEL = "llama3:latest"
$env:OLLAMA_CODER_MODEL = "qwen2.5-coder:7b"
npm.cmd run workforce:inquiry
```

Generated artifacts and rejected attempts are saved under `D:\website-projects-backup\Durrani_AI-Agents\projects\DW-944529-ahlam-collections-preview\agent-generated-store\`. The run fails rather than reporting completion if required deterministic checks or QA blockers remain. A completed run produces self-contained local `index.html` and `admin.html` review prototypes; it is not a production ecommerce backend, and does not connect to payments, customer storage, live FX, courier APIs, or production deployment. This test workflow is manually invoked; it is not yet an approval-triggered inquiry watcher or a general-purpose autonomous agency.

## Batch controls and recovery

- The admin page supports queueing, pausing, resuming, cancellation, retrying failed batches (maximum three attempts), model selection, and a concurrency limit from one to three concepts.
- The role registry refreshes every three seconds and separates **capability check** from **batch task** status. A passed one-off check is not labeled as task completion. Task cards show queued, running, completed, failed, or cancelled; **Delivered** is shown only when the system records a completed task's artifact handoff to a receiving role.
- Schedule enablement and the local-time daily start (default 09:00 Asia/Karachi) are configurable in the same admin page.
- A unique batch ID based on the Pakistan calendar date prevents a second daily batch. Repeated start requests return the existing batch instead of duplicating it.
- If the worker process is stopped mid-run, a run older than two hours is recovered on the next worker start; retries remain bounded.
- The worker is an explicitly launched process. For unattended Windows scheduling, configure Windows Task Scheduler to start `npm.cmd run workforce:worker
```

For a one-time local integration test, the worker supports an explicit one-shot mode that queues today's idempotent batch and exits after processing it:

```powershell
$env:OLLAMA_MODEL = "an-installed-model-name"
npm.cmd run workforce:worker -- --once --start-today` at user sign-in, with **Start only if the computer is available** and **Do not start a new instance** enabled. A powered-off PC cannot guarantee daily delivery.
- State and output use local disk, not Supabase. Back up the configured workforce data folder using the PC's normal backup process.

## QA evidence and limitations

The worker checks required files, title/description metadata, in-page navigation targets, and JavaScript syntax with `node --check`. It records the results in per-edition `qa-report.json` and the batch `batch-report.json`. Browser smoke tests, dependency installation, package builds, external link checks, image generation, and production deployment are not claimed or run for these dependency-free static projects.

The generated websites remain safe, self-contained static concept templates. This is not yet a general-purpose code-writing agent, isolated package-install/build sandbox, CMS/Shopify generator, cloud preview service, or automatic GitHub/Vercel release system. The dashboard labels the one-off Ollama result as a capability check, shows batch task lifecycle independently, and records task delivery only when a configured downstream role actually receives the completed task's artifact.
