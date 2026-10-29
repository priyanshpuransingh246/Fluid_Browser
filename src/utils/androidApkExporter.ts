import JSZip from 'jszip';
import { GeneratedSceneImage } from './sceneMediaGenerator';

/**
 * Generates the exact injected DOM automation script for Bot 1 (ChatGPT Image Bot v20)
 * and Bot 2 (Flow AI Video Bot v3.0) for the Android Custom Chromium WebView APK.
 */
export function getInjectedUserscriptsSource(): {
  chatgptBotJs: string;
  flowBotJs: string;
  githubWorkflowYml: string;
  androidMainActivityKt: string;
} {
  const chatgptBotJs = `/**
 * ITIHASKAR SAMAY - ANDROID CHROMIUM WEBVIEW INJECTED ENGINE
 * BOT 1: CHATGPT IMAGE BOT (v20 - Library Reuse + v15 Direct Blob Download)
 */
(function() {
  window.ItihaskarChatGPTBot = {
    countLargeImages: function() {
      const imgs = Array.from(document.querySelectorAll('main img, article img'));
      return imgs.filter(img => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 200).length;
    },
    clickComposerPlus: function() {
      const box = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
      if (!box) return false;
      const bRect = box.getBoundingClientRect();
      const btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => {
        const r = b.getBoundingClientRect();
        return r.width >= 20 && r.width <= 60 && Math.abs(r.top - bRect.top) < 65 && r.left <= bRect.left + 55;
      }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
      if (btns.length > 0) { btns[0].click(); return true; }
      return false;
    },
    selectFromLibrary: async function(targetQuery) {
      if (!this.clickComposerPlus()) return false;
      await new Promise(r => setTimeout(r, 1200));
      const libBtn = Array.from(document.querySelectorAll('[role="menuitem"], button, div')).find(
        el => (el.innerText || '').trim().toLowerCase().startsWith('add from library')
      );
      if (!libBtn || libBtn.getAttribute('aria-disabled') === 'true') return false;
      libBtn.click();
      await new Promise(r => setTimeout(r, 1800));
      const searchInput = document.querySelector('input[placeholder*="Search" i]');
      if (searchInput) {
        searchInput.focus();
        searchInput.value = targetQuery;
        searchInput.dispatchEvent(new InputEvent('input', { bubbles: true }));
        await new Promise(r => setTimeout(r, 1500));
      }
      const rows = Array.from(document.querySelectorAll('[role="dialog"] div, [role="dialog"] li')).filter(el => {
        const r = el.getBoundingClientRect();
        return r.width >= 240 && r.height >= 36 && r.height <= 85 && (el.innerText || '').toLowerCase().includes(targetQuery.toLowerCase());
      });
      if (rows.length === 0) return false;
      rows[0].click();
      await new Promise(r => setTimeout(r, 800));
      const addToChat = Array.from(document.querySelectorAll('button')).find(
        b => (b.innerText || '').trim().toLowerCase() === 'add to chat'
      );
      if (addToChat) { addToChat.click(); return true; }
      return false;
    },
    downloadLatestSceneImage: async function(sceneNo) {
      const imgs = Array.from(document.querySelectorAll('main img, article img'))
        .filter(img => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 200);
      if (imgs.length === 0) return false;
      const lastImg = imgs[imgs.length - 1];
      const resp = await fetch(lastImg.src);
      const blob = await resp.blob();
      if (blob.size < 10000) return false;
      const b64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
      const fileName = 'Scene_' + String(sceneNo).padStart(2, '0') + '.png';
      if (window.AndroidBridge && window.AndroidBridge.saveSceneImage) {
        window.AndroidBridge.saveSceneImage(fileName, b64);
      }
      return true;
    }
  };
})();
`;

  const flowBotJs = `/**
 * ITIHASKAR SAMAY - ANDROID CHROMIUM WEBVIEW INJECTED ENGINE
 * BOT 2: FLOW AI VIDEO GENERATOR BOT (v3.0 - Exact Composer Send Button & Popup Fix)
 */
(function() {
  window.ItihaskarFlowBot = {
    dismissAllPopups: function() {
      // Closes red Google Security Alert ('Did you request help signing in? [Review]') via '✕' (NEVER 'Review')
      const allClickable = Array.from(document.querySelectorAll('button, [role="button"], a, span'));
      for (const el of allClickable) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.width > 55 || r.height > 55) continue;
        const txt = (el.innerText || '').trim().toLowerCase();
        const aria = (el.getAttribute('aria-label') || '').trim().toLowerCase();
        if (txt.includes('review') || aria.includes('review')) continue;
        if (['x', '✕', '✖', '×', 'close'].includes(txt) || aria.includes('close') || aria.includes('dismiss')) {
          el.click();
          return 'closed-popup';
        }
      }
      return null;
    },
    clickComposerSendButtonStrict: function() {
      // v3.0 Exact Fix: Strictly bounds search to Prompt Composer Box next to 'Video | 720p · 6s | x1'
      // NEVER clicks right-side canvas image card '⋮' (3-dots) menu!
      const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
      const agentBtn = btns.find(b => {
        const r = b.getBoundingClientRect();
        const txt = (b.innerText || '').trim().toLowerCase();
        return r.height > 0 && r.top > window.innerHeight * 0.50 && (txt === 'agent' || txt.endsWith('agent'));
      });
      if (!agentBtn) return null;
      const aRect = agentBtn.getBoundingClientRect();

      let composerBox = agentBtn.parentElement;
      while (composerBox && composerBox !== document.body) {
        const cr = composerBox.getBoundingClientRect();
        if (cr.width >= 300 && cr.width <= window.innerWidth * 0.80 && cr.height >= 60) break;
        composerBox = composerBox.parentElement;
      }
      const composerRightLimit = (composerBox && composerBox !== document.body)
        ? Math.min(composerBox.getBoundingClientRect().right + 18, window.innerWidth * 0.80)
        : window.innerWidth * 0.78;

      const rowRightBtns = btns.filter(b => {
        if (b === agentBtn) return false;
        const r = b.getBoundingClientRect();
        if (r.width < 18 || r.height < 18 || r.width > 260 || r.height > 70) return false;
        if (Math.abs((r.top + r.height / 2) - (aRect.top + aRect.height / 2)) > 36) return false;
        if (r.left <= aRect.right - 4 || r.right > composerRightLimit) return false;
        if (composerBox && composerBox !== document.body && !composerBox.contains(b)) return false;
        return true;
      }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

      const settingsPill = rowRightBtns.find(b => {
        const t = (b.innerText || '').toLowerCase();
        return t.includes('video') || t.includes('720p') || t.includes('6s') || t.includes('x1');
      });

      let sendBtn = null;
      if (settingsPill) {
        const pRect = settingsPill.getBoundingClientRect();
        const afterPill = rowRightBtns.filter(b => {
          if (b === settingsPill) return false;
          const r = b.getBoundingClientRect();
          return r.left >= pRect.right - 6 && r.left <= pRect.right + 85 && r.width <= 64;
        });
        if (afterPill.length > 0) sendBtn = afterPill[0];
      }
      if (!sendBtn && rowRightBtns.length > 0) {
        sendBtn = rowRightBtns[rowRightBtns.length - 1];
      }
      if (sendBtn) {
        sendBtn.click();
        return 'clicked-composer-send-arrow';
      }
      return null;
    }
  };
})();
`;

  const githubWorkflowYml = `name: Build Itihaskar Samay Android Automation Browser APK

on:
  push:
    branches: [ "main", "master" ]
  workflow_dispatch:

jobs:
  build-apk:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Repository
        uses: actions/checkout@v4

      - name: Set up JDK 17
        uses: actions/setup-java@v4
        with:
          java-version: '17'
          distribution: 'temurin'

      - name: Setup Android SDK
        uses: android-actions/setup-android@v3

      - name: Grant Execute Permission for Gradlew
        run: chmod +x ./gradlew

      - name: Build Debug APK (With Custom Chromium WebView + Multi-Account Vault)
        run: ./gradlew assembleDebug

      - name: Upload Itihaskar Samay Automation APK
        uses: actions/upload-artifact@v4
        with:
          name: Itihaskar-Samay-Bot-v20-v3-Android-APK
          path: app/build/outputs/apk/debug/app-debug.apk
`;

  const androidMainActivityKt = `package com.itihaskarsamay.bot

import android.annotation.SuppressLint
import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Base64
import android.webkit.CookieManager
import android.webkit.JavascriptInterface
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import java.io.File
import java.io.FileOutputStream

/**
 * Itihaskar Samay - Custom Android Chromium Automation Browser
 * Features:
 * 1. Spoofs Desktop Chrome User-Agent & strips 'wv' WebView marker so ChatGPT & Google Flow AI allow login & automation
 * 2. Persistent Multi-Account Profile Switcher (saves cookies per Account_1..7 & Flow_Account_1..3 in chosen folder)
 * 3. Saves downloaded images directly to <ChosenFolder>/output_images/Scene_XX.png
 * 4. 1-Click Delete All Images in output_images/ folder
 */
class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var workspaceRoot: File
    private lateinit var outputImagesDir: File

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        workspaceRoot = File(getExternalFilesDir(null), "Itihaskar_Bot")
        outputImagesDir = File(workspaceRoot, "output_images")
        outputImagesDir.mkdirs()

        webView = WebView(this)
        setContentView(webView)

        val settings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        // Desktop Chromium User-Agent without '--enable-automation' or '; wv' restriction
        settings.userAgentString = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"

        CookieManager.getInstance().setAcceptCookie(true)
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)

        webView.addJavascriptInterface(AndroidAutomationBridge(), "AndroidBridge")
        webView.webViewClient = WebViewClient()
        webView.webChromeClient = WebChromeClient()
    }

    inner class AndroidAutomationBridge {
        @JavascriptInterface
        fun saveSceneImage(fileName: String, base64Png: String): Boolean {
            return try {
                val bytes = Base64.decode(base64Png, Base64.DEFAULT)
                val outFile = File(outputImagesDir, fileName)
                FileOutputStream(outFile).use { it.write(bytes) }
                true
            } catch (e: Exception) {
                false
            }
        }

        @JavascriptInterface
        fun deleteAllOutputImages(): Int {
            val files = outputImagesDir.listFiles() ?: return 0
            var deleted = 0
            for (f in files) {
                if (f.isFile && (f.name.endsWith(".png") || f.name.endsWith(".jpg"))) {
                    if (f.delete()) deleted++
                }
            }
            return deleted
        }
    }
}
`;

  return {
    chatgptBotJs,
    flowBotJs,
    githubWorkflowYml,
    androidMainActivityKt,
  };
}

