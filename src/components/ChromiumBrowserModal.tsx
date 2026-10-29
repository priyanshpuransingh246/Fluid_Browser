import React from 'react';
import {
  Globe,
  ShieldCheck,
  Play,
  Square,
  Moon,
  Plus,
  Check,
  ArrowRight,
  RotateCcw,
  Image as ImageIcon,
  Film,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { ParsedScene, formatSceneImageName } from '../utils/botEngine';
import {
  GeneratedSceneImage,
  GeneratedSceneVideo,
} from '../utils/sceneMediaGenerator';
import { CharacterReferenceAsset } from '../data/preloadedScenes';

export interface AccountProfile {
  id: string;
  name: string;
  email: string;
  loggedIn: boolean;
  exhaustedToday: boolean;
  creditsRemaining: number;
  itemsGenerated: number;
  uploadedRefs: string[];
}

interface ChromiumBrowserProps {
  browserTarget: 'chatgpt' | 'flow';
  setBrowserTarget: (t: 'chatgpt' | 'flow') => void;
  chatgptAccounts: AccountProfile[];
  flowAccounts: AccountProfile[];
  activeChatgptAccIdx: number;
  setActiveChatgptAccIdx: (idx: number) => void;
  activeFlowAccIdx: number;
  setActiveFlowAccIdx: (idx: number) => void;
  isRunningBot: boolean;
  runningBotType: 'chatgpt' | 'flow' | null;
  currentSceneNo: number | null;
  currentStepLabel: string;
  currentStepProgress: number;
  stealthMode: boolean;
  setStealthMode: (v: boolean) => void;
  stealthScreenBlackout: boolean;
  setStealthScreenBlackout: (v: boolean) => void;
  onStartChatgptBot: () => void;
  onStartFlowBot: () => void;
  onStopBot: () => void;
  onToggleAccountLogin: (type: 'chatgpt' | 'flow', idx: number) => void;
  onResetTodayFlowCredits: () => void;
  selectedScenes: ParsedScene[];
  outputImages: GeneratedSceneImage[];
  outputVideos: GeneratedSceneVideo[];
  characterRefs: CharacterReferenceAsset[];
  workspaceFolderPath: string;
  liveLogs: string[];
  pdfFileName: string;
  onGoToStudioStep3?: () => void;
}

export const ChromiumBrowserView: React.FC<ChromiumBrowserProps> = ({
  browserTarget,
  setBrowserTarget,
  chatgptAccounts,
  flowAccounts,
  activeChatgptAccIdx,
  setActiveChatgptAccIdx,
  activeFlowAccIdx,
  setActiveFlowAccIdx,
  isRunningBot,
  runningBotType,
  currentSceneNo,
  currentStepLabel,
  currentStepProgress,
  stealthMode,
  setStealthMode,
  stealthScreenBlackout,
  setStealthScreenBlackout,
  onStartChatgptBot,
  onStartFlowBot,
  onStopBot,
  onToggleAccountLogin,
  onResetTodayFlowCredits,
  selectedScenes,
  outputImages,
  outputVideos,
  characterRefs,
  workspaceFolderPath,
  liveLogs,
  pdfFileName,
  onGoToStudioStep3,
}) => {
  const activeChatAcc =
    chatgptAccounts[activeChatgptAccIdx] || chatgptAccounts[0];
  const activeFlowAcc = flowAccounts[activeFlowAccIdx] || flowAccounts[0];

  const activeScene =
    selectedScenes.find((s) => s.sceneNo === currentSceneNo) ||
    selectedScenes[0] ||
    null;

  const latestImageForScene = activeScene
    ? outputImages.find((img) => img.sceneNo === activeScene.sceneNo)
    : outputImages[outputImages.length - 1];

  const latestVideoForScene = activeScene
    ? outputVideos.find((v) => v.sceneNo === activeScene.sceneNo)
    : outputVideos[outputVideos.length - 1];

  const browserUrl =
    browserTarget === 'chatgpt'
      ? `https://chatgpt.com/c/itihaskar-scene-${activeScene?.sceneNo || 1}`
      : `https://labs.google/fx/tools/flow/project/itihaskar-samay-v3`;

  return (
    <div className="space-y-6">
      {/* Stealth Screen-Off Blackout Overlay (wakes on tap) */}
      {stealthScreenBlackout && (
        <div
          role="dialog"
          aria-label="Stealth Screen-Off Active"
          onClick={() => setStealthScreenBlackout(false)}
          className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-6 cursor-pointer select-none"
        >
          <div className="max-w-md text-center space-y-3 opacity-35 hover:opacity-80 transition-opacity">
            <Moon className="w-8 h-8 text-[#ff8a1f] mx-auto" />
            <p className="text-sm font-mono text-white/80">
              STEALTH SCREEN-OFF MODE ACTIVE (OLED BLACKOUT)
            </p>
            <p className="text-xs text-white/60">
              {isRunningBot
                ? `Running Scene ${currentSceneNo ?? '--'}: ${currentStepLabel}`
                : 'Automation standing by in background.'}
            </p>
            <p className="text-xs text-[#ffb36b] pt-2">
              Tap anywhere on screen to wake display
            </p>
          </div>
        </div>
      )}

      {/* Top Automation Action Bar */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[24px] p-4 sm:p-5 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 min-w-0">
          <div className="grid grid-cols-2 sm:inline-flex rounded-full bg-[#180600]/90 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => setBrowserTarget('chatgpt')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-full transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                browserTarget === 'chatgpt'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bot 1: ChatGPT (v20)</span>
            </button>
            <button
              type="button"
              onClick={() => setBrowserTarget('flow')}
              className={`px-3.5 py-2 text-xs font-semibold rounded-full transition-colors inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                browserTarget === 'flow'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600]'
                  : 'text-white/75 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Bot 2: Flow AI (v3.0)</span>
            </button>
          </div>

          <span className="text-xs text-[#ffb36b] font-mono px-1 truncate max-w-full">
            Folder: {workspaceFolderPath}/
            {browserTarget === 'chatgpt' ? 'chrome_accounts' : 'flow_accounts'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const next = !stealthMode;
              setStealthMode(next);
              if (next && isRunningBot) {
                setStealthScreenBlackout(true);
              }
            }}
            className={`min-h-[40px] px-4 rounded-full text-xs font-medium border transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              stealthMode
                ? 'bg-[#ff8a1f]/20 border-[#ff8a1f] text-[#ffb36b]'
                : 'bg-[#180600]/70 border-white/20 text-white/80 hover:bg-white/10'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            {stealthMode ? 'Stealth Screen-Off: ON' : 'Stealth Screen-Off: OFF'}
          </button>

          {isRunningBot ? (
            <button
              type="button"
              onClick={onStopBot}
              className="min-h-[40px] px-5 rounded-full text-xs font-semibold bg-rose-600/30 border border-rose-400/50 text-rose-200 hover:bg-rose-600/50 inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              Stop Automation
            </button>
          ) : selectedScenes.length === 0 ? (
            <button
              type="button"
              onClick={onGoToStudioStep3}
              className="min-h-[40px] px-5 rounded-full text-xs font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              📄 Choose PDF in Step 3 First
            </button>
          ) : browserTarget === 'chatgpt' ? (
            <button
              type="button"
              onClick={onStartChatgptBot}
              className="min-h-[40px] px-5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5" />
              Run Bot 1: Generate Images ({selectedScenes.length} Scenes)
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartFlowBot}
              className="min-h-[40px] px-5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-lg"
            >
              <Play className="w-3.5 h-3.5" />
              Run Bot 2: Generate Flow Videos ({selectedScenes.length} Scenes)
            </button>
          )}
        </div>
      </div>

      {/* Persistent Account Switcher Strip */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[24px] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
          <div>
            <p className="text-xs font-semibold tracking-wider text-[#ffb36b]">
              Persistent Multi-Account Sequence
            </p>
            <h3 className="text-base font-semibold text-white mt-0.5">
              {browserTarget === 'chatgpt'
                ? 'ChatGPT Accounts (chrome_accounts/Account_1..N)'
                : 'Flow AI Jio Pro Accounts (flow_accounts/Flow_Account_1..N)'}
            </h3>
          </div>
          {browserTarget === 'flow' && (
            <button
              type="button"
              onClick={onResetTodayFlowCredits}
              className="min-h-[38px] px-4 rounded-full text-xs font-medium bg-[#180600]/80 border border-white/20 hover:bg-white/10 text-[#ffb36b] inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Today&apos;s Credit Memory
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5">
          {(browserTarget === 'chatgpt' ? chatgptAccounts : flowAccounts).map(
            (acc, idx) => {
              const isSelected =
                browserTarget === 'chatgpt'
                  ? idx === activeChatgptAccIdx
                  : idx === activeFlowAccIdx;
              return (
                <div
                  key={acc.id}
                  onClick={() =>
                    browserTarget === 'chatgpt'
                      ? setActiveChatgptAccIdx(idx)
                      : setActiveFlowAccIdx(idx)
                  }
                  className={`p-3 rounded-2xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#2a0e04] border-[#ff8a1f]'
                      : 'bg-[#180600]/75 border-white/15 hover:border-white/30'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold text-white font-mono truncate">
                      {acc.name}
                    </span>
                    <span className="text-[11px] font-mono text-[#ffb36b]">
                      {acc.exhaustedToday
                        ? 'LIMIT'
                        : acc.loggedIn
                          ? 'SAVED'
                          : 'NEW'}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] text-white/60 truncate">
                    {acc.email}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-1 text-[11px] font-mono">
                    <span className="text-white/85 tabular-nums">
                      {browserTarget === 'chatgpt'
                        ? `${acc.itemsGenerated} imgs`
                        : `${acc.creditsRemaining} cr`}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleAccountLogin(browserTarget, idx);
                      }}
                      className="text-[11px] text-[#ff8a1f] hover:underline cursor-pointer"
                    >
                      {acc.loggedIn ? 'Active' : 'Login'}
                    </button>
                  </div>
                </div>
              );
            }
          )}
        </div>
      </div>

      {/* Built-in Android Chromium Automation Viewport */}
      <div className="bg-[#180600] border border-white/15 rounded-[24px] overflow-hidden shadow-2xl">
        {/* Chromium Window Frame & Address Bar */}
        <div className="bg-[#240b03] border-b border-white/15 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120400] border border-white/15 text-xs text-emerald-300 font-mono shrink-0">
              <Lock className="w-3 h-3" />
              <span>Itihaskar Auto-Browser · Chromium 131</span>
            </div>
            <div className="flex-1 min-w-[180px] bg-[#120400] border border-white/15 rounded-full px-3.5 py-1 text-xs font-mono text-white/80 truncate flex items-center gap-2">
              <Globe className="w-3.5 h-3.5 text-[#ff8a1f] shrink-0" />
              <span className="truncate">{browserUrl}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-white/70 shrink-0">
            <span className="inline-flex items-center gap-1 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              AutomationControlled: Suppressed
            </span>
            <span>·</span>
            <span className="text-[#ffb36b]">
              {browserTarget === 'chatgpt'
                ? activeChatAcc?.name
                : activeFlowAcc?.name}
            </span>
          </div>
        </div>

        {/* Live Automation Progress Bar */}
        {isRunningBot && (
          <div className="bg-[#2a0e04] border-b border-white/15 px-4 py-2.5">
            <div className="flex items-center justify-between text-xs font-mono mb-1.5">
              <span className="text-[#ffb36b]">
                [LIVE AUTOMATION · Scene {currentSceneNo ?? '--'}] {currentStepLabel}
              </span>
              <span className="text-white tabular-nums">
                {currentStepProgress}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-[#120400] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] transition-transform duration-150 origin-left"
                style={{
                  transform: `scaleX(${Math.max(0.05, currentStepProgress / 100)})`,
                }}
              />
            </div>
          </div>
        )}

        {/* Simulated / Live DOM Workspace Inside Chromium */}
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[450px]">
          {/* Left 8 Columns: Active Web Application DOM (ChatGPT v20 or Flow AI v3.0) */}
          <div className="lg:col-span-8 p-5 flex flex-col justify-between bg-[#120400] border-b lg:border-b-0 lg:border-r border-white/15">
            {!activeScene ? (
              <div className="my-auto py-14 text-center space-y-4">
                <p className="text-sm font-semibold text-[#ffb36b]">
                  No PDF Script Loaded Yet
                </p>
                <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
                  Pehle Studio ke <strong>Step 3 (PDF Script Choose Karein)</strong>{' '}
                  mein apni PDF select ya upload karein. Jaise hi aap PDF
                  choose karenge, uske saare scenes aur prompts yahan Auto-Browser
                  mein aa jayenge.
                </p>
                {onGoToStudioStep3 && (
                  <button
                    type="button"
                    onClick={onGoToStudioStep3}
                    className="min-h-[42px] px-5 rounded-full bg-white text-[#180600] text-xs font-semibold hover:bg-[#fff4ec] cursor-pointer"
                  >
                    📄 Go to Step 3: Choose PDF Script
                  </button>
                )}
              </div>
            ) : browserTarget === 'chatgpt' ? (
              /* CHATGPT v20 INTERFACE */
              <div className="flex flex-col h-full justify-between space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      ChatGPT 4o · Image Generator
                    </span>
                    <span className="text-xs text-white/60 font-mono">
                      · {activeChatAcc?.name} · PDF: {pdfFileName}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-[#ffb36b]">
                    Library Cache:{' '}
                    {activeChatAcc?.uploadedRefs.length
                      ? activeChatAcc.uploadedRefs.join(', ')
                      : 'Ready'}
                  </div>
                </div>

                <div className="space-y-4 my-auto py-2">
                  {/* User Prompt Bubble */}
                  <div className="ml-auto max-w-xl bg-[#240b03] border border-white/15 rounded-2xl p-3.5 space-y-2">
                    {activeScene.referenceCharName && (
                      <div className="flex items-center gap-2.5 p-2 rounded-xl bg-[#120400] border border-[#ff8a1f]/40">
                        <img
                          src={
                            characterRefs.find((r) =>
                              r.name
                                .toLowerCase()
                                .includes(
                                  activeScene.referenceCharName!.toLowerCase()
                                )
                            )?.url ||
                            '/assets/aistudio/OLD_CHANGEZ_KHAN_fe741f17.jpeg'
                          }
                          alt={activeScene.referenceCharName}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-lg object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-[#ffb36b] truncate">
                            Recurring Character: {activeScene.referenceCharName}
                          </div>
                          <div className="text-[11px] font-mono text-emerald-300">
                            v20 Smart Mode: (+) → Add from library → Search
                            Library → Tick (✓) → Add to chat
                          </div>
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-white/90 leading-relaxed font-mono">
                      Create an image: {activeScene.imagePrompt}
                    </p>
                  </div>

                  {/* ChatGPT Generated Image Card */}
                  <div className="max-w-xl bg-[#1c0802] border border-white/15 rounded-2xl p-3 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <span className="text-emerald-300 font-medium inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          Auto-Rename Target:{' '}
                          <code className="font-mono text-[#ffb36b]">
                            {workspaceFolderPath}/output_images/
                            {formatSceneImageName(activeScene.sceneNo)}
                          </code>
                        </span>
                      </span>
                      <span className="font-mono text-white/60 text-[11px]">
                        v15 Direct Blob + Lightbox
                      </span>
                    </div>

                    {latestImageForScene?.dataUrl ? (
                      <img
                        src={latestImageForScene.dataUrl}
                        alt={`Scene ${activeScene.sceneNo}`}
                        referrerPolicy="no-referrer"
                        className="w-full aspect-video rounded-xl object-cover border border-white/15"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-xl bg-[#120400] border border-white/10 flex items-center justify-center text-xs text-white/60 font-mono">
                        Ready to generate &amp; download{' '}
                        {formatSceneImageName(activeScene.sceneNo)}
                      </div>
                    )}
                  </div>
                </div>

                {/* ChatGPT Bottom Composer Bar */}
                <div className="bg-[#240b03] border border-white/20 rounded-2xl p-3 space-y-2">
                  <div className="text-xs text-white/80 font-mono truncate">
                    Create an image: {activeScene.imagePrompt}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#120400] text-xs text-[#ffb36b] font-mono">
                      <Plus className="w-3.5 h-3.5 text-[#ff8a1f]" />
                      Add from library (v20)
                    </span>
                    <div className="w-7 h-7 rounded-full bg-white text-[#180600] flex items-center justify-center">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* FLOW AI v3.0 INTERFACE (`labs.google/fx/tools/flow`) */
              <div className="flex flex-col h-full justify-between space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      Google Flow AI · Video Generator (v3.0)
                    </span>
                    <span className="text-xs font-mono text-white/60">
                      · {activeFlowAcc?.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-[#240b03] border border-white/15 text-xs font-mono text-emerald-300 tabular-nums">
                      {activeFlowAcc?.creditsRemaining ?? 540} credits
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#240b03] border border-white/15 text-xs font-mono text-white/80 inline-flex items-center gap-1">
                      <Plus className="w-3.5 h-3.5 text-[#ff8a1f]" />
                      Upload (Auto-Closes Esc)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-auto py-2">
                  <div className="bg-[#240b03] border border-white/15 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-white/85">
                        Folder Image:{' '}
                        {formatSceneImageName(activeScene.sceneNo)}
                      </span>
                      <span className="font-mono text-emerald-300">
                        Attached
                      </span>
                    </div>
                    {latestImageForScene?.dataUrl ? (
                      <img
                        src={latestImageForScene.dataUrl}
                        alt="Uploaded Scene Frame"
                        referrerPolicy="no-referrer"
                        className="w-full aspect-video rounded-xl object-cover border border-white/15"
                      />
                    ) : (
                      <div className="w-full aspect-video rounded-xl bg-[#120400] border border-white/10 flex items-center justify-center text-xs text-white/50 font-mono">
                        Reads {formatSceneImageName(activeScene.sceneNo)} from
                        output_images/
                      </div>
                    )}
                  </div>

                  <div className="bg-[#240b03] border border-white/15 rounded-2xl p-3 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-[#ffb36b]">
                        {latestVideoForScene?.status === 'NAHI BANA (NO)'
                          ? 'Dropped (Auto-Skip)'
                          : 'Canvas Video Output (720p · 6s)'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-950/80 border border-rose-400/40 text-[10px] font-mono text-rose-200">
                        ⋮ Card Menu Ignored (v3.0 Fix)
                      </span>
                    </div>
                    {latestImageForScene?.dataUrl ? (
                      <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-white/15">
                        <img
                          src={latestImageForScene.dataUrl}
                          alt="Rendered Video Preview"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-transparent flex items-end p-2.5">
                          <span className="text-[11px] font-mono text-emerald-300">
                            {latestVideoForScene?.status || 'BANA (YES)'} ·
                            Download Ready
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full aspect-video rounded-xl bg-[#120400] border border-white/10 flex items-center justify-center text-xs text-white/50 font-mono">
                        Video Output Card
                      </div>
                    )}
                  </div>
                </div>

                {/* Flow AI Bottom Prompt Composer Box (v3.0 Exact Fix) */}
                <div className="max-w-2xl mx-auto w-full bg-[#240b03] border-2 border-[#ff8a1f] rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#ffb36b]">
                    <span>
                      PROMPT COMPOSER BOX (Bounded maxRight &lt;= 78% width)
                    </span>
                    <span>v3.0 Send Fix Active</span>
                  </div>

                  <div className="flex items-start gap-2.5 bg-[#120400] border border-white/15 rounded-xl p-2.5">
                    <div className="px-2.5 py-1 rounded-md bg-[#2a0e04] text-[11px] font-mono text-emerald-300 shrink-0">
                      + {formatSceneImageName(activeScene.sceneNo)}
                    </div>
                    <p className="text-xs text-white/90 font-mono line-clamp-2">
                      {activeScene.videoPrompt}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-[#120400] text-white flex items-center justify-center text-xs font-mono">
                        +
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-[#120400] border border-white/15 text-xs font-mono text-white/70">
                        Agent: OFF
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-lg bg-[#120400] text-xs font-mono text-[#ffb36b]">
                        Video | 16:9 · Omni 3.1 Flash · 720p · 6s | x1
                      </span>
                      <span
                        title="Exact round Arrow (→) Send button right of Settings Pill"
                        className="w-8 h-8 rounded-full bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-bold flex items-center justify-center shadow-md"
                      >
                        <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right 4 Columns: Real-Time Terminal & Step Inspector */}
          <div className="lg:col-span-4 bg-[#1c0802] p-4 flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/15 pb-2.5">
                <span className="text-xs font-semibold text-white">
                  Itihaskar Bot Execution Parity
                </span>
                <span className="text-[11px] font-mono text-[#ffb36b]">
                  {browserTarget === 'chatgpt'
                    ? 'itihaskar_samay_bot.py v20'
                    : 'flow_video_bot.py v3.0'}
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-white/85 bg-[#120400] border border-white/15 rounded-xl p-3">
                {browserTarget === 'chatgpt' ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Smart &apos;Add from library&apos; character reuse
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Saves physically to{' '}
                        <code>output_images/Scene_XX.png</code>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Auto-rotates Account_1..7 on limit reached
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Composer-bounded &apos;→&apos; Send click (ignores card
                        &apos;⋮&apos;)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Reads <code>Scene_XX.png</code> from phone folder
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <span>
                        Auto-rotates Flow_Account_1..3 on daily limit
                      </span>
                    </div>
                  </>
                )}
              </div>

              <div className="bg-[#120400] border border-white/15 rounded-xl p-3 h-64 overflow-y-auto font-mono text-[11px] space-y-1.5 text-white/80">
                {liveLogs.map((logLine, idx) => (
                  <div
                    key={idx}
                    className={
                      logLine.includes('DONE') ||
                      logLine.includes('SAVED') ||
                      logLine.includes('BANA (YES)') ||
                      logLine.includes('✅')
                        ? 'text-emerald-300'
                        : logLine.includes('DROP') ||
                            logLine.includes('NAHI BANA') ||
                            logLine.includes('Limit') ||
                            logLine.includes('ERROR')
                          ? 'text-[#ffb36b]'
                          : 'text-white/80'
                    }
                  >
                    {logLine}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-[11px] font-mono text-white/60 border-t border-white/15 pt-2.5 flex items-center justify-between">
              <span>Output: {workspaceFolderPath}/output_images</span>
              <span className="text-[#ffb36b] tabular-nums">
                {outputImages.length} PNGs
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
