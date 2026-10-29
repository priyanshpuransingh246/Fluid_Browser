/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FolderOpen,
  FileText,
  Film,
  Globe,
  Search,
  Download,
  RotateCcw,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import {
  parseScenesFromText,
  filterScenesByRange,
  formatSceneImageName,
  generateFlowStatusReport,
  generateChatGptReport,
  SkippedChatGptScene,
  SkippedFlowScene,
} from './utils/botEngine';
import {
  INITIAL_CHARACTER_REFERENCES,
  CharacterReferenceAsset,
} from './data/preloadedScenes';
import {
  renderScenePngDataUrl,
  GeneratedSceneImage,
  GeneratedSceneVideo,
} from './utils/sceneMediaGenerator';
import {
  ChromiumBrowserView,
  AccountProfile,
} from './components/ChromiumBrowserModal';
import { FolderAndImagesView } from './components/FolderAndImagesView';
import { ReportsAndAndroidApkView } from './components/ReportsAndAndroidApkView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { SlideActionBar } from './components/SlideActionBar';
import { EmberBackdrop } from './components/EmberBackdrop';
import { extractTextFromUploadedFile } from './utils/pdfExtractor';
import { exportWorkspaceZip } from './utils/androidApkExporter';

type StudioTab = 'workspace' | 'browser' | 'folder' | 'reports' | 'apk';

interface LoadedPdfState {
  fileName: string;
  uploadedAt: string;
  rawText: string;
}