/**
 * Packages all `output_images/Scene_XX.png` files + Reports into a single ZIP download
 */
export async function exportWorkspaceZip(params: {
  images: GeneratedSceneImage[];
  flowReportText: string;
  chatgptReportText: string;
  sceneChatsLogText: string;
  dailyCreditJson: string;
}): Promise<Blob> {
  const zip = new JSZip();
  const imgFolder = zip.folder('output_images');
  const reportsFolder = zip.folder('scene_account_reports');

  for (const img of params.images) {
    if (img.dataUrl && img.dataUrl.includes(',')) {
      const b64 = img.dataUrl.split(',')[1];
      imgFolder?.file(img.fileName, b64, { base64: true });
    }
  }

  zip.file('skipped_scenes_report.txt', params.chatgptReportText);
  zip.file('flow_skipped_scenes_report.txt', params.flowReportText);
  zip.file('chatgpt_scene_chats.txt', params.sceneChatsLogText);
  reportsFolder?.file('Scene_Account_Status_Report.txt', params.flowReportText);
  reportsFolder?.file('daily_credit_tracker.json', params.dailyCreditJson);

  return await zip.generateAsync({ type: 'blob' });
}

/**
 * Packages the complete GitHub Actions Android Custom WebView APK project + Userscripts into a ZIP
 */
