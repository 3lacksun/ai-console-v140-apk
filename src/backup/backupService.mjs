import { normaliseCState, serialiseCState, STORAGE_SCHEMA_VERSION_C } from '../workspaces/workspaceSchema.mjs';
import { assertNoProhibitedProperties } from '../utils/privacy.mjs';

const safeClone = (value) => JSON.parse(JSON.stringify(value));
const comparable = (value) => JSON.stringify(serialiseCState(value));
export const BACKUP_SCHEMA_VERSION = 2;

export const createOrdinaryBackup = (state, now = Date.now()) => {
  const c = serialiseCState(normaliseCState(state, now), now);
  const { promptLibrary, documentSession, backupMetadata, ...safe } = c;
  const workspaces = (safe.workspaces || []).map(({ projectAIConfiguration, ...workspace }) => workspace);
  return { backupSchemaVersion: BACKUP_SCHEMA_VERSION, appStorageSchemaVersion: STORAGE_SCHEMA_VERSION_C, createdAt: now, payload: { ...safe, workspaces, documentSession: null }, exclusions: ['API keys', 'provider credentials', 'SecureStore contents', 'PIN verifier/material', 'transient attachment/document context', 'protected prompt content', 'project AI configuration'] };
};

export const validateOrdinaryBackup = (candidate) => {
  if (!candidate || ![1, BACKUP_SCHEMA_VERSION].includes(candidate.backupSchemaVersion)) throw new Error('Unsupported ordinary backup schema version.');
  if (Number(candidate.appStorageSchemaVersion) > STORAGE_SCHEMA_VERSION_C) throw new Error('Backup was created by a future application schema.');
  if (!candidate.payload || !Array.isArray(candidate.payload.chats) || !Array.isArray(candidate.payload.workspaces)) throw new Error('Backup payload is malformed.');
  assertNoProhibitedProperties(candidate, { exportScope: true });
  return true;
};

export const previewRestore = (current, backup) => { validateOrdinaryBackup(backup); return { currentChats: current.chats?.length || 0, incomingChats: backup.payload.chats.length, currentWorkspaces: current.workspaces?.length || 0, incomingWorkspaces: backup.payload.workspaces.length, currentDocuments: current.documents?.length || 0, incomingDocuments: backup.payload.documents?.length || 0, conflictPolicy: 'replace-after-validation-with-durable-readback-and-rollback' }; };

export const prepareAtomicRestore = (current, backup, now = Date.now()) => {
  validateOrdinaryBackup(backup);
  const rollback = safeClone(current);
  try {
    const candidate = normaliseCState({ ...backup.payload, storageSchemaVersion: backup.appStorageSchemaVersion }, now);
    return { nextState: candidate, rollbackState: rollback, restoredAt: now };
  } catch (error) { return { nextState: rollback, rollbackState: rollback, error: error.message || 'Restore validation failed.' }; }
};

export const commitPreparedRestore = async (prepared, { writeState, readState }) => {
  if (!prepared || prepared.error) return { ok: false, rolledBack: false, error: prepared?.error || 'Restore is not prepared.' };
  if (typeof writeState !== 'function' || typeof readState !== 'function') throw new Error('Restore persistence callbacks are required.');
  try {
    const wrote = await writeState(prepared.nextState);
    if (wrote === false) throw new Error('Candidate restore write failed.');
    const durable = await readState();
    if (comparable(durable) !== comparable(prepared.nextState)) throw new Error('Candidate restore read-back verification failed.');
    return { ok: true, rolledBack: false, state: normaliseCState(durable), restoredAt: prepared.restoredAt };
  } catch (error) {
    try {
      const rollbackWrite = await writeState(prepared.rollbackState);
      if (rollbackWrite === false) throw new Error('Rollback write failed.');
      const rollbackDurable = await readState();
      if (comparable(rollbackDurable) !== comparable(prepared.rollbackState)) throw new Error('Rollback read-back verification failed.');
      return { ok: false, rolledBack: true, state: normaliseCState(rollbackDurable), error: error.message || 'Restore commit failed.' };
    } catch (rollbackError) {
      return { ok: false, rolledBack: false, error: `${error.message || 'Restore commit failed.'} Rollback also failed: ${rollbackError.message || 'unknown rollback error'}` };
    }
  }
};
