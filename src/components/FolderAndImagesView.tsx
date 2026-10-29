import React, { useState } from 'react';
import {
  FolderOpen,
  Trash2,
  Download,
  Plus,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react';
import { GeneratedSceneImage } from '../utils/sceneMediaGenerator';
import { CharacterReferenceAsset } from '../data/preloadedScenes';
import { AccountProfile } from './ChromiumBrowserModal';

interface FolderAndImagesViewProps {
  workspaceFolderPath: string;
  setWorkspaceFolderPath: (p: string) => void;
  boundDirectoryName: string | null;
  onPickDeviceDirectory: () => void;
  outputImages: GeneratedSceneImage[];
  onClearStorageForNextVideo: () => void;
  onDeleteSingleOutputImage: (sceneNo: number) => void;
  onDownloadWorkspaceZip: () => void;
  characterRefs: CharacterReferenceAsset[];
  onAddCharacterRef: (file: File) => void;
  chatgptAccounts: AccountProfile[];
  flowAccounts: AccountProfile[];
  onAddAccount: (type: 'chatgpt' | 'flow') => void;
  onToggleAccountLogin: (type: 'chatgpt' | 'flow', idx: number) => void;
  onResetTodayFlowCredits: () => void;
}

export const FolderAndImagesView: React.FC<FolderAndImagesViewProps> = ({
  workspaceFolderPath,
  setWorkspaceFolderPath,
  boundDirectoryName,
  onPickDeviceDirectory,
  outputImages,
  onClearStorageForNextVideo,
  onDeleteSingleOutputImage,
  onDownloadWorkspaceZip,
  characterRefs,
  onAddCharacterRef,
  chatgptAccounts,
  flowAccounts,
  onAddAccount,
  onToggleAccountLogin,
  onResetTodayFlowCredits,
}) => {
  const [confirmClearStorage, setConfirmClearStorage] = useState(false);
  const [filterAccount, setFilterAccount] = useState<string>('ALL');

  const filteredImages =
    filterAccount === 'ALL'
      ? outputImages
      : outputImages.filter((img) => img.accountUsed === filterAccount);

  const totalSizeKb = Math.round(
    outputImages.reduce((acc, item) => acc + item.sizeBytes, 0) / 1024
  );

  return (
    <div className="space-y-5">
      {/* Device Folder Picker & 1-Click Clear Storage Banner */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#ffb36b]">
              FREE FIRE STYLE MAIN RESOURCE FOLDER
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Phone Storage Folder &amp; Clear Storage Manager
            </h2>
            <p className="text-xs sm:text-sm text-white/75 max-w-2xl leading-relaxed">
              Is main folder ke andar teen cheezein banti hain:{' '}
              <code className="font-mono text-[#ffb36b]">output_images/</code>{' '}
              (jaha ChatGPT images download hoti hain aur Flow AI me upload hoti
              hain),{' '}
              <code className="font-mono text-[#7ee787]">
                accounts_login_vault/
              </code>{' '}
              (jaha sabhi accounts ke login details save rehte hain), aur{' '}
              <code className="font-mono text-[#ffb36b]">
                scene_account_reports/
              </code>{' '}
              (jaha reports banti hain).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={onPickDeviceDirectory}
              className="min-h-[42px] px-4 sm:px-5 rounded-full text-xs font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] inline-flex items-center gap-2 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 shrink-0" />
              <span>
                {boundDirectoryName
                  ? `📁 Folder: ${boundDirectoryName}`
                  : '📁 Choose Phone Folder'}
              </span>
            </button>

            <button
              type="button"
              onClick={onDownloadWorkspaceZip}
              className="min-h-[42px] px-4 sm:px-5 rounded-full text-xs font-semibold bg-[#180600]/80 hover:bg-white/10 text-white border border-white/25 inline-flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#ff8a1f] shrink-0" />
              <span>Download Images + Reports (.ZIP)</span>
            </button>
          </div>
        </div>

        {/* Folder Path Input & Subfolder Map */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t border-white/15">
          <div className="lg:col-span-5 space-y-2">
            <label
              htmlFor="android-workspace-path"
              className="block text-xs font-medium text-white/85"
            >
              Active Phone Storage Folder Path
            </label>
            <input
              id="android-workspace-path"
              type="text"
              value={workspaceFolderPath}
              onChange={(e) => setWorkspaceFolderPath(e.target.value)}
              className="w-full min-h-[44px] bg-[#120400]/80 border border-white/20 rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#ff8a1f]"
            />
            <p className="text-[11px] text-white/60 font-mono break-words">
              Subfolders: /output_images, /accounts_login_vault
              (chrome_accounts + flow_accounts), /scene_account_reports
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="bg-[#120400]/80 border border-white/15 rounded-2xl p-3">
              <div className="text-[11px] text-white/65">output_images/</div>
              <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                {outputImages.length} PNGs
              </div>
              <div className="text-[11px] font-mono text-[#ffb36b] tabular-nums">
                {totalSizeKb} KB in folder
              </div>
            </div>

            <div className="bg-[#120400]/80 border border-white/15 rounded-2xl p-3">
              <div className="text-[11px] text-white/65">chrome_accounts/</div>
              <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                {chatgptAccounts.length} Profiles
              </div>
              <div className="text-[11px] font-mono text-[#7ee787]">
                {chatgptAccounts.filter((a) => a.loggedIn).length} Login Saved
              </div>
            </div>

            <div className="bg-[#120400]/80 border border-white/15 rounded-2xl p-3">
              <div className="text-[11px] text-white/65">flow_accounts/</div>
              <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                {flowAccounts.length} Jio Pro
              </div>
              <div className="text-[11px] font-mono text-[#ffb36b]">
                {flowAccounts.filter((a) => !a.exhaustedToday).length} Active
                Today
              </div>
            </div>

            <div className="bg-[#120400]/80 border border-white/15 rounded-2xl p-3">
              <div className="text-[11px] text-white/65">Character Refs</div>
              <div className="mt-1 text-base sm:text-lg font-bold text-white font-mono tabular-nums">
                {characterRefs.length} Assets
              </div>
              <div className="text-[11px] font-mono text-white/60">
                Library Reuse
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 1-Click Clear Storage (Delete Images + Reports for Next Video) Card */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/15">
          <div>
            <h3 className="text-base font-semibold text-white">
              Clear Storage for Next Documentary Video (output_images/ + Reports)
            </h3>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              Next video par move karne se pehle{' '}
              <strong className="text-white">Clear Storage</strong> dabayein —
              yeh <code className="font-mono text-[#ffb36b]">output_images/</code>{' '}
              ki saari purani images aur purani scene reports delete kar dega
              (aapke saved account logins safe rahenge).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!confirmClearStorage ? (
              <button
                type="button"
                onClick={() => setConfirmClearStorage(true)}
                className="min-h-[42px] px-5 rounded-full text-xs font-semibold bg-rose-600/25 border border-rose-400/50 hover:bg-rose-600/40 text-rose-200 inline-flex items-center gap-2 cursor-pointer"
              >
                <Trash2 className="w-4 h-4 shrink-0" />
                <span>
                  🗑️ Clear Storage: Images ({outputImages.length}) + Reports
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center gap-2 bg-rose-950/90 border border-rose-400/60 px-3.5 py-2 rounded-2xl">
                <span className="text-xs font-medium text-rose-200">
                  Delete all {outputImages.length} images &amp; reports for next
                  video? (Logins stay safe)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    onClearStorageForNextVideo();
                    setConfirmClearStorage(false);
                  }}
                  className="px-3.5 py-1 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white cursor-pointer"
                >
                  Yes, Clear Storage
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearStorage(false)}
                  className="px-3 py-1 rounded-full bg-[#180600] text-xs text-white/80 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Filter Bar */}
        {outputImages.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            <button
              type="button"
              onClick={() => setFilterAccount('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                filterAccount === 'ALL'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75 hover:bg-white/10'
              }`}
            >
              All Images ({outputImages.length})
            </button>
            {Array.from(new Set(outputImages.map((i) => i.accountUsed))).map(
              (acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => setFilterAccount(acc)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-mono transition-colors cursor-pointer ${
                    filterAccount === acc
                      ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                      : 'bg-[#120400] text-white/75 hover:bg-white/10'
                  }`}
                >
                  {acc} (
                  {outputImages.filter((i) => i.accountUsed === acc).length})
                </button>
              )
            )}
          </div>
        )}

        {/* Images Grid or Empty State */}
        {filteredImages.length === 0 ? (
          <div className="bg-[#120400]/80 border border-white/15 rounded-2xl p-8 text-center space-y-2.5">
            <ImageIcon className="w-8 h-8 text-[#ff8a1f] mx-auto" />
            <div className="text-sm font-semibold text-white">
              output_images/ Folder is Clean (0 Scene Images)
            </div>
            <p className="text-xs text-white/70 max-w-md mx-auto leading-relaxed">
              Storage clean hai! Ab aap Scene Queue me apni nayi PDF upload
              karke Bot 1 (ChatGPT Image Bot) chala sakte hain — saari nayi
              images{' '}
              <code className="font-mono text-[#ffb36b]">
                {workspaceFolderPath}/output_images/Scene_01.png
              </code>{' '}
              naam se save hongi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 max-h-[540px] overflow-y-auto pr-1">
            {filteredImages.map((img) => (
              <div
                key={img.fileName}
                className="bg-[#120400]/90 border border-white/15 rounded-2xl overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="relative aspect-video bg-[#180600]">
                    {img.dataUrl ? (
                      <img
                        src={img.dataUrl}
                        alt={img.fileName}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-mono text-white/50">
                        {img.fileName}
                      </div>
                    )}
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-semibold text-white">
                        {img.fileName}
                      </span>
                      <span className="font-mono text-[#ffb36b]">
                        {img.accountUsed}
                      </span>
                    </div>
                    <p className="text-xs text-white/70 line-clamp-2">
                      {img.imagePrompt}
                    </p>
                  </div>
                </div>

                <div className="px-3 pb-3 pt-1 flex items-center justify-between border-t border-white/10 text-[11px] font-mono text-white/60">
                  <span>{Math.round(img.sizeBytes / 1024)} KB</span>
                  <div className="flex items-center gap-2">
                    {img.dataUrl && (
                      <a
                        href={img.dataUrl}
                        download={img.fileName}
                        className="text-[#ffb36b] hover:underline"
                      >
                        Download
                      </a>
                    )}
                    <button
                      type="button"
                      aria-label={`Delete ${img.fileName}`}
                      onClick={() => onDeleteSingleOutputImage(img.sceneNo)}
                      className="text-rose-400 hover:underline cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Multi-Account Persistent Vault Manager + Daily Credit Memory Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                ChatGPT Login Vault (chrome_accounts/)
              </h3>
              <p className="text-xs text-white/65">
                Saved forever inside {workspaceFolderPath}/chrome_accounts
              </p>
            </div>
            <button
              type="button"
              onClick={() => onAddAccount('chatgpt')}
              className="min-h-[36px] px-3.5 rounded-full text-xs font-medium bg-[#180600] border border-white/20 hover:bg-white/10 text-white inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#ff8a1f]" />
              Add Account
            </button>
          </div>

          <div className="space-y-2">
            {chatgptAccounts.map((acc, idx) => (
              <div
                key={acc.id}
                className="bg-[#120400]/80 border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white font-mono truncate">
                    {acc.name} · {acc.email}
                  </div>
                  <div className="text-[11px] text-white/60 font-mono">
                    {acc.loggedIn
                      ? '✅ Login Saved Forever'
                      : 'Login Needed in Browser'}{' '}
                    · {acc.itemsGenerated} images
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAccountLogin('chatgpt', idx)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#240b03] border border-white/15 text-[#ffb36b] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {acc.loggedIn ? 'Saved' : 'Save Login'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-semibold text-white">
                Flow AI Login Vault &amp; Daily Credit Memory (flow_accounts/)
              </h3>
              <p className="text-xs text-white/65">
                Same-Day Exhausted Account Skip + Auto Next-Day Reset (
                <code>daily_credit_tracker.json</code>)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onResetTodayFlowCredits}
                className="min-h-[36px] px-3.5 rounded-full text-xs font-semibold bg-[#ff8a1f]/20 border border-[#ff8a1f]/60 hover:bg-[#ff8a1f]/35 text-[#ffb36b] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                🔄 Reset Today&apos;s Credit Memory
              </button>
              <button
                type="button"
                onClick={() => onAddAccount('flow')}
                className="min-h-[36px] px-3.5 rounded-full text-xs font-medium bg-[#180600] border border-white/20 hover:bg-white/10 text-white inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#ff8a1f]" />
                Add Jio Pro
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {flowAccounts.map((acc, idx) => (
              <div
                key={acc.id}
                className="bg-[#120400]/80 border border-white/15 rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white font-mono truncate">
                    {acc.name} · {acc.email}
                  </div>
                  <div className="text-[11px] font-mono text-white/60">
                    {acc.exhaustedToday
                      ? '⚠️ Today Credits Exhausted (Auto-Skips Today)'
                      : `${acc.creditsRemaining} credits remaining · ${acc.itemsGenerated} videos made`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleAccountLogin('flow', idx)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-[#240b03] border border-white/15 text-[#ffb36b] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {acc.loggedIn ? 'Saved' : 'Save Login'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Character Reference Images Vault */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-white">
              Character Reference Library (v20 Smart &apos;Add from Library&apos;
              Reuse)
            </h3>
            <p className="text-xs text-white/70">
              Jab PDF prompt me{' '}
              <code className="font-mono text-[#ffb36b]">
                USE UPLOADED IMAGE AS OLD CHANGEZ KHAN
              </code>{' '}
              aata hai, Bot 1 pehli baar upload karke agli baar ChatGPT Library
              se reuse karta hai.
            </p>
          </div>

          <label className="min-h-[40px] px-4 rounded-full text-xs font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] inline-flex items-center gap-1.5 cursor-pointer shrink-0">
            <Plus className="w-3.5 h-3.5" />
            <span>Add Character Reference Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onAddCharacterRef(file);
              }}
            />
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {characterRefs.map((ref) => (
            <div
              key={ref.id}
              className="bg-[#120400]/80 border border-white/15 rounded-2xl p-3.5 flex items-center gap-4"
            >
              <img
                src={ref.url}
                alt={ref.name}
                referrerPolicy="no-referrer"
                className="w-14 h-18 rounded-xl object-cover border border-white/15 shrink-0"
              />
              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-sm font-semibold text-white truncate">
                  {ref.name}
                </div>
                <div className="text-xs font-mono text-white/60 truncate">
                  File: {ref.fileName}
                </div>
                <div className="text-xs text-[#7ee787] font-mono">
                  Cached in Library: {ref.uploadedInAccounts.join(', ')}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
