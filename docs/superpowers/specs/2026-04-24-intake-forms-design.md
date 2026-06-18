# Intake Forms — Design Spec

**Date:** 2026-04-24
**Status:** Design
**Feature area:** Patient dossier — intake questionnaires

---

## 1. Purpose

Let care providers build reusable intake questionnaires, assign them to clients, and collect responses that attach to the client's profile. First increment of the broader "extended patient dossier" feature.

## 2. User stories

**As a care provider, I want to:**
- Build a questionnaire once and reuse it across many clients (e.g. "Adult intake", "Couples intake").
- Edit the questionnaire later (reword, add/remove questions) without corrupting intake records I've already collected.
- Assign a questionnaire to a specific client, at onboarding or later.
- See which clients have open, in-progress, or completed forms.
- Read the client's answers on their profile.

**As a client, I want to:**
- See the forms my care provider has asked me to fill in.
- Fill them out at my own pace — save progress and come back.
- Edit my own answers later if something changes.

## 3. Scope

**In scope (v1):**
- Questionnaire **template** CRUD with a builder UI.
- Five question types: number, single-select (radio), multi-select (checkbox), plain text, date.
- Per-question required/optional flag.
- Per-template category tag (freeform, e.g. "adult", "couples") so providers can group templates.
- Assignment of a template to a client. On assign, a **frozen snapshot** of the template is copied onto the assignment.
- Client-side fill-out with **draft + resume** (status: `not_started` → `in_progress` → `completed`).
- Response editing: client edits their own answers any time (even after submitting). Provider cannot overwrite client answers.
- Integration surfaces:
  - Provider: `Settings → Intake Forms` (template library) + "Intake" tab on each client's profile (assignments + answers).
  - Client: banner on dashboard when a form is pending + "Intake" tab on own profile.

**Out of scope (v1):**
- Template versioning / migrating answers between versions (Approach 3 — not needed since we use snapshots).
- Scoring rules (e.g. auto-calculated PHQ-9 total).
- Branching logic (conditional "if answer to Q2 is yes, show Q3").
- Locking responses after submit.
- Cross-client analytics / aggregation of answers.
- Therapist-only sections within a form.
- PDF export.

## 4. Design approach

**Approach 2 — Immutable snapshots.**
When a provider assigns a template to a client, the full question list is copied into the assignment row as JSONB. Later edits to the template only affect future assignments. Existing clients' forms remain exactly as they were handed out.

Trade-off accepted: a small duplication of data is worth the clinical accuracy guarantee (no retroactive changes to what a patient was asked).

## 5. Data model

Four new tables, all in `public` schema.

### `questionnaire_templates`
The blank form. Editable at any time.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | default `gen_random_uuid()` |
| `therapist_id` | uuid FK → `profiles(id)` | owner |
| `title` | text | e.g. "Adult intake" |
| `description` | text nullable | shown to the client before starting |
| `category` | text nullable | freeform tag, e.g. "adult", "couples", "addiction" |
| `is_published` | boolean, default false | `false` = draft, hidden from assign menus |
| `created_at`, `updated_at` | timestamptz, default `now()` | |

### `questionnaire_questions`
Individual questions inside a template. Normalized so the builder can edit in place.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `template_id` | uuid FK → `questionnaire_templates(id)` ON DELETE CASCADE | |
| `question_text` | text | |
| `help_text` | text nullable | optional subtext under the question |
| `question_type` | text | CHECK in (`number`, `radio`, `checkbox`, `text`, `date`) |
| `options` | jsonb nullable | for `radio` / `checkbox`: `[{id, label}]` |
| `is_required` | boolean, default false | |
| `position` | integer | sort order within template |
| `config` | jsonb nullable | optional per-type config, e.g. `{min: 1, max: 10}` for number |
| `created_at`, `updated_at` | timestamptz | |

