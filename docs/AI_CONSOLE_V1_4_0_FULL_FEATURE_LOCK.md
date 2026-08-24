# AI Console v1.4.0 — Full Feature Lock

> **Specification status:** AUTHORITATIVE TARGET — IMPLEMENTATION EXISTS; VERIFICATION IS TRACKED SEPARATELY  
> **Baseline:** AI Console v1.3.1 Premium UI & Document Studio  
> **Target:** AI Console v1.4.0 — Document Studio Pro & Premium Android UX  
> **Authority:** Explicit current user scope + preserved non-conflicting v1.3.1 requirements  
> **Important:** This document defines the authorised v1.4.0 target. Implementation and verification status are recorded separately; this specification does not by itself claim APK build, signing, device, accessibility, or live-provider acceptance.


## 1. Lock statement

This Feature Lock freezes the approved target for the v1.4.0 implementation programme. It is a cumulative lock: all non-conflicting v1.3.1 authorised features remain required. A later explicit authorised amendment may supersede a lock item; absence of mention does not retire it.

## 2. Preserved v1.3.1 feature families

The following remain locked:
- OpenRouter streaming conversation transport and current generation controls;
- stable chat/message identity, branching/edit/resubmit/regenerate lineage;
- chat organisation: search, rename, pin, archive, delete, bulk, tags, folders, sort;
- workflow-tree chats and status cycling;
- workspaces, notes and project organisation;
- six-digit PIN-protected AI/provider/model/prompt/project configuration;
- local attachments/text/ZIP context handling and safe Markdown/code rendering;
- privacy sanitisation and request-only context exclusion;
- local exports, backup/restore and workspace project archive capability;
- SecureStore secrets/PIN verifier and versioned ordinary local state;
- speech recognition capability and explicit unavailable/permission states;
- light-only appearance for v1.4.0; dark mode is not authorised for the current release;
- Android-first Expo/React Native architecture and debug-vs-production release distinction.

## 3. New locked feature families

### FL-DOC — Document Studio Pro

- **FL-DOC-001** Documents is a first-class primary domain.
- **FL-DOC-002** Multiple documents per workspace.
- **FL-DOC-003** Create/open/rename/duplicate/archive/delete/search/sort.
- **FL-DOC-004** Structured sections and heading hierarchy.
- **FL-DOC-005** Add/edit/delete/reorder/navigate sections.
- **FL-DOC-006** Rich Markdown-compatible editing, undo/redo, find.
- **FL-DOC-007** Explicit autosave/saved/failure state tied to durable persistence.
- **FL-DOC-008** Built-in professional templates: Report, Technical Specification, Audit, Implementation Plan, Memorandum, Proposal, Formal Letter.
- **FL-DOC-009** Cover page, title metadata, header/footer, page numbers, TOC, page size, orientation, margins.
- **FL-DOC-010** Print/PDF preview using the same render model as export.
- **FL-DOC-011** Revision history and named snapshots.
- **FL-DOC-012** Revision comparison and non-destructive restore.
- **FL-DOC-013** Add selected chat messages/assistant outputs to documents.
- **FL-DOC-014** AI append/insert/replace document operations using existing protected provider configuration.
- **FL-DOC-015** PDF, Markdown, TXT and HTML export.
- **FL-DOC-016** DOCX export when verifiable fidelity is technically achieved; otherwise explicitly PARTIAL.
- **FL-DOC-017** Versioned safe document-project ZIP export/import with integrity and privacy validation.

### FL-AND — Android interaction

- **FL-AND-001** Coherent bottom-sheet/action-sheet patterns.
- **FL-AND-002** Long-press message action menu.
- **FL-AND-003** Larger secondary touch targets where needed.
- **FL-AND-004** One-handed compact-phone layout improvements.
- **FL-AND-005** Persistent generation status.
- **FL-AND-006** Distinct stop/retry/regenerate states.
- **FL-AND-007** Shared snackbar/toast/banner feedback system.
- **FL-AND-008** Improved keyboard avoidance across chat and document editor.
- **FL-AND-009** Ordered Android back-navigation/state restoration.
- **FL-AND-010** Appropriate haptic feedback.
- **FL-AND-011** Purpose-designed empty states/instructions.
- **FL-AND-012** Consistent modal/sheet hierarchy.

