# AI Console v1.4.0 — Full Technical Specification

> **Specification status:** AUTHORITATIVE TARGET — IMPLEMENTATION EXISTS; VERIFICATION IS TRACKED SEPARATELY  
> **Baseline:** AI Console v1.3.1 Premium UI & Document Studio  
> **Target:** AI Console v1.4.0 — Document Studio Pro & Premium Android UX  
> **Authority:** Explicit current user scope + preserved non-conflicting v1.3.1 requirements  
> **Important:** This document defines the authorised v1.4.0 target. Implementation and verification status are recorded separately; this specification does not by itself claim APK build, signing, device, accessibility, or live-provider acceptance.


## 1. Target architecture

AI Console v1.4.0 retains the Expo/React Native Android-first architecture and the v1.3.1 separation between native presentation/device APIs and deterministic domain modules. The principal architectural change is the addition of a first-class **Documents domain**, a unified **interaction/design system**, and a responsive navigation shell capable of compact/medium/expanded compositions.

### 1.1 Target layer model

| Layer | Target responsibilities |
|---|---|
| App/navigation shell | Primary domains, adaptive navigation, Android back stack, keyboard/IME policy, transient overlay coordination. |
| Design system | Tokens, typography, surfaces, state styles, motion, responsive breakpoints, shared interactive components. |
| Conversation domain | Existing stable chats/messages/branches/workflows/organisation/offline drafts, preserved and regression protected. |
| Generation runtime | Existing per-chat generation job model; expose observable UI state and navigation-safe status. |
| Workspace domain | Existing workspace relationships plus fully wired rename and document membership/indexing. |
| Documents domain | Document schema, sections, templates, revisions/snapshots, comparison, autosave state, composition settings. |
| Export/import domain | PDF/MD/TXT/HTML/DOCX-capable pipeline, document-project archive, workspace archive and safe validation. |
| Persistence/privacy | Versioned state migration, transactional restore/import, SecureStore results, privacy sanitisation. |
| Native integrations | DocumentPicker, FileSystem, Print, Sharing, SecureStore, speech recognition, haptics/accessibility APIs as applicable. |
| Verification | Unit/domain tests, failure injection, component/workflow tests, CI and physical Android acceptance evidence. |

## 2. Navigation and screen model

### 2.1 Primary destinations

`Chats`, `Workspaces`, `Documents`, `Settings` are first-class destinations. Protected AI & Prompt Settings remains a gated subordinate route/sheet, not a primary ordinary destination.

### 2.2 Compact composition

- Bottom navigation or equivalent thumb-reachable primary navigation.
- One principal content pane.
- Contextual controls delivered through top app bar, long-press and bottom sheets.
- Document outline/properties exposed as sheets/drawers rather than permanently consuming width.

### 2.3 Medium composition

- Navigation rail when width permits.
- Two-pane layouts for useful list/detail relationships.
- Chats may present conversation list + active conversation where practical.
- Documents may present document list/outline + editor.

### 2.4 Expanded composition

- Persistent navigation rail/sidebar.
- Multi-pane productivity layouts.
- Document Studio target: `Document browser | Editor canvas | Outline/properties`.
- Chat target: optional conversation/workflow list + conversation canvas + contextual detail pane when useful.

### 2.5 Back-stack resolution

The shell SHALL resolve Android Back in this order:
1. close contextual menu;
2. close bottom sheet;
3. close dialog/modal;
4. exit nested document/manager subview;
5. navigate to previous app destination/state;
6. allow OS exit only when no app-level transient/nested state remains.

Unsaved document changes or in-flight destructive operations SHALL interpose an explicit safe decision rather than silently discarding state.

## 3. Design system

Create `src/ui/` (or an equivalent project-consistent location) containing central tokens and primitives.

### 3.1 Token families

- colour/surface semantics for the authorised light appearance;
- typography roles and scalable line heights;
- spacing scale;
- border/radius/elevation/shadow tokens;
- icon sizes/strokes;
- touch target minimums;
- animation durations/easing with reduced-motion variants;
- compact/medium/expanded breakpoints;
- semantic state tokens: info/success/warning/error/disabled/selected/focused.

### 3.2 Shared components

At minimum create/refactor shared primitives for:
- Button / IconButton;
- TextField / MultilineField / SearchField;
- Select/Picker entry;
- Card/ListRow/MetadataRow;
- Chip/Tag;
- AppBar;
- BottomSheet/ActionSheet;
- Dialog;
- Snackbar/Toast/Banner;
- EmptyState/Skeleton/Progress;
- MessageBubble/MessageActionSheet;
- AttachmentCard;
- DocumentCard;
- DocumentToolbar;
- AccessibleReorderControls.

Every primitive SHALL expose accessible labels/roles/states and deterministic disabled/loading/error semantics.

## 4. Conversation UI integration

### 4.1 Message action migration

Existing message actions SHALL remain functionally available but move from persistent dense action-chip clutter to contextual presentation. A minimal immediately useful set may remain visible; the full valid set SHALL be available via long press/action sheet.