### `client_questionnaires`
One row per assignment. The snapshot lives here.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `client_id` | uuid FK → `profiles(id)` | |
| `therapist_id` | uuid FK → `profiles(id)` | assigner |
| `template_id` | uuid FK → `questionnaire_templates(id)` ON DELETE SET NULL | reference only; snapshot is authoritative |
| `title_snapshot` | text | |
| `description_snapshot` | text nullable | |
| `questions_snapshot` | jsonb | the full question list at assignment time |
| `status` | text | CHECK in (`not_started`, `in_progress`, `completed`), default `not_started` |
| `assigned_at` | timestamptz, default `now()` | |
| `started_at` | timestamptz nullable | |
| `completed_at` | timestamptz nullable | |
| `created_at`, `updated_at` | timestamptz | |

`questions_snapshot` JSONB shape mirrors `questionnaire_questions` rows, with a stable `id` per question so responses can reference them.

### `questionnaire_responses`
One row per answered question per assignment.

| column | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `client_questionnaire_id` | uuid FK → `client_questionnaires(id)` ON DELETE CASCADE | |
| `question_id` | text | matches `id` inside `questions_snapshot` |
| `answer` | jsonb | shape depends on type (see below) |
| `updated_at` | timestamptz, default `now()` | |
| `UNIQUE(client_questionnaire_id, question_id)` | | one response per question per assignment |

**Answer shapes per type:**
- `number` → `{"value": 7}`
- `radio` → `{"optionId": "opt_2"}`
- `checkbox` → `{"optionIds": ["opt_1", "opt_3"]}`
- `text` → `{"value": "free text"}`
- `date` → `{"value": "2026-03-14"}` (ISO date string)

### RLS policies

- `questionnaire_templates` / `questionnaire_questions`: readable + writable only by the owning `therapist_id`. Admin override via `is_admin_user()`.
- `client_questionnaires`: readable by both the `client_id` and `therapist_id`. Insert/update by the `therapist_id` (except status fields auto-bumped by RPC when the client touches responses — see below).
- `questionnaire_responses`: readable by both `client_id` and `therapist_id` of the parent assignment. Insert/update only by the owning `client_id`.

### Indexes
- `(therapist_id, is_published)` on templates
- `(template_id, position)` on questions
- `(client_id, status)` on assignments
- `(therapist_id, status)` on assignments
- `(client_questionnaire_id)` on responses (already covered by FK, but add a partial index on unanswered required questions if the UI needs it)

## 6. RPCs

- `assign_questionnaire(p_template_id uuid, p_client_id uuid) RETURNS uuid` — SECURITY DEFINER. Verifies the caller owns the template + has a client relationship, reads published template + its questions, builds the snapshot, inserts `client_questionnaires` row, returns new assignment id. Atomic.
- `upsert_questionnaire_response(p_assignment_id uuid, p_question_id text, p_answer jsonb) RETURNS void` — SECURITY DEFINER. Caller must be the `client_id` of the assignment. Rejects if `p_question_id` is not present in `questions_snapshot`. Upserts the response row, and bumps the assignment's `status` from `not_started` to `in_progress` + sets `started_at` on first call.
- `submit_questionnaire(p_assignment_id uuid) RETURNS void` — SECURITY DEFINER. Caller must be the `client_id`. Validates all required questions have responses, sets `status = 'completed'` + `completed_at = now()`. Returns an error listing missing required questions if any.

## 7. UI

### 7.1 Provider — template builder

Layout: **inline cards** (Google Forms style).
- Settings → Intake Forms → list of templates (title, category, status badge `Published` / `Draft`, last updated).
- "New template" button → blank builder.
- Builder:
  - Top: title input, category input, description textarea, "Publish" toggle, "Delete" button.
  - Body: vertical list of question cards. Each card is collapsed by default, showing `{position}. {text} [Type badge] [Required badge]`. Clicking expands it for editing.
  - Drag handle (`⋮⋮`) on each card for reorder — updates `position` on drop.
  - "+ Add question" button at the bottom, opens a type picker (Number / Radio / Checkbox / Text / Date) then a fresh expanded card.
  - Auto-save debounced on every edit (~500ms). Visible "Saved ✓" indicator.

### 7.2 Provider — client profile "Intake" tab

