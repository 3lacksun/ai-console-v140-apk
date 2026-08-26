import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Alert, AppState, BackHandler, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, FlatList, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Speech from 'expo-speech';
import MessageBubble from './src/components/MessageBubble';
import SettingsSheet from './src/components/SettingsSheet';
import LLMSettingsSheet from './src/components/LLMSettingsSheet';
import PinGateModal from './src/components/PinGateModal';
import ModelPicker from './src/components/ModelPicker';
import ChatManager from './src/components/ChatManager';
import WorkspaceManager from './src/components/WorkspaceManager';
import ProtectedWorkspaceTools from './src/components/ProtectedWorkspaceTools';
import AttachmentSourceSheet from './src/components/AttachmentSourceSheet';
import PdfReviewSheet from './src/components/PdfReviewSheet';
import VoiceReviewSheet from './src/components/VoiceReviewSheet';
import DocumentStudio from './src/components/DocumentStudio';
import DocumentTargetSheet from './src/components/DocumentTargetSheet';
import AppErrorBoundary from './src/components/AppErrorBoundary';
import { IconAlert, IconBot, IconChat, IconClose, IconDocument, IconKey, IconMic, IconSend, IconSettings, IconStop, IconUpload, IconWorkspace } from './src/components/Icons';
import { getColors, radii, BRAND } from './src/theme';
import { DEFAULT_SYSTEM_PROMPT, commitStateTransaction, formatProviderName, getApiKeyResult, getJSON, getLLMSettingsPin, getVersionedAppStateResult, INITIAL_MODELS, persistAndVerifyVersionedAppState, setApiKey as persistApiKey, setJSON, setLLMSettingsPin } from './src/utils/storage';
import { sanitizeChatsForPersistence } from './src/utils/privacy.mjs';
import { fetchModels, streamChatCompletion } from './src/utils/streamChat';
import { isLegacyPlainPinRecord, pinVerifierNeedsUpgrade, verifyPinAgainstRecordAsync } from './src/utils/pinVerifier.mjs';
import { pickAndExtractFile } from './src/utils/fileUpload';
import { captureCameraImage, loadImageDataUrl, pickGalleryImage } from './src/utils/mediaPicker';
import { generateImage } from './src/utils/imageGeneration';
import { DEFAULT_OUTPUT_TOKENS, normaliseOutputTokens } from './src/utils/outputTokens.mjs';
import { activeBranchMessages, appendTurn, branchIds, createChat, createMessage, editMessageAndBranch, estimateTokens, migratePackageAToB, providerMessagesForTarget, regenerateAssistant, removeMessage, setActiveBranch, updateMessageContent } from './src/domain/conversationSchema.mjs';
import { createWorkflowChildChat, nextWorkflowStatus, setWorkflowStatus } from './src/domain/workflowTree.mjs';
import { assignFolder, bulkArchive, bulkDelete, setArchived, setPinned, setTags } from './src/domain/conversationOrganisation.mjs';
import { QueueStatus, cancelTurn, cleanCompletedTurns, enqueueTurn, markFailed, markSending, markSent, removeQueueForChat, retryTurn } from './src/domain/offlineQueue.mjs';
import { deterministicFilename, exportChatHtml, exportChatMarkdown, exportChatText, parseChatImport, safeChatExport } from './src/export/chatExport.mjs';
import { createChatPdf, PDF_LAYOUTS } from './src/export/pdfExport';
import { createChatDocumentArchive, documentZipFilename } from './src/export/documentArchive.mjs';
import { GenerationManager } from './src/services/generationManager.mjs';
import { addWorkspace, addWorkspaceNote, archiveWorkspace, deleteDocumentFromState, deleteWorkspace, migrateBToC, normaliseCState, renameWorkspace, workspaceChats } from './src/workspaces/workspaceSchema.mjs';
import { addPrompt, createPrompt, deletePrompt, duplicatePrompt, expandPromptVariables, mergePromptLibraries, parsePromptImport, promptAppliesToWorkspace, safePromptExport, updatePrompt } from './src/prompts/promptLibrary.mjs';
import { createOrdinaryBackup, prepareAtomicRestore, previewRestore } from './src/backup/backupService.mjs';
import { addAttachment, createAttachment, createAttachmentSession, removeAttachment, reorderAttachment, updateAttachmentStatus } from './src/attachments/attachmentSession.mjs';
import { bytesToBase64, createProjectArchive, mergeParsedProjectArchive, parseProjectArchive, projectArchiveFilename } from './src/export/projectArchive.mjs';
import { createDocumentProjectArchive, documentProjectFilename, mergeParsedDocumentProjectArchive, parseDocumentProjectArchive } from './src/documents/documentProjectArchive.mjs';
import { appendRevision, applyAiDocumentOperation, applyRevisionHead, createDocument, createRevision, markDocumentSaved, markDocumentSaveFailed, markDocumentSaving, placeVisibleChatMessage } from './src/documents/documentDomain.mjs';
import { exportDocument, previewDocumentPdf } from './src/documents/documentExport';
import { renderDocumentText } from './src/documents/documentRender.mjs';
import { classifyLayout } from './src/ui/responsive.mjs';
import { FeedbackBanner, PrimaryNavigation, triggerHaptic } from './src/ui/primitives';
import { processPdf } from './src/documents/pdfPipeline.mjs';
import { localPdfAdapter } from './src/documents/localPdfAdapter';
import { addDocumentSource, buildContextManifest, createDocumentSession, selectDocumentPages, selectDocumentSources } from './src/documents/contextManifest.mjs';
import { loadSpeechRecognitionModule } from './src/voice/speechRecognitionAdapter.mjs';
import { preparePlaybackAudioSession, prepareRecordingAudioSession, normaliseSpeakRate } from './src/voice/speechPlayback.mjs';
import { normalisePinThrottle, pinThrottleRemainingMs, recordPinFailure, resetPinThrottle } from './src/security/pinThrottle.mjs';

const calculateEstimatedTokens = (text = '') => Math.ceil(String(text).length / 4);
const PIN_THROTTLE_STORAGE_KEY = 'aiConsolePinThrottle';
const APP_RELEASE_LABEL = "Command Centre v1.5.1";

let cachedSpeechRecognitionModule = null;