Role/state rules:
- user message: copy, quote, edit/resubmit, branch, share/export, add to document, delete as authorised;
- assistant message: copy, Markdown copy, quote, regenerate/retry where valid, branch, bookmark, share/export, add to document, delete as authorised;
- generating message/job: stop status/actions appropriate to the active job only.

### 4.2 Generation state contract

Expose an observable view model per active job:
`IDLE | PREPARING | GENERATING | STREAMING | STOPPING | STOPPED | FAILED | COMPLETE | OFFLINE_DRAFT`.

The UI SHALL distinguish `Retry` (repeat failed operation) from `Regenerate` (create a new assistant branch from a valid prompt lineage). Navigation SHALL not discard active job state; stale callbacks remain rejected by request identity.

### 4.3 Feedback channel

Implement a single feedback coordinator capable of:
- ephemeral toast;
- actionable snackbar with optional undo/retry;
- persistent warning/error banner;
- accessibility announcement.

Domain failures SHALL return typed results rather than being swallowed.

## 5. Workspace model changes

Preserve current workspace schema fields and add only the minimum fields needed to index documents cleanly, preferably deriving membership where possible to avoid stale duplicated relationships.

Workspace manager SHALL wire:
- create;
- select;
- rename;
- archive/unarchive;
- delete with fallback movement rules;
- notes;
- project export/import;
- document navigation/association.

Rename validation SHALL reject empty/invalid names and persist durably before presenting terminal success.

## 6. Documents domain data model

A recommended schema shape is:

```text
Document {
  documentId: string
  workspaceId: string
  title: string
  status: ACTIVE | ARCHIVED
  templateId?: string
  createdAt: ISO timestamp
  updatedAt: ISO timestamp
  revisionHeadId?: string
  composition: {
    pageSize: A4 | LETTER | ...
    orientation: PORTRAIT | LANDSCAPE
    margins: { top, right, bottom, left }
    coverPage: {...}
    header: {...}
    footer: {...}
    pageNumbers: {...}
    toc: {...}
  }
  metadata: {...non-secret user document metadata...}
  sections: Section[]
}

Section {
  sectionId: string
  type: HEADING | PARAGRAPH | LIST | QUOTE | CODE | PAGE_BREAK | ...
  level?: number
  content: string / structured safe payload
  orderKey: string|number
}

DocumentRevision {
  revisionId: string
  documentId: string
  createdAt: ISO timestamp
  label?: string
  reason: AUTOSAVE | MANUAL | SNAPSHOT | RESTORE | IMPORT
  snapshot: privacy-safe serialised document
  parentRevisionId?: string
}
```

Implementation MAY choose an equivalent normalized model, but stable IDs, deterministic ordering, migration and privacy requirements are mandatory.

## 7. Document editor architecture

### 7.1 Editing strategy

Prefer deterministic structured state rather than storing uncontrolled rendered HTML. Markdown-compatible source/blocks SHALL remain serialisable, diffable, exportable and safe.

### 7.2 Autosave state machine

`CLEAN → DIRTY → SAVING → SAVED` or `SAVE_FAILED`.

Rules:
- debounce routine autosaves;
- explicit save/snapshot can force immediate durable write;
- only successful durable write sets `SAVED`;
- navigation from `DIRTY`/`SAVE_FAILED` must preserve state or require a decision;
- persistence error enters shared feedback/accessibility channel.

### 7.3 Reordering

Drag-and-drop MAY be provided visually, but Up/Down/Move-to-position actions MUST provide an accessible alternative and use the same domain reorder operation.

### 7.4 Revision compare

Comparison SHOULD operate at section level first, then text diff within matched sections. It SHALL present additions, removals and changed sections legibly and SHALL not alter content until an explicit restore/apply action.

## 8. Template system

Templates SHALL be local deterministic definitions containing:
- stable template ID;
- display name/category;
- initial section structure;
- default composition metadata;
- optional placeholder hints.

Initial templates: General Report, Technical Specification, Audit Report, Implementation Plan, Memorandum, Proposal, Formal Letter.

Template application creates a normal editable document and does not retain a hidden privileged execution pathway.

## 9. Chat-to-document integration

`Add to document` SHALL open a contextual target picker:
1. current workspace document list;
2. create new document;
3. insert target: append / before section / after section / replace selected section where applicable.

Visible message content is the default transferred payload. Hidden `apiContent`, attachment extraction context and provider secrets remain excluded.

AI-assisted document generation SHALL call the existing provider/generation infrastructure using the active authorised protected configuration; no new provider/config surface is introduced.

## 10. Document rendering/export pipeline

### 10.1 Canonical intermediate representation

Build a privacy-safe `DocumentRenderModel` from durable document state. All exporters consume this model to reduce format drift.

### 10.2 PDF

- Convert render model to escaped, controlled HTML/CSS for `expo-print` or equivalent supported local PDF mechanism.
- Apply page size/orientation/margins.
- Render cover page/TOC/header/footer/page numbers to the extent supported by the chosen engine.
- Preview uses the same render model/styles as export.
- Export success requires a generated readable file URI; release acceptance requires actual open/visual inspection on device where available.