New tab on `ClientProfile.tsx`, after existing tabs.
- Top: "Assign form" button → opens a modal listing published templates owned by the provider. Click one → call `assign_questionnaire`, close modal, refresh list.
- List of assignments for this client: each row shows title, status badge, assigned date, "View answers" button. Completed rows show `completed_at`.
- "View answers" opens a read-only rendering of the snapshot with the client's responses filled in.

### 7.3 Client — dashboard banner

If the client has any `not_started` or `in_progress` assignments, show a banner at the top of `ClientDashboard.tsx`:
> 📋 You have N intake form(s) to fill in. [Open →]

Clicking "Open" routes to the client's Intake tab.

### 7.4 Client — own profile "Intake" tab

New route `/intake` in the client's navigation (sidebar entry added under "Quick Access"). List lives there rather than embedded in their profile page, because the profile page is about identity/settings while Intake is task-like.
- List of assigned forms with status.
- Click a form → fill-out view:
  - One question per "card" rendered by type. Required questions marked with `*`.
  - "Save & close" button at any time — persists draft, closes.
  - "Submit" button at bottom — calls `submit_questionnaire`. If required questions are missing, shows inline errors.
  - After completion, client can still reopen and edit any answer (which bumps status back to `in_progress` on edit, back to `completed` on re-submit).

## 8. Integration & routing

- Provider: add `Intake Forms` entry under existing Settings area, route `/settings/intake-forms` (list) and `/settings/intake-forms/:id` (builder).
- Client profile: add "Intake" tab in the existing tabbed layout on `/clients/:id` (provider) and on the client's own profile view.
- No new top-level nav item. No impact to existing Sessions / Tasks / Journals navigation.

## 9. Edit semantics (who can change what)

| Action | Provider | Client |
|---|---|---|
| Create / edit / delete **template** | ✓ | ✗ |
| Add / remove / reorder **questions** | ✓ | ✗ |
| Assign a template to a client | ✓ | ✗ |
| Edit the **snapshot** on a live assignment | ✗ | ✗ (frozen) |
| Write / edit **responses** | ✗ | ✓ |
| Submit / re-submit | ✗ | ✓ |
| Delete an assignment | ✓ | ✗ |

## 10. Error handling

- Builder: auto-save retries on network failure; shows explicit "Save failed — retrying" banner if >1 attempt fails.
- Assign: if caller is not the template owner or not related to the client, RPC returns error; UI shows "Not allowed".
- Response upsert: if assignment status is not `not_started` or `in_progress`, allow anyway (edits permitted post-completion) but do not rewrite `completed_at`.
- Submit: on missing required questions, UI jumps to the first missing question and highlights it.

## 11. Testing approach

- **Unit:** RPC SQL — snapshot contents match template at assign time, snapshot untouched by template edits after the fact, `submit_questionnaire` rejects incomplete required sets.
- **Integration:** E2E via Playwright:
  - Provider creates template, publishes, assigns to a client.
  - Client logs in, sees banner, fills answers across all 5 question types, saves draft, returns, submits.
  - Provider re-opens template, edits a question, confirms the already-assigned client's form is unchanged.
  - Client re-opens completed form, edits an answer, re-submits.
- **RLS:** negative tests — provider B cannot see provider A's templates or any of their assigned forms; clients cannot see other clients' assignments.

## 12. Implementation order (suggested sprint slicing)

1. Migration: 4 new tables + RLS + 3 RPCs + indexes.
2. Provider template library page (list + create + delete) with stub builder.
3. Builder page — inline card UI, all 5 question types, drag reorder, auto-save.
4. Assign modal on client profile + assignments list tab.
5. Client fill-out view with draft+resume + submit validation.
6. Client dashboard banner + own-profile Intake tab.
7. E2E tests.

## 13. Open questions (for implementation plan to resolve, not blockers for spec)

- Exact shape of the type picker UI on "+ Add question" (dropdown vs modal).
- Translations — existing `i18next` keys; intake-specific strings go under a new `intake_forms` namespace.
- Should `category` be a freeform text input or a dropdown sourced from existing categories? (Spec allows freeform for v1; UI can offer autocomplete over existing distinct values.)
- Should the "Assign form" modal also prefilter templates by `category`? (Nice-to-have.)
