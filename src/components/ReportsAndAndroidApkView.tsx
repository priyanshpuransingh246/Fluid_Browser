import React, { useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import {
  exportAndroidGithubApkProjectZip,
  getInjectedUserscriptsSource,
} from '../utils/androidApkExporter';

interface ReportsAndAndroidApkProps {
  flowReportText: string;
  chatgptReportText: string;
  sceneChatsLogText: string;
  dailyCreditJson: string;
  mode: 'reports' | 'apk';
}

export const ReportsAndAndroidApkView: React.FC<ReportsAndAndroidApkProps> = ({
  flowReportText,
  chatgptReportText,
  sceneChatsLogText,
  dailyCreditJson,
  mode,
}) => {
  const [activeReportTab, setActiveReportTab] = useState<
    'flow' | 'chatgpt' | 'chats' | 'credits'
  >('flow');
  const [copied, setCopied] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<
    'kotlin' | 'flowjs' | 'chatgptjs' | 'workflow'
  >('kotlin');

  const scriptsSource = getInjectedUserscriptsSource();

  const currentReportContent =
    activeReportTab === 'flow'
      ? flowReportText
      : activeReportTab === 'chatgpt'
        ? chatgptReportText
        : activeReportTab === 'chats'
          ? sceneChatsLogText
          : dailyCreditJson;

  const currentReportFilename =
    activeReportTab === 'flow'
      ? 'Scene_Account_Status_Report.txt'
      : activeReportTab === 'chatgpt'
        ? 'skipped_scenes_report.txt'
        : activeReportTab === 'chats'
          ? 'chatgpt_scene_chats.txt'
          : 'daily_credit_tracker.json';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownloadText = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadAndroidApkProject = async () => {
    const blob = await exportAndroidGithubApkProjectZip();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Itihaskar_Samay_Android_Chromium_APK_GitHub_Project.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (mode === 'reports') {
    return (
      <div className="space-y-5">
        <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-wider text-[#ffb36b]">
                WORK REPORTS • SCENE &amp; ACCOUNT STATUS
              </p>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Scene &amp; Account Status Reports (
                <code>scene_account_reports/</code>)
              </h2>
              <p className="text-xs text-white/70">
                Shows the exact output report for your currently loaded PDF (
                <code>Haan Bana YES</code> vs <code>Nahi Bana NO</code> +
                Account Name + Dropped Video Prompts).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(currentReportContent)}
                className="min-h-[40px] px-4 rounded-full text-xs font-medium bg-[#180600] border border-white/20 hover:bg-white/10 text-white inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#7ee787]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Report
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() =>
                  handleDownloadText(
                    currentReportFilename,
                    currentReportContent
                  )
                }
                className="min-h-[40px] px-4 sm:px-5 rounded-full text-xs font-semibold bg-white text-[#180600] hover:bg-[#fff4ec] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0" />
                <span>Download {currentReportFilename}</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/15">
            <button
              type="button"
              onClick={() => setActiveReportTab('flow')}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeReportTab === 'flow'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75 hover:bg-white/10'
              }`}
            >
              Flow AI Status Report (v3.0)
            </button>
            <button
              type="button"
              onClick={() => setActiveReportTab('chatgpt')}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeReportTab === 'chatgpt'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75 hover:bg-white/10'
              }`}
            >
              ChatGPT Dropped Report (v20)
            </button>
            <button
              type="button"
              onClick={() => setActiveReportTab('chats')}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeReportTab === 'chats'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75 hover:bg-white/10'
              }`}
            >
              chatgpt_scene_chats.txt
            </button>
            <button
              type="button"
              onClick={() => setActiveReportTab('credits')}
              className={`px-3.5 py-2 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                activeReportTab === 'credits'
                  ? 'bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75 hover:bg-white/10'
              }`}
            >
              daily_credit_tracker.json
            </button>
          </div>

          <pre className="bg-[#120400] border border-white/15 rounded-2xl p-4 text-xs font-mono text-white/90 whitespace-pre-wrap break-words max-h-[520px] overflow-y-auto leading-relaxed">
            {currentReportContent}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Step-by-Step Android Download & Run Guide */}
      <div className="bg-[rgba(56,20,6,0.45)] border border-white/15 rounded-[22px] p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-[#ffb36b]">
              ANDROID STEP-BY-STEP GUIDE + APK BUILDER
            </p>
            <h2 className="text-lg sm:text-xl font-bold text-white">
              Android Phone Me Kaise Download Aur Run Karein (Step-by-Step)
            </h2>
            <p className="text-xs sm:text-sm text-white/75 max-w-2xl leading-relaxed">
              Aap is app ko do tarike se apne aur apni team ke Android phone me
              install aur run kar sakte hain:
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadAndroidApkProject}
            className="min-h-[44px] px-4 sm:px-5 rounded-full text-xs font-semibold bg-gradient-to-r from-[#ff3d00] to-[#ff8a1f] text-[#180600] inline-flex items-center gap-2 cursor-pointer shadow-lg"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Download GitHub Android APK Project (.ZIP)</span>
          </button>
        </div>

        {/* Method 1 & Method 2 Step-by-Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#120400]/85 border border-white/15 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#7ee787] uppercase tracking-wider">
              Method 1: Turant Phone Me Install Karein (PWA App — 30 Seconds)
            </div>
            <ol className="text-xs text-white/80 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Apne Android phone ke <strong>Chrome Browser</strong> me is app
                ka link kholein.
              </li>
              <li>
                Upar right side me <strong>&quot;Install App&quot;</strong>{' '}
                button dabayein (ya Chrome ke <code>⋮</code> menu me jaakar{' '}
                <strong>&quot;Add to Home screen / Install app&quot;</strong>{' '}
                par tap karein).
              </li>
              <li>
                App aapke phone me install ho jayega. Open karte hi{' '}
                <strong>Slide to Open</strong> karein.
              </li>
              <li>
                Sabse pehle <strong>Free Fire style Folder Setup</strong> aayega
                — waha <strong>&quot;📁 Select Phone Storage Folder&quot;</strong>{' '}
                par tap karke apne phone me ek folder (jaise{' '}
                <code>Itihaskar_Bot</code>) select karke{' '}
                <strong>&quot;Allow Access&quot;</strong> kar dein.
              </li>
              <li>
                Ab <strong>Scene Queue</strong> me apni <code>.pdf</code> file
                upload karein aur <strong>Bot 1 (ChatGPT)</strong> ya{' '}
                <strong>Bot 2 (Flow AI)</strong> slide karke chala dein!
              </li>
            </ol>
          </div>

          <div className="bg-[#120400]/85 border border-white/15 rounded-2xl p-4 space-y-2.5">
            <div className="text-xs font-semibold text-[#ffb36b] uppercase tracking-wider">
              Method 2: Custom Chromium Auto-Browser APK (GitHub Actions Se)
            </div>
            <ol className="text-xs text-white/80 space-y-2 list-decimal list-inside leading-relaxed">
              <li>
                Upar diye gaye orange button{' '}
                <strong>&quot;Download GitHub Android APK Project (.ZIP)&quot;</strong>{' '}
                par click karke ZIP download karein.
              </li>
              <li>
                Apne GitHub account me ek naya repository banayein aur is ZIP ke
                saare files waha upload (push) kar dein.
              </li>
              <li>
                GitHub ke <strong>Actions</strong> tab me jayein — waha{' '}
                <code>Build Itihaskar Chromium APK</code> workflow automatic
                chalega aur 2–3 minute me <code>app-debug.apk</code> bana dega.
              </li>
              <li>
                Us <code>.apk</code> ko apne ya team ke Android phone me
                download karke install kar lein — iske andar{' '}
                <strong>Desktop Chromium 131 WebView</strong> aur{' '}
                <strong>Bot 1 (v20) + Bot 2 (v3.0)</strong> userscripts pre-built
                hain!
              </li>
            </ol>
          </div>
        </div>

        {/* Code Inspector Tabs */}
        <div className="pt-2 border-t border-white/15 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCodeTab('kotlin')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono cursor-pointer ${
                activeCodeTab === 'kotlin'
                  ? 'bg-white text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75'
              }`}
            >
              MainActivity.kt (Chromium WebView)
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('chatgptjs')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono cursor-pointer ${
                activeCodeTab === 'chatgptjs'
                  ? 'bg-white text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75'
              }`}
            >
              chatgpt_bot_v20.js
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('flowjs')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono cursor-pointer ${
                activeCodeTab === 'flowjs'
                  ? 'bg-white text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75'
              }`}
            >
              flow_video_bot_v3.js
            </button>
            <button
              type="button"
              onClick={() => setActiveCodeTab('workflow')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono cursor-pointer ${
                activeCodeTab === 'workflow'
                  ? 'bg-white text-[#180600] font-semibold'
                  : 'bg-[#120400] text-white/75'
              }`}
            >
              .github/workflows/build-apk.yml
            </button>
          </div>

          <pre className="bg-[#120400] border border-white/15 rounded-2xl p-4 text-xs font-mono text-white/85 whitespace-pre-wrap break-words max-h-96 overflow-y-auto leading-relaxed">
            {activeCodeTab === 'kotlin'
              ? scriptsSource.kotlinMainActivity
              : activeCodeTab === 'chatgptjs'
                ? scriptsSource.chatgptBotJs
                : activeCodeTab === 'flowjs'
                  ? scriptsSource.flowBotJs
                  : scriptsSource.githubWorkflowYml}
          </pre>
        </div>
      </div>
    </div>
  );
};