### 10.3 Markdown/TXT/HTML

Deterministic serializers with safe escaping and stable section ordering.

### 10.4 DOCX

Implement with a locally bundled compatible library only if it can produce structurally valid DOCX in the Expo/native build. Tests SHALL open/inspect generated package structure and, for release acceptance, an actual document viewer should confirm fidelity where available. If not achievable without destabilising the target runtime, mark DOCX PARTIAL and do not claim full fidelity.

### 10.5 Document project ZIP

Manifest includes archive type/version, app schema version, createdAt, document/workspace identity, included files, integrity records and exclusion declaration. Use existing archive policy plus corrected duplicate-entry detection.

## 11. Workspace project archive remediation

Make `createProjectArchive` and `parseProjectArchive` reachable from UI. Import flow:
`pick → raw preflight/duplicate validation → JSZip parse → path/size/ratio/schema/integrity/prohibited-field validation → preview → snapshot current durable state → write candidate → verify → activate → success`.

Failure before activation SHALL leave current state untouched. Failure during durable commit SHALL rollback/restore prior state and report failure.

## 12. Duplicate ZIP entry defence

The existing object-key uniqueness check is insufficient after JSZip normalization. Add a raw ZIP central-directory preflight (or another verified parser stage preserving duplicate names) before map collapse. Normalize path representation consistently and reject duplicates after normalization. Add crafted duplicate-entry fixtures/tests.

## 13. Restore transaction remediation

Refactor restore away from `set state then asynchronous effect saves` as the success gate.

Target service contract:
```text
prepareRestore(candidate, current) -> validatedPlan
commitRestore(validatedPlan) -> { ok, persistedState, rollbackEvidence? }
```

UI reports success only after `commitRestore.ok === true` and a verification read confirms expected durable version/state. On failure, retain/restore prior state and present a recovery message.

## 14. SecureStore API key result contract

`setApiKey` SHALL return an explicit result or throw a typed persistence error. UI states:
- `Saved securely` only after success;
- `Session only` only if explicitly supported and visibly communicated;
- `Save failed` otherwise.

No silent catch may make failed persistence indistinguishable from successful device storage.

## 15. Prompt Library minimum remediation

Preserve current protected domain functions and wire the missing v1.3.1 contract into the gated UI:
- create/edit;
- role selection;
- categories;
- variables and `{{variable}}` expansion/execution;
- enabled/favourite;
- workspace assignment;
- versions;
- duplicate;
- search;
- safe import/export.

Do not add marketplace, collaboration, cloud prompt sync or unrelated prompt-authoring expansion.

## 16. Accessibility implementation

All icon-only controls use `accessibilityLabel`; stateful controls expose `accessibilityState`; significant status changes use appropriate live-region/announcement behaviour supported by React Native/Android.

Focus management rules:
- opening sheet/dialog moves focus appropriately;
- closing restores focus to invoking control where practical;
- screen transitions announce meaningful heading/context;
- error summary/action becomes reachable immediately;
- document outline exposes heading/section semantics.

Dynamic type:
- avoid fixed-height text containers where text can scale;
- allow wrapping;
- cap only where a documented component needs it and still remains accessible;
- test large font scales.

Reduced motion:
- central motion preference disables/reduces nonessential translate/scale effects;
- status changes remain understandable without animation.

## 17. Responsive implementation

Use a central layout-width hook/context to produce semantic size classes rather than scattered pixel conditions. Components consume `compact|medium|expanded` and render structurally appropriate variants.

Representative acceptance widths SHOULD include phone portrait, phone landscape, small tablet/foldable half/open widths, and large tablet. Exact emulator/device values may be selected during implementation but SHALL cover all three semantic classes.

## 18. CI/repository remediation

The workflow SHALL run from the real canonical source root. Remove historical `med-ai-console-expo` path assumptions unless the repository is deliberately restructured to that exact path. Cache, working directory, Android artifact path and upload path must agree.

Artifact name SHALL derive from current metadata or be updated consistently to v1.4.0 target once implementation release identity is authorised/finalised.

## 19. Testing architecture

Add deterministic tests for:
- document schema normalization/migration;
- CRUD and workspace associations;
- section ordering/reorder accessibility operations;
- autosave state machine and write failure;
- revision/snapshot/restore;
- template initialization;
- render-model privacy exclusions;
- each exporter;
- document archive round trip/rejections;
- raw duplicate ZIP names;
- restore commit failure/rollback;
- SecureStore persistence failure result;
- workspace rename persistence;
- Prompt Library missing UI/domain contracts;
- generation view-state mapping;
- responsive navigation state reducers where pure logic exists.

Component/device tests should cover bottom sheets, long press, Back, keyboard, focus restoration, text scaling, reduced motion and native share/PDF opening.

## 20. Release evidence

The implementation report SHALL separate:
- source/static PASS;
- deterministic test PASS;
- emulator/runtime PASS;
- physical-device PASS;
- CI/signing PASS;
- live provider PASS;
- UNVERIFIABLE external gates.

No category may borrow evidence from another category.