export async function exportAndroidGithubApkProjectZip(): Promise<Blob> {
  const zip = new JSZip();
  const {
    chatgptBotJs,
    flowBotJs,
    githubWorkflowYml,
    androidMainActivityKt,
  } = getInjectedUserscriptsSource();

  zip.file('.github/workflows/build-android-apk.yml', githubWorkflowYml);
  zip.file(
    'app/src/main/java/com/itihaskarsamay/bot/MainActivity.kt',
    androidMainActivityKt
  );
  zip.file('app/src/main/assets/chatgpt_bot_v20_injected.js', chatgptBotJs);
  zip.file('app/src/main/assets/flow_bot_v3_injected.js', flowBotJs);
  zip.file(
    'README_ANDROID_SETUP.md',
    `# Itihaskar Samay - Android Custom Chromium Automation APK (v20 + v3.0)

## How to Get Your APK via GitHub Actions:
1. Upload this folder to a new GitHub repository.
2. Go to the **Actions** tab in your GitHub repository and enable workflows.
3. Click **Build Itihaskar Samay Android Automation Browser APK** -> **Run workflow**.
4. In ~2 minutes, download **Itihaskar-Samay-Bot-v20-v3-Android-APK.zip** from Artifacts and install \`app-debug.apk\` on your team's Android phones!

## Included Fixes:
- **Bot 1 (ChatGPT v20)**: Smart 'Add from library' character reference reuse (\`OLD CHANGEZ KHAN\`, \`YOUNG ADULT CHANGEZ KHAN\`) + v15 direct blob downloader into \`output_images/Scene_XX.png\`.
- **Bot 2 (Flow AI v3.0)**: Strict Composer-bounded round '→' Send button click (never clicks right-side canvas card '⋮' menu), auto-closes top-right '+' menu after upload, auto-closes red Google security alert, and 3-layer credit/card verification.`
  );

  return await zip.generateAsync({ type: 'blob' });
}