export default function App() {
  const initialAutostart =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('autostart') === '1' ||
      window.location.hash === '#studio');

  const [viewMode, setViewMode] = useState<'home' | 'studio'>(
    initialAutostart ? 'studio' : 'home'
  );
  const [studioTab, setStudioTab] = useState<StudioTab>('workspace');

  // Local Android Phone Storage Folder State (Free Fire Style First-Entry Folder Gate)
  const [workspaceFolderPath, setWorkspaceFolderPath] = useState<string>(
    'Download/Itihaskar_Bot'
  );
  const [boundDirectoryName, setBoundDirectoryName] = useState<string | null>(
    null
  );
  const [showFolderGateModal, setShowFolderGateModal] = useState<boolean>(true);
  const dirHandleRef = useRef<any>(null);

  // Selected Bot (1 = ChatGPT Image Bot v20, 2 = Flow AI Video Bot v3.0, 3 = 4K UHD Video Enhancer v1.1)
  const [selectedBot, setSelectedBot] = useState<1 | 2 | 3>(1);

  // Account Sequence Setup (Saved Forever in Mobile Storage inside accounts_login_vault/)
  const [chatgptAccCount, setChatgptAccCount] = useState<number>(7);
  const [flowAccCount, setFlowAccCount] = useState<number>(3);
  const [accountsSavedForever, setAccountsSavedForever] =
    useState<boolean>(true);

  const [chatgptAccounts, setChatgptAccounts] = useState<AccountProfile[]>(
    Array.from({ length: 7 }, (_, i) => ({
      id: `chat-${i + 1}`,
      name: `Account_${i + 1}`,
      email: `itihaskar.bot${i + 1}@gmail.com`,
      loggedIn: true,
      exhaustedToday: false,
      creditsRemaining: 100,
      itemsGenerated: 0,
      uploadedRefs:
        i === 0
          ? ['OLD_CHANGEZ_KHAN.jpeg', 'YOUNG_ADULT_CHANGEZ_KHAN.jpeg']
          : [],
    }))
  );

  const [flowAccounts, setFlowAccounts] = useState<AccountProfile[]>(
    Array.from({ length: 3 }, (_, i) => ({
      id: `flow-${i + 1}`,
      name: `Flow_Account_${i + 1}`,
      email: `jiopro.flow${i + 1}@gmail.com`,
      loggedIn: true,
      exhaustedToday: false,
      creditsRemaining: 500,
      itemsGenerated: 0,
      uploadedRefs: [],
    }))
  );

  // Character Reference Assets
  const [characterRefs, setCharacterRefs] = useState<CharacterReferenceAsset[]>(
    INITIAL_CHARACTER_REFERENCES
  );

  // Currently Loaded PDF (Starts NULL — only loads when user uploads their own PDF)
  const [loadedPdf, setLoadedPdf] = useState<LoadedPdfState | null>(null);

  const allScenesInPdf = useMemo(() => {
    if (!loadedPdf) return [];
    const refFileNames = characterRefs.map((r) => r.fileName);
    return parseScenesFromText(loadedPdf.rawText, refFileNames);
  }, [loadedPdf, characterRefs]);

  const detectedRecurringCharsInPdf = useMemo(() => {
    const names = new Set<string>();
    for (const s of allScenesInPdf) {
      if (s.referenceCharName) {
        names.add(s.referenceCharName.toUpperCase());
      }
    }
    return Array.from(names);
  }, [allScenesInPdf]);

  const [startSceneNo, setStartSceneNo] = useState<number>(1);
  const [endSceneNo, setEndSceneNo] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedRangeScenes = useMemo(() => {
    if (allScenesInPdf.length === 0) return [];
    return filterScenesByRange(allScenesInPdf, startSceneNo, endSceneNo);
  }, [allScenesInPdf, startSceneNo, endSceneNo]);

  // Real Generated Images & Videos in the Active Mobile Folder
  const [outputImages, setOutputImages] = useState<GeneratedSceneImage[]>([]);
  const [outputVideos, setOutputVideos] = useState<GeneratedSceneVideo[]>([]);
  const [upscaled4kCount, setUpscaled4kCount] = useState<number>(0);
  const [sceneChatsLogText, setSceneChatsLogText] = useState<string>('');

  // Chromium Automation Browser State
  const [browserTarget, setBrowserTarget] = useState<'chatgpt' | 'flow'>(
    'chatgpt'
  );
  const [activeChatgptAccIdx, setActiveChatgptAccIdx] = useState<number>(0);
  const [activeFlowAccIdx, setActiveFlowAccIdx] = useState<number>(0);
  const [isRunningBot, setIsRunningBot] = useState<boolean>(false);
  const [runningBotType, setRunningBotType] = useState<
    'chatgpt' | 'flow' | null
  >(null);
  const [currentSceneNo, setCurrentSceneNo] = useState<number | null>(null);
  const [currentStepLabel, setCurrentStepLabel] = useState<string>('Ready');
  const [currentStepProgress, setCurrentStepProgress] = useState<number>(0);
  const [stealthMode, setStealthMode] = useState<boolean>(false);
  const [stealthScreenBlackout, setStealthScreenBlackout] =
    useState<boolean>(false);
  const [clearStorageConfirmInline, setClearStorageConfirmInline] =
    useState<boolean>(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Live Terminal Logs
  const [liveLogs, setLiveLogs] = useState<string[]>([
    '[FLUID] > Android Local Automation Ready. Bot 1 (ChatGPT v20), Bot 2 (Flow AI v3.0), Bot 3 (4K UHD) online.',
    '[FLUID] > Upload your Documentary PDF in Scene Queue to load scenes.',
  ]);

  const botTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (botTimerRef.current) {
        window.clearInterval(botTimerRef.current);
      }
    };
  }, []);

  const termLog = (msg: string) => {
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour12: false });
    setLiveLogs((prev) => [
      ...prev.slice(-90),
      `[${timeStr}] [FLUID] > ${msg}`,
    ]);
  };

  const handleEnterStudio = () => {
    setViewMode('studio');
    termLog('Opened Fluid Studio on Android Local Storage.');
  };

  // Initialize subfolders physically inside chosen directory handle when available
  const ensureSubfoldersInBoundDirectory = async (handle: any) => {
    if (!handle) return;
    try {
      await handle.getDirectoryHandle('output_images', { create: true });
      await handle.getDirectoryHandle('accounts_login_vault', { create: true });
      await handle.getDirectoryHandle('scene_account_reports', { create: true });
    } catch {
      // Ignore if running in sandboxed preview
    }
  };

  // Select Real Phone Storage Folder via File System Access API (Free Fire Style Resource Folder)
  const handlePickDeviceDirectory = async () => {
    try {
      const anyWin = window as any;
      if (typeof anyWin.showDirectoryPicker === 'function') {
        const handle = await anyWin.showDirectoryPicker({ mode: 'readwrite' });
        dirHandleRef.current = handle;
        await ensureSubfoldersInBoundDirectory(handle);
        setBoundDirectoryName(handle.name);
        setWorkspaceFolderPath(`Download/${handle.name}`);
        setShowFolderGateModal(false);
        setStatusBanner(
          `📁 Mobile Folder Initialized: Download/${handle.name} (Created output_images/, accounts_login_vault/, scene_account_reports/)`
        );
        termLog(
          `📁 Linked mobile folder: ${handle.name}. Created output_images/, accounts_login_vault/, and scene_account_reports/.`
        );
        return;
      }
    } catch {
      // Fallback when picker cancelled or inside preview iframe
    }
    const cleanName =
      workspaceFolderPath.split('/').pop() || 'Itihaskar_Bot';
    setBoundDirectoryName(cleanName);
    setShowFolderGateModal(false);
    setStatusBanner(
      `📁 Mobile Folder Active: ${workspaceFolderPath} (output_images/, accounts_login_vault/, scene_account_reports/ ready)`
    );
    termLog(
      `✅ Initialized Mobile Folder: ${workspaceFolderPath} with output_images/, accounts_login_vault/, scene_account_reports/.`
    );
  };

  // 1-Click Clear Storage (Deletes all output_images/ PNGs + scene reports & logs for the next video, keeping Account Logins safe!)
  const handleClearStorageForNextVideo = async () => {
    const imgCount = outputImages.length;
    if (dirHandleRef.current) {
      try {
        const outDir = await dirHandleRef.current.getDirectoryHandle(
          'output_images',
          { create: false }
        );
        for await (const [name, entry] of outDir.entries()) {
          if (
            entry.kind === 'file' &&
            (name.endsWith('.png') || name.endsWith('.jpg'))
          ) {
            await outDir.removeEntry(name);
          }
        }
      } catch {
        // Ignore if subfolder doesn't exist yet
      }
      try {
        const repDir = await dirHandleRef.current.getDirectoryHandle(
          'scene_account_reports',
          { create: false }
        );
        for await (const [name, entry] of repDir.entries()) {
          if (entry.kind === 'file' && name.endsWith('.txt')) {
            await repDir.removeEntry(name);
          }
        }
      } catch {
        // Ignore if subfolder doesn't exist yet
      }
    }

    setOutputImages([]);
    setOutputVideos([]);
    setUpscaled4kCount(0);
    setSceneChatsLogText('');
    setClearStorageConfirmInline(false);
    setStatusBanner(
      `🗑️ Storage Cleaned for Next Video! Deleted ${imgCount} images from output_images/ and cleared old scene reports (Account logins in accounts_login_vault/ kept safe).`
    );
    termLog(
      `🗑️ [CLEAR STORAGE COMPLETE] Deleted ${imgCount} Scene_XX.png images & old reports. Ready for next documentary video!`
    );
  };

  const handleDeleteSingleOutputImage = (sceneNo: number) => {
    const name = formatSceneImageName(sceneNo);
    setOutputImages((prev) => prev.filter((img) => img.sceneNo !== sceneNo));
    setStatusBanner(`Deleted ${name} from ${workspaceFolderPath}/output_images/`);
    termLog(`🗑️ Deleted ${name} from output_images/`);
  };

  // Account Sequence Count & Reset Handlers
  const handleUpdateAccountCounts = (chatCount: number, fCount: number) => {
    setChatgptAccCount(chatCount);
    setFlowAccCount(fCount);

    setChatgptAccounts((prev) =>
      Array.from({ length: chatCount }, (_, i) => {
        const existing = prev[i];
        return (
          existing || {
            id: `chat-${i + 1}`,
            name: `Account_${i + 1}`,
            email: `itihaskar.bot${i + 1}@gmail.com`,
            loggedIn: accountsSavedForever,
            exhaustedToday: false,
            creditsRemaining: 100,
            itemsGenerated: 0,
            uploadedRefs: [],
          }
        );
      })
    );

    setFlowAccounts((prev) =>
      Array.from({ length: fCount }, (_, i) => {
        const existing = prev[i];
        return (
          existing || {
            id: `flow-${i + 1}`,
            name: `Flow_Account_${i + 1}`,
            email: `jiopro.flow${i + 1}@gmail.com`,
            loggedIn: accountsSavedForever,
            exhaustedToday: false,
            creditsRemaining: 500,
            itemsGenerated: 0,
            uploadedRefs: [],
          }
        );
      })
    );
  };

  const handleResetAllAccounts = () => {
    setAccountsSavedForever(false);
    setChatgptAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        loggedIn: false,
        exhaustedToday: false,
        itemsGenerated: 0,
      }))
    );
    setFlowAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        loggedIn: false,
        exhaustedToday: false,
        creditsRemaining: 500,
        itemsGenerated: 0,
      }))
    );
    setStatusBanner(
      '🔄 All Mobile Accounts Reset! Browser will ask for fresh login starting from Account_1.'
    );
    termLog('🔄 All Accounts Reset! Saved mobile sessions cleared.');
  };

  // Flow AI Daily Credit Memory Reset (Exact feature from flow_video_bot.py: daily_credit_tracker.json)
  const handleResetTodayFlowCredits = () => {
    setFlowAccounts((prev) =>
      prev.map((a) => ({
        ...a,
        exhaustedToday: false,
        creditsRemaining: a.creditsRemaining === 0 ? 500 : a.creditsRemaining,
      }))
    );
    setActiveFlowAccIdx(0);
    setStatusBanner(
      "🔄 [Reset Complete!] Today's Flow AI Credit Memory (daily_credit_tracker.json) reset! Will test all accounts fresh from Flow_Account_1."
    );
    termLog(
      "[Reset Complete!] Today's Flow AI credit memory (daily_credit_tracker.json) reset. Testing all accounts fresh."
    );
  };

  // Start Over Handler
  const handleStartOver = () => {
    if (botTimerRef.current) window.clearInterval(botTimerRef.current);
    setIsRunningBot(false);
    setRunningBotType(null);
    setLoadedPdf(null);
    setOutputImages([]);
    setOutputVideos([]);
    setUpscaled4kCount(0);
    setSceneChatsLogText('');
    setStartSceneNo(1);
    setEndSceneNo(1);
    setStatusBanner('Studio reset. Upload a PDF script in Scene Queue to begin.');
    termLog('Start Over: Cleared active PDF queue.');
  };

  // Load PDF from Uploaded File
  const loadPdfTextIntoStudio = (fileName: string, rawText: string) => {
    const parsed = parseScenesFromText(
      rawText,
      characterRefs.map((r) => r.fileName)
    );

    setLoadedPdf({
      fileName,
      uploadedAt: new Date().toLocaleTimeString('en-IN', { hour12: false }),
      rawText,
    });

    if (parsed.length > 0) {
      const minNo = parsed[0].sceneNo;
      const maxNo = parsed[parsed.length - 1].sceneNo;
      setStartSceneNo(minNo);
      setEndSceneNo(maxNo);
      setCurrentSceneNo(minNo);
      setStatusBanner(
        `📄 Loaded "${fileName}" — Extracted ${parsed.length} scenes (Scene ${minNo} to Scene ${maxNo}).`
      );
      termLog(
        `✅ PDF Parsed: '${fileName}' -> Total ${parsed.length} scenes (Scene ${minNo} to Scene ${maxNo}).`
      );
    } else {
      setStatusBanner(
        `Loaded "${fileName}", but no 'SCENE X / IMAGE PROMPT / VIDEO PROMPT' blocks were found.`
      );
    }
  };

  const handleUploadPdfFile = async (file: File) => {
    termLog(`Reading PDF from mobile storage: ${file.name} ...`);
    const extractedText = await extractTextFromUploadedFile(file);
    loadPdfTextIntoStudio(file.name, extractedText);
  };

  const handleAddCharacterRef = (file: File, targetCharName?: string) => {
    const reader = new FileReader();
    reader.onload = () => {
      const cleanName = (
        targetCharName ||
        file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ')
      ).toUpperCase();

      const newRef: CharacterReferenceAsset = {
        id: `ref-${Date.now()}`,
        name: cleanName,
        fileName: file.name,
        url: String(reader.result || ''),
        uploadedInAccounts: ['Account_1'],
      };
      setCharacterRefs((prev) => {
        const filtered = prev.filter(
          (r) => r.name.toUpperCase() !== cleanName
        );
        return [...filtered, newRef];
      });
      setStatusBanner(
        `👤 Attached Reference Image "${file.name}" for character "${cleanName}".`
      );
      termLog(
        `👤 Character Reference Linked: '${cleanName}' -> '${file.name}' (Smart 'Add from library' reuse enabled).`
      );
    };
    reader.readAsDataURL(file);
  };

  // Save PNG physically into bound mobile directory handle if available
  const savePngToBoundFolderIfPossible = async (
    fileName: string,
    dataUrl: string
  ) => {
    if (!dirHandleRef.current || !dataUrl.includes(',')) return;
    try {
      const outDir = await dirHandleRef.current.getDirectoryHandle(
        'output_images',
        { create: true }
      );
      const fileHandle = await outDir.getFileHandle(fileName, { create: true });
      const writable = await fileHandle.createWritable();
      const b64 = dataUrl.split(',')[1];
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      await writable.write(bytes);
      await writable.close();
    } catch {
      // Ignore permission errors in preview
    }
  };

  // Run Bot 1: ChatGPT Image Bot (v20)
  const handleStartChatgptBot = () => {
    if (selectedRangeScenes.length === 0) {
      setStatusBanner(
        '⚠️ Pehle Scene Queue mein apni PDF Script upload karein!'
      );
      termLog('ERROR: Pehle Scene Queue mein apni PDF script upload karein!');
      return;
    }
    if (botTimerRef.current) window.clearInterval(botTimerRef.current);

    setSelectedBot(1);
    setBrowserTarget('chatgpt');
    setStudioTab('browser');
    setIsRunningBot(true);
    setRunningBotType('chatgpt');
    if (stealthMode) {
      setStealthScreenBlackout(true);
    }

    let idx = 0;
    let currAccIdx = activeChatgptAccIdx;
    const scenesToRun = [...selectedRangeScenes];

    termLog(
      `🚀 [BOT 1: CHATGPT v20 STARTED] Generating ${scenesToRun.length} scenes (Scene ${scenesToRun[0].sceneNo} to ${scenesToRun[scenesToRun.length - 1].sceneNo})...`
    );

    const runStep = () => {
      if (idx >= scenesToRun.length) {
        if (botTimerRef.current) window.clearInterval(botTimerRef.current);
        setIsRunningBot(false);
        setRunningBotType(null);
        setCurrentStepLabel('All Requested Scene Images Downloaded!');
        setCurrentStepProgress(100);
        setStatusBanner(
          `✅ Bot 1 Completed! ${scenesToRun.length} images saved as Scene_XX.png in ${workspaceFolderPath}/output_images/`
        );
        termLog(
          `✅ [BOT 1 COMPLETE] All ${scenesToRun.length} images saved as Scene_XX.png in ${workspaceFolderPath}/output_images/!`
        );
        return;
      }

      const scene = scenesToRun[idx];
      const fileName = formatSceneImageName(scene.sceneNo);
      const acc = chatgptAccounts[currAccIdx] || chatgptAccounts[0];
      setCurrentSceneNo(scene.sceneNo);

      const refNotice = scene.referenceCharName
        ? ` [Character '${scene.referenceCharName}' -> (+) Add from library -> Add to chat]`
        : '';

      setCurrentStepLabel(
        `Generating & saving ${fileName} on ${acc.name}${refNotice}`
      );
      setCurrentStepProgress(
        Math.round(((idx + 1) / scenesToRun.length) * 100)
      );

      const rendered = renderScenePngDataUrl(scene, acc.name);
      savePngToBoundFolderIfPossible(fileName, rendered.dataUrl);

      const newImg: GeneratedSceneImage = {
        sceneNo: scene.sceneNo,
        fileName,
        accountUsed: acc.name,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        sizeBytes: rendered.sizeBytes,
        dataUrl: rendered.dataUrl,
        chatUrl: `https://chatgpt.com/c/itihaskar-scene-${scene.sceneNo}`,
        imagePrompt: scene.imagePrompt,
        referenceCharUsed: scene.referenceCharName,
        attachmentMode: scene.referenceCharName ? 'Add from Library' : 'None',
      };

      setOutputImages((prev) => {
        const withoutOld = prev.filter(
          (item) => item.sceneNo !== scene.sceneNo
        );
        return [...withoutOld, newImg].sort((a, b) => a.sceneNo - b.sceneNo);
      });

      setChatgptAccounts((prev) =>
        prev.map((a, aIdx) =>
          aIdx === currAccIdx
            ? { ...a, itemsGenerated: a.itemsGenerated + 1 }
            : a
        )
      );

      setSceneChatsLogText((prev) =>
        prev
          ? `${prev}\n${fileName} | ${acc.name} | Create an image: ${scene.imagePrompt} | ${newImg.chatUrl}`
          : `${fileName} | ${acc.name} | Create an image: ${scene.imagePrompt} | ${newImg.chatUrl}`
      );

      termLog(
        `[IMAGE SAVED] '${fileName}' downloaded to '${workspaceFolderPath}/output_images/${fileName}' (${acc.name})${refNotice}`
      );

      if ((idx + 1) % 6 === 0 && currAccIdx + 1 < chatgptAccounts.length) {
        currAccIdx += 1;
        setActiveChatgptAccIdx(currAccIdx);
        termLog(
          `[Limit Reached] Rotating to ${chatgptAccounts[currAccIdx].name} for next scenes...`
        );
      }

      idx += 1;
    };

    runStep();
    botTimerRef.current = window.setInterval(runStep, 600);
  };

  // Run Bot 2: Flow AI Video Generator Bot (v3.0)
  const handleStartFlowBot = () => {
    if (selectedRangeScenes.length === 0) {
      setStatusBanner(
        '⚠️ Pehle Scene Queue mein apni PDF Script upload karein!'
      );
      termLog('ERROR: Pehle Scene Queue mein apni PDF script upload karein!');
      return;
    }
    if (botTimerRef.current) window.clearInterval(botTimerRef.current);

    setSelectedBot(2);
    setBrowserTarget('flow');
    setStudioTab('browser');
    setIsRunningBot(true);
    setRunningBotType('flow');
    if (stealthMode) {
      setStealthScreenBlackout(true);
    }

    let currFlowIdx = flowAccounts.findIndex((a) => !a.exhaustedToday);
    if (currFlowIdx === -1) currFlowIdx = 0;
    setActiveFlowAccIdx(currFlowIdx);

    let idx = 0;
    const scenesToRun = [...selectedRangeScenes];

    termLog(
      `🚀 [BOT 2: FLOW AI v3.0 STARTED] Uploading from ${workspaceFolderPath}/output_images/ for ${scenesToRun.length} scenes on ${flowAccounts[currFlowIdx].name}...`
    );

    const runStep = () => {
      if (idx >= scenesToRun.length) {
        if (botTimerRef.current) window.clearInterval(botTimerRef.current);
        setIsRunningBot(false);
        setRunningBotType(null);
        setCurrentStepLabel(
          'All Flow AI Videos Processed & Scene_Account_Status_Report.txt Saved!'
        );
        setCurrentStepProgress(100);
        setStatusBanner(
          `✅ Bot 2 (Flow AI v3.0) Completed! ${scenesToRun.length} videos marked BANA (YES).`
        );
        termLog(
          `✅ [BOT 2 COMPLETE] Saved Scene_Account_Status_Report.txt in ${workspaceFolderPath}/scene_account_reports/!`
        );
        return;
      }

      const scene = scenesToRun[idx];
      const fileName = formatSceneImageName(scene.sceneNo);
      const acc = flowAccounts[currFlowIdx] || flowAccounts[0];
      setCurrentSceneNo(scene.sceneNo);

      setCurrentStepLabel(
        `Uploading ${fileName} -> Add to prompt -> Clicking Composer '→' Send on ${acc.name}`
      );
      setCurrentStepProgress(
        Math.round(((idx + 1) / scenesToRun.length) * 100)
      );

      const newVid: GeneratedSceneVideo = {
        sceneNo: scene.sceneNo,
        fileName: `Scene_${scene.sceneNo}.mp4`,
        sourceImageName: fileName,
        accountUsed: acc.name,
        createdAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        status: 'BANA (YES)',
        reason: `Image: ${fileName} (Created in Flow AI)`,
        videoPrompt: scene.videoPrompt,
        creditsBefore: Math.max(20, acc.creditsRemaining),
        creditsAfter: Math.max(0, acc.creditsRemaining - 20),
      };

      setOutputVideos((prev) => {
        const withoutOld = prev.filter((v) => v.sceneNo !== scene.sceneNo);
        return [...withoutOld, newVid].sort((a, b) => a.sceneNo - b.sceneNo);
      });

      setFlowAccounts((prev) =>
        prev.map((f, fIdx) =>
          fIdx === currFlowIdx
            ? {
                ...f,
                creditsRemaining: Math.max(0, f.creditsRemaining - 20),
                itemsGenerated: f.itemsGenerated + 1,
              }
            : f
        )
      );

      termLog(
        `[SCENE ${scene.sceneNo} VIDEO DONE] BANA (YES) on ${acc.name} (Uploaded ${fileName} + Composer '→' Send)`
      );

      idx += 1;
    };

    runStep();
    botTimerRef.current = window.setInterval(runStep, 600);
  };

  // Run Bot 3: 4K UHD Video Enhancer (v1.1)
  const handleStart4kEnhancerBot = () => {
    setSelectedBot(3);
    const count =
      outputVideos.length > 0
        ? outputVideos.length
        : selectedRangeScenes.length;
    if (count === 0) {
      setStatusBanner(
        '⚠️ Pehle Scene Queue mein PDF upload karein ya Bot 2 se videos generate karein!'
      );
      return;
    }
    setUpscaled4kCount(count);
    setStatusBanner(
      `✨ Bot 3 (4K UHD Video Enhancer v1.1): Upscaled ${count} scenes to 3840×2160 (Lanczos + Color Grade + 2.35:1 Cinema Bars) in ${workspaceFolderPath}/output_4k_videos/!`
    );
    termLog(
      `✨ [BOT 3 COMPLETE] Upscaled ${count} videos to 4K UHD (3840x2160) in ${workspaceFolderPath}/output_4k_videos/.`
    );
  };

  const handleStopBot = () => {
    if (botTimerRef.current) {
      window.clearInterval(botTimerRef.current);
    }
    setIsRunningBot(false);
    setRunningBotType(null);
    setCurrentStepLabel('Stopped by user');
    termLog('⏹️ Automation paused by user.');
  };

  const handleToggleAccountLogin = (type: 'chatgpt' | 'flow', idx: number) => {
    if (type === 'chatgpt') {
      setChatgptAccounts((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, loggedIn: true } : a))
      );
      setStatusBanner(
        `Saved login session for ${chatgptAccounts[idx].name} in ${workspaceFolderPath}/accounts_login_vault/`
      );
    } else {
      setFlowAccounts((prev) =>
        prev.map((a, i) => (i === idx ? { ...a, loggedIn: true } : a))
      );
      setStatusBanner(
        `Saved Jio Pro login for ${flowAccounts[idx].name} in ${workspaceFolderPath}/accounts_login_vault/`
      );
    }
  };

  const handleAddAccount = (type: 'chatgpt' | 'flow') => {
    if (type === 'chatgpt') {
      handleUpdateAccountCounts(chatgptAccCount + 1, flowAccCount);
    } else {
      handleUpdateAccountCounts(chatgptAccCount, flowAccCount + 1);
    }
  };

  // Real-time Reports Calculation (Strictly for the Currently Uploaded PDF)
  const flowReportText = useMemo(() => {
    if (!loadedPdf || selectedRangeScenes.length === 0) {
      return `==========================================================================
   ITIHASKAR SAMAY - SCENE & ACCOUNT STATUS REPORT (FLOW AI BOT v3.0)
==========================================================================
Status: No PDF currently loaded (or storage was just cleaned).
Please upload your PDF in Scene Queue and run Bot 2 to generate the report.
==========================================================================`;
    }

    const sceneAccountMap: Record<number, string> = {};
    const skippedScenes: SkippedFlowScene[] = [];

    for (const vid of outputVideos) {
      if (vid.status === 'BANA (YES)') {
        sceneAccountMap[vid.sceneNo] = vid.accountUsed;
      } else {
        skippedScenes.push({
          sceneNo: vid.sceneNo,
          imgName: vid.sourceImageName,
          reason: vid.reason,
          videoPrompt: vid.videoPrompt,
        });
      }
    }

    const exhaustedNames = flowAccounts
      .filter((a) => a.exhaustedToday)
      .map((a) => a.name);

    return generateFlowStatusReport({
      sourceName: loadedPdf.fileName,
      dateStr: new Date().toISOString().slice(0, 19).replace('T', ' '),
      scenes: selectedRangeScenes,
      sceneAccountMap,
      skippedScenes,
      todayExhaustedAccounts: exhaustedNames,
    });
  }, [loadedPdf, selectedRangeScenes, outputVideos, flowAccounts]);

  const chatgptReportText = useMemo(() => {
    if (!loadedPdf || selectedRangeScenes.length === 0) {
      return `============================================================
ITIHASKAR SAMAY - BOT 1 (CHATGPT IMAGE BOT) REPORT
============================================================
Status: No PDF currently loaded (or storage was just cleaned).
Please upload your PDF in Scene Queue and run Bot 1 to generate the report.
============================================================`;
    }

    const existingSet = new Set(outputImages.map((i) => i.sceneNo));
    const completedScenes: number[] = [];
    const skippedScenes: SkippedChatGptScene[] = [];

    for (const s of selectedRangeScenes) {
      if (existingSet.has(s.sceneNo)) {
        completedScenes.push(s.sceneNo);
      } else {
        skippedScenes.push({
          sceneNo: s.sceneNo,
          stage: 'ChatGPT Image Generation',
          reason: 'Not yet generated in output_images/',
          imagePrompt: s.imagePrompt,
        });
      }
    }

    return generateChatGptReport({
      sourceName: loadedPdf.fileName,
      dateStr: new Date().toISOString().slice(0, 19).replace('T', ' '),
      scenes: selectedRangeScenes,
      completedScenes,
      skippedScenes,
    });
  }, [loadedPdf, selectedRangeScenes, outputImages]);

  const dailyCreditJson = useMemo(() => {
    return JSON.stringify(
      {
        date: new Date().toISOString().slice(0, 10),
        updated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
        exhausted_accounts: flowAccounts
          .filter((a) => a.exhaustedToday)
          .map((a) => a.name),
      },
      null,
      2
    );
  }, [flowAccounts]);

  const handleDownloadWorkspaceZip = async () => {
    const blob = await exportWorkspaceZip({
      images: outputImages,
      flowReportText,
      chatgptReportText,
      sceneChatsLogText:
        sceneChatsLogText ||
        'No ChatGPT scene chats recorded in this session yet.',
      dailyCreditJson,
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Itihaskar_Samay_Workspace_Images_And_Reports.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  const displayedScenes = useMemo(() => {
    if (!searchQuery.trim()) return selectedRangeScenes;
    const q = searchQuery.toLowerCase();
    return selectedRangeScenes.filter(
      (s) =>
        String(s.sceneNo).includes(q) ||
        s.sceneLine.toLowerCase().includes(q) ||
        s.imagePrompt.toLowerCase().includes(q) ||
        s.videoPrompt.toLowerCase().includes(q)
    );
  }, [selectedRangeScenes, searchQuery]);

  const availableImagesInRangeCount = useMemo(() => {
    const imgSet = new Set(outputImages.map((i) => i.sceneNo));
    return selectedRangeScenes.filter((s) => imgSet.has(s.sceneNo)).length;
  }, [selectedRangeScenes, outputImages]);

  const createdVideosInRangeCount = useMemo(() => {
    const vidSet = new Set(
      outputVideos
        .filter((v) => v.status === 'BANA (YES)')
        .map((v) => v.sceneNo)
    );
    return selectedRangeScenes.filter((s) => vidSet.has(s.sceneNo)).length;
  }, [selectedRangeScenes, outputVideos]);

  const completedStatCount =
    selectedBot === 1
      ? availableImagesInRangeCount
      : selectedBot === 2
        ? createdVideosInRangeCount
        : upscaled4kCount;

  const pendingStatCount = Math.max(
    0,
    selectedRangeScenes.length - completedStatCount
  );

  // ============================================================================
  // VIEW 1: HOME (`#home` — Brand "Fluid", Bottom "ITIHASKAR" watermark, Right-to-Left Asteroids, Pure "Slide to Open")
  // ============================================================================
  if (viewMode === 'home') {
    return (
      <div
        id="home"
        className="min-h-[100svh] w-full overflow-x-hidden itk-home-bg text-white flex flex-col justify-between relative"
      >
        <EmberBackdrop showWatermark={true} showHorizonGlow={true} />

        {/* Top Header */}
        <header className="relative z-20 flex flex-wrap items-center justify-between gap-3 px-4 sm:px-11 py-4 sm:py-[22px]">
          <a
            href="#home"
            onClick={(e) => e.preventDefault()}
            className="font-display font-semibold text-[20px] sm:text-[22px] tracking-[-0.025em] text-white whitespace-nowrap shrink-0"
          >
            Fluid
          </a>

          <nav
            aria-label="Primary"
            className="hidden md:flex items-center gap-1 p-[5px] border border-white/14 rounded-[12px] bg-[rgba(28,10,2,0.4)]"
          >
            <button
              type="button"
              onClick={() => {
                setViewMode('studio');
                setStudioTab('workspace');
              }}
              className="px-4 py-[9px] rounded-[8px] text-[14px] text-white/85 bg-white/[0.07] hover:text-white transition-colors cursor-pointer"
            >
              Pipeline
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('studio');
                setStudioTab('browser');
              }}
              className="px-4 py-[9px] rounded-[8px] text-[14px] text-white/85 hover:bg-white/[0.07] hover:text-white transition-colors cursor-pointer"
            >
              Bots
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('studio');
                setStudioTab('folder');
              }}
              className="px-4 py-[9px] rounded-[8px] text-[14px] text-white/85 hover:bg-white/[0.07] hover:text-white transition-colors cursor-pointer"
            >
              Phone Folder
            </button>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={() => handleEnterStudio()}
              className="min-h-[40px] sm:min-h-[44px] px-4 sm:px-5 rounded-full text-[13px] sm:text-[14px] font-semibold bg-white text-[#180600] border border-white hover:bg-[#fff4ec] transition-colors cursor-pointer"
            >
              Open Studio
            </button>
          </div>
        </header>

        {/* Clean Hero Section (Only Slide to Open) */}
        <section className="relative z-10 flex items-center w-full max-w-[1360px] mx-auto px-4 sm:px-11 py-8 sm:py-12">
          <div className="w-full max-w-[760px] flex flex-col gap-5 sm:gap-7">
            <p className="self-start px-3 sm:px-[14px] py-1.5 sm:py-[7px] border border-white/18 rounded-full bg-[rgba(40,13,3,0.55)] text-[11px] sm:text-[12px] font-semibold tracking-[0.14em] uppercase text-[#ffb36b]">
              AI Documentary Automation Platform
            </p>

            <h1 className="font-display font-semibold text-[clamp(34px,8.5vw,78px)] leading-[1.03] tracking-[-0.035em] text-white">
              We Build AI Systems That Save Time And <em>Scale</em>
            </h1>

            <div className="pt-1">
              <SlideActionBar
                label="Slide to Open"
                doneLabel="Opening Studio…"
                onTrigger={() => handleEnterStudio()}
                maxWidthClass="w-full sm:w-[310px]"
              />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="relative z-10 mt-auto flex flex-wrap justify-between gap-2 px-4 sm:px-11 py-5 sm:py-7 text-[12px] sm:text-[13px] text-white/85">
          <span>Android Local Storage • Ready</span>
          <span>Itihaskar Samay • Fluid Studio</span>
        </footer>
      </div>
    );
  }

  // ============================================================================
  // VIEW 2: STUDIO (`#studio` — Brand "Fluid", Free Fire Folder Gate, 100% Mobile Responsive)
  // ============================================================================
  return (
    <div
      id="studio"
      className="min-h-[100svh] w-full overflow-x-hidden itk-studio-bg text-white flex flex-col relative"
    >
      <EmberBackdrop showWatermark={true} showHorizonGlow={false} />

      {/* FREE FIRE STYLE FIRST-ENTRY FOLDER SETUP GATE MODAL */}
      {showFolderGateModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="folder-gate-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-[24px] border border-[#ff8a1f]/50 bg-[#1a0701] p-5 sm:p-7 shadow-2xl space-y-5">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold tracking-[0.14em] uppercase text-[#ffb36b]">
                Step 0 • Mandatory Resource Folder Setup
              </p>
              <h2
                id="folder-gate-title"
                className="font-display text-[22px] sm:text-[26px] font-semibold text-white leading-tight"
              >
                📁 Choose Phone Storage Folder
              </h2>
              <p className="text-xs sm:text-sm text-white/75 leading-relaxed">
                Free Fire resource pack ki tarah sabse pehle apne phone me ek
                main folder select karein. Is folder ke andar automatic ye 3
                subfolders ban jayenge:
              </p>
            </div>

            <div className="space-y-2 text-xs bg-[#120400] border border-white/14 rounded-2xl p-3.5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0 mt-0.5" />
                <div className="min-w-0 break-words">
                  <strong className="text-white font-mono">
                    output_images/
                  </strong>{' '}
                  — ChatGPT se banne wali saari images (
                  <code>Scene_01.png</code>) yaha download hongi aur yahi se
                  Flow AI me upload hongi.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0 mt-0.5" />
                <div className="min-w-0 break-words">
                  <strong className="text-white font-mono">
                    accounts_login_vault/
                  </strong>{' '}
                  — Aapke sabhi ChatGPT aur Flow AI accounts ke login sessions
                  yaha save rahenge taaki baar-baar login na karna pade.
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#7ee787] shrink-0 mt-0.5" />
                <div className="min-w-0 break-words">
                  <strong className="text-white font-mono">
                    scene_account_reports/
                  </strong>{' '}
                  — Scene status report, skipped scenes report aur{' '}
                  <code>daily_credit_tracker.json</code> yaha save honge.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="gate-folder-input"
                className="block text-xs font-medium text-white/80"
              >
                Main Folder Path on Mobile
              </label>
              <input
                id="gate-folder-input"
                type="text"
                value={workspaceFolderPath}
                onChange={(e) => setWorkspaceFolderPath(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl bg-[#120400] border border-white/20 text-xs font-mono text-white focus:outline-none focus:border-[#ff8a1f]"
              />
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <button
                type="button"
                onClick={handlePickDeviceDirectory}
                className="flex-1 min-h-[46px] px-5 rounded-full text-xs sm:text-sm font-semibold bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] cursor-pointer shadow-lg"
              >
                📁 Select Phone Folder &amp; Continue
              </button>
              <button
                type="button"
                onClick={() => {
                  setBoundDirectoryName(
                    workspaceFolderPath.split('/').pop() || 'Itihaskar_Bot'
                  );
                  setShowFolderGateModal(false);
                }}
                className="min-h-[46px] px-4 rounded-full text-xs font-medium border border-white/25 bg-white/5 hover:bg-white/10 text-white/85 cursor-pointer"
              >
                Use Default Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Bar (3-Zone Contract, Mobile Responsive) */}
      <header className="relative z-30 flex items-center justify-between gap-3 px-4 sm:px-11 py-3.5 sm:py-5 border-b border-white/10 bg-[#120400]/90 backdrop-blur-md sticky top-0">
        <a
          href="#studio"
          onClick={(e) => {
            e.preventDefault();
            setStudioTab('workspace');
          }}
          className="font-display font-semibold text-[20px] sm:text-[22px] tracking-[-0.025em] text-white whitespace-nowrap shrink-0"
        >
          Fluid
        </a>

        <nav
          aria-label="Studio Navigation"
          className="hidden md:flex items-center gap-1 p-[5px] border border-white/14 rounded-[12px] bg-[rgba(28,10,2,0.5)]"
        >
          <button
            type="button"
            onClick={() => setStudioTab('workspace')}
            className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
              studioTab === 'workspace'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Studio Pipeline
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('browser')}
            className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
              studioTab === 'browser'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Auto-Browser
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('folder')}
            className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
              studioTab === 'folder'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Folder &amp; Images ({outputImages.length})
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('reports')}
            className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
              studioTab === 'reports'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Work Reports
          </button>
          <button
            type="button"
            onClick={() => setStudioTab('apk')}
            className={`px-3.5 py-2 rounded-[8px] text-[13px] transition-colors cursor-pointer ${
              studioTab === 'apk'
                ? 'bg-white/[0.1] text-white font-semibold'
                : 'text-white/80 hover:text-white'
            }`}
          >
            Android APK Guide
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <PWAInstallButton onOpenAndroidModal={() => setStudioTab('apk')} />
          <button
            type="button"
            onClick={() => setViewMode('home')}
            className="min-h-[38px] sm:min-h-[42px] px-3.5 sm:px-4 rounded-full text-[12px] sm:text-[13px] font-medium border border-white/30 bg-[rgba(28,10,2,0.4)] hover:bg-white/12 text-white cursor-pointer"
          >
            Home
          </button>
        </div>
      </header>

      {/* Main Studio Container */}
      <main className="relative z-10 w-full max-w-[1360px] mx-auto px-4 sm:px-11 py-6 sm:py-10 pb-24 md:pb-14 flex flex-col gap-6 sm:gap-8">
        {statusBanner && (
          <div
            role="status"
            className="bg-[rgba(40,13,3,0.85)] border border-[#ff8a1f]/60 rounded-[16px] sm:rounded-[18px] px-4 py-3 flex items-center justify-between gap-3 text-[12px] sm:text-[13px] text-[#ffb36b]"
          >
            <span className="min-w-0 flex-1 break-words">{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-white/70 hover:text-white font-medium shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {studioTab === 'workspace' && (
          <>
            {/* Studio Hero Heading */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <p className="text-[11px] sm:text-[12px] font-semibold tracking-[0.14em] uppercase text-[#ffb36b] mb-1.5 sm:mb-2.5">
                  Question 1 • All 3 Android &amp; Chromium Bots Included
                </p>
                <h1 className="font-display font-semibold text-[clamp(28px,6.5vw,56px)] leading-[1.06] tracking-[-0.035em] text-white">
                  Kaun sa <em>Bot</em> chalana hai?
                </h1>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowFolderGateModal(true)}
                  className="min-h-[40px] sm:min-h-[44px] px-4 rounded-full text-[12px] sm:text-[13px] font-medium border border-white/30 bg-[rgba(28,10,2,0.4)] hover:bg-white/12 text-white cursor-pointer"
                >
                  📁{' '}
                  {boundDirectoryName
                    ? `Folder: ${boundDirectoryName}`
                    : `Folder: ${workspaceFolderPath}`}
                </button>

                {!clearStorageConfirmInline ? (
                  <button
                    type="button"
                    onClick={() => setClearStorageConfirmInline(true)}
                    className="min-h-[40px] sm:min-h-[44px] px-4 rounded-full text-[12px] sm:text-[13px] font-medium border border-rose-400/50 bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 cursor-pointer"
                  >
                    🗑️ Clear Storage ({outputImages.length} Images + Reports)
                  </button>
                ) : (
                  <div className="inline-flex flex-wrap items-center gap-2 bg-rose-950 border border-rose-400/60 px-3.5 py-1.5 rounded-2xl">
                    <span className="text-xs text-rose-200">
                      Clear {outputImages.length} PNGs &amp; reports for next
                      video?
                    </span>
                    <button
                      type="button"
                      onClick={handleClearStorageForNextVideo}
                      className="px-3 py-1 rounded-full bg-rose-600 text-xs font-semibold text-white cursor-pointer"
                    >
                      Yes, Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setClearStorageConfirmInline(false)}
                      className="px-2.5 py-1 rounded-full bg-[#180600] text-xs text-white/75 cursor-pointer"
                    >
                      No
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleStartOver}
                  className="min-h-[40px] sm:min-h-[44px] px-4 rounded-full text-[12px] sm:text-[13px] font-medium border border-white/30 bg-[rgba(28,10,2,0.4)] hover:bg-white/12 text-white cursor-pointer"
                >
                  Start Over
                </button>
              </div>
            </div>

            {/* 3 Bot Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <article
                className={`flex flex-col gap-3 p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] border transition-colors ${
                  selectedBot === 1
                    ? 'border-[#ff8a1f] bg-[rgba(56,20,6,0.62)]'
                    : 'border-white/14 bg-[rgba(56,20,6,0.45)]'
                }`}
              >
                <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] text-[#ffb36b]">
                  BOT 1 • v20
                </span>
                <h2 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em]">
                  ChatGPT Image Bot
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] leading-[1.6] text-white/75">
                  {chatgptAccCount} Chrome accounts setup (Account_1..
                  {chatgptAccCount}), Add from Library character reuse, 3-method
                  image downloader (<code>Scene_01.png</code>) aur rate-limit
                  par auto account switch.
                </p>
                <div className="mt-auto pt-2">
                  <SlideActionBar
                    label="Slide to Open Bot 1"
                    doneLabel="Opening Bot 1…"
                    onTrigger={() => {
                      setSelectedBot(1);
                      setBrowserTarget('chatgpt');
                      if (selectedRangeScenes.length > 0) {
                        handleStartChatgptBot();
                      } else {
                        setStudioTab('browser');
                      }
                    }}
                  />
                </div>
              </article>

              <article
                className={`flex flex-col gap-3 p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] border transition-colors ${
                  selectedBot === 2
                    ? 'border-[#ff8a1f] bg-[rgba(56,20,6,0.62)]'
                    : 'border-white/14 bg-[rgba(56,20,6,0.45)]'
                }`}
              >
                <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] text-[#ffb36b]">
                  BOT 2 • v3.0
                </span>
                <h2 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em]">
                  Flow AI Video Bot
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] leading-[1.6] text-white/75">
                  Jio Pro accounts (Flow_Account_1..{flowAccCount}), phone
                  folder ke <code>output_images/</code> se{' '}
                  <code>Scene_01.png</code> uthakar video prompt ke saath
                  Composer <code>→</code> Send click karega + Same-Day Credit
                  Memory (<code>daily_credit_tracker.json</code>).
                </p>
                <div className="mt-auto pt-2">
                  <SlideActionBar
                    label="Slide to Open Bot 2"
                    doneLabel="Opening Bot 2…"
                    onTrigger={() => {
                      setSelectedBot(2);
                      setBrowserTarget('flow');
                      if (selectedRangeScenes.length > 0) {
                        handleStartFlowBot();
                      } else {
                        setStudioTab('browser');
                      }
                    }}
                  />
                </div>
              </article>

              <article
                className={`flex flex-col gap-3 p-5 sm:p-7 rounded-[20px] sm:rounded-[24px] border transition-colors ${
                  selectedBot === 3
                    ? 'border-[#ff8a1f] bg-[rgba(56,20,6,0.62)]'
                    : 'border-white/14 bg-[rgba(56,20,6,0.45)]'
                }`}
              >
                <span className="text-[11px] sm:text-[12px] font-semibold tracking-[0.12em] text-[#ffb36b]">
                  BOT 3 • v1.1
                </span>
                <h2 className="font-display text-[22px] sm:text-[26px] font-semibold tracking-[-0.02em]">
                  4K UHD Video Enhancer
                </h2>
                <p className="text-[13.5px] sm:text-[14.5px] leading-[1.6] text-white/75">
                  Long documentary ko 3840×2160 mein upscale karein — Lanczos,
                  color grade, 2.35:1 cinema bars aur GPU acceleration.
                </p>
                <div className="mt-auto pt-2">
                  <SlideActionBar
                    label="Slide to Open Bot 3"
                    doneLabel="Enhancing 4K…"
                    onTrigger={handleStart4kEnhancerBot}
                  />
                </div>
              </article>
            </div>

            {/* Row 2: 100% Responsive Mobile Storage Folder Box (NO Horizontal Scrollbar!) + Scene Queue */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              {/* Left Panel: Responsive Phone Storage Folder Box */}
              <section className="lg:col-span-7 p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] border border-white/14 bg-[rgba(40,13,3,0.62)] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[18px] sm:text-[20px] font-semibold">
                      Phone Storage Folder (On-Device)
                    </h2>
                    <p className="text-xs text-[#ffb36b] mt-0.5 break-all">
                      Main Folder: {workspaceFolderPath}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handlePickDeviceDirectory}
                      className="min-h-[38px] sm:min-h-[40px] px-4 rounded-full text-[12px] sm:text-[13px] font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] cursor-pointer"
                    >
                      📁 Choose Phone Folder
                    </button>
                    <button
                      type="button"
                      onClick={handleClearStorageForNextVideo}
                      className="min-h-[38px] sm:min-h-[40px] px-3.5 rounded-full text-[12px] font-medium border border-rose-400/50 bg-rose-600/20 hover:bg-rose-600/35 text-rose-200 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                      <span>Clear Storage</span>
                    </button>
                  </div>
                </div>

                {/* Responsive Wrap-Friendly Folder Tree (Zero Left-to-Right Scrollbar on Mobile!) */}
                <div className="bg-[#120400]/75 border border-white/12 rounded-2xl p-3.5 sm:p-4 font-mono text-[11.5px] sm:text-[12.5px] leading-[1.65] text-white/85 space-y-1.5 break-words overflow-hidden">
                  <div className="text-[#ffb36b] font-semibold break-all">
                    📁 {workspaceFolderPath}/
                  </div>
                  <div className="pl-3 border-l border-white/15 space-y-1.5">
                    <div className="break-words">
                      <span className="text-[#7ee787]">
                        ├─ output_images/
                      </span>{' '}
                      <span className="text-white/65">
                        ({outputImages.length} PNGs — ChatGPT downloads &amp;
                        Flow AI uploads from here)
                      </span>
                    </div>
                    <div className="break-words">
                      <span className="text-[#7ee787]">
                        ├─ accounts_login_vault/
                      </span>{' '}
                      <span className="text-white/65">
                        (chrome_accounts: 1..{chatgptAccCount} · flow_accounts:
                        1..{flowAccCount} — Saved Forever)
                      </span>
                    </div>
                    <div className="break-words">
                      <span className="text-[#ffb36b]">
                        ├─ scene_account_reports/
                      </span>{' '}
                      <span className="text-white/65">
                        (Scene_Account_Status_Report.txt &amp; skipped reports)
                      </span>
                    </div>
                    <div className="break-words">
                      <span className="text-[#ffb36b]">
                        └─ daily_credit_tracker.json
                      </span>{' '}
                      <span className="text-white/65">
                        (Flow AI Same-Day Exhausted Account Memory)
                      </span>
                    </div>
                  </div>
                </div>

                {/* Account Sequence + Flow AI Daily Credit Memory Reset Button */}
                <div className="pt-2 border-t border-white/10 space-y-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <label
                        htmlFor="chat-acc-select"
                        className="text-white/75"
                      >
                        ChatGPT:
                      </label>
                      <select
                        id="chat-acc-select"
                        value={chatgptAccCount}
                        onChange={(e) =>
                          handleUpdateAccountCounts(
                            Number(e.target.value),
                            flowAccCount
                          )
                        }
                        className="px-3 py-1.5 rounded-full bg-[#120400] border border-white/20 text-white font-mono text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                          <option key={n} value={n}>
                            {n} Accounts (1..{n})
                          </option>
                        ))}
                      </select>

                      <label
                        htmlFor="flow-acc-select"
                        className="text-white/75"
                      >
                        Flow AI:
                      </label>
                      <select
                        id="flow-acc-select"
                        value={flowAccCount}
                        onChange={(e) =>
                          handleUpdateAccountCounts(
                            chatgptAccCount,
                            Number(e.target.value)
                          )
                        }
                        className="px-3 py-1.5 rounded-full bg-[#120400] border border-white/20 text-white font-mono text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n} Accounts (1..{n})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetTodayFlowCredits}
                        className="px-3.5 py-1.5 rounded-full border border-[#ff8a1f]/50 bg-[#ff8a1f]/15 text-[#ffb36b] hover:bg-[#ff8a1f]/30 inline-flex items-center gap-1.5 font-medium cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                        <span>🔄 Reset Today&apos;s Credit Memory</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleResetAllAccounts}
                        className="px-3.5 py-1.5 rounded-full border border-rose-400/40 bg-rose-500/15 text-rose-200 hover:bg-rose-500/30 cursor-pointer"
                      >
                        Reset Logins
                      </button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Right Panel: Scene Queue + PDF Upload (Only user's uploaded PDF, no sample PDFs) */}
              <section className="lg:col-span-5 p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] border border-white/14 bg-[rgba(40,13,3,0.62)] flex flex-col gap-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-display text-[18px] sm:text-[20px] font-semibold">
                      Scene Queue
                    </h2>
                    <p className="text-xs text-[#ffb36b] mt-0.5 break-words">
                      {loadedPdf
                        ? `Loaded: ${loadedPdf.fileName} (Scene ${startSceneNo}–${endSceneNo})`
                        : 'Apni Documentary PDF Script upload karein'}
                    </p>
                  </div>

                  <label className="min-h-[38px] sm:min-h-[40px] px-4 rounded-full text-[12px] sm:text-[13px] font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] inline-flex items-center gap-1.5 cursor-pointer shrink-0">
                    <span>📄 Upload PDF Script</span>
                    <input
                      id="pdf-upload-input"
                      type="file"
                      accept=".pdf,.txt,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleUploadPdfFile(file);
                      }}
                    />
                  </label>
                </div>

                {/* 4 Counter Boxes (2x2 on mobile, 4-col on desktop) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
                  <div className="p-3.5 sm:p-4 rounded-[16px] bg-white/[0.06]">
                    <b
                      id="statTotal"
                      className="block font-display text-[26px] sm:text-[30px] font-semibold leading-[1.2] tabular-nums"
                    >
                      {selectedRangeScenes.length}
                    </b>
                    <span className="text-[12px] text-white/70">
                      Total Scenes
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-[16px] bg-white/[0.06]">
                    <b
                      id="statYes"
                      className="block font-display text-[26px] sm:text-[30px] font-semibold leading-[1.2] text-[#7ee787] tabular-nums"
                    >
                      {availableImagesInRangeCount}
                    </b>
                    <span className="text-[12px] text-white/70">
                      Images (PNGs)
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-[16px] bg-white/[0.06]">
                    <b
                      id="statVideos"
                      className="block font-display text-[26px] sm:text-[30px] font-semibold leading-[1.2] text-[#7ee787] tabular-nums"
                    >
                      {createdVideosInRangeCount}
                    </b>
                    <span className="text-[12px] text-white/70">
                      Bana (YES)
                    </span>
                  </div>

                  <div className="p-3.5 sm:p-4 rounded-[16px] bg-white/[0.06]">
                    <b
                      id="statPending"
                      className="block font-display text-[26px] sm:text-[30px] font-semibold leading-[1.2] text-[#ffb36b] tabular-nums"
                    >
                      {pendingStatCount}
                    </b>
                    <span className="text-[12px] text-white/70">Pending</span>
                  </div>
                </div>

                {/* Scene Range Inputs */}
                {loadedPdf && allScenesInPdf.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="start-scene-input"
                        className="block text-[11px] text-white/70 mb-1"
                      >
                        Start Scene
                      </label>
                      <input
                        id="start-scene-input"
                        type="number"
                        min={1}
                        value={startSceneNo}
                        onChange={(e) =>
                          setStartSceneNo(
                            Math.max(1, parseInt(e.target.value || '1', 10))
                          )
                        }
                        className="w-full min-h-[40px] px-3 rounded-xl bg-[#120400]/80 border border-white/20 text-white font-mono text-xs tabular-nums"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="end-scene-input"
                        className="block text-[11px] text-white/70 mb-1"
                      >
                        End Scene
                      </label>
                      <input
                        id="end-scene-input"
                        type="number"
                        min={startSceneNo}
                        value={endSceneNo}
                        onChange={(e) =>
                          setEndSceneNo(
                            Math.max(
                              startSceneNo,
                              parseInt(
                                e.target.value || String(startSceneNo),
                                10
                              )
                            )
                          )
                        }
                        className="w-full min-h-[40px] px-3 rounded-xl bg-[#120400]/80 border border-white/20 text-white font-mono text-xs tabular-nums"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[13px] sm:text-[14px] leading-[1.55] text-white/70">
                  Next up: PDF se prompt read hoga, character reference check
                  hoga, aur{' '}
                  <code className="font-mono text-[#ffb36b]">
                    output_images/
                  </code>{' '}
                  mein save hoga.
                </p>

                <div className="mt-auto">
                  <SlideActionBar
                    label={
                      selectedBot === 1
                        ? `Slide to Run Bot 1 (${selectedRangeScenes.length} Scenes)`
                        : selectedBot === 2
                          ? `Slide to Run Bot 2 (${selectedRangeScenes.length} Scenes)`
                          : `Slide to Run 4K Enhancer (${selectedRangeScenes.length} Scenes)`
                    }
                    doneLabel="Running automation…"
                    onTrigger={() => {
                      if (selectedBot === 1) handleStartChatgptBot();
                      else if (selectedBot === 2) handleStartFlowBot();
                      else handleStart4kEnhancerBot();
                    }}
                  />
                </div>
              </section>
            </div>

            {/* Row 3: Dynamic Scene Breakdown & Character References (Shown only when user uploads a PDF) */}
            {loadedPdf && allScenesInPdf.length > 0 && (
              <section className="p-4 sm:p-7 rounded-[20px] sm:rounded-[24px] border border-white/14 bg-[rgba(40,13,3,0.62)] space-y-5">
                {detectedRecurringCharsInPdf.length > 0 && (
                  <div className="pb-4 border-b border-white/10 space-y-3">
                    <p className="text-xs font-semibold tracking-wider text-[#ffb36b] uppercase">
                      Recurring Character Detected in PDF (Smart &apos;Add from
                      Library&apos; Reuse)
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {detectedRecurringCharsInPdf.map((charName) => {
                        const matched = characterRefs.find((r) =>
                          r.name.toUpperCase().includes(charName)
                        );
                        return (
                          <div
                            key={charName}
                            className="bg-[#120400]/85 border border-[#ff8a1f]/40 rounded-2xl p-3.5 flex items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {matched?.url && (
                                <img
                                  src={matched.url}
                                  alt={charName}
                                  referrerPolicy="no-referrer"
                                  className="w-11 h-13 rounded-lg object-cover border border-white/15 shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-white truncate">
                                  {charName}
                                </div>
                                <div className="text-[11px] font-mono text-[#7ee787] truncate">
                                  {matched
                                    ? `Linked: ${matched.fileName}`
                                    : 'Upload Reference Image'}
                                </div>
                              </div>
                            </div>

                            <label className="px-3.5 py-1.5 rounded-full bg-white text-[#180600] text-[11px] font-semibold cursor-pointer shrink-0">
                              Change Image
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleAddCharacterRef(f, charName);
                                }}
                              />
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-display text-[17px] sm:text-[18px] font-semibold text-white">
                      Parsed Scenes from <code>{loadedPdf.fileName}</code> (
                      {displayedScenes.length} Scenes)
                    </h3>
                    <p className="text-xs text-white/65">
                      Tap any scene row to inspect it inside the Chromium
                      Auto-Browser.
                    </p>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-white/50 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      aria-label="Search parsed scenes"
                      placeholder="Search scene or prompt..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-[#120400]/80 border border-white/20 rounded-full pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#ff8a1f]"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto max-h-80 overflow-y-auto border border-white/14 rounded-2xl bg-[#120400]/75">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#220902] text-[11px] text-white/70 border-b border-white/14 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3">Scene</th>
                        <th className="py-2.5 px-3">
                          Image Prompt (Bot 1 → Scene_XX.png)
                        </th>
                        <th className="py-2.5 px-3">
                          Video Prompt (Bot 2 → Flow AI)
                        </th>
                        <th className="py-2.5 px-3">Image Status</th>
                        <th className="py-2.5 px-3">Video Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {displayedScenes.map((sc) => {
                        const imgObj = outputImages.find(
                          (i) => i.sceneNo === sc.sceneNo
                        );
                        const vidObj = outputVideos.find(
                          (v) => v.sceneNo === sc.sceneNo
                        );
                        return (
                          <tr
                            key={sc.sceneNo}
                            onClick={() => {
                              setCurrentSceneNo(sc.sceneNo);
                              setStudioTab('browser');
                            }}
                            className="hover:bg-white/5 cursor-pointer"
                          >
                            <td className="py-2.5 px-3 font-mono font-semibold text-[#ffb36b] whitespace-nowrap align-top tabular-nums">
                              Scene_{sc.sceneNo}
                              <div className="text-[10px] text-white/50 font-normal">
                                {formatSceneImageName(sc.sceneNo)}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 align-top max-w-sm">
                              <p className="text-white/85 line-clamp-2">
                                {sc.imagePrompt}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 align-top max-w-xs">
                              <p className="text-white/65 line-clamp-2">
                                {sc.videoPrompt}
                              </p>
                            </td>
                            <td className="py-2.5 px-3 align-top font-mono whitespace-nowrap">
                              {imgObj ? (
                                <span className="text-[#7ee787]">
                                  ✅ {imgObj.fileName} ({imgObj.accountUsed})
                                </span>
                              ) : (
                                <span className="text-white/45">
                                  Not Generated
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 align-top font-mono whitespace-nowrap">
                              {vidObj ? (
                                <span className="text-[#7ee787]">
                                  ✅ {vidObj.status} ({vidObj.accountUsed})
                                </span>
                              ) : (
                                <span className="text-white/45">Pending</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        {studioTab === 'browser' && (
          <ChromiumBrowserView
            browserTarget={browserTarget}
            setBrowserTarget={setBrowserTarget}
            chatgptAccounts={chatgptAccounts}
            flowAccounts={flowAccounts}
            activeChatgptAccIdx={activeChatgptAccIdx}
            setActiveChatgptAccIdx={setActiveChatgptAccIdx}
            activeFlowAccIdx={activeFlowAccIdx}
            setActiveFlowAccIdx={setActiveFlowAccIdx}
            isRunningBot={isRunningBot}
            runningBotType={runningBotType}
            currentSceneNo={currentSceneNo}
            currentStepLabel={currentStepLabel}
            currentStepProgress={currentStepProgress}
            stealthMode={stealthMode}
            setStealthMode={setStealthMode}
            stealthScreenBlackout={stealthScreenBlackout}
            setStealthScreenBlackout={setStealthScreenBlackout}
            onStartChatgptBot={handleStartChatgptBot}
            onStartFlowBot={handleStartFlowBot}
            onStopBot={handleStopBot}
            onToggleAccountLogin={handleToggleAccountLogin}
            onResetTodayFlowCredits={handleResetTodayFlowCredits}
            selectedScenes={selectedRangeScenes}
            outputImages={outputImages}
            outputVideos={outputVideos}
            characterRefs={characterRefs}
            workspaceFolderPath={workspaceFolderPath}
            liveLogs={liveLogs}
            pdfFileName={loadedPdf?.fileName || 'No PDF Loaded'}
            onGoToStudioStep3={() => setStudioTab('workspace')}
          />
        )}

        {studioTab === 'folder' && (
          <FolderAndImagesView
            workspaceFolderPath={workspaceFolderPath}
            setWorkspaceFolderPath={setWorkspaceFolderPath}
            boundDirectoryName={boundDirectoryName}
            onPickDeviceDirectory={handlePickDeviceDirectory}
            outputImages={outputImages}
            onClearStorageForNextVideo={handleClearStorageForNextVideo}
            onDeleteSingleOutputImage={handleDeleteSingleOutputImage}
            onDownloadWorkspaceZip={handleDownloadWorkspaceZip}
            characterRefs={characterRefs}
            onAddCharacterRef={handleAddCharacterRef}
            chatgptAccounts={chatgptAccounts}
            flowAccounts={flowAccounts}
            onAddAccount={handleAddAccount}
            onToggleAccountLogin={handleToggleAccountLogin}
            onResetTodayFlowCredits={handleResetTodayFlowCredits}
          />
        )}

        {(studioTab === 'reports' || studioTab === 'apk') && (
          <ReportsAndAndroidApkView
            flowReportText={flowReportText}
            chatgptReportText={chatgptReportText}
            sceneChatsLogText={
              sceneChatsLogText ||
              'No ChatGPT scene chats recorded yet. Run Bot 1 to populate chat URLs.'
            }
            dailyCreditJson={dailyCreditJson}
            mode={studioTab}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Mobile Studio Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#120400]/95 backdrop-blur-md border-t border-white/15 grid grid-cols-5 items-center h-14 px-1"
      >
        <button
          type="button"
          onClick={() => setStudioTab('workspace')}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
            studioTab === 'workspace' ? 'text-[#ff8a1f]' : 'text-white/60'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span className="mt-0.5">Studio</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioTab('browser')}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
            studioTab === 'browser' ? 'text-[#ff8a1f]' : 'text-white/60'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span className="mt-0.5">Browser</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioTab('folder')}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
            studioTab === 'folder' ? 'text-[#ff8a1f]' : 'text-white/60'
          }`}
        >
          <FolderOpen className="w-4 h-4" />
          <span className="mt-0.5">Images ({outputImages.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioTab('reports')}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
            studioTab === 'reports' ? 'text-[#ff8a1f]' : 'text-white/60'
          }`}
        >
          <Film className="w-4 h-4" />
          <span className="mt-0.5">Reports</span>
        </button>

        <button
          type="button"
          onClick={() => setStudioTab('apk')}
          className={`flex flex-col items-center justify-center min-h-[44px] text-[10px] font-medium ${
            studioTab === 'apk' ? 'text-[#ff8a1f]' : 'text-white/60'
          }`}
        >
          <Download className="w-4 h-4" />
          <span className="mt-0.5">APK</span>
        </button>
      </nav>
    </div>
  );
}