### FL-VIS — Visual UI/UX

- **FL-VIS-001** Central design tokens and responsive breakpoints.
- **FL-VIS-002** Unified typography hierarchy.
- **FL-VIS-003** Consistent surface/card/sheet/dialog/elevation system.
- **FL-VIS-004** Standard shared component library and interaction states.
- **FL-VIS-005** Refined chat/message/code/attachment presentation.
- **FL-VIS-006** Refined conversation/workspace list hierarchy.
- **FL-VIS-007** Purpose-designed professional Document Studio visuals/tooling.
- **FL-VIS-008** Loading skeletons, offline, empty and error visual states.
- **FL-VIS-009** Consistent icon family/weight/alignment.
- **FL-VIS-010** Restrained functional motion with reduced-motion variant.
- **FL-VIS-011** Deliberate Android edge-to-edge/system-bar handling.

### FL-A11Y — Accessibility

- **FL-A11Y-001** TalkBack labels for every icon-only control.
- **FL-A11Y-002** Correct role/state/value semantics.
- **FL-A11Y-003** Logical focus order and focus restoration.
- **FL-A11Y-004** Accessible state announcements for generation/save/error/success.
- **FL-A11Y-005** Dynamic font scaling/high text zoom resilience.
- **FL-A11Y-006** Explicit reduced-motion support.
- **FL-A11Y-007** Non-drag alternative to reorder operations.
- **FL-A11Y-008** Accessible document outline.
- **FL-A11Y-009** Contrast/touch-target review.
- **FL-A11Y-010** Physical TalkBack/focus acceptance when device evidence is available.

### FL-RSP — Responsive/adaptive

- **FL-RSP-001** Compact single-pane mobile layout.
- **FL-RSP-002** Medium navigation-rail/selective split layout.
- **FL-RSP-003** Expanded multi-pane productivity layout.
- **FL-RSP-004** Expanded Document Studio three-pane layout where width permits.
- **FL-RSP-005** Tablet/foldable structural reflow, not simple stretch.
- **FL-RSP-006** Landscape-phone usability.
- **FL-RSP-007** Orientation/activity state preservation.

## 4. Defect closure lock

All are mandatory:
- **FL-FIX-001** DEFECT-001 protected Prompt Library complete to existing contract only.
- **FL-FIX-002** DEFECT-002 workspace archive export/import reachable.
- **FL-FIX-003** DEFECT-003 CI path corrected/verified.
- **FL-FIX-004** DEFECT-004 workspace rename UI/persistence.
- **FL-FIX-005** DEFECT-005 transactional durable restore.
- **FL-FIX-006** DEFECT-006 explicit SecureStore failure outcome.
- **FL-FIX-007** DEFECT-007 raw duplicate ZIP entry detection.
- **FL-FIX-008** DEFECT-008 README identity corrected.
- **FL-FIX-009** DEFECT-009 CI artifact identity corrected/derived.

## 5. Explicit non-goals / prohibited scope drift

- **FL-NG-001** No prompt marketplace, cloud prompt sync, collaborative prompt authoring or broad prompt-feature programme.
- **FL-NG-002** No unrelated new LLM/provider family or automatic fallback.
- **FL-NG-003** No architecture rewrite solely for cosmetic reasons.
- **FL-NG-004** No embedded signing credentials/secrets.
- **FL-NG-005** No weakening/removal of current privacy exclusions or protected-settings boundary.
- **FL-NG-006** No removal of authorised v1.3.1 features merely because the new design changes their presentation.

## 6. Completion lock

A feature is not 100% complete solely because code or UI exists. It must satisfy its behaviour, persistence/error states and applicable verification. Device-only evidence remains UNVERIFIABLE until executed. A release cannot be GO while a mandatory locally actionable lock item is FAIL/open.