function AIConsoleApp() {
  const [hydrated, setHydrated] = useState(false);
  const [apiKey, setApiKeyState] = useState('');
  const apiKeyRef = useRef('');
  const [modelGroups, setModelGroups] = useState(INITIAL_MODELS);
  const [model, setModel] = useState('openrouter/auto');
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(DEFAULT_OUTPUT_TOKENS);
  const [colorMode, setColorMode] = useState('light');
  const [conversationState, setConversationState] = useState(() => normaliseCState({}));
  const [input, setInput] = useState('');
  const [attachmentSession, setAttachmentSession] = useState(() => createAttachmentSession());
  const [editSourceMessageId, setEditSourceMessageId] = useState(null);
  const [generations, setGenerations] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [voiceDraft, setVoiceDraft] = useState('');
  const [voiceReviewOpen, setVoiceReviewOpen] = useState(false);
  const [error, setError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState(false);
  const [pinGateOpen, setPinGateOpen] = useState(false);
  const [pinGateMode, setPinGateMode] = useState('unlock');
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isChatManagerOpen, setIsChatManagerOpen] = useState(false);
  const [isWorkspaceManagerOpen, setIsWorkspaceManagerOpen] = useState(false);
  const [isProtectedWorkspaceToolsOpen, setIsProtectedWorkspaceToolsOpen] = useState(false);
  const [isAttachmentSourceOpen, setIsAttachmentSourceOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [pdfReview, setPdfReview] = useState(null);
  const [pdfSelectedPages, setPdfSelectedPages] = useState([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [voiceLocale, setVoiceLocale] = useState('en-GB');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [offlineMode, setOfflineMode] = useState(false);
  const [primaryDestination, setPrimaryDestination] = useState('chats');
  const [apiKeyPersistenceStatus, setApiKeyPersistenceStatus] = useState('UNKNOWN');
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [documentTargetOpen, setDocumentTargetOpen] = useState(false);
  const [documentTargetMessage, setDocumentTargetMessage] = useState(null);
  const [pendingPromptContext, setPendingPromptContext] = useState(null);
  const [bookmarkViewerOpen, setBookmarkViewerOpen] = useState(false);
  const [documentGeneration, setDocumentGeneration] = useState(null);
  const generationRequestsRef = useRef(new Map());
  const conversationStateRef = useRef(conversationState);
  const skipInitialApiKeyPersistRef = useRef(true);
  const apiKeyReadHealthyRef = useRef(true);
  const apiKeyPersistRevisionRef = useRef(0);
  const statePersistRevisionRef = useRef(0);
  const isNearBottomRef = useRef(true);
  const documentGenerationRef = useRef(null);
  const hydrationDegradedRef = useRef(false);
  const pinThrottleRef = useRef(resetPinThrottle());
  const chatManagerTriggerRef = useRef(null);
  const workspaceManagerTriggerRef = useRef(null);
  const settingsTriggerRef = useRef(null);
  const protectedSettingsTriggerRef = useRef(null);
  const attachmentTriggerRef = useRef(null);
  const voiceTriggerRef = useRef(null);
  const { width } = useWindowDimensions();
  const layout = classifyLayout(width);
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  // Retained as a compatibility guard: both generation identity and stream cancellation remain chat-scoped.
  const streamRefs = useRef(new Map());
  const generationManagerRef = useRef(null);
  const attachmentExtractsRef = useRef(new Map());
  const voiceDraftRef = useRef('');
  const palette = useMemo(() => getColors(colorMode), [colorMode]);
  const styles = useMemo(() => createStyles(palette), [palette]);
  const chats = workspaceChats(conversationState);
  const activeChatId = conversationState.activeChatId;
  const activeChat = useMemo(() => chats.find((chat) => chat.id === activeChatId) || chats[0] || null, [chats, activeChatId]);
  const activeWorkspace = useMemo(() => conversationState.workspaces.find((workspace) => workspace.id === conversationState.activeWorkspaceId) || conversationState.workspaces[0] || null, [conversationState.workspaces, conversationState.activeWorkspaceId]);
  const messages = useMemo(() => activeBranchMessages(activeChat), [activeChat]);
  const activeGeneration = activeChat ? generations[activeChat.id] : null;
  const isLoading = Boolean(activeGeneration && !['COMPLETE', 'FAILED', 'CANCELLED'].includes(activeGeneration.status));
  const activeDocument = useMemo(() => (conversationState.documents || []).find((doc) => doc.id === conversationState.activeDocumentId) || null, [conversationState.documents, conversationState.activeDocumentId]);
  const activeDocumentGeneration = useMemo(() => (documentGeneration?.documentId === activeDocument?.id ? documentGeneration : (conversationState.documentGenerationJobs || []).find((job) => job.documentId === activeDocument?.id) || null), [documentGeneration, conversationState.documentGenerationJobs, activeDocument?.id]);
  const activeBranches = useMemo(() => branchIds(activeChat), [activeChat]);
  const activeQueuedTurns = useMemo(() => (conversationState.offlineQueue || []).filter((turn) => turn.chatId === activeChat?.id), [conversationState.offlineQueue, activeChat?.id]);
  const anyGeneration = useMemo(() => Object.values(generations).find((job) => job && !['COMPLETE','FAILED','CANCELLED'].includes(job.status)) || null, [generations]);
  const navigationItems = useMemo(() => {
    const iconColor = (id) => (primaryDestination === id ? palette.cyanBright : palette.textMuted);
    return [
      { id: 'chats', label: 'Chats', icon: <IconChat size={20} color={iconColor('chats')} /> },
      { id: 'workspaces', label: 'Workspaces', icon: <IconWorkspace size={20} color={iconColor('workspaces')} /> },
      { id: 'documents', label: 'Documents', icon: <IconDocument size={20} color={iconColor('documents')} /> },
      { id: 'settings', label: 'Settings', icon: <IconSettings size={20} color={iconColor('settings')} /> },
    ];
  }, [palette, primaryDestination]);

  if (!generationManagerRef.current) {
    const manager = new GenerationManager({
      onStateChange: (chatId, job, snapshot) => { setGenerations(snapshot); if (job && ['COMPLETE','FAILED','CANCELLED'].includes(job.status)) { streamRefs.current.delete(chatId); const request=generationRequestsRef.current.get(chatId); if (request?.queueId) setConversationState((previous)=>({...previous,offlineQueue: job.status==='COMPLETE'?cleanCompletedTurns(markSent(previous.offlineQueue,request.queueId)):markFailed(previous.offlineQueue,request.queueId,job.error||`Generation ${String(job.status).toLowerCase()}.`)})); if (job.status === 'COMPLETE') generationRequestsRef.current.delete(chatId); } },
    });
    manager.setDeltaHandler((chatId, job, delta) => setConversationState((previous) => {
      const currentChat = previous.chats.find((chat) => chat.id === chatId);
      if (!currentChat || !currentChat.messages.some((message) => message.messageId === job.targetMessageId)) return previous;
      const current = currentChat.messages.find((message) => message.messageId === job.targetMessageId);
      return updateMessageContent(previous, chatId, job.targetMessageId, `${current.content || ''}${delta}`);
    }));
    generationManagerRef.current = manager;
  }

  useEffect(() => {
    let mounted = true;
    const hydrate = async () => {
      try {
        const [storedKeyResult, storedGroups, storedModel, storedPrompt, storedTemp, storedMaxTokens, storedChats, storedActiveId, storedMessages, storedTokens, storedMode, versionedResult, storedLocale, storedPlaybackSpeed, storedDestination, storedHaptics] = await Promise.all([
          getApiKeyResult(), getJSON('modelGroups', INITIAL_MODELS), getJSON('activeModel', 'openrouter/auto'), getJSON('systemPrompt', DEFAULT_SYSTEM_PROMPT), getJSON('temperature', 0.2), getJSON('maxTokens', DEFAULT_OUTPUT_TOKENS), getJSON('chats', []), getJSON('activeChatId', ''), getJSON('chatHistory', []), getJSON('estimatedTokens', 0), getJSON('colorMode', 'light'), getVersionedAppStateResult(), getJSON('voiceLocale', 'en-GB'), getJSON('playbackSpeed', 1), getJSON('primaryDestination', 'chats'), getJSON('hapticsEnabled', true),
        ]);
        const legacy = { chats: storedChats, activeChatId: storedActiveId, chatHistory: storedMessages, estimatedTokens: storedTokens };
        let state;
        if (versionedResult.ok && versionedResult.state) state = normaliseCState(versionedResult.state);
        else if (!versionedResult.ok && versionedResult.backupState) { hydrationDegradedRef.current = true; state = normaliseCState(versionedResult.backupState); setError('Startup recovery mode: a verified previous state was loaded read-only. Automatic writes are blocked until a deliberate restore/import action succeeds.'); }
        else if (!versionedResult.ok) { hydrationDegradedRef.current = true; state = normaliseCState(migrateBToC(migratePackageAToB(legacy))); setError('Startup recovery mode: durable state is unreadable and no verified backup is available. Automatic writes are blocked.'); }
        else state = normaliseCState(migrateBToC(migratePackageAToB(legacy)));
        state = { ...state, documentGenerationJobs: (state.documentGenerationJobs || []).map((job) => job.status === 'STREAMING' ? { ...job, status: 'FAILED', error: 'Interrupted by application restart.', updatedAt: Date.now() } : job) };
        if (!mounted) return;
        apiKeyReadHealthyRef.current = storedKeyResult.ok;
        setApiKeyState(storedKeyResult.value);
        apiKeyRef.current = String(storedKeyResult.value || '').trim();
        setApiKeyPersistenceStatus(storedKeyResult.ok ? 'READ_OK' : 'READ_FAILED');
        setModelGroups(storedGroups && typeof storedGroups === 'object' ? storedGroups : INITIAL_MODELS);
        setModel(storedModel);
        setSystemPrompt(storedPrompt);
        setTemperature(Number(storedTemp) || 0.2);
        setMaxTokens(normaliseOutputTokens(storedMaxTokens));
        setConversationState(state);
        setColorMode(storedMode === 'dark' ? 'dark' : 'light');
        setVoiceLocale(typeof storedLocale === 'string' ? storedLocale : 'en-GB');
        setPlaybackSpeed(Number(storedPlaybackSpeed) || 1);
        setPrimaryDestination(['chats', 'workspaces', 'documents', 'settings'].includes(storedDestination) ? storedDestination : 'chats');
        setHapticsEnabled(storedHaptics !== false);
      } catch (hydrateError) {
        if (!mounted) return;
        hydrationDegradedRef.current = true;
        apiKeyReadHealthyRef.current = false;
        setApiKeyPersistenceStatus('READ_FAILED');
        setError(`Startup recovery mode: saved state could not be restored safely${hydrateError?.message ? ` (${hydrateError.message})` : ''}. Existing durable state has not been overwritten.`);
      } finally {
        if (mounted) setHydrated(true);
      }
    };
    void hydrate();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!hydrated || hydrationDegradedRef.current) return;
    if (skipInitialApiKeyPersistRef.current) {
      skipInitialApiKeyPersistRef.current = false;
      return;
    }
    apiKeyRef.current = String(apiKey || '').trim();
    const revision = ++apiKeyPersistRevisionRef.current;
    persistApiKey(apiKey).then((result) => {
      if (revision !== apiKeyPersistRevisionRef.current) return;
      apiKeyReadHealthyRef.current = result.ok;
      setApiKeyPersistenceStatus(result.status);
    });
  }, [apiKey, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('modelGroups', modelGroups); }, [modelGroups, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('activeModel', model); }, [model, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('systemPrompt', systemPrompt); }, [systemPrompt, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('temperature', temperature); }, [temperature, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('maxTokens', maxTokens); }, [maxTokens, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('colorMode', colorMode); }, [colorMode, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('voiceLocale', voiceLocale); }, [voiceLocale, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('playbackSpeed', playbackSpeed); }, [playbackSpeed, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('primaryDestination', primaryDestination); }, [primaryDestination, hydrated]);
  useEffect(() => { if (hydrated && !hydrationDegradedRef.current) setJSON('hapticsEnabled', hapticsEnabled); }, [hapticsEnabled, hydrated]);
  useEffect(() => { conversationStateRef.current = conversationState; }, [conversationState]);
  useEffect(() => {
    if (!hydrated || typeof AccessibilityInfo.announceForAccessibility !== 'function') return;
    const labels = { chats: 'Chats', workspaces: 'Workspaces', documents: 'Documents', settings: 'Settings' };
    AccessibilityInfo.announceForAccessibility(`${labels[primaryDestination] || 'Command Centre'} screen`);
  }, [primaryDestination, hydrated]);
  useEffect(() => { if (!hydrated || hydrationDegradedRef.current) return; const revision=++statePersistRevisionRef.current; void persistAndVerifyVersionedAppState(conversationState).then((result)=>{ if (revision===statePersistRevisionRef.current && !result.ok) setError(result.error || 'Application state could not be durably verified.'); }); void setJSON('chats', sanitizeChatsForPersistence(conversationState.chats)); void setJSON('activeChatId', activeChatId); }, [conversationState, activeChatId, hydrated]);
  useEffect(() => {
    if (!hydrated || hydrationDegradedRef.current) return undefined;
    const dirty = (conversationState.documents || []).find((doc) => doc.autosaveStatus === 'DIRTY');
    if (!dirty) return undefined;
    const dirtyId = dirty.id;
    const timer = setTimeout(async () => {
      const current = conversationStateRef.current;
      const liveDirty = (current.documents || []).find((doc) => doc.id === dirtyId && doc.autosaveStatus === 'DIRTY');
      if (!liveDirty) return;
      const revision = createRevision(liveDirty, { label: 'Autosave', kind: 'AUTOSAVE' });
      const savingDoc = applyRevisionHead(markDocumentSaving(liveDirty), revision);
      const candidate = { ...current, documents: current.documents.map((doc) => doc.id === dirtyId ? savingDoc : doc), documentRevisions: appendRevision(current.documentRevisions || [], revision) };
      conversationStateRef.current = candidate;
      setConversationState(candidate);
      const result = await persistAndVerifyVersionedAppState(candidate);
      setConversationState((latest) => {
        const next = { ...latest, documents: latest.documents.map((doc) => { if (doc.id !== dirtyId) return doc; const exactCandidate = doc.revisionHeadId === revision.id && Number(doc.updatedAt) === Number(savingDoc.updatedAt); if (!exactCandidate) return doc; return result.ok ? markDocumentSaved(doc) : markDocumentSaveFailed(doc); }) };
        conversationStateRef.current = next;
        return next;
      });
      if (!result.ok) setError(result.error || 'Document autosave failed.');
    }, 650);
    return () => clearTimeout(timer);
  }, [conversationState.documents, hydrated]);

  useEffect(() => {
    let disposed = false;
    let resultSubscription; let errorSubscription; let endSubscription;
    void loadSpeechRecognitionModule().then((loaded) => {
      if (disposed) return;
      if (!loaded.ok) { cachedSpeechRecognitionModule = null; return; }
      const speechRecognition = loaded.module;
      cachedSpeechRecognitionModule = speechRecognition;
      try {
        resultSubscription = speechRecognition.addListener('result', (event) => { const transcript = event.results?.[0]?.transcript; if (transcript) { voiceDraftRef.current = transcript; setVoiceDraft(transcript); } });
        errorSubscription = speechRecognition.addListener('error', (event) => { if (event.error !== 'aborted' && event.error !== 'no-speech') setError(event.message || 'Speech recognition is unavailable. Typing remains available.'); setIsListening(false); });
        endSubscription = speechRecognition.addListener('end', () => { setIsListening(false); if (voiceDraftRef.current.trim()) setVoiceReviewOpen(true); });
      } catch (_) { cachedSpeechRecognitionModule = null; setError('Speech recognition is unavailable in this build. Typing remains available.'); }
    });
    return () => { disposed = true; try { resultSubscription?.remove?.(); } catch (_) {} try { errorSubscription?.remove?.(); } catch (_) {} try { endSubscription?.remove?.(); } catch (_) {} try { cachedSpeechRecognitionModule?.abort?.(); } catch (_) {} };
  }, []);


  // Explicit stream cleanup contract retained for CI/static verification and unmount safety.
  useEffect(() => () => { for (const entry of streamRefs.current.values()) entry.stream?.cancel?.(); streamRefs.current.clear(); }, []);

  useEffect(() => {
    const lifecycleSubscription = AppState.addEventListener('change', (state) => { if (state !== 'active') generationManagerRef.current?.recoverAfterLifecycleTransition(); });
    return () => {
      lifecycleSubscription.remove();
      void Speech.stop().catch(() => {});
      for (const entry of streamRefs.current.values()) entry.stream?.cancel?.();
      streamRefs.current.clear();
    };
  }, []);

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => { if (documentTargetOpen) { setDocumentTargetOpen(false); return true; } if (isChatManagerOpen) { setIsChatManagerOpen(false); return true; } if (isWorkspaceManagerOpen) { setIsWorkspaceManagerOpen(false); return true; } if (voiceReviewOpen) { setVoiceReviewOpen(false); return true; } if (pdfReview) { setPdfReview(null); return true; } if (isAttachmentSourceOpen) { setIsAttachmentSourceOpen(false); return true; } if (isProtectedWorkspaceToolsOpen) { setIsProtectedWorkspaceToolsOpen(false); return true; } if (isSettingsOpen || isLLMSettingsOpen) { setIsSettingsOpen(false); setIsLLMSettingsOpen(false); return true; } if (primaryDestination !== 'chats') { requestPrimaryDestination('chats'); return true; } return false; });
    return () => backSubscription.remove();
  }, [documentTargetOpen, isChatManagerOpen, isWorkspaceManagerOpen, isProtectedWorkspaceToolsOpen, isAttachmentSourceOpen, pdfReview, voiceReviewOpen, isSettingsOpen, isLLMSettingsOpen, primaryDestination, activeDocument?.autosaveStatus]);

  const scrollToBottom = useCallback(() => setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80), []);
  const currentModelName = () => Object.values(modelGroups || {}).flat().find((item) => item.id === model)?.name || model;
  const effectiveSystemPrompt = () => { const project = String(activeWorkspace?.projectAIConfiguration?.systemInstructions || '').trim(); return project ? `${systemPrompt}\n\nProject instructions:\n${project}` : systemPrompt; };
  const updateChat = (chatId, updater) => setConversationState((previous) => ({ ...previous, chats: previous.chats.map((chat) => chat.id === chatId ? { ...updater(chat), updatedAt: Date.now() } : chat) }));
  const selectWorkspace = (workspaceId) => setConversationState((previous) => { const workspace = previous.workspaces.find((item) => item.id === workspaceId); if (!workspace) return previous; const nextChat = previous.chats.find((chat) => chat.workspaceId === workspaceId); const nextDocument = (previous.documents || []).find((doc) => doc.workspaceId === workspaceId && doc.status !== 'ARCHIVED'); return { ...previous, activeWorkspaceId: workspace.id, activeChatId: nextChat?.id || '', activeDocumentId: nextDocument?.id || null }; });
  const updateWorkspace = (workspaceId, updater) => setConversationState((previous) => ({ ...previous, workspaces: previous.workspaces.map((workspace) => workspace.id === workspaceId ? { ...updater(workspace), updatedAt: Date.now() } : workspace) }));
  const commitCandidateState = async (candidate) => {
    const previous = conversationStateRef.current;
    const result = await commitStateTransaction(previous, normaliseCState(candidate));
    if (!result.ok) throw new Error(result.error || 'State transaction failed and rollback could not be verified.');
    hydrationDegradedRef.current = false;
    conversationStateRef.current = result.state;
    setConversationState(result.state);
    return result.state;
  };
  const validateArchivePickerSize = async (asset, maxBytes = 25 * 1024 * 1024) => {
    const info = await FileSystem.getInfoAsync(asset?.uri || '', { size: true });
    const size = Number(info?.size);
    if (!info?.exists || !Number.isFinite(size) || size < 0) throw new Error('Archive size could not be verified safely.');
    if (size > maxBytes) throw new Error(`Archive exceeds the ${Math.floor(maxBytes / (1024 * 1024))} MB source-size limit.`);
    return size;
  };
  const requestPrimaryDestination = (destination) => {
    if (destination === primaryDestination) return;
    if (primaryDestination !== 'documents' || !activeDocument || !['DIRTY','SAVING','SAVE_FAILED'].includes(activeDocument.autosaveStatus)) { setPrimaryDestination(destination); return; }
    if (activeDocument.autosaveStatus === 'SAVING') { Alert.alert('Document save in progress', 'Stay in Document Studio until the current durable write finishes.', [{ text: 'OK' }]); return; }
    const discard = () => {
      const head = (conversationState.documentRevisions || []).find((revision) => revision.id === activeDocument.revisionHeadId && revision.documentId === activeDocument.id);
      if (!head?.snapshot) { Alert.alert('No durable revision available', 'This document has no verified revision to discard back to. Retry the save instead.'); return; }
      setConversationState((previous) => ({ ...previous, documents: previous.documents.map((doc) => doc.id === activeDocument.id ? { ...head.snapshot, autosaveStatus: 'SAVED', lastSavedAt: head.createdAt, updatedAt: head.createdAt } : doc) }));
      setPrimaryDestination(destination);
    };
    const retry = async () => {
      try {
        const state = conversationStateRef.current;
        const doc = (state.documents || []).find((item) => item.id === activeDocument.id);
        if (!doc) return;
        const saving = markDocumentSaving(doc);
        const candidate = { ...state, documents: state.documents.map((item) => item.id === doc.id ? saving : item) };
        const result = await persistAndVerifyVersionedAppState(candidate);
        if (!result.ok) throw new Error(result.error || 'Save could not be durably verified.');
        setConversationState((previous) => ({ ...previous, documents: previous.documents.map((item) => item.id === doc.id ? markDocumentSaved(item) : item) }));
        setPrimaryDestination(destination);
      } catch (saveError) { setError(saveError.message || 'Document save failed.'); }
    };
    Alert.alert('Unsaved document changes', 'Choose how to resolve this document before leaving Document Studio.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Discard', style: 'destructive', onPress: discard }, { text: 'Retry save', onPress: () => void retry() }]);
  };
  const stopGenerationForChat = (chatId) => { generationManagerRef.current?.cancel(chatId); streamRefs.current.get(chatId)?.stream?.cancel?.(); streamRefs.current.delete(chatId); };
  const stopGeneration = () => { if (activeChat) stopGenerationForChat(activeChat.id); };

  const requestProtectedSettingsAccess = async () => { try { const storedPin = await getLLMSettingsPin(); setPinGateMode(storedPin ? 'unlock' : 'create'); setPinGateOpen(true); } catch (_) { setError('Protected settings are unavailable because secure device storage could not be opened.'); } };
  const handlePinSubmit = async (pin) => {
    try {
      if (pinGateMode === 'unlock') {
        const now = Date.now();
        const persistedThrottle = normalisePinThrottle(await getJSON(PIN_THROTTLE_STORAGE_KEY, pinThrottleRef.current), now);
        pinThrottleRef.current = persistedThrottle;
        const remainingMs = pinThrottleRemainingMs(persistedThrottle, now);
        if (remainingMs > 0) return `Too many incorrect PIN attempts. Try again in ${Math.max(1, Math.ceil(remainingMs / 60000))} minute(s).`;
        const storedPin = await getLLMSettingsPin();
        if (!storedPin || !(await verifyPinAgainstRecordAsync(pin, storedPin))) {
          const nextThrottle = recordPinFailure(persistedThrottle, now);
          pinThrottleRef.current = nextThrottle;
          await setJSON(PIN_THROTTLE_STORAGE_KEY, nextThrottle);
          const lockedMs = pinThrottleRemainingMs(nextThrottle, now);
          return lockedMs > 0 ? `Too many incorrect PIN attempts. Locked for ${Math.ceil(lockedMs / 60000)} minutes.` : 'Incorrect PIN.';
        }
        pinThrottleRef.current = resetPinThrottle();
        await setJSON(PIN_THROTTLE_STORAGE_KEY, pinThrottleRef.current);
        if (isLegacyPlainPinRecord(storedPin) || pinVerifierNeedsUpgrade(storedPin)) await setLLMSettingsPin(pin);
      } else {
        await setLLMSettingsPin(pin);
        pinThrottleRef.current = resetPinThrottle();
        await setJSON(PIN_THROTTLE_STORAGE_KEY, pinThrottleRef.current);
      }
      setPinGateOpen(false);
      setIsLLMSettingsOpen(true);
      return '';
    } catch (pinError) { return pinError.message || 'Unable to access protected settings.'; }
  };

  const startGeneration = (chatId, targetMessageId, apiMessages, options = {}) => {
    generationRequestsRef.current.set(chatId, { targetMessageId, apiMessages, queueId: options.queueId || null });
    let response = '';
    generationManagerRef.current.start({ chatId, targetMessageId, streamFactory: (callbacks) => {
      const requestId = `request-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const isCurrentRequest = () => streamRefs.current.get(chatId)?.requestId === requestId;
      const stream = streamChatCompletion({ apiKey: apiKeyRef.current || apiKey, model, messages: apiMessages, temperature, maxTokens, onDelta: (delta) => { if (isCurrentRequest()) { response += delta; callbacks.onDelta(delta); } }, onDone: () => { if (isCurrentRequest()) callbacks.onDone(); }, onError: (streamError) => { if (isCurrentRequest()) { setError(`API Error: ${streamError.message}`); callbacks.onError(streamError); } } });
      streamRefs.current.set(chatId, { requestId, stream });
      return stream;
    } });
  };

  const buildProviderRequest = (chat, targetMessageId, promptContext = pendingPromptContext) => {
    const scoped = providerMessagesForTarget(chat, targetMessageId);
    const preamble = [{ role: 'system', content: effectiveSystemPrompt() }];
    if (promptContext && ['system','developer'].includes(promptContext.role) && promptContext.content.trim()) preamble.push({ role: promptContext.role, content: promptContext.content });
    return [...preamble, ...scoped];
  };
  const handleSendMessage = () => {
    if (!activeChat || (!input.trim() && !attachmentSession.files.length) || isLoading) return;
    const text = input.trim(); const files = attachmentSession.files; const attachment = files[0] || null;
    if (offlineMode) {
      const draftId=`draft-${Date.now()}`;
      setConversationState((previous)=>({...previous,offlineQueue:enqueueTurn(previous.offlineQueue,{chatId:activeChat.id,messageId:draftId,content:text,attachments:files,providerContextRequired:files.length>0})}));
      setInput(''); setAttachmentSession(createAttachmentSession()); attachmentExtractsRef.current.clear();
      setError(files.length ? 'Draft queued. Attachment metadata is retained, but files must be reattached before sending after restart.' : 'Draft queued for delivery when online.');
      return;
    }
    if (!(apiKeyRef.current || apiKey).trim()) { setError('No API key loaded. Open the key icon, paste your OpenRouter key (sk-or-v1-...), and wait for “Saved securely”.'); requestProtectedSettingsAccess(); return; }
    const textParts=[]; const imageParts=[];
    for (const file of files) {
      const context=attachmentExtractsRef.current.get(file.id);
      if (context && typeof context==='object' && context.type==='image_url') imageParts.push(context);
      else textParts.push(`[Attachment: ${file.name}]\n${String(context||'')}`);
    }
    const visibleText=text || `Attached ${files.length} file${files.length===1?'':'s'}`;
    const promptText=textParts.length?`${text || `Please review the ${files.length} attached file${files.length===1?'':'s'}.`}\n\n${textParts.join('\n\n')}`:text;
    const apiContent=imageParts.length?[{type:'text',text:promptText||'Please review the attached image.'},...imageParts]:promptText;
    let nextState;
    if (editSourceMessageId) {
      nextState=editMessageAndBranch(conversationState,activeChat.id,editSourceMessageId,visibleText);
      const editedChat=nextState.chats.find(c=>c.id===activeChat.id), assistant=editedChat.messages.at(-1), editedId=assistant.parentMessageId;
      nextState={...nextState,chats:nextState.chats.map(c=>c.id===activeChat.id?{...c,messages:c.messages.map(m=>m.messageId===editedId?{...m,apiContent,attachment:attachment?{name:attachment.name,kind:attachment.kind,size:attachment.size}:undefined}:m)}:c)};
    } else nextState=appendTurn(conversationState,activeChat.id,{role:'user',content:visibleText,apiContent,attachment:attachment?{name:attachment.name,kind:attachment.kind,size:attachment.size}:null});
    const nextChat=nextState.chats.find(c=>c.id===activeChat.id),target=nextChat.messages.at(-1);
    setConversationState(nextState); setInput(''); setAttachmentSession(createAttachmentSession()); attachmentExtractsRef.current.clear(); setEditSourceMessageId(null);
    const request=buildProviderRequest(nextChat,target.messageId); setPendingPromptContext(null); startGeneration(activeChat.id,target.messageId,request);
  };
  const handleRegenerate = (message) => { if (!activeChat || isLoading || !apiKey.trim()) return; try { const next=regenerateAssistant(conversationState,activeChat.id,message.messageId); const nextChat=next.chats.find(c=>c.id===activeChat.id),target=nextChat.messages.at(-1); setConversationState(next); startGeneration(activeChat.id,target.messageId,buildProviderRequest(nextChat,target.messageId,null)); } catch(e){setError(e.message);} };
  const handleRetryGeneration = (message) => { if (!activeChat || !apiKey.trim()) return; const prior=generationRequestsRef.current.get(activeChat.id); if(!prior||prior.targetMessageId!==message.messageId){setError('No failed or cancelled request is available to retry for this response.');return;} setConversationState(previous=>updateMessageContent(previous,activeChat.id,message.messageId,'')); try { generationManagerRef.current.retry(activeChat.id,(callbacks)=>{const requestId=`retry-${Date.now()}-${Math.random().toString(36).slice(2,7)}`;const isCurrentRequest=()=>streamRefs.current.get(activeChat.id)?.requestId===requestId;const stream=streamChatCompletion({apiKey: apiKeyRef.current || apiKey,model,messages:prior.apiMessages,temperature,maxTokens,onDelta:(delta)=>{if(isCurrentRequest())callbacks.onDelta(delta);},onDone:()=>{if(isCurrentRequest())callbacks.onDone();},onError:(e)=>{if(isCurrentRequest())callbacks.onError(e);}});streamRefs.current.set(activeChat.id,{requestId,stream});return stream;}); }catch(e){setError(e.message||'Retry failed.');} };
  const dispatchQueuedTurn = (turn) => { if (offlineMode || !apiKey.trim() || !turn || turn.status!==QueueStatus.QUEUED) return; if (turn.providerContextRequired) { setConversationState(previous=>({...previous,offlineQueue:markFailed(markSending(previous.offlineQueue,turn.id),turn.id,'Attachments must be reattached before this queued draft can be sent.')})); return; } const current=conversationStateRef.current,chat=current.chats.find(c=>c.id===turn.chatId); if(!chat){setConversationState(previous=>({...previous,offlineQueue:markFailed(markSending(previous.offlineQueue,turn.id),turn.id,'Destination chat no longer exists.')}));return;} let next={...current,offlineQueue:markSending(current.offlineQueue,turn.id)}; next=appendTurn(next,chat.id,{role:'user',content:turn.content,apiContent:turn.content}); const nextChat=next.chats.find(c=>c.id===chat.id),target=nextChat.messages.at(-1); conversationStateRef.current=next;setConversationState(next);startGeneration(chat.id,target.messageId,buildProviderRequest(nextChat,target.messageId,null),{queueId:turn.id}); };
  const retryQueuedTurn=(id)=>setConversationState(previous=>({...previous,offlineQueue:retryTurn(previous.offlineQueue,id)}));
  const cancelQueuedTurn=(id)=>setConversationState(previous=>({...previous,offlineQueue:cancelTurn(previous.offlineQueue,id)}));
  useEffect(() => { if (!hydrated || offlineMode || !apiKey.trim()) return; const next = (conversationState.offlineQueue || []).find((turn) => turn.status === QueueStatus.QUEUED); if (next) dispatchQueuedTurn(next); }, [hydrated, offlineMode, apiKey, conversationState.offlineQueue]);
  const handleDeleteChat = (chatId) => { stopGenerationForChat(chatId); generationManagerRef.current?.cancelForDeletedChat(chatId); setConversationState((previous) => { const remaining = previous.chats.filter((chat) => chat.id !== chatId); const activeWorkspaceHasChat = remaining.some((chat) => chat.workspaceId === previous.activeWorkspaceId); const replacement = activeWorkspaceHasChat ? [] : [{ ...createChat(), workspaceId: previous.activeWorkspaceId }]; const nextChats = [...remaining, ...replacement].map((chat) => chat.workflowParentId === chatId ? { ...chat, workflowParentId: null } : chat); const nextActive = previous.activeChatId === chatId ? (nextChats.find((chat) => chat.workspaceId === previous.activeWorkspaceId) || nextChats[0]).id : previous.activeChatId; return { ...previous, chats: nextChats, activeChatId: nextActive, offlineQueue: removeQueueForChat(previous.offlineQueue, chatId), workspaces: previous.workspaces.map((workspace) => workspace.id === previous.activeWorkspaceId ? { ...workspace, chatIds: nextChats.filter((chat) => chat.workspaceId === workspace.id).map((chat) => chat.id), updatedAt: Date.now() } : workspace) }; }); };
  const handleBulkDeleteChats = (chatIds = []) => { const scopedIds = new Set((conversationStateRef.current.chats || []).filter((chat) => chat.workspaceId === conversationStateRef.current.activeWorkspaceId).map((chat) => chat.id)); const selected = Array.from(new Set(chatIds)).filter((id) => scopedIds.has(id)); for (const chatId of selected) { stopGenerationForChat(chatId); generationManagerRef.current?.cancelForDeletedChat(chatId); } setConversationState((previous) => { const selectedSet = new Set(selected); const remaining = bulkDelete(previous.chats, selected).map((chat) => selectedSet.has(chat.workflowParentId) ? { ...chat, workflowParentId: null } : chat); const replacement = remaining.some((chat) => chat.workspaceId === previous.activeWorkspaceId) ? [] : [{ ...createChat(), workspaceId: previous.activeWorkspaceId }]; const chats = [...remaining, ...replacement]; const activeChatId = selectedSet.has(previous.activeChatId) ? (chats.find((chat) => chat.workspaceId === previous.activeWorkspaceId) || chats[0])?.id || '' : previous.activeChatId; const offlineQueue = selected.reduce((queue, chatId) => removeQueueForChat(queue, chatId), previous.offlineQueue); return normaliseCState({ ...previous, chats, activeChatId, offlineQueue }); }); };
  const handleCreateChat = () => { const chat = { ...createChat(), workspaceId: conversationState.activeWorkspaceId }; setConversationState((previous) => ({ ...previous, chats: [chat, ...previous.chats], activeChatId: chat.id, workspaces: previous.workspaces.map((workspace) => workspace.id === chat.workspaceId ? { ...workspace, chatIds: [...workspace.chatIds, chat.id], updatedAt: Date.now() } : workspace) })); setInput(''); setAttachmentSession(createAttachmentSession()); attachmentExtractsRef.current.clear(); };
  const handleCreateWorkflowChild = (parentChatId) => { setConversationState((previous) => { const parent = previous.chats.find((chat) => chat.id === parentChatId); if (!parent) return previous; const child = createWorkflowChildChat(parent); return { ...previous, chats: [child, ...previous.chats], activeChatId: child.id, workspaces: previous.workspaces.map((workspace) => workspace.id === child.workspaceId ? { ...workspace, chatIds: [...workspace.chatIds, child.id], updatedAt: Date.now() } : workspace) }; }); setInput(''); setAttachmentSession(createAttachmentSession()); attachmentExtractsRef.current.clear(); };
  const handleCycleWorkflowStatus = (chatId) => setConversationState((previous) => ({ ...previous, chats: previous.chats.map((chat) => chat.id === chatId ? setWorkflowStatus(chat, nextWorkflowStatus(chat.workflowStatus)) : chat) }));
  const handleExport = async (format = 'txt', selected = messages) => { if (!activeChat) return; try { const output = format === 'json' ? JSON.stringify(safeChatExport({ ...activeChat, messages: selected }), null, 2) : format === 'md' ? exportChatMarkdown(activeChat, selected) : format === 'html' ? exportChatHtml(activeChat, selected) : exportChatText(activeChat, selected); const extension = format === 'json' ? 'json' : format === 'md' ? 'md' : format === 'html' ? 'html' : 'txt'; const uri = `${FileSystem.cacheDirectory}${deterministicFilename(activeChat, extension)}`; await FileSystem.writeAsStringAsync(uri, output, { encoding: FileSystem.EncodingType.UTF8 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: format === 'html' ? 'text/html' : 'text/plain' }); else setError(`Export saved to ${uri}`); } catch (_) { setError('Unable to create a safe chat export.'); } };
  const handleExportPdf = async (layout = PDF_LAYOUTS.POLISHED) => { if (!activeChat) return; try { const pdf = await createChatPdf(activeChat, messages, { layout }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(pdf.uri, { mimeType: 'application/pdf', dialogTitle: `Export ${pdf.filename}` }); else setError(`PDF created at ${pdf.uri}`); } catch (pdfError) { setError(pdfError.message || 'Unable to create a local chat PDF.'); } };
  const handleCreateDocumentZip = async () => { if (!activeChat) return; try { const base64 = await createChatDocumentArchive(activeChat, messages); const filename = documentZipFilename(activeChat); const uri = `${FileSystem.cacheDirectory}${filename}`; await FileSystem.writeAsStringAsync(uri, base64, { encoding: FileSystem.EncodingType.Base64 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: `Export ${filename}` }); else setError(`Document ZIP created at ${uri}`); } catch (archiveError) { setError(archiveError.message || 'Unable to create a safe local document ZIP.'); } };
  const handleImport = async () => { try { const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true }); if (picked.canceled) return; const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri); const chat = parseChatImport(raw); chat.id = createChat().id; chat.workspaceId = conversationState.activeWorkspaceId; const current = conversationStateRef.current; const candidate = normaliseCState({ ...current, chats: [chat, ...current.chats], activeChatId: chat.id, workspaces: current.workspaces.map((workspace) => workspace.id === chat.workspaceId ? { ...workspace, chatIds: [...workspace.chatIds, chat.id], updatedAt: Date.now() } : workspace) }); await commitCandidateState(candidate); setError('Chat import committed after durable read-back verification.'); } catch (importError) { setError(importError.message || 'Unable to import this chat export. Existing data was retained where rollback verified.'); } };
  const handleBackup = async () => { try { const backup = createOrdinaryBackup(conversationState); const uri = `${FileSystem.cacheDirectory}AI_Console_Backup_${Date.now()}.json`; await FileSystem.writeAsStringAsync(uri, JSON.stringify(backup, null, 2), { encoding: FileSystem.EncodingType.UTF8 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json' }); else setError(`Backup saved to ${uri}`); } catch (backupError) { setError(backupError.message || 'Unable to create validated ordinary backup.'); } };
  const handleRestore = async () => { try { const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true }); if (picked.canceled) return; const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri); const backup = JSON.parse(raw); const preview = previewRestore(conversationStateRef.current, backup); const prepared = prepareAtomicRestore(conversationStateRef.current, backup); if (prepared.error) throw new Error(prepared.error); Alert.alert('Restore backup?', `Current: ${preview.currentChats} chats, ${preview.currentWorkspaces} workspaces, ${preview.currentDocuments} documents. Incoming: ${preview.incomingChats} chats, ${preview.incomingWorkspaces} workspaces, ${preview.incomingDocuments} documents.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Restore', style: 'destructive', onPress: () => { void commitCandidateState(prepared.nextState).then(() => setError('Backup durably restored and read-back verified.')).catch((restoreError) => setError(restoreError.message || 'Backup restore failed; rollback was attempted.')); } }]); } catch (restoreError) { setError(restoreError.message || 'Backup restore validation failed.'); } };
  const handleSyncModels = async () => { if (isFetchingModels) return; setIsFetchingModels(true); try { const data = await fetchModels(apiKey); const grouped = {}; (data.data || []).forEach((item) => { const provider = formatProviderName(item.id.split('/')[0]); (grouped[provider] ||= []).push({ id: item.id, name: item.name }); }); Object.keys(grouped).forEach((key) => grouped[key].sort((a, b) => a.name.localeCompare(b.name))); if (Object.keys(grouped).length) setModelGroups(grouped); else setError('OpenRouter returned an empty model list.'); } catch (syncError) { setError(syncError.message || 'Unable to sync models from OpenRouter.'); } finally { setIsFetchingModels(false); } };
  const handlePickFile = async () => { if (isLoading) return; try { const selected = await pickAndExtractFile(); if (!selected) return; const file = createAttachment({ name: selected.attachment?.name, uri: selected.attachment?.uri || selected.pdfAsset?.uri || null, size: selected.attachment?.size, kind: selected.attachment?.kind || 'document', mimeType: selected.attachment?.type || selected.pdfAsset?.mimeType || '', source: 'document' }); if (selected.pdfAsset) { setAttachmentSession((previous) => addAttachment(previous, { ...file, status: 'PROCESSING' })); const job = await processPdf({ file: { ...selected.pdfAsset, name: file.name, uri: file.uri }, adapter: localPdfAdapter }); if (job.status !== 'READY') { setAttachmentSession((previous) => updateAttachmentStatus(previous, file.id, 'FAILED', job.error)); throw new Error(job.error || 'PDF text extraction failed.'); } setPdfReview({ attachmentId: file.id, job }); setPdfSelectedPages(job.pages.map((page) => page.pageNumber)); return; } attachmentExtractsRef.current.set(file.id, selected.context || ''); setAttachmentSession((previous) => addAttachment(previous, { ...file, status: 'READY' })); } catch (uploadError) { setError(uploadError.message || 'Unable to prepare this file.'); } };
  const addImageAttachment = async (asset) => { if (!asset) return; const dataUrl = await loadImageDataUrl(asset); const file = createAttachment(asset); attachmentExtractsRef.current.set(file.id, { type: 'image_url', image_url: { url: dataUrl } }); setAttachmentSession((previous) => addAttachment(previous, { ...file, status: 'READY' })); };
  const handleAddCamera = async () => { try { await addImageAttachment(await captureCameraImage()); } catch (cameraError) { setError(cameraError.message || 'Unable to use the camera.'); } };
  const handleAddGallery = async () => { try { await addImageAttachment(await pickGalleryImage()); } catch (galleryError) { setError(galleryError.message || 'Unable to open the gallery.'); } };
  const handleTogglePdfPage = (pageNumber) => setPdfSelectedPages((previous) => previous.includes(pageNumber) ? previous.filter((page) => page !== pageNumber) : [...previous, pageNumber].sort((a, b) => a - b));
  const handleCancelPdfReview = () => { if (pdfReview?.attachmentId) { attachmentExtractsRef.current.delete(pdfReview.attachmentId); setAttachmentSession((previous) => removeAttachment(previous, pdfReview.attachmentId)); } setPdfReview(null); setPdfSelectedPages([]); };
  const handleUsePdfPages = () => { if (!pdfReview) return; const selected = pdfReview.job.pages.filter((page) => pdfSelectedPages.includes(page.pageNumber)); const context = selected.map((page) => `[PDF: ${pdfReview.job.file.name} · Page ${page.pageNumber}]\n${page.text?.trim() || 'No extractable text was found on this page.'}`).join('\n\n'); attachmentExtractsRef.current.set(pdfReview.attachmentId, context); setAttachmentSession((previous) => updateAttachmentStatus(previous, pdfReview.attachmentId, 'READY')); setConversationState((previous) => { let session = createDocumentSession(); const source = { id: pdfReview.attachmentId, filename: pdfReview.job.file.name, status: 'READY', pages: pdfReview.job.pages, retained: false }; session = addDocumentSource(session, source); session = selectDocumentSources(session, [source.id]); session = selectDocumentPages(session, pdfSelectedPages.map((pageNumber) => ({ sourceId: source.id, pageNumber }))); session = buildContextManifest(session, { maxCharacters: 60000 }); return { ...previous, documentSession: session }; }); setPdfReview(null); setPdfSelectedPages([]); };
  const handleMoveAttachment = (id, direction) => setAttachmentSession((previous) => { const index = previous.files.findIndex((file) => file.id === id); const destination = index + direction; if (index < 0 || destination < 0 || destination >= previous.files.length) return previous; return reorderAttachment(previous, id, destination); });
  const handleSpeakMessage = async (message) => {
    const content = String(message?.content || '').trim();
    if (!content) {
      setError('Nothing to speak — this message has no text.');
      return;
    }
    try {
      await Speech.stop();
      await preparePlaybackAudioSession();
      setIsSpeaking(true);
      const rate = normaliseSpeakRate(playbackSpeed, Platform.OS);
      // Prefer a device voice matching the locale when available.
      let voice;
      try {
        const voices = await Speech.getAvailableVoicesAsync();
        const wanted = String(voiceLocale || 'en-GB').toLowerCase();
        voice = (voices || []).find((v) => String(v.language || '').toLowerCase() === wanted)
          || (voices || []).find((v) => String(v.language || '').toLowerCase().startsWith(wanted.split('-')[0]))
          || undefined;
      } catch (_) {}
      Speech.speak(content, {
        language: voiceLocale || 'en-GB',
        voice: voice?.identifier,
        rate,
        pitch: 1.0,
        onStart: () => setIsSpeaking(true),
        onDone: () => setIsSpeaking(false),
        onStopped: () => setIsSpeaking(false),
        onError: () => {
          setIsSpeaking(false);
          setError('Text-to-speech failed. Check media volume is up (not ringer only).');
        },
      });
    } catch (_) {
      setIsSpeaking(false);
      setError('Text-to-speech playback failed on this device.');
    }
  };
  const handleStopSpeech = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
    } catch (_) {
      setIsSpeaking(false);
      setError('Unable to stop text to speech.');
    }
  };
  const handleGenerateImage = async () => {
    const prompt = String(input || '').trim();
    if (!prompt) {
      setError('Type an image description in the message box, then open Add media → Create image.');
      return;
    }
    if (!apiKey) {
      setError('Enter an OpenRouter API key in AI settings before generating images.');
      return;
    }
    if (!activeChat) {
      setError('Start a chat before generating an image.');
      return;
    }
    if (isLoading || isGeneratingImage) return;
    setIsGeneratingImage(true);
    setError('');
    try {
      const result = await generateImage({ apiKey, prompt, preferredModel: model });
      const now = Date.now();
      setConversationState((previous) => ({
        ...previous,
        chats: previous.chats.map((chat) => {
          if (chat.id !== activeChat.id) return chat;
          const parent = activeBranchMessages(chat).at(-1)?.messageId || null;
          const branchId = chat.activeBranchId || 'main';
          const userMsg = createMessage({ role: 'user', content: prompt, parentMessageId: parent, branchId, now });
          const assistantMsg = createMessage({
            role: 'assistant',
            content: `Generated image · ${result.model}`,
            parentMessageId: userMsg.messageId,
            branchId,
            now: now + 1,
            imageUri: result.url,
            attachment: { name: 'generated-image.png', kind: 'image', imageUri: result.url },
          });
          return {
            ...chat,
            title: chat.title === 'New chat' && prompt ? prompt.slice(0, 42) : chat.title,
            messages: [...chat.messages, userMsg, assistantMsg],
            updatedAt: now,
          };
        }),
      }));
      setInput('');
    } catch (genError) {
      setError(genError?.message || 'Image generation failed.');
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleExportProject = async (workspaceId) => { try { const workspace = conversationState.workspaces.find((item) => item.id === workspaceId); const bytes = await createProjectArchive(conversationState, workspaceId); const filename = projectArchiveFilename(workspace); const uri = `${FileSystem.cacheDirectory}${filename}`; await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: `Export ${workspace?.name || 'workspace'}` }); else setError(`Project archive created at ${uri}`); } catch (projectError) { setError(projectError.message || 'Project export failed.'); } };
  const handleImportProject = async () => { try { const picked = await DocumentPicker.getDocumentAsync({ type: ['application/zip', 'application/octet-stream'], copyToCacheDirectory: true }); if (picked.canceled) return; await validateArchivePickerSize(picked.assets[0]); const base64 = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 }); const parsed = await parseProjectArchive(base64); const candidate = mergeParsedProjectArchive(conversationStateRef.current, parsed); await commitCandidateState(candidate); setIsWorkspaceManagerOpen(false); setError('Project archive transaction committed and durable read-back verified.'); } catch (projectError) { setError(projectError.message || 'Project archive rejected; existing state was retained where rollback verified.'); } };
  const handleExportPrompts = async () => { try { const payload = safePromptExport(conversationState.promptLibrary); const uri = `${FileSystem.cacheDirectory}AI_Console_Protected_Prompts_${Date.now()}.json`; await FileSystem.writeAsStringAsync(uri, JSON.stringify(payload, null, 2), { encoding: FileSystem.EncodingType.UTF8 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/json' }); else setError(`Protected prompt export created at ${uri}`); } catch (promptError) { setError(promptError.message || 'Protected prompt export failed.'); } };
  const handleImportPrompts = async () => { try { const picked = await DocumentPicker.getDocumentAsync({ type: 'application/json', copyToCacheDirectory: true }); if (picked.canceled) return; const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri); const prompts = parsePromptImport(raw, true); const current = conversationStateRef.current; const candidate = { ...current, promptLibrary: mergePromptLibraries(current.promptLibrary, prompts) }; await commitCandidateState(candidate); setError('Protected prompt import merged transactionally and durable read-back verified.'); } catch (promptError) { setError(promptError.message || 'Protected prompt import failed; existing library was retained where rollback verified.'); } };
  const handleDurableWorkspaceRename = async (id, name) => { try { const candidate = renameWorkspace(conversationStateRef.current, id, name); await commitCandidateState(candidate); triggerHaptic(hapticsEnabled); } catch (renameError) { setError(renameError.message || 'Workspace rename could not be durably verified.'); } };
  const handleAddMessageToDocument = (message) => { setDocumentTargetMessage(message); setDocumentTargetOpen(true); };
  const commitMessageToDocument = (documentId, placement = { mode: 'append' }) => { const doc = (conversationState.documents || []).find((item) => item.id === documentId); if (!doc || !documentTargetMessage) return; const updated = placeVisibleChatMessage(doc, documentTargetMessage, placement); setConversationState((previous) => normaliseCState({ ...previous, activeDocumentId: documentId, documents: previous.documents.map((item) => item.id === documentId ? updated : item) })); setDocumentTargetMessage(null); setPrimaryDestination('documents'); triggerHaptic(hapticsEnabled); };
  const createDocumentFromMessage = () => { if (!documentTargetMessage) return; const doc = createDocument({ workspaceId: conversationState.activeWorkspaceId, title: 'Chat extract' }); const updated = placeVisibleChatMessage(doc, documentTargetMessage); setConversationState((previous) => normaliseCState({ ...previous, documents: [...(previous.documents || []), updated], activeDocumentId: updated.id })); setDocumentTargetMessage(null); setPrimaryDestination('documents'); triggerHaptic(hapticsEnabled); };
  const handleDocumentPreview = async (doc) => { try { await previewDocumentPdf(doc); } catch (previewError) { setError(previewError.message || 'Document preview failed.'); } };
  const handleDocumentExport = async (doc, format) => { try { const output = await exportDocument(doc, format); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(output.uri, { mimeType: output.mimeType, dialogTitle: `Export ${output.filename}` }); else setError(`Document exported to ${output.uri}`); } catch (exportError) { setError(exportError.message || 'Document export failed.'); } };
  const handleDocumentProjectExport = async (doc) => { try { const bytes = await createDocumentProjectArchive(conversationState, doc.id); const filename = documentProjectFilename(doc); const uri = `${FileSystem.cacheDirectory}${filename}`; await FileSystem.writeAsStringAsync(uri, bytesToBase64(bytes), { encoding: FileSystem.EncodingType.Base64 }); if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType: 'application/zip', dialogTitle: `Export ${filename}` }); else setError(`Document project exported to ${uri}`); } catch (exportError) { setError(exportError.message || 'Document project export failed.'); } };
  const handleDocumentProjectImport = async () => { try { const picked = await DocumentPicker.getDocumentAsync({ type: ['application/zip','application/octet-stream'], copyToCacheDirectory: true }); if (picked.canceled) return; await validateArchivePickerSize(picked.assets[0]); const base64 = await FileSystem.readAsStringAsync(picked.assets[0].uri, { encoding: FileSystem.EncodingType.Base64 }); const parsed = await parseDocumentProjectArchive(base64); const current = conversationStateRef.current; const candidate = mergeParsedDocumentProjectArchive(current, parsed, current.activeWorkspaceId); await commitCandidateState(candidate); setError('Document project transaction committed and durable read-back verified.'); } catch (importError) { setError(importError.message || 'Document project archive rejected; existing state was retained where rollback verified.'); } };
  const updateDocumentGenerationJob = (job) => {
    setDocumentGeneration(job);
    if (!job) return;
    setConversationState((previous) => ({ ...previous, documentGenerationJobs: [...(previous.documentGenerationJobs || []).filter((item) => item.id !== job.id && item.documentId !== job.documentId), { id: job.id, documentId: job.documentId, sectionId: job.sectionId || null, operation: job.operation, status: job.status, createdAt: job.createdAt, updatedAt: Date.now(), error: job.error || null }] }));
  };
  const handleAiDocumentOperation = (operation, doc, sectionId = null) => {
    if (!(apiKeyRef.current || apiKey).trim()) { setError('No API key loaded. Open the key icon, paste your OpenRouter key (sk-or-v1-...), and wait for “Saved securely”.'); requestProtectedSettingsAccess(); return; }
    if (!doc || (operation !== 'append' && !sectionId)) { setError(`Choose a target section before AI ${operation}.`); return; }
    if (documentGenerationRef.current?.stream && documentGenerationRef.current?.job?.status === 'STREAMING') { setError('A document generation is already active. Stop it before starting another.'); return; }
    const job = { id: `docjob-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, documentId: doc.id, sectionId, operation, status: 'STREAMING', createdAt: Date.now(), baseUpdatedAt: doc.updatedAt, error: null };
    updateDocumentGenerationJob(job);
    let result = '';
    const instruction = `Perform a ${operation} document operation. Return only the replacement or inserted document text.\n\nVisible document:\n${renderDocumentText(doc)}`;
    const stream = streamChatCompletion({ apiKey: apiKeyRef.current || apiKey, model, temperature, maxTokens, messages: [{ role:'system', content:effectiveSystemPrompt() }, { role:'user', content:instruction }], onDelta:(delta)=>{ if (documentGenerationRef.current?.job?.id === job.id) { result += delta; setDocumentGeneration((current) => current?.id === job.id ? { ...current, receivedCharacters: result.length } : current); } }, onDone:()=>{ const currentState = conversationStateRef.current; const currentDoc = (currentState.documents || []).find((item) => item.id === job.documentId); const targetExists = operation === 'append' || currentDoc?.sections?.some((section) => section.id === job.sectionId); if (!currentDoc || currentDoc.updatedAt !== job.baseUpdatedAt || !targetExists) { const failed={...job,status:'FAILED',error:'Document changed while AI generation was running; stale output was not applied.'}; documentGenerationRef.current=null; updateDocumentGenerationJob(failed); setError(failed.error); return; } setConversationState((previous)=>({ ...previous, documents: previous.documents.map((item)=>item.id===job.documentId?applyAiDocumentOperation(item,{operation,text:result,sectionId:job.sectionId}):item) })); const complete={...job,status:'COMPLETE'}; documentGenerationRef.current=null; updateDocumentGenerationJob(complete); }, onError:(aiError)=>{ const failed={...job,status:'FAILED',error:aiError.message || 'AI document operation failed.'}; documentGenerationRef.current=null; updateDocumentGenerationJob(failed); setError(failed.error); } });
    documentGenerationRef.current = { job, stream };
  };
  const stopDocumentGeneration = () => { const active = documentGenerationRef.current; if (!active?.job) return; try { active.stream?.cancel?.(); } catch (_) {} const cancelled={...active.job,status:'CANCELLED',error:'Stopped by user.'}; documentGenerationRef.current=null; updateDocumentGenerationJob(cancelled); };
  const retryDocumentGeneration = () => { const job = documentGeneration || (conversationState.documentGenerationJobs || []).find((item) => item.documentId === activeDocument?.id && ['FAILED','CANCELLED'].includes(item.status)); if (!job) return; const doc=(conversationStateRef.current.documents || []).find((item)=>item.id===job.documentId); if (!doc) { setError('The document for this generation no longer exists.'); return; } handleAiDocumentOperation(job.operation, doc, job.sectionId); };

  const startSpeechRecognition = async () => { const speechRecognition = cachedSpeechRecognitionModule; if (!speechRecognition || typeof speechRecognition.requestPermissionsAsync !== 'function' || typeof speechRecognition.start !== 'function') { setError('Speech recognition is unavailable in this build. Text input remains available.'); setIsListening(false); return; } try { const permission = await speechRecognition.requestPermissionsAsync(); if (!permission.granted) { setError('Microphone permission is required for speech-to-text.'); return; } await prepareRecordingAudioSession(); voiceDraftRef.current = ''; setVoiceDraft(''); setVoiceReviewOpen(false); const speechOptions = { lang: 'en-GB', interimResults: true, addsPunctuation: true, continuous: true }; speechOptions.lang = voiceLocale || speechOptions.lang; speechRecognition.start(speechOptions); setIsListening(true); } catch (_) { setError('Speech recognition is unavailable on this device. Text input remains available.'); setIsListening(false); } };
  const toggleSpeechRecognition = async () => { const speechRecognition = cachedSpeechRecognitionModule; if (isListening) { try { speechRecognition?.stop?.(); } catch (_) { setError('Speech recognition could not be stopped cleanly.'); } setIsListening(false); try { await preparePlaybackAudioSession(); } catch (_) {} return; } await startSpeechRecognition(); };
  const acceptVoiceTranscript = () => { const transcript = voiceDraft.trim(); if (transcript) setInput((current) => current.trim() ? `${current.trim()}\n${transcript}` : transcript); voiceDraftRef.current = ''; setVoiceDraft(''); setVoiceReviewOpen(false); };
  const cancelVoiceTranscript = () => { voiceDraftRef.current = ''; setVoiceDraft(''); setVoiceReviewOpen(false); };
  const retryVoiceTranscript = async () => { cancelVoiceTranscript(); await startSpeechRecognition(); };

  if (!hydrated) return <View style={[styles.appRoot, styles.centerFill]}><StatusBar style={colorMode === 'light' ? 'dark' : 'light'} /></View>;
  return <View style={styles.appRoot} testID="ai-console-app-ready"><StatusBar style={colorMode === 'light' ? 'dark' : 'light'} /><KeyboardAvoidingView style={styles.keyboardAvoider} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}><View style={[styles.safe, { paddingTop: insets.top }]}>
    <View style={styles.header}><TouchableOpacity ref={chatManagerTriggerRef} style={styles.headerLeft} onPress={() => primaryDestination === 'chats' ? setIsChatManagerOpen(true) : requestPrimaryDestination('chats')} accessibilityLabel={primaryDestination === 'chats' ? 'Manage conversations' : 'Return to chats'} accessibilityRole="button"><View style={styles.headerLogo}>{primaryDestination === 'documents' ? <IconDocument /> : primaryDestination === 'workspaces' ? <IconWorkspace /> : primaryDestination === 'settings' ? <IconSettings /> : <IconBot />}</View><View><Text style={styles.headerTitle} numberOfLines={1}>{primaryDestination === 'chats' ? (activeChat?.title || BRAND.shortName) : primaryDestination === 'documents' ? (activeDocument?.title || 'Document Studio') : primaryDestination === 'workspaces' ? (activeWorkspace?.name || 'Workspaces') : 'Settings'}</Text><Text style={styles.headerModel} numberOfLines={1}>{primaryDestination === 'chats' ? `${currentModelName()} · ${APP_RELEASE_LABEL}` : APP_RELEASE_LABEL}</Text></View></TouchableOpacity><View style={styles.headerRight}>{primaryDestination === 'chats' && <View style={styles.tokenPill}><Text style={styles.tokenText}>TKS:{estimateTokens(messages)}</Text></View>}<TouchableOpacity ref={protectedSettingsTriggerRef} style={styles.settingsBtn} onPress={requestProtectedSettingsAccess} accessibilityLabel="Open PIN protected AI and prompt settings" accessibilityRole="button"><IconKey size={19} color={palette.cyanBright} /></TouchableOpacity></View></View>
    <FeedbackBanner message={error} tone={/fail|error|reject|unable|incorrect/i.test(error) ? 'error' : 'info'} onClose={() => setError('')} palette={palette} />
    {anyGeneration && <FeedbackBanner message={`Generation ${String(anyGeneration.status || '').toLowerCase().replace('_',' ')}${anyGeneration.chatId === activeChat?.id ? '' : ' in another chat'}.`} tone={anyGeneration.status === 'FAILED' ? 'error' : 'info'} actionLabel={['QUEUED','STREAMING','CANCELLING'].includes(anyGeneration.status) ? 'Stop' : undefined} onAction={['QUEUED','STREAMING','CANCELLING'].includes(anyGeneration.status) ? () => stopGenerationForChat(anyGeneration.chatId) : undefined} palette={palette} />}
    <View style={[styles.mainShell, layout !== 'compact' && styles.mainShellWide]}>
      {layout !== 'compact' && <PrimaryNavigation items={navigationItems} active={primaryDestination} onSelect={(id) => { triggerHaptic(hapticsEnabled); requestPrimaryDestination(id); }} palette={palette} vertical />}
      <View style={styles.destinationArea}>
      {primaryDestination === 'chats' && <><View style={styles.conversationArea}>{activeBranches.length > 1 && <View style={styles.branchBar} accessibilityLabel="Conversation branches"><Text style={styles.branchLabel}>Branch</Text>{activeBranches.map((id,index)=><TouchableOpacity key={id} style={[styles.branchChip,activeChat?.activeBranchId===id&&styles.branchChipActive]} onPress={()=>setConversationState((previous)=>setActiveBranch(previous,activeChat.id,id))} accessibilityRole="button" accessibilityState={{selected:activeChat?.activeBranchId===id}}><Text style={styles.branchChipText}>{index===0?'Main':`Branch ${index}`}</Text></TouchableOpacity>)}</View>}{bookmarkViewerOpen && <View style={styles.bookmarkPanel}><View style={styles.bookmarkHeader}><Text style={styles.branchLabel}>Bookmarks</Text><TouchableOpacity style={styles.miniAction} onPress={()=>setBookmarkViewerOpen(false)} accessibilityRole="button"><Text style={styles.miniActionText}>Close</Text></TouchableOpacity></View>{(activeChat?.bookmarks||[]).length===0?<Text style={styles.queueText}>No bookmarks in this chat.</Text>:(activeChat.bookmarks||[]).map((id)=>{const item=activeChat.messages.find((message)=>message.messageId===id);return item?<Text key={id} style={styles.queueText} numberOfLines={3}>{item.role}: {item.content}</Text>:null;})}</View>}{messages.length === 0 ? <View style={styles.emptyState}><View style={styles.emptyIcon}><IconBot color={palette.cyanBright} /></View><Text style={styles.emptyEyebrow}>COMMAND CENTRE</Text><Text style={styles.emptyTitle}>Command Centre Ready</Text><Text style={styles.emptySubtitle}>Issue orders, run document ops, or stage local intelligence. Your workspace stays on this device.</Text><TouchableOpacity style={styles.emptyBtn} onPress={handleCreateChat} accessibilityRole="button"><Text style={styles.emptyBtnText}>Open Channel</Text></TouchableOpacity></View> : <FlatList ref={listRef} data={messages} keyExtractor={(item) => item.messageId} renderItem={({ item }) => <MessageBubble message={item} isStreamingEmpty={isLoading && item.messageId === activeGeneration?.targetMessageId && !item.content} retryAvailable={['FAILED','CANCELLED'].includes(activeGeneration?.status) && activeGeneration?.targetMessageId === item.messageId} palette={palette} onRetry={() => handleRetryGeneration(item)} onRegenerate={() => handleRegenerate(item)} onDownload={() => handleExport('md', [item])} onShare={() => handleExport('txt', [item])} onContinue={() => setInput('Continue the previous response.')} onBranch={() => { if (item.role === 'assistant') handleRegenerate(item); else { setInput(item.content); setEditSourceMessageId(item.messageId); } }} onBookmark={() => updateChat(activeChat.id, (chat) => ({ ...chat, bookmarks: Array.from(new Set([...(chat.bookmarks || []), item.messageId])) }))} onQuote={() => setInput(`> ${item.content}\n\n`)} onEdit={() => { setInput(item.content); setEditSourceMessageId(item.messageId); }} onResubmit={() => { setInput(item.content); setEditSourceMessageId(item.messageId); }} onSpeak={() => handleSpeakMessage(item)} onAddToDocument={() => handleAddMessageToDocument(item)} onDelete={() => Alert.alert('Delete message?', 'Delete this message and all descendant branch messages?', [{text:'Cancel',style:'cancel'},{text:'Delete',style:'destructive',onPress:()=>setConversationState((previous)=>removeMessage(previous,activeChat.id,item.messageId))}])} />} contentContainerStyle={styles.messageList} onScroll={(event)=>{const {contentOffset,contentSize,layoutMeasurement}=event.nativeEvent;isNearBottomRef.current=(contentSize.height-layoutMeasurement.height-contentOffset.y)<96;}} scrollEventThrottle={100} onContentSizeChange={()=>{if(isNearBottomRef.current)scrollToBottom();}} />}</View>
      <View style={styles.composerAvoider}><View style={styles.inputArea}><View style={styles.composerMetaRow}>{(activeChat?.bookmarks||[]).length>0&&<TouchableOpacity style={styles.miniAction} onPress={()=>setBookmarkViewerOpen((value)=>!value)} accessibilityRole="button"><Text style={styles.miniActionText}>{(activeChat.bookmarks||[]).length} bookmarks</Text></TouchableOpacity>}{pendingPromptContext&&<View style={styles.promptStage}><Text style={styles.promptStageText}>{pendingPromptContext.role}: {pendingPromptContext.name}</Text><TouchableOpacity onPress={()=>setPendingPromptContext(null)} style={styles.miniAction} accessibilityRole="button"><Text style={styles.miniActionText}>Clear</Text></TouchableOpacity></View>}</View>{activeQueuedTurns.map((turn)=><View key={turn.id} style={styles.queueRow}><View style={styles.queueBody}><Text style={styles.queueTitle}>{turn.status} draft</Text><Text style={styles.queueText} numberOfLines={2}>{turn.content || (turn.attachments||[]).map((file)=>file.name).join(', ') || 'Attachment draft'}</Text>{turn.error&&<Text style={styles.queueError}>{turn.error}</Text>}</View>{['FAILED','CANCELLED'].includes(turn.status)&&<TouchableOpacity style={styles.miniAction} onPress={()=>retryQueuedTurn(turn.id)} accessibilityRole="button"><Text style={styles.miniActionText}>Retry</Text></TouchableOpacity>}{!['SENT','CANCELLED'].includes(turn.status)&&<TouchableOpacity style={styles.miniAction} onPress={()=>cancelQueuedTurn(turn.id)} accessibilityRole="button"><Text style={styles.miniActionText}>Cancel</Text></TouchableOpacity>}</View>)}{attachmentSession.files.map((file) => <View key={file.id} style={styles.attachmentChip}><Text style={styles.attachmentText} numberOfLines={1}>{file.kind}: {file.name} · {file.status.toLowerCase()}</Text><TouchableOpacity style={styles.attachmentMove} onPress={() => handleMoveAttachment(file.id, -1)} accessibilityRole="button" accessibilityLabel={`Move ${file.name} earlier`}><Text style={styles.attachmentMoveText}>↑</Text></TouchableOpacity><TouchableOpacity style={styles.attachmentMove} onPress={() => handleMoveAttachment(file.id, 1)} accessibilityRole="button" accessibilityLabel={`Move ${file.name} later`}><Text style={styles.attachmentMoveText}>↓</Text></TouchableOpacity><TouchableOpacity style={styles.inlineClose} onPress={() => { attachmentExtractsRef.current.delete(file.id); setAttachmentSession((previous) => removeAttachment(previous, file.id)); }} accessibilityRole="button" accessibilityLabel={`Remove attachment ${file.name}`}><IconClose size={16} color={palette.textMuted} /></TouchableOpacity></View>)}{isListening && <Text style={styles.listeningText} accessibilityLiveRegion="polite">Listening in {voiceLocale}… {voiceDraft ? `“${voiceDraft}”` : 'tap the microphone again to stop and review.'}</Text>}{offlineMode && <Text style={styles.offlineText} accessibilityLiveRegion="polite">Offline mode: drafts queue locally. Visible attachment metadata is retained; files must be reattached before a queued attachment draft can send.</Text>}{(isSpeaking || isGeneratingImage) && <View style={styles.haltRow}>
  {isSpeaking && <TouchableOpacity style={styles.haltBtn} onPress={handleStopSpeech} accessibilityRole="button"><Text style={styles.haltBtnText}>Stop speaking</Text></TouchableOpacity>}
  {isGeneratingImage && <Text style={styles.listeningText} accessibilityLiveRegion="polite">Creating image…</Text>}
</View>}
{isLoading && <View style={styles.haltRow}><TouchableOpacity style={styles.haltBtn} onPress={stopGeneration} accessibilityRole="button"><IconStop /><Text style={styles.haltBtnText}>Stop Generating</Text></TouchableOpacity></View>}<View style={styles.inputRow}><TouchableOpacity ref={attachmentTriggerRef} onPress={() => setIsAttachmentSourceOpen(true)} disabled={isLoading} style={styles.iconInputBtn} accessibilityLabel="Add document, upload image, camera photo, or create image" accessibilityRole="button"><IconUpload size={19} color={palette.textMuted} /></TouchableOpacity><TextInput value={input} onChangeText={setInput} placeholder={editSourceMessageId ? 'Edit message before resubmitting…' : 'Ask anything…'} placeholderTextColor={palette.textFaint} editable={!isLoading} multiline onFocus={() => requestAnimationFrame(scrollToBottom)} style={styles.textInput} accessibilityLabel="Message" /><TouchableOpacity ref={voiceTriggerRef} onPress={toggleSpeechRecognition} disabled={isLoading} style={[styles.iconInputBtn, isListening && styles.micBtnActive]} accessibilityLabel={isListening ? 'Stop speech recognition' : 'Start speech recognition'} accessibilityRole="button"><IconMic size={19} color={isListening ? '#ffffff' : palette.textMuted} /></TouchableOpacity><TouchableOpacity onPress={handleSendMessage} disabled={isLoading || (!input.trim() && !attachmentSession.files.length)} style={[styles.sendBtn, (isLoading || (!input.trim() && !attachmentSession.files.length)) && styles.sendBtnDisabled]} accessibilityLabel="Send message" accessibilityRole="button"><IconSend /></TouchableOpacity></View><TouchableOpacity style={styles.offlineToggle} onPress={() => setOfflineMode((value) => !value)} accessibilityRole="switch" accessibilityState={{ checked: offlineMode }}><Text style={styles.uploadHint}>{offlineMode ? 'Offline drafts enabled — tap to resume online sending' : 'Attach multiple text/ZIP sources one at a time (each up to 25 MB); request context is safely bounded and transient. Tap to queue local drafts.'}</Text></TouchableOpacity></View></View></>}
      {primaryDestination === 'workspaces' && <ScrollView contentContainerStyle={styles.domainPage}><Text style={styles.domainTitle}>Workspaces</Text><Text style={styles.domainDetail}>Organise chats, documents, retained metadata, notes and project exports. AI configuration remains PIN protected.</Text><TouchableOpacity ref={workspaceManagerTriggerRef} style={styles.domainPrimary} onPress={() => setIsWorkspaceManagerOpen(true)} accessibilityRole="button" accessibilityLabel="Open workspace manager"><Text style={styles.domainPrimaryText}>Manage workspaces</Text></TouchableOpacity>{conversationState.workspaces.map((workspace) => <TouchableOpacity key={workspace.id} onPress={() => { selectWorkspace(workspace.id); triggerHaptic(hapticsEnabled); }} style={[styles.domainCard, workspace.id === conversationState.activeWorkspaceId && styles.domainCardActive]} accessibilityRole="button" accessibilityState={{selected:workspace.id===conversationState.activeWorkspaceId}}><Text style={styles.domainCardTitle}>{workspace.name}</Text><Text style={styles.domainDetail}>{workspace.chatIds?.length || 0} chats · {workspace.documentIds?.length || 0} documents · {workspace.archived ? 'Archived' : 'Active'}</Text></TouchableOpacity>)}</ScrollView>}
      {primaryDestination === 'documents' && <DocumentStudio documents={conversationState.documents || []} revisions={conversationState.documentRevisions || []} activeDocumentId={conversationState.activeDocumentId} workspaceId={conversationState.activeWorkspaceId} onSelectDocument={(id) => setConversationState((previous) => ({...previous,activeDocumentId:id}))} onChangeDocuments={(documents) => setConversationState((previous) => normaliseCState({...previous,documents}))} onChangeRevisions={(documentRevisions) => setConversationState((previous) => ({...previous,documentRevisions}))} onPreview={handleDocumentPreview} onExport={handleDocumentExport} onExportProject={handleDocumentProjectExport} onImportProject={handleDocumentProjectImport} onAiOperation={handleAiDocumentOperation} documentGeneration={activeDocumentGeneration} onStopAi={stopDocumentGeneration} onRetryAi={retryDocumentGeneration} onDeleteDocument={(id) => setConversationState((previous) => deleteDocumentFromState(previous, id))} palette={palette} layout={layout} />}
      {primaryDestination === 'settings' && <ScrollView contentContainerStyle={styles.domainPage}><Text style={styles.domainTitle}>Settings</Text><Text style={styles.domainDetail}>General device, accessibility, voice, export and backup controls are separate from protected Provider & Prompt Settings.</Text><TouchableOpacity ref={settingsTriggerRef} style={styles.domainPrimary} onPress={() => setIsSettingsOpen(true)} accessibilityRole="button"><Text style={styles.domainPrimaryText}>Open Command Centre settings</Text></TouchableOpacity><TouchableOpacity style={styles.domainCard} onPress={requestProtectedSettingsAccess} accessibilityRole="button"><Text style={styles.domainCardTitle}>Provider & Prompt Settings</Text><Text style={styles.domainDetail}>PIN protected provider, model, generation, prompt and project-AI configuration.</Text></TouchableOpacity><View style={styles.domainCard}><Text style={styles.domainCardTitle}>Secure API-key persistence</Text><Text style={styles.domainDetail}>{apiKeyPersistenceStatus === 'SAVED_SECURELY' ? 'Saved securely' : apiKeyPersistenceStatus === 'SESSION_ONLY' ? 'Session only — SecureStore persistence failed' : apiKeyPersistenceStatus === 'READ_FAILED' ? 'Secure storage read failed — existing key was not modified' : apiKeyPersistenceStatus === 'READ_OK' ? 'Secure storage read successfully' : 'Not yet verified this session'}</Text></View></ScrollView>}
      </View>
    </View>
    {layout === 'compact' && (
      <View style={{ paddingBottom: Math.max(insets.bottom, 0) }}>
        <PrimaryNavigation items={navigationItems} active={primaryDestination} onSelect={(id) => { triggerHaptic(hapticsEnabled); requestPrimaryDestination(id); }} palette={palette} />
      </View>
    )}
  </View></KeyboardAvoidingView>
  <SettingsSheet visible={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} onExportChat={() => handleExport('txt')} onExportPdf={() => handleExportPdf(PDF_LAYOUTS.POLISHED)} onExportPdfCompact={() => handleExportPdf(PDF_LAYOUTS.COMPACT)} onCreateDocumentZip={handleCreateDocumentZip} onClearChat={() => { if (activeChat) Alert.alert('Clear chat?', 'Delete every message in this chat? This cannot be undone.', [{text:'Cancel',style:'cancel'},{text:'Clear',style:'destructive',onPress:()=>{stopGenerationForChat(activeChat.id);updateChat(activeChat.id,(chat)=>({...chat,messages:[],bookmarks:[]}));}}]); }} onExportData={() => handleExport('json')} onImportData={handleImport} onBackup={handleBackup} onRestore={handleRestore} dataStats={{ chats: chats.length, archived: chats.filter((chat) => chat.archived).length, attachments: chats.reduce((total, chat) => total + chat.messages.filter((message) => message.attachment).length, 0), queued: conversationState.offlineQueue.length, schema: conversationState.storageSchemaVersion }} colorMode={colorMode} onToggleColorMode={() => setColorMode((mode) => (mode === 'dark' ? 'light' : 'dark'))} offlineMode={offlineMode} onToggleOfflineMode={() => setOfflineMode((v) => !v)} voiceLocale={voiceLocale} onChangeVoiceLocale={setVoiceLocale} playbackSpeed={playbackSpeed} onChangePlaybackSpeed={setPlaybackSpeed} onStopSpeech={handleStopSpeech} hapticsEnabled={hapticsEnabled} onToggleHaptics={setHapticsEnabled} returnFocusRef={settingsTriggerRef} palette={palette} />
  <LLMSettingsSheet visible={isLLMSettingsOpen} onClose={() => { setIsModelPickerOpen(false); setIsLLMSettingsOpen(false); }} apiKey={apiKey} onChangeApiKey={setApiKeyState} currentModelName={currentModelName()} onOpenModelPicker={() => setIsModelPickerOpen(true)} systemPrompt={systemPrompt} onChangeSystemPrompt={setSystemPrompt} temperature={temperature} onChangeTemperature={setTemperature} maxTokens={maxTokens} onChangeMaxTokens={(value) => setMaxTokens(normaliseOutputTokens(value))} isFetchingModels={isFetchingModels} onSyncModels={handleSyncModels} onChangePin={() => { setIsLLMSettingsOpen(false); setPinGateMode('change'); setPinGateOpen(true); }} onOpenProtectedWorkspaceTools={() => setIsProtectedWorkspaceToolsOpen(true)} apiKeyPersistenceStatus={apiKeyPersistenceStatus} returnFocusRef={protectedSettingsTriggerRef} palette={palette} />
  <AttachmentSourceSheet visible={isAttachmentSourceOpen} onClose={() => setIsAttachmentSourceOpen(false)} onDocument={handlePickFile} onCamera={handleAddCamera} onGallery={handleAddGallery} onGenerateImage={handleGenerateImage} returnFocusRef={attachmentTriggerRef} palette={palette} />
  <PdfReviewSheet visible={Boolean(pdfReview)} job={pdfReview?.job} selectedPages={pdfSelectedPages} onTogglePage={handleTogglePdfPage} onUse={handleUsePdfPages} onCancel={handleCancelPdfReview} returnFocusRef={attachmentTriggerRef} palette={palette} />
  <VoiceReviewSheet visible={voiceReviewOpen} transcript={voiceDraft} onChangeTranscript={(value) => { voiceDraftRef.current = value; setVoiceDraft(value); }} onAccept={acceptVoiceTranscript} onRetry={retryVoiceTranscript} onCancel={cancelVoiceTranscript} returnFocusRef={voiceTriggerRef} palette={palette} />
  <DocumentTargetSheet visible={documentTargetOpen} documents={(conversationState.documents || []).filter((doc) => doc.workspaceId === conversationState.activeWorkspaceId && doc.status !== 'ARCHIVED')} onClose={() => setDocumentTargetOpen(false)} onSelect={commitMessageToDocument} onCreateNew={createDocumentFromMessage} palette={palette} />
  <PinGateModal visible={pinGateOpen} mode={pinGateMode} onClose={() => setPinGateOpen(false)} onSubmit={handlePinSubmit} returnFocusRef={protectedSettingsTriggerRef} palette={palette} /><ModelPicker visible={isModelPickerOpen && isLLMSettingsOpen} onClose={() => setIsModelPickerOpen(false)} modelGroups={modelGroups} selectedId={model} onSelect={setModel} returnFocusRef={protectedSettingsTriggerRef} palette={palette} /><ChatManager visible={isChatManagerOpen} onClose={() => setIsChatManagerOpen(false)} chats={chats} activeChatId={activeChat?.id} generationChatIds={Object.values(generations).filter((job) => !['COMPLETE', 'FAILED', 'CANCELLED'].includes(job.status)).map((job) => job.chatId)} onSelect={(id) => { setConversationState((previous) => ({ ...previous, activeChatId: id })); setInput(''); setAttachmentSession(createAttachmentSession()); attachmentExtractsRef.current.clear(); }} onCreate={handleCreateChat} onRename={(id, title) => updateChat(id, (chat) => ({ ...chat, title }))} onDelete={handleDeleteChat} onTogglePin={(id, value) => updateChat(id, (chat) => setPinned(chat, value))} onToggleArchive={(id, value) => updateChat(id, (chat) => setArchived(chat, value))} onSetTags={(id, tags) => updateChat(id, (chat) => setTags(chat, tags))} onAssignFolder={(id, folder) => { setConversationState((previous) => ({ ...previous, folders: previous.folders.some((item) => item.id === folder.id) ? previous.folders : [...previous.folders, folder] })); updateChat(id, (chat) => assignFolder(chat, folder)); }} onBulkArchive={(ids) => setConversationState((previous) => { const scoped = new Set(previous.chats.filter((chat) => chat.workspaceId === previous.activeWorkspaceId).map((chat) => chat.id)); return { ...previous, chats: bulkArchive(previous.chats, ids.filter((id) => scoped.has(id))) }; })} onBulkDelete={handleBulkDeleteChats} onCreateWorkflowChild={handleCreateWorkflowChild} onCycleWorkflowStatus={handleCycleWorkflowStatus} folders={conversationState.folders} returnFocusRef={chatManagerTriggerRef} palette={palette} />
  <WorkspaceManager visible={isWorkspaceManagerOpen} onClose={() => setIsWorkspaceManagerOpen(false)} workspaces={conversationState.workspaces} activeWorkspaceId={conversationState.activeWorkspaceId} onCreate={(name) => setConversationState((previous) => addWorkspace(previous, { name }))} onSelect={selectWorkspace} onRename={handleDurableWorkspaceRename} onArchive={(id, archived) => setConversationState((previous) => archiveWorkspace(previous, id, archived))} onDelete={(id) => setConversationState((previous) => deleteWorkspace(previous, id))} onAddNote={(id, content) => setConversationState((previous) => addWorkspaceNote(previous, id, content))} onExport={handleExportProject} onImport={handleImportProject} returnFocusRef={workspaceManagerTriggerRef} palette={palette} />
  <ProtectedWorkspaceTools visible={isLLMSettingsOpen && isProtectedWorkspaceToolsOpen} onClose={() => setIsProtectedWorkspaceToolsOpen(false)} promptLibrary={conversationState.promptLibrary} workspaces={conversationState.workspaces} activeWorkspaceId={conversationState.activeWorkspaceId} onAddPrompt={(values) => setConversationState((previous) => ({ ...previous, promptLibrary: addPrompt(previous.promptLibrary, createPrompt(values), true) }))} onDeletePrompt={(id) => setConversationState((previous) => ({ ...previous, promptLibrary: deletePrompt(previous.promptLibrary, id, true) }))} onUpdatePrompt={(id, patch) => setConversationState((previous) => ({ ...previous, promptLibrary: updatePrompt(previous.promptLibrary, id, patch, true) }))} onDuplicatePrompt={(id) => setConversationState((previous) => ({ ...previous, promptLibrary: duplicatePrompt(previous.promptLibrary, id, true) }))} onExportPrompts={handleExportPrompts} onImportPrompts={handleImportPrompts} onUsePrompt={(prompt, substitutions = {}) => { if (!promptAppliesToWorkspace(prompt, conversationState.activeWorkspaceId)) { setError('This prompt is not authorised for the active workspace.'); return; } const expanded = expandPromptVariables(prompt, substitutions); if (['system','developer'].includes(prompt.role)) { setPendingPromptContext({ role: prompt.role, content: expanded, name: prompt.name }); setError(`${prompt.role} prompt staged for the next provider request.`); } else { setPendingPromptContext(null); setInput(expanded); } setIsProtectedWorkspaceToolsOpen(false); }} onUpdateProjectAI={(workspaceId, projectAIConfiguration) => updateWorkspace(workspaceId, (workspace) => ({ ...workspace, projectAIConfiguration }))} returnFocusRef={protectedSettingsTriggerRef} palette={palette} />
  </View>;
}

export default function App() {
  return <AppErrorBoundary><AIConsoleApp /></AppErrorBoundary>;
}

const createStyles = (colors) => StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: colors.bg }, keyboardAvoider: { flex: 1 }, centerFill: { alignItems: 'center', justifyContent: 'center' }, safe: { flex: 1, minHeight: 0 }, header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border, backgroundColor: colors.bgHeader, elevation: 4, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 2 }, zIndex: 2 }, headerLeft: { flex: 1, minWidth: 0, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginRight: 6 }, headerLogo: { width: 42, height: 42, borderRadius: 15, backgroundColor: colors.cyan, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, headerTitle: { flexShrink: 1, fontSize: 16, fontWeight: '800', letterSpacing: -0.25, color: colors.textPrimary }, headerModel: { flexShrink: 1, fontSize: 10, fontWeight: '700', color: colors.cyanBright, letterSpacing: 0.7, textTransform: 'uppercase' }, headerRight: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 5 }, tokenPill: { maxWidth: 64, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: colors.panelAlt, borderWidth: 1, borderColor: colors.border, borderRadius: radii.pill }, tokenText: { fontSize: 9, fontFamily: 'monospace', color: colors.textMuted, fontWeight: '700' }, settingsBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.panelAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 15, elevation: 1, shadowColor: colors.shadow, shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } }, workspaceButtonText: { color: colors.cyanBright, fontSize: 10, fontWeight: '800' }, toast: { position: 'absolute', top: 68, left: 12, right: 12, backgroundColor: colors.roseToast, borderRadius: radii.md, paddingLeft: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8, zIndex: 30 }, toastText: { flex: 1, color: '#ffffff', fontSize: 12, fontWeight: '600' }, toastClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 }, emptyIcon: { width: 76, height: 76, borderRadius: 26, backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyanBorder, alignItems: 'center', justifyContent: 'center', marginBottom: 8, elevation: 2, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, emptyEyebrow: { color: colors.cyanBright, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 }, emptyTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.4, color: colors.textPrimary }, emptySubtitle: { fontSize: 12, color: colors.textFaint, textAlign: 'center', lineHeight: 18 }, emptyBtn: { marginTop: 16, minHeight: 52, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: colors.cyan, borderWidth: 0, borderRadius: 16, elevation: 4, shadowColor: colors.shadow, shadowOpacity: 0.18, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }, emptyBtnText: { fontSize: 12, fontWeight: '800', color: '#ffffff' }, conversationArea: { flex: 1, minHeight: 0 }, messageList: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 }, composerAvoider: { flexShrink: 0 }, inputArea: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, backgroundColor: colors.bgHeader }, attachmentChip: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, alignSelf: 'flex-start', maxWidth: '100%', marginBottom: 8, paddingLeft: 12, backgroundColor: colors.cyanDim, borderWidth: 1, borderColor: colors.cyanBorder, borderRadius: radii.pill }, attachmentText: { flex: 1, minWidth: 0, fontSize: 11, fontWeight: '600', color: colors.textSecondary }, attachmentMove: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, attachmentMoveText: { color: colors.cyanBright, fontSize: 16, fontWeight: '800' }, inlineClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }, listeningText: { marginBottom: 8, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.rose }, offlineText: { marginBottom: 8, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.cyanBright }, haltRow: { alignItems: 'center', marginBottom: 10 }, haltBtn: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.borderLight, paddingHorizontal: 16, borderRadius: radii.pill }, haltBtnText: { fontSize: 11, fontWeight: '700', color: colors.rose }, inputRow: { flexDirection: 'row', alignItems: 'flex-end', backgroundColor: colors.panel, borderWidth: 1, borderColor: colors.border, borderRadius: 24, paddingHorizontal: 6, paddingVertical: 6, elevation: 4, shadowColor: colors.shadow, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 3 } }, iconInputBtn: { width: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md }, micBtnActive: { backgroundColor: colors.rose }, textInput: { flex: 1, maxHeight: 120, minHeight: 48, paddingVertical: 10, color: colors.textSecondary, fontSize: 14 }, sendBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan, borderRadius: 16, marginLeft: 2, elevation: 3, shadowColor: colors.shadow, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, sendBtnDisabled: { backgroundColor: colors.border }, uploadHint: { marginTop: 6, textAlign: 'center', fontSize: 10, color: colors.textFaint }, offlineToggle: { minHeight: 48, justifyContent: 'center' }, branchBar:{minHeight:52,flexDirection:'row',alignItems:'center',gap:6,paddingHorizontal:12,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.bg},branchLabel:{color:colors.textMuted,fontSize:10,fontWeight:'800',textTransform:'uppercase'},branchChip:{minHeight:40,paddingHorizontal:10,justifyContent:'center',borderRadius:radii.pill,borderWidth:1,borderColor:colors.border,backgroundColor:colors.panel},branchChipActive:{borderColor:colors.cyanBright,backgroundColor:colors.cyanDim},branchChipText:{color:colors.textSecondary,fontSize:10,fontWeight:'700'},bookmarkPanel:{padding:10,gap:6,borderBottomWidth:1,borderBottomColor:colors.border,backgroundColor:colors.panelAlt},bookmarkHeader:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},composerMetaRow:{flexDirection:'row',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:4},miniAction:{minHeight:40,paddingHorizontal:10,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.border,borderRadius:radii.pill,backgroundColor:colors.panelAlt},miniActionText:{color:colors.cyanBright,fontSize:10,fontWeight:'700'},promptStage:{flex:1,minHeight:40,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8,paddingLeft:10,borderWidth:1,borderColor:colors.cyanBorder,borderRadius:radii.pill,backgroundColor:colors.cyanDim},promptStageText:{flex:1,color:colors.textSecondary,fontSize:10,fontWeight:'700'},queueRow:{minHeight:58,flexDirection:'row',alignItems:'center',gap:6,padding:8,marginBottom:6,borderWidth:1,borderColor:colors.border,borderRadius:radii.md,backgroundColor:colors.panelAlt},queueBody:{flex:1,minWidth:0},queueTitle:{color:colors.textSecondary,fontSize:10,fontWeight:'800'},queueText:{color:colors.textMuted,fontSize:10,lineHeight:15},queueError:{color:colors.rose,fontSize:10,lineHeight:15}, mainShell: { flex: 1, minHeight: 0 }, mainShellWide: { flexDirection: 'row' }, destinationArea: { flex: 1, minWidth: 0, minHeight: 0 }, domainPage: { padding: 16, gap: 12, paddingBottom: 64 }, domainTitle: { color: colors.textPrimary, fontSize: 24, fontWeight: '800' }, domainDetail: { color: colors.textMuted, fontSize: 12, lineHeight: 18 }, domainPrimary: { minHeight: 52, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.cyan, borderRadius: radii.lg, elevation: 3, shadowColor: colors.shadow, shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } }, domainPrimaryText: { color: '#ffffff', fontSize: 13, fontWeight: '800' }, domainCard: { minHeight: 76, padding: 16, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radii.lg, backgroundColor: colors.surfaceElevated, elevation: 1, shadowColor: colors.shadow, shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } }, domainCardActive: { borderColor: colors.cyanBright, backgroundColor: colors.cyanDim }, domainCardTitle: { color: colors.textPrimary, fontSize: 14, fontWeight: '800', marginBottom: 3 },
});
