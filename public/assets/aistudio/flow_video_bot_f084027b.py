r"""
====================================================================
ITIHASKAR SAMAY - BOT 2: FLOW AI VIDEO GENERATOR BOT (v3.0)
Channel: http://www.youtube.com/@ItihaskarSamay
File Name: flow_video_bot.py (Save in C:\Itihaskar_Bot\flow_video_bot.py or C:\mobile bot\flow_video_bot.py)

What's New in v3.0 (Exact Fix for Video Prompt '→' Send Button & Canvas '⋮' Menu Bug):
  1. Fixed '→' Send Button Click (Video 00:41 - 00:43 Bug Fixed):
     - Aapke screen recording mein 00:43 par jab prompt lamba hone ki wajah se composer box
       bada hua, toh 'Agent' button ke level par right side mein bane canvas image card ka
       '⋮' (3-dots) button aa gaya tha, jis wajah se bot '→' Send button ki jagah right-side
       card ka '⋮' menu ('Favourite / Animate / Move to bin') click kar raha tha!
     - Ab v3.0 mein bot strictly Prompt Composer Box ke andar 'Video | 720p · 6s | x1' pill ke
       bilkul bagal wale round '→' Send button ko dhoondh kar click (JS click + Mouse click)
       karta hai, aur verify bhi karta hai ki prompt send hokar box khali hua ya nahi!
  2. Auto-Closes Top-Right '+' Menu After Upload (Video 00:00 - 00:42 Fix):
     - Image upload hone ke baad upar wala '+' ('Upload / New collection / Create character')
       menu turant band kar deta hai taaki screen saaf rahe.
  3. Auto-Closes Red Google Security Alert ("Did you request help signing in? [Review]").
  4. Suppresses Chrome '--disable-blink-features=AutomationControlled' Top Warning Bar.
====================================================================
"""

import os
if os.name != "nt":
    os.environ.setdefault("DISPLAY", ":99")
import sys
import csv
import re
import json
import time
import site
import ctypes
import importlib
import subprocess
import urllib.request
from datetime import datetime
from pathlib import Path

# ====================================================================
# 0. DIRECT AUTO-INSTALLER (Playwright + pypdf)
# ====================================================================
def _ensure_packages():
    need_install = False
    try:
        import playwright  # noqa: F401
        import pypdf  # noqa: F401
    except ModuleNotFoundError:
        need_install = True

    if not need_install:
        return

    print("\n========================================================")
    print("[Auto-Setup] Installing required libraries (playwright + pypdf)...")
    print("========================================================")
    script_dir = os.path.dirname(os.path.abspath(__file__))

    try:
        import pip  # noqa: F401
    except ModuleNotFoundError:
        try:
            import ensurepip
            ensurepip.bootstrap(upgrade=True)
        except Exception:
            get_pip_file = os.path.join(script_dir, "get-pip.py")
            urllib.request.urlretrieve("https://bootstrap.pypa.io/get-pip.py", get_pip_file)
            subprocess.check_call([sys.executable, get_pip_file, "--break-system-packages"])
        importlib.invalidate_caches()
        importlib.reload(site)

    pw_installer_file = os.path.join(script_dir, "_install_pw_helper.py")
    with open(pw_installer_file, "w", encoding="utf-8") as f:
        f.write(
            "import sys\n"
            "from pip._internal.cli.main import main\n"
            "sys.exit(main(['install', '--upgrade', '--break-system-packages', 'playwright', 'pypdf']))\n"
        )
    subprocess.check_call([sys.executable, pw_installer_file])
    try:
        os.remove(pw_installer_file)
    except Exception:
        pass

    importlib.invalidate_caches()
    importlib.reload(site)
    user_site = site.getusersitepackages()
    if user_site and user_site not in sys.path:
        sys.path.append(user_site)

    from playwright._impl._driver import compute_driver_executable, get_driver_env
    drv, cli = compute_driver_executable()
    subprocess.check_call([str(drv), str(cli), "install", "chromium"], env=get_driver_env())
    print("\n[Auto-Setup] Setup complete!\n")


_ensure_packages()

from pypdf import PdfReader  # noqa: E402
from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeoutError  # noqa: E402

# ====================================================================
# 1. WINDOWS KEEP-AWAKE & COLLEGE STEALTH (SCREEN-OFF) MODE
# ====================================================================

def set_keep_awake(enable: bool = True, allow_screen_off: bool = False):
    if os.name == "nt":
        try:
            if enable:
                if allow_screen_off:
                    ctypes.windll.kernel32.SetThreadExecutionState(0x80000001)
                else:
                    ctypes.windll.kernel32.SetThreadExecutionState(0x80000003)
            else:
                ctypes.windll.kernel32.SetThreadExecutionState(0x80000000)
        except Exception:
            pass


def turn_off_laptop_screen():
    """Laptop ki screen ko turant OFF (black) kar deta hai jabki bot andar chalta rehta hai!"""
    if os.name == "nt":
        try:
            ctypes.windll.user32.PostMessageW(0xFFFF, 0x0112, 0xF170, 2)
        except Exception:
            pass


# ====================================================================
# 2. SETTINGS & FOLDERS (`output_images`, `output_videos`, `scene_account_reports`)
# ====================================================================

BASE_DIR = Path(__file__).parent.resolve()
FLOW_ACCOUNTS_DIR = BASE_DIR / "flow_accounts"
IMAGES_DIR = BASE_DIR / "output_images"
VIDEOS_DIR = BASE_DIR / "output_videos"
REPORTS_DIR = BASE_DIR / "scene_account_reports"

CSV_FILE = BASE_DIR / "scenes_template.csv"
REPORT_FILE = BASE_DIR / "flow_skipped_scenes_report.txt"
MASTER_STATUS_FILE = REPORTS_DIR / "Scene_Account_Status_Report.txt"
DAILY_CREDIT_FILE = REPORTS_DIR / "daily_credit_tracker.json"

DEFAULT_FLOW_ACCOUNTS = 3
FLOW_AI_URL = "https://flow.google.com/"

FLOW_ACCOUNTS_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)
VIDEOS_DIR.mkdir(exist_ok=True)
REPORTS_DIR.mkdir(exist_ok=True)


def get_flow_account_folders():
    existing = sorted(
        [d for d in FLOW_ACCOUNTS_DIR.iterdir() if d.is_dir() and d.name.startswith("Flow_Account_")],
        key=lambda p: int(re.sub(r"\D", "", p.name) or 0),
    )
    if existing:
        return existing
    f1 = FLOW_ACCOUNTS_DIR / "Flow_Account_1"
    f1.mkdir(exist_ok=True)
    return [f1]


def find_existing_scene_image(scene_no: int):
    candidates = [
        IMAGES_DIR / f"Scene_{scene_no:02d}.png",
        IMAGES_DIR / f"scene_{scene_no:02d}.png",
        IMAGES_DIR / f"Scene_{scene_no}.png",
        IMAGES_DIR / f"scene_{scene_no}.png",
        IMAGES_DIR / f"Scene_{scene_no:02d}.jpg",
        IMAGES_DIR / f"scene_{scene_no:02d}.jpg",
    ]
    for c in candidates:
        if c.exists() and c.stat().st_size > 5000:
            return c
    return None


# ====================================================================
# 2B. DAILY CREDIT EXHAUSTED ACCOUNT TRACKER (SAME-DAY MEMORY + NEXT-DAY AUTO RESET)
# ====================================================================

def get_today_date_str() -> str:
    return datetime.now().strftime("%Y-%m-%d")


def load_today_exhausted_accounts() -> set:
    today_str = get_today_date_str()
    if not DAILY_CREDIT_FILE.exists():
        return set()

    try:
        data = json.loads(DAILY_CREDIT_FILE.read_text(encoding="utf-8"))
        saved_date = data.get("date", "")
        if saved_date == today_str:
            exhausted = set(data.get("exhausted_accounts", []))
            return exhausted
        else:
            print(f"\n[New Day Detected!] Kal ({saved_date}) ke baad aaj naya din ({today_str}) hai!")
            print("   -> Sabhi Flow AI accounts ke daily credits renew ho gaye hain. Starting fresh from Flow_Account_1!")
            save_today_exhausted_accounts(set())
            return set()
    except Exception:
        return set()


def save_today_exhausted_accounts(exhausted_set: set):
    today_str = get_today_date_str()
    payload = {
        "date": today_str,
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "exhausted_accounts": sorted(
            list(exhausted_set),
            key=lambda name: int(re.sub(r"\D", "", name) or 0),
        ),
    }
    try:
        DAILY_CREDIT_FILE.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    except Exception:
        pass


def mark_account_exhausted_today(acc_name: str, exhausted_set: set):
    exhausted_set.add(acc_name)
    save_today_exhausted_accounts(exhausted_set)
    print(f"   [Daily Memory Saved] '{acc_name}' ko aaj ({get_today_date_str()}) ke liye Credit-Exhausted mark kar liya gaya hai.")
    print(f"   -> Aaj jab bhi aap dobara bot chalayenge, '{acc_name}' skip ho jayega (Kal apne-aap reset hoga!).")


def reset_today_credit_memory():
    save_today_exhausted_accounts(set())
    print(f"\n[Reset Complete!] Aaj ({get_today_date_str()}) ki Flow AI account credit memory reset kar di gayi hai.")
    print("Ab bot phir se Flow_Account_1 se check karega.\n")


# ====================================================================
# 3. OPTION 1: FLOW AI DEDICATED ACCOUNT SETUP
# ====================================================================

def setup_flow_accounts_interactively():
    print("\n========================================================")
    print("   FLOW AI (JIO PRO) ACCOUNT SETUP MODE")
    print("========================================================")
    print("Yeh accounts ChatGPT se bilkul ALAG (`flow_accounts` folder mein) save honge.")
    print("Aap wahi Gmail IDs login karein jinme aapka Jio Pro / Flow AI plan active hai!\n")

    num_input = input(f"Flow AI ke liye kitne accounts login karne hain? (Jaise 1, 2, 3, Default {DEFAULT_FLOW_ACCOUNTS}): ").strip()
    count = int(num_input) if num_input.isdigit() and 1 <= int(num_input) <= 20 else DEFAULT_FLOW_ACCOUNTS

    with sync_playwright() as p:
        for i in range(1, count + 1):
            acc_folder = FLOW_ACCOUNTS_DIR / f"Flow_Account_{i}"
            acc_folder.mkdir(exist_ok=True)

            print(f"\n---> [Flow AI Account {i}/{count}] Chrome khul raha hai ({acc_folder.name})...")
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(acc_folder),
                channel="chrome",
                headless=False,
                args=[
                    "--disable-blink-features=AutomationControlled",
                    "--test-type",
                    "--start-maximized",
                ] + ([] if os.name == "nt" else ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]),
                ignore_default_args=["--no-sandbox"] if os.name == "nt" else [],
                chromium_sandbox=(os.name == "nt"),
                no_viewport=True,
            )

            page = context.pages[0] if context.pages else context.new_page()
            page.goto(FLOW_AI_URL)

            print(f"   1. Khule huye Chrome mein apne {i}-number Jio Pro Gmail account se Flow AI mein login karein.")
            print("   2. Agar upar laal rang ka 'Did you request help signing in?' popup aaye, toh uske '✕' par click kar dein.")
            print("   3. Login hone ke baad yahan Terminal mein ENTER dabayein.")
            input(f"   [Flow_Account_{i} Login poora hone ke baad ENTER dabayein] >> ")

            context.close()
            print(f"   [Saved!] {acc_folder.name} ka login hamesha ke liye save ho gaya!")
            time.sleep(1.5)

    print("\n========================================================")
    print("FLOW AI KE SAARE ACCOUNTS KA SETUP COMPLETE HO GAYA!")
    print("========================================================\n")


# ====================================================================
# 4. MULTI-PDF SELECTOR + MATCH WITH `output_images` + SCENE RANGE
# ====================================================================

def _natural_sort_key(path_obj: Path):
    return [int(part) if part.isdigit() else part.lower() for part in re.split(r"(\d+)", path_obj.name)]


def load_scenes_from_pdf(pdf_path: Path):
    print(f"\n[PDF Reader] Reading '{pdf_path.name}'...")
    reader = PdfReader(str(pdf_path))
    full_text = "\n".join((page.extract_text() or "") for page in reader.pages)

    cleaned_lines = []
    for line in full_text.splitlines():
        if re.search(r"\|\s*Page\s*\d+", line, re.IGNORECASE):
            continue
        cleaned_lines.append(line)
    clean_text = "\n".join(cleaned_lines)

    pattern = re.compile(
        r"SCENE\s+(\d+)\s*\n.*?"
        r"IMAGE\s+PROMPT:\s*\n(.*?)\s*\n"
        r"VIDEO\s+PROMPT:\s*\n(.*?)(?=\n\s*(?:NOTE:|SCENE\s+\d+)|\Z)",
        re.DOTALL | re.IGNORECASE,
    )

    scenes = []
    for match in pattern.finditer(clean_text):
        scene_no = int(match.group(1))
        img_prompt = " ".join(match.group(2).split())
        vid_prompt = " ".join(match.group(3).split())
        scenes.append({
            "scene_no": scene_no,
            "image_prompt": img_prompt,
            "video_prompt": vid_prompt,
        })

    return scenes


def select_and_load_scenes_for_video():
    pdf_files = sorted(BASE_DIR.glob("*.pdf"), key=_natural_sort_key)
    scenes = []
    source_name = ""

    if pdf_files:
        print("\n========================================================")
        print(f"   IS FOLDER MEIN TOTAL {len(pdf_files)} PDF FILES MILI HAIN:")
        print("========================================================")
        for idx, pf in enumerate(pdf_files, start=1):
            print(f"   {idx}. {pf.name}")
        print("========================================================")

        sel = input(f"---> Jis PDF ko choose karna hai uska number dijiye (1 se {len(pdf_files)}, Default 1): ").strip()
        s_idx = int(sel) - 1 if sel.isdigit() and 1 <= int(sel) <= len(pdf_files) else 0
        chosen_pdf = pdf_files[s_idx]

        print(f"\n[Selected PDF] Aapne chuna hai: {s_idx + 1}. {chosen_pdf.name}")
        scenes = load_scenes_from_pdf(chosen_pdf)
        source_name = chosen_pdf.name

    elif CSV_FILE.exists():
        with open(CSV_FILE, mode="r", encoding="utf-8-sig", errors="replace") as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get("Scene_No") and row.get("Image_Prompt"):
                    scenes.append({
                        "scene_no": int(row["Scene_No"].strip()),
                        "image_prompt": row["Image_Prompt"].strip(),
                        "video_prompt": (row.get("Video_Prompt") or "").strip(),
                    })
        source_name = CSV_FILE.name

    if not scenes:
        return [], "", False

    pdf_scene_nums = [s["scene_no"] for s in scenes]
    min_pdf_scene = pdf_scene_nums[0]
    max_pdf_scene = pdf_scene_nums[-1]

    available_in_this_pdf = [
        s["scene_no"] for s in scenes if find_existing_scene_image(s["scene_no"]) is not None
    ]
    print(f"\n[Images Check] '{source_name}' (Scene {min_pdf_scene}-{max_pdf_scene}) mein se in Scenes ki images 'output_images' folder mein maujood hain:")
    print(f"   -> Available Scene Images ({len(available_in_this_pdf)}/{len(scenes)}): {available_in_this_pdf if available_in_this_pdf else 'Koi image nahi mili!'}")

    default_start = available_in_this_pdf[0] if available_in_this_pdf else min_pdf_scene
    default_end = available_in_this_pdf[-1] if available_in_this_pdf else max_pdf_scene

    start_in = input(
        f"\n---> Kahan se video banana shuru karna hai? (Start Scene Number {min_pdf_scene}-{max_pdf_scene}, Default {default_start}): "
    ).strip()
    start_no = int(start_in) if start_in.isdigit() else default_start

    end_in = input(
        f"---> Kahan tak video banana hai? (End Scene Number {start_no}-{max_pdf_scene}, Default {default_end}): "
    ).strip()
    end_no = int(end_in) if end_in.isdigit() else default_end

    ready_scenes = []
    missing_img_scenes = []
    for s in scenes:
        if start_no <= s["scene_no"] <= end_no:
            img_file = find_existing_scene_image(s["scene_no"])
            if img_file is not None:
                s["img_path"] = img_file
                ready_scenes.append(s)
            else:
                missing_img_scenes.append(s["scene_no"])

    if missing_img_scenes:
        print(f"\n[Note] In Scenes ki image 'output_images' folder mein nahi hai, isliye inhe skip kiya jayega: {missing_img_scenes}")

    print(f"[Ready] Total {len(ready_scenes)} scenes ke videos banaye jayenge: {[s['scene_no'] for s in ready_scenes]}")

    stealth_in = input(
        "\n---> Kya 'College / Screen-Off Stealth Mode' chalu karna hai (Chrome chhupa rahega + Screen OFF ho jayegi)? (y/n, Default n): "
    ).strip().lower()
    stealth_mode = stealth_in in ("y", "yes", "1", "haan")

    return ready_scenes, source_name, stealth_mode


# ====================================================================
# 5. FLOW AI AUTOMATIC VERIFICATION (CREDITS + CARDS + ERRORS)
# ====================================================================

def get_flow_remaining_credits(page):
    """
    Reads the current Flow AI credit balance from the page if visible
    (e.g. '1,240 credits', '85 credits remaining', or top-right credit badge).
    Returns int credit count, or None if not displayed on current view.
    """
    try:
        val = page.evaluate("""() => {
            const els = Array.from(document.querySelectorAll('button, span, div, a, p'));
            for (const el of els) {
                if (el.children.length > 2) continue;
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0) continue;
                const txt = (el.innerText || el.textContent || '').trim();
                if (!txt || txt.length > 45) continue;
                const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim();
                const combined = (txt + ' ' + aria).toLowerCase();

                // Match patterns like "980 credits", "1,250 credits", "credits: 450"
                let m = combined.match(/(\\d[\\d,]*)\\s*credits?(?:\\s+left|\\s+remaining)?/i);
                if (!m) {
                    m = combined.match(/credits?\\s*[:\\-]?\\s*(\\d[\\d,]*)/i);
                }
                if (m) {
                    const num = parseInt(m[1].replace(/,/g, ''), 10);
                    if (!isNaN(num) && num >= 0 && num <= 500000) {
                        return num;
                    }
                }
            }
            return null;
        }""")
        return int(val) if val is not None else None
    except Exception:
        return None


def count_flow_project_cards(page) -> int:
    """
    Counts generated media/video cards on the Flow AI project canvas (top 72% of screen),
    ignoring small icons and the bottom prompt composer bar.
    """
    try:
        return page.evaluate("""() => {
            const maxTop = window.innerHeight * 0.72;
            const seenRects = [];
            const candidates = Array.from(document.querySelectorAll('video, canvas, img, [data-testid*="card"], [class*="card"]'));

            for (const el of candidates) {
                const r = el.getBoundingClientRect();
                // Generated 16:9 cards on Flow AI canvas are medium/large rectangles above the prompt bar
                if (r.width < 140 || r.height < 80) continue;
                if (r.top < 45 || r.top > maxTop) continue;

                // De-duplicate overlapping elements inside the same card
                const isDup = seenRects.some(sr => Math.abs(sr.left - r.left) < 25 && Math.abs(sr.top - r.top) < 25);
                if (!isDup) {
                    seenRects.push({ left: r.left, top: r.top, width: r.width, height: r.height });
                }
            }
            return seenRects.length;
        }""")
    except Exception:
        return 0


def check_flow_credits_exhausted(page) -> bool:
    exhausted_phrases = [
        "not enough credits",
        "insufficient credits",
        "out of credits",
        "no credits left",
        "no credits remaining",
        "you don't have enough credits",
        "monthly limit reached",
        "daily limit reached",
        "quota exceeded",
    ]
    try:
        alerts = page.locator("[role='alert'], [role='status'], .snackbar, .toast, dialog, [role='dialog']")
        if alerts.count() > 0:
            txt = alerts.last.inner_text(timeout=1500).lower()
            if "running low" in txt:
                return False
            if any(p in txt for p in exhausted_phrases):
                return True
    except Exception:
        pass

    # Also check if visible credit balance is literally 0
    rem = get_flow_remaining_credits(page)
    if rem is not None and rem == 0:
        return True

    return False


def check_flow_generation_error(page) -> str:
    """
    Scans BOTH toast/alert popups AND visible inline error cards on the Flow AI workspace.
    As soon as any policy or generation error appears, returns the exact reason so the bot
    can immediately drop the scene and move on without waiting!
    """
    if check_flow_credits_exhausted(page):
        return ""

    error_phrases = [
        ("violat", "Flow AI Policy Violation (Prompt / Image Restricted)"),
        ("policy", "Flow AI Policy Violation / Guideline Restriction"),
        ("guidelines", "Flow AI Policy Violation / Guideline Restriction"),
        ("try a different prompt", "Flow AI Rejected Video Prompt (Policy Violation)"),
        ("try another prompt", "Flow AI Rejected Video Prompt (Policy Violation)"),
        ("try a different image", "Flow AI Rejected Uploaded Image"),
        ("try another image", "Flow AI Rejected Uploaded Image"),
        ("cannot upload", "Flow AI Image Upload Rejected"),
        ("upload failed", "Flow AI Image Upload Failed"),
        ("couldn't upload", "Flow AI Image Upload Rejected"),
        ("unable to upload", "Flow AI Image Upload Rejected"),
        ("couldn't generate", "Flow AI Could Not Generate Video (Policy / Error)"),
        ("unable to generate", "Flow AI Unable to Generate Video (Policy / Error)"),
        ("failed to generate", "Flow AI Failed to Generate Video"),
        ("generation failed", "Flow AI Generation Failed"),
        ("can't create", "Flow AI Declined Video Creation (Policy / Error)"),
        ("cannot create", "Flow AI Declined Video Creation (Policy / Error)"),
        ("something went wrong", "Flow AI Generation Error"),
        ("blocked", "Flow AI Blocked Generation (Safety Filter)"),
        ("filtered", "Flow AI Filtered Generation (Safety Policy)"),
    ]

    try:
        found_reason = page.evaluate("""(errorPairs) => {
            const containers = Array.from(document.querySelectorAll(
                '[role="alert"], [role="status"], .snackbar, .toast, [role="dialog"], dialog'
            ));

            // Also scan any small visible warning/error text blocks in the workspace
            const textBlocks = Array.from(document.querySelectorAll('div, span, p')).filter(el => {
                if (el.children.length > 2) return false;
                const r = el.getBoundingClientRect();
                return r.width > 40 && r.height > 12 && r.height < 140;
            });

            const allToCheck = [...containers, ...textBlocks];
            for (const el of allToCheck) {
                const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                if (!txt || txt.length > 350) continue;
                if (txt.includes('running low')) continue;
                if (txt.includes('did you request help signing in') || txt.includes('request to help you sign in')) continue;

                for (const [phrase, reason] of errorPairs) {
                    if (txt.includes(phrase)) {
                        return reason;
                    }
                }
            }
            return '';
        }""", error_phrases)
        return found_reason or ""
    except Exception:
        return ""


def clear_failed_prompt_and_popups(page):
    """
    Agar kisi scene mein error aata hai, toh agle scene par jaane se pehle
    error popup ko band karta hai aur prompt box mein lagi purani image/text ko saaf kar deta hai!
    """
    dismiss_all_flow_popups(page)
    try:
        page.keyboard.press("Escape")
        time.sleep(0.4)
    except Exception:
        pass

    # Remove any attached image chip inside the prompt composer bar so next scene attaches cleanly
    try:
        page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
            for (const b of btns) {
                const r = b.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.55 || r.width === 0 || r.height === 0) continue;
                const aria = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
                const txt = (b.innerText || '').trim().toLowerCase();
                if (aria.includes('remove') || aria.includes('delete') || aria.includes('clear') || txt === 'x' || txt === '✕' || txt === '×' || txt === 'close') {
                    if (r.width <= 42 && r.height <= 42) {
                        b.click();
                    }
                }
            }
        }""")
    except Exception:
        pass


def _dismiss_popups_in_target(target) -> str:
    """
    Helper that runs inside either the main `page` or any child `frame` (such as Google One Bar
    `ogs.google.com` / `myaccount.google.com` security callout iframes).
    Specifically detects and closes:
      1. Red Google Security Alert: "Did you request help signing in?" -> clicks '✕' / Close (NEVER 'Review')
      2. Top-right floating notification / callout cards with '✕' / '×' close buttons
      3. Standard Flow AI dialogs ('Got it', 'OK', 'I understand', etc.)
    """
    return target.evaluate("""() => {
        // 1. Check specifically for "Did you request help signing in?" or security callout cards
        const allContainers = Array.from(document.querySelectorAll('div, section, aside, [role="dialog"], [role="alert"], [role="region"], dialog'));
        for (const box of allContainers) {
            const r = box.getBoundingClientRect();
            if (r.width < 150 || r.height < 60 || r.width > 700 || r.height > 500) continue;
            const boxTxt = (box.innerText || '').toLowerCase();
            if (
                boxTxt.includes('did you request help signing in') ||
                boxTxt.includes('request to help you sign in') ||
                boxTxt.includes('review the request')
            ) {
                const candidates = Array.from(box.querySelectorAll('button, [role="button"], a, span, div'));
                for (const c of candidates) {
                    const cr = c.getBoundingClientRect();
                    if (cr.width === 0 || cr.height === 0 || cr.width > 55 || cr.height > 55) continue;
                    const cTxt = (c.innerText || c.textContent || '').trim().toLowerCase();
                    const cAria = (c.getAttribute('aria-label') || c.getAttribute('title') || '').trim().toLowerCase();
                    if (cTxt.includes('review') || cAria.includes('review')) continue;
                    if (
                        ['x', '✕', '✖', '×', '⨯', 'close'].includes(cTxt) ||
                        cAria.includes('close') ||
                        cAria.includes('dismiss')
                    ) {
                        c.click();
                        return 'security-alert-close (' + (cTxt || cAria || 'X') + ')';
                    }
                }
            }
        }

        // 2. Check any small '✕' / '×' close buttons inside top-right notification callouts (or inside small callout iframes)
        const allClickable = Array.from(document.querySelectorAll('button, [role="button"], a, div[tabindex="0"], span[role="button"]'));
        for (const el of allClickable) {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || r.width > 52 || r.height > 52) continue;
            const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().toLowerCase();
            if (txt.includes('review') || aria.includes('review')) continue;

            const isExplicitX = ['x', '✕', '✖', '×', '⨯'].includes(txt) || aria.includes('close') || aria.includes('dismiss');
            const inTopRightOrIframe = (window.innerWidth < 550 && window.innerHeight < 500) || (r.left > window.innerWidth * 0.55 && r.top < 360);
            if (isExplicitX && inTopRightOrIframe) {
                el.click();
                return 'top-right-callout-x (' + (txt || aria || 'X') + ')';
            }
        }

        // 3. Standard consent / welcome buttons
        const dismissWords = [
            'okay', 'ok', 'got it', 'i understand', 'agree', 'i agree',
            'accept', 'continue', 'skip', 'dismiss', 'no thanks'
        ];
        for (const el of allClickable) {
            const rect = el.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;
            const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
            const aria = (el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().toLowerCase();
            if (txt === 'review' || aria.includes('review')) continue;
            if (dismissWords.includes(txt) || dismissWords.includes(aria)) {
                el.click();
                return 'popup:' + (txt || aria);
            }
        }

        // 4. Standard modal dialogs
        const dialogs = document.querySelectorAll('[role="dialog"], dialog, [aria-modal="true"]');
        for (const d of dialogs) {
            if (d.offsetParent === null) continue;
            const btns = d.querySelectorAll('button, [role="button"]');
            for (const b of btns) {
                const t = (b.innerText || '').trim().toLowerCase();
                const a = (b.getAttribute('aria-label') || '').trim().toLowerCase();
                if (t.includes('review') || a.includes('review')) continue;
                if (['x', '✕', '✖', '×', 'close'].includes(t) || a.includes('close') || a.includes('dismiss')) {
                    b.click();
                    return 'dialog-x';
                }
            }
        }
        return null;
    }""")


def dismiss_all_flow_popups(page):
    """
    Scans the main page AND all child iframes (e.g. Google One Bar security callouts)
    up to 5 times to close stacked popups like 'Did you request help signing in? [Review]'
    and any '×' notification cards behind it.
    """
    for _ in range(5):
        closed_any = False
        targets = [page] + [f for f in page.frames if f != page.main_frame]
        for tgt in targets:
            try:
                clicked_what = _dismiss_popups_in_target(tgt)
                if clicked_what:
                    print(f"   -> [Popup Auto-Closed] {clicked_what}")
                    closed_any = True
                    time.sleep(0.8)
            except Exception:
                continue
        if not closed_any:
            break


def enter_flow_project(page):
    """
    Closes any Google Account security callouts ('Did you request help signing in?') and
    clicks '+ New project' on `labs.google/fx/tools/flow` using both Playwright visible-element
    iteration and a JS + Mouse Coordinate fallback so it never gets stuck on the landing page.
    """
    dismiss_all_flow_popups(page)
    if "/project/" in page.url:
        return

    print("   -> Clicking '+ New project' on Flow AI home page...")
    for attempt in range(3):
        if "/project/" in page.url:
            break

        dismiss_all_flow_popups(page)

        # Strategy 1: Iterate over ALL matching locators and click the first truly visible one
        clicked_pw = False
        for sel in [
            "button:has-text('New project')",
            "[role='button']:has-text('New project')",
            "a:has-text('New project')",
            "button:has-text('Create with Flow')",
        ]:
            try:
                loc = page.locator(sel)
                cnt = loc.count()
                for idx in range(cnt):
                    item = loc.nth(idx)
                    if item.is_visible(timeout=1200):
                        item.scroll_into_view_if_needed(timeout=2000)
                        item.click(force=True, timeout=3000)
                        clicked_pw = True
                        print(f"   -> Clicked '+ New project' via locator ({sel} #{idx + 1})!")
                        break
                if clicked_pw:
                    break
            except Exception:
                continue

        # Strategy 2: JS DOM + Mouse Coordinate Click fallback
        if not clicked_pw or "/project/" not in page.url:
            try:
                coords = page.evaluate("""() => {
                    const els = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'));
                    for (const el of els) {
                        const r = el.getBoundingClientRect();
                        if (r.width < 60 || r.width > 360 || r.height < 24 || r.height > 90) continue;
                        if (r.top < 0 || r.top > window.innerHeight) continue;
                        const txt = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
                        if (txt === 'new project' || txt === '+ new project' || txt === 'add new project' || txt.endsWith('new project')) {
                            el.click();
                            return { x: r.left + r.width / 2, y: r.top + r.height / 2, text: txt };
                        }
                    }
                    return null;
                }""")
                if coords:
                    page.mouse.click(coords["x"], coords["y"])
                    print(f"   -> Clicked '+ New project' at ({int(coords['x'])}, {int(coords['y'])})!")
            except Exception:
                pass

        for _ in range(12):
            if "/project/" in page.url:
                break
            time.sleep(0.5)

        if "/project/" in page.url:
            print(f"   -> [Project Opened] URL: {page.url[:65]}...")
            break

    time.sleep(2)
    dismiss_all_flow_popups(page)


def ensure_agent_mode_off(page):
    try:
        agent_state = page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
            const agentBtn = btns.find(b => {
                const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
                return (txt === 'agent' || txt.endsWith('agent')) && b.getBoundingClientRect().height > 0 && b.getBoundingClientRect().top > window.innerHeight * 0.5;
            });
            if (!agentBtn) return 'not_found';

            const ariaPressed = agentBtn.getAttribute('aria-pressed');
            const dataState = agentBtn.getAttribute('data-state');
            const ariaSelected = agentBtn.getAttribute('aria-selected');
            const bg = window.getComputedStyle(agentBtn).backgroundColor || '';

            let isBrightBg = false;
            const m = bg.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
            if (m) {
                const r = parseInt(m[1], 10), g = parseInt(m[2], 10), b = parseInt(m[3], 10);
                if (r > 120 || g > 120 || b > 120) isBrightBg = true;
            }

            if (ariaPressed === 'true' || dataState === 'on' || dataState === 'active' || ariaSelected === 'true' || isBrightBg) {
                agentBtn.click();
                return 'turned_off';
            }
            return 'already_off';
        }""")
        if agent_state == "turned_off":
            print("   -> [Agent Mode] Agent mode ON tha, use click karke OFF kar diya gaya!")
            time.sleep(1.5)
        else:
            print("   -> [Agent Mode] Agent mode pehle se OFF hai.")
    except Exception as e:
        print(f"   -> [Agent Check Note] {e}")


def configure_flow_settings_popover(page):
    print("   -> Opening bottom-right Settings Pill (next to '→' Send button)...")

    opened_pill = page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
        const agentBtn = btns.find(b => {
            const r = b.getBoundingClientRect();
            const txt = (b.innerText || '').trim().toLowerCase();
            return r.height > 0 && r.top > window.innerHeight * 0.5 && (txt === 'agent' || txt.endsWith('agent'));
        });

        if (agentBtn) {
            // Find the prompt composer box container so we NEVER touch canvas card '⋮' buttons on the far right!
            let composerBox = agentBtn.parentElement;
            while (composerBox && composerBox !== document.body) {
                const cr = composerBox.getBoundingClientRect();
                if (cr.width >= 320 && cr.width <= window.innerWidth * 0.78 && cr.height >= 60) {
                    break;
                }
                composerBox = composerBox.parentElement;
            }
            const maxRight = (composerBox && composerBox !== document.body)
                ? composerBox.getBoundingClientRect().right + 15
                : window.innerWidth * 0.78;

            const aRect = agentBtn.getBoundingClientRect();
            const rightBtns = btns.filter(b => {
                const r = b.getBoundingClientRect();
                return (
                    r.width > 0 && r.height > 0 &&
                    Math.abs(r.top - aRect.top) < 40 &&
                    r.left > aRect.right &&
                    r.right <= maxRight
                );
            }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

            // Prefer button whose text looks like the Settings Pill ('Video | 720p · 6s | x1')
            const pillByText = rightBtns.find(b => {
                const t = (b.innerText || '').toLowerCase();
                return t.includes('video') || t.includes('720p') || t.includes('1080p') || t.includes('6s') || t.includes('x1') || t.includes('16:9') || b.getBoundingClientRect().width >= 65;
            });
            if (pillByText) {
                pillByText.click();
                return (pillByText.innerText || 'settings_pill').replace(/\\s+/g, ' ').trim();
            }

            if (rightBtns.length >= 2) {
                const settingsPill = rightBtns[0];
                settingsPill.click();
                return (settingsPill.innerText || 'settings_pill').replace(/\\s+/g, ' ').trim();
            } else if (rightBtns.length === 1) {
                rightBtns[0].click();
                return (rightBtns[0].innerText || 'settings_pill').replace(/\\s+/g, ' ').trim();
            }
        }
        return null;
    }""")

    print(f"   -> Settings Pill clicked: '{opened_pill}'")
    time.sleep(1.8)

    def click_popover_option(exact_texts):
        return page.evaluate("""(targets) => {
            const lowerTargets = targets.map(t => t.toLowerCase());
            const els = Array.from(document.querySelectorAll('button, [role="button"], [role="tab"], [role="option"], [role="radio"], [role="menuitem"], div, span'));
            for (const target of lowerTargets) {
                for (const el of els) {
                    const r = el.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0 || r.width > 280 || r.height > 75) continue;
                    if (r.top < window.innerHeight * 0.20 || r.top > window.innerHeight * 0.88) continue;
                    const txt = (el.innerText || el.textContent || '').trim().toLowerCase();
                    if (txt === target) {
                        el.click();
                        return txt;
                    }
                }
            }
            return null;
        }""", exact_texts)

    if click_popover_option(["video"]):
        print("      [Set] Mode: Video")
        time.sleep(1.0)

    if click_popover_option(["16:9"]):
        print("      [Set] Aspect Ratio: 16:9")
        time.sleep(0.5)

    model_is_omni = page.evaluate("""() => {
        const txt = document.body.innerText.toLowerCase();
        return txt.includes('omni 3.1 flash') || txt.includes('omni flash');
    }""")
    if not model_is_omni:
        click_popover_option(["veo 2", "veo 3", "veo", "nano banana 2.1", "imagen"])
        time.sleep(0.8)
        click_popover_option(["omni 3.1 flash", "omni flash"])
    print("      [Set] Model: Omni 3.1 Flash")

    if click_popover_option(["720p"]):
        print("      [Set] Resolution: 720p")
        time.sleep(0.5)

    if click_popover_option(["6s", "6 sec", "6 seconds"]):
        print("      [Set] Duration: 6s")
        time.sleep(0.5)

    if click_popover_option(["x1"]):
        print("      [Set] Count: x1")
        time.sleep(0.5)

    try:
        page.keyboard.press("Escape")
        time.sleep(0.8)
    except Exception:
        pass


def click_top_right_add_media_plus_button(page) -> bool:
    dismiss_all_flow_popups(page)
    coords = page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => {
            const r = b.getBoundingClientRect();
            const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
            const aria = (b.getAttribute('aria-label') || b.getAttribute('title') || '').trim().toLowerCase();
            // Never click 'Review' or security alert buttons in top-right!
            if (
                txt.includes('review') || aria.includes('review') ||
                txt.includes('sign in') || aria.includes('sign in') ||
                ['x', '✕', '✖', '×', 'close', 'dismiss'].includes(txt) ||
                aria.includes('close') || aria.includes('dismiss')
            ) {
                return false;
            }
            return (
                r.width >= 24 && r.width <= 90 &&
                r.height >= 24 && r.height <= 70 &&
                r.top >= 15 && r.top <= 250 &&
                r.left > window.innerWidth * 0.68 &&
                r.left < window.innerWidth * 0.88
            );
        });

        if (btns.length === 0) return null;
        btns.sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
        const addMediaBtn = btns[0];
        const r = addMediaBtn.getBoundingClientRect();
        addMediaBtn.click();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }""")
    return coords is not None


def click_prompt_bar_plus_icon(page) -> bool:
    return page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
        const agentBtn = btns.find(b => {
            const r = b.getBoundingClientRect();
            const txt = (b.innerText || '').trim().toLowerCase();
            return r.height > 0 && r.top > window.innerHeight * 0.5 && (txt === 'agent' || txt.endsWith('agent'));
        });

        if (agentBtn) {
            const aRect = agentBtn.getBoundingClientRect();
            const leftBtns = btns.filter(b => {
                if (b === agentBtn) return false;
                const r = b.getBoundingClientRect();
                return (
                    r.width > 0 && r.height > 0 &&
                    Math.abs(r.top - aRect.top) < 35 &&
                    r.left < aRect.left &&
                    (aRect.left - r.left) < 120
                );
            }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

            if (leftBtns.length > 0) {
                leftBtns[leftBtns.length - 1].click();
                return true;
            }
        }
        return false;
    }""")


def upload_and_attach_scene_image(page, img_path: Path) -> bool:
    resolved_img = str(img_path.resolve())
    img_filename = img_path.name
    img_stem = img_path.stem

    print(f"   -> [Step A] Uploading '{img_filename}' via Top-Right '+' (Add media) button...")
    uploaded_to_project = False

    try:
        if click_top_right_add_media_plus_button(page):
            time.sleep(1.5)
            upload_item = page.locator(
                "[role='menuitem']:has-text('Upload'), button:has-text('Upload'), li:has-text('Upload'), div[role='button']:has-text('Upload'), span:has-text('Upload')"
            ).first
            if upload_item.is_visible(timeout=3000):
                with page.expect_file_chooser(timeout=10000) as fc_info:
                    upload_item.click()
                fc_info.value.set_files(resolved_img)
                uploaded_to_project = True
                print(f"   -> '{img_filename}' uploaded via Top-Right '+' -> 'Upload'!")
    except Exception as e1:
        print(f"   -> [Top-Right '+' Note] {e1}")

    if not uploaded_to_project:
        # Close top-right '+' dropdown if it opened without uploading
        try:
            page.keyboard.press("Escape")
            time.sleep(0.4)
        except Exception:
            pass
        try:
            if click_prompt_bar_plus_icon(page):
                time.sleep(1.5)
                upload_media_btn = page.locator(
                    "button:has-text('Upload media'), [role='button']:has-text('Upload media'), span:has-text('Upload media')"
                ).last
                if upload_media_btn.is_visible(timeout=3000):
                    with page.expect_file_chooser(timeout=10000) as fc_info:
                        upload_media_btn.click()
                    fc_info.value.set_files(resolved_img)
                    uploaded_to_project = True
                    print(f"   -> '{img_filename}' uploaded via Bottom-Left '+' -> 'Upload media'!")
        except Exception:
            pass

    if not uploaded_to_project:
        print("   [Error] Flow AI mein Upload button nahi mila!")
        return False

    # Close any lingering top-right '+' dropdown ('Upload / New collection / Create character / New scene')
    try:
        page.keyboard.press("Escape")
    except Exception:
        pass

    print("   -> [Step B] Waiting for image upload (20% -> 60% -> 100%) to complete...")
    time.sleep(4)
    for _ in range(30):
        up_err = check_flow_generation_error(page)
        if up_err:
            return False
        still_uploading = page.evaluate("""() => {
            const els = Array.from(document.querySelectorAll('div, span'));
            return els.some(el => {
                if (el.children.length > 0) return false;
                const txt = (el.innerText || '').trim();
                return /^\\d{1,2}%$/.test(txt);
            });
        }""")
        if not still_uploading:
            break
        time.sleep(2)
    time.sleep(3)
    print(f"   -> '{img_filename}' upload 100% complete!")

    # Make sure top-right '+' menu is closed before Step C
    try:
        page.keyboard.press("Escape")
        time.sleep(0.4)
    except Exception:
        pass

    print(f"   -> [Step C] Opening '+' menu, searching '{img_filename}', and clicking 'Add to prompt'...")
    for _ in range(3):
        search_box = page.locator("input[placeholder*='Search assets' i]").first
        if not search_box.is_visible(timeout=1000):
            click_prompt_bar_plus_icon(page)
            time.sleep(2)

        if search_box.is_visible(timeout=2500):
            search_box.click()
            time.sleep(0.3)
            page.keyboard.press("Control+A")
            page.keyboard.press("Backspace")
            page.keyboard.insert_text(img_stem)
            time.sleep(1.5)

        clicked_card = page.evaluate("""(targetFileName) => {
            const targetLower = targetFileName.toLowerCase();
            const targetStem = targetLower.replace(/\\.[^.]+$/, '');
            const allEls = Array.from(document.querySelectorAll('div, button, li, [role="option"], [role="menuitem"], [role="button"]'));

            for (const el of allEls) {
                const r = el.getBoundingClientRect();
                if (r.width < 60 || r.height < 25 || r.height > 90) continue;
                const txt = (el.innerText || '').trim().toLowerCase();
                if (txt.includes(targetLower) || txt.includes(targetStem)) {
                    el.click();
                    return txt.split('\\n')[0];
                }
            }
            return null;
        }""", img_filename)

        print(f"   -> Selected asset card in popup: '{clicked_card or img_filename}'")
        time.sleep(1.5)

        add_to_prompt_btn = page.locator(
            "button:has-text('Add to prompt'), [role='button']:has-text('Add to prompt'), div:has-text('Add to prompt')"
        ).last
        try:
            if add_to_prompt_btn.is_visible(timeout=3000):
                add_to_prompt_btn.click()
                print("   -> [Clicked 'Add to prompt'!] Image attached to prompt box & popup closed!")
                time.sleep(2)
                return True
        except Exception:
            pass

        clicked_add_js = page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"], div, span'));
            const addBtn = btns.find(b => {
                const r = b.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.height > 80) return false;
                return (b.innerText || b.textContent || '').trim().toLowerCase() === 'add to prompt';
            });
            if (addBtn) {
                addBtn.click();
                return true;
            }
            return false;
        }""")
        if clicked_add_js:
            print("   -> [Clicked 'Add to prompt'!] Image attached to prompt box & popup closed!")
            time.sleep(2)
            return True

        time.sleep(1.5)

    print("   [Warning] 'Add to prompt' button click nahi ho paya.")
    return False


def _find_and_click_composer_send_button(page):
    """
    Finds the round '→' Send button strictly INSIDE the prompt composer box (immediately to the
    right of the 'Video | 720p · 6s | x1' Settings Pill), NEVER touching any '⋮' (3-dots) menu
    button on the background canvas image/video cards!
    Returns dict `{ x, y, strategy }` if found, or None.
    """
    return page.evaluate("""() => {
        const btns = Array.from(document.querySelectorAll('button, [role="button"]'));

        // 1. Locate the 'Agent' button in the bottom prompt composer bar
        const agentBtn = btns.find(b => {
            const r = b.getBoundingClientRect();
            const txt = (b.innerText || b.textContent || '').trim().toLowerCase();
            return r.height > 0 && r.top > window.innerHeight * 0.50 && (txt === 'agent' || txt.endsWith('agent'));
        });

        if (!agentBtn) return null;
        const aRect = agentBtn.getBoundingClientRect();

        // 2. Walk up from `agentBtn` to find the Prompt Composer Box container
        //    (In Flow AI, the composer bar is ~420px - 760px wide and centered at the bottom,
        //     with its right edge around 68% - 75% of window.innerWidth).
        let composerBox = agentBtn.parentElement;
        while (composerBox && composerBox !== document.body) {
            const cr = composerBox.getBoundingClientRect();
            if (cr.width >= 320 && cr.width <= window.innerWidth * 0.78 && cr.height >= 60) {
                break;
            }
            composerBox = composerBox.parentElement;
        }

        const composerRightLimit = (composerBox && composerBox !== document.body)
            ? Math.min(composerBox.getBoundingClientRect().right + 18, window.innerWidth * 0.80)
            : window.innerWidth * 0.78;

        // 3. Find all buttons on the bottom toolbar row of the composer box to the right of `agentBtn`,
        //    strictly bounded by `composerRightLimit` so we NEVER match a canvas card's '⋮' menu button!
        const rowRightBtns = btns.filter(b => {
            if (b === agentBtn) return false;
            const r = b.getBoundingClientRect();
            if (r.width < 18 || r.height < 18 || r.width > 260 || r.height > 70) return false;
            if (Math.abs((r.top + r.height / 2) - (aRect.top + aRect.height / 2)) > 36) return false;
            if (r.left <= aRect.right - 4) return false;
            if (r.right > composerRightLimit) return false;
            if (composerBox && composerBox !== document.body && !composerBox.contains(b)) return false;
            return true;
        }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

        // 4. Identify the Settings Pill ('Video | 720p · 6s | x1') on that row
        const settingsPill = rowRightBtns.find(b => {
            const t = (b.innerText || b.textContent || '').toLowerCase();
            return (
                t.includes('video') || t.includes('720p') || t.includes('1080p') ||
                t.includes('6s') || t.includes('5s') || t.includes('8s') ||
                t.includes('x1') || t.includes('16:9') || b.getBoundingClientRect().width >= 68
            );
        });

        let sendBtn = null;
        if (settingsPill) {
            const pRect = settingsPill.getBoundingClientRect();
            // The round '→' Send button is immediately to the right of the Settings Pill (within 85px)
            const afterPill = rowRightBtns.filter(b => {
                if (b === settingsPill) return false;
                const r = b.getBoundingClientRect();
                return r.left >= pRect.right - 6 && r.left <= pRect.right + 85 && r.width <= 64;
            });
            if (afterPill.length > 0) {
                sendBtn = afterPill[0];
            }
        }

        if (!sendBtn && rowRightBtns.length > 0) {
            // Pick the rightmost button INSIDE the composer box row
            sendBtn = rowRightBtns[rowRightBtns.length - 1];
        }

        if (sendBtn) {
            const sr = sendBtn.getBoundingClientRect();
            sendBtn.click();
            return {
                x: sr.left + sr.width / 2,
                y: sr.top + sr.height / 2,
                strategy: settingsPill ? 'right-of-settings-pill' : 'composer-row-rightmost'
            };
        }

        // 5. Fallback if Settings Pill was found even outside `composerBox` check:
        //    click 26px to the right of the Settings Pill's right edge!
        const globalPill = btns.find(b => {
            const r = b.getBoundingClientRect();
            if (r.top < window.innerHeight * 0.55 || r.width < 65 || r.right > window.innerWidth * 0.80) return false;
            const t = (b.innerText || '').toLowerCase();
            return t.includes('video') && (t.includes('720p') || t.includes('1080p') || t.includes('6s') || t.includes('x1'));
        });
        if (globalPill) {
            const pr = globalPill.getBoundingClientRect();
            const targetX = pr.right + 24;
            const targetY = pr.top + pr.height / 2;
            const elAtPoint = document.elementFromPoint(targetX, targetY);
            if (elAtPoint) {
                const btnAtPoint = elAtPoint.closest('button, [role="button"]') || elAtPoint;
                btnAtPoint.click();
            }
            return { x: targetX, y: targetY, strategy: 'offset-from-settings-pill' };
        }

        return null;
    }""")


def _is_prompt_still_in_composer(page, video_prompt: str) -> bool:
    """Checks if the typed video prompt text is still sitting unsubmitted inside the composer box."""
    snippet = (video_prompt or "").strip()[:28].lower()
    if not snippet:
        return False
    try:
        return page.evaluate("""(snip) => {
            const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], div, p, span'));
            for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.top < window.innerHeight * 0.50 || r.width === 0 || r.height === 0) continue;
                if (r.right > window.innerWidth * 0.80) continue;
                const txt = (el.innerText || el.value || el.textContent || '').trim().toLowerCase();
                if (txt.includes(snip)) {
                    return true;
                }
            }
            return false;
        }""", snippet)
    except Exception:
        return False


def type_prompt_and_click_send(page, video_prompt: str):
    # 1. Close asset search popover or any lingering top-right menu before focusing prompt box
    try:
        search_box = page.locator("input[placeholder*='Search assets' i]").first
        if search_box.is_visible(timeout=800):
            add_btn = page.locator("button:has-text('Add to prompt')").first
            if add_btn.is_visible(timeout=800):
                add_btn.click()
            else:
                page.keyboard.press("Escape")
            time.sleep(1.2)
    except Exception:
        pass

    # Also close any open dropdown menu ('Upload / New collection' or 'Favourite / Animate')
    try:
        has_open_menu = page.evaluate("""() => {
            const menus = Array.from(document.querySelectorAll('[role="menu"], [role="listbox"]'));
            return menus.some(m => {
                const r = m.getBoundingClientRect();
                return r.width > 50 && r.height > 50;
            });
        }""")
        if has_open_menu:
            page.keyboard.press("Escape")
            time.sleep(0.5)
    except Exception:
        pass

    # 2. Focus the 'What do you want to create?' prompt box inside the composer
    box_coords = page.evaluate("""() => {
        const els = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"], div, span'));
        const target = els.find(el => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0 || r.top < window.innerHeight * 0.55) return false;
            if (r.right > window.innerWidth * 0.80) return false;
            const ph = (el.getAttribute('placeholder') || el.getAttribute('data-placeholder') || el.innerText || '').toLowerCase();
            return ph.includes('what do you want to create');
        });
        if (target) {
            const r = target.getBoundingClientRect();
            target.click();
            if (target.focus) target.focus();
            return { x: r.left + Math.min(120, r.width / 2), y: r.top + r.height / 2 };
        }
        return null;
    }""")

    if box_coords:
        try:
            page.mouse.click(box_coords["x"], box_coords["y"])
        except Exception:
            pass
    else:
        page.evaluate("""() => {
            const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
            const agentBtn = btns.find(b => {
                const t = (b.innerText || '').trim().toLowerCase();
                return (t === 'agent' || t.endsWith('agent')) && b.getBoundingClientRect().top > window.innerHeight * 0.5;
            });
            if (agentBtn) {
                const r = agentBtn.getBoundingClientRect();
                const elAbove = document.elementFromPoint(r.left + 90, r.top - 35);
                if (elAbove) {
                    elAbove.click();
                    if (elAbove.focus) elAbove.focus();
                }
            }
        }""")

    print("   -> Typing Video Prompt into 'What do you want to create?'...")
    time.sleep(0.4)
    page.keyboard.press("Control+A")
    page.keyboard.press("Backspace")
    page.keyboard.insert_text(video_prompt)
    time.sleep(0.3)
    # Type a real space + backspace and dispatch InputEvent so React/Lit/Angular state enables the Send button!
    page.keyboard.press("Space")
    time.sleep(0.2)
    page.keyboard.press("Backspace")
    try:
        page.evaluate("""() => {
            const active = document.activeElement;
            if (active) {
                active.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true }));
                active.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }""")
    except Exception:
        pass
    time.sleep(1.2)

    # 3. Click the round '→' Send button strictly inside the composer bar (right next to 'Video | 720p · 6s | x1')
    send_info = _find_and_click_composer_send_button(page)
    if send_info:
        try:
            # Perform a real Playwright hardware mouse click on the exact center of the '→' Send button!
            page.mouse.click(send_info["x"], send_info["y"])
            print(f"   -> Clicked round Arrow (→) Send button at ({int(send_info['x'])}, {int(send_info['y'])}) [{send_info['strategy']}]!")
        except Exception:
            print(f"   -> Clicked round Arrow (→) Send button [{send_info['strategy']}]!")
    else:
        print("   -> Pressing Enter to send video prompt...")
        page.keyboard.press("Enter")

    # 4. Verify within 2.5 seconds that the prompt was actually submitted (composer box cleared)!
    time.sleep(2.5)
    if _is_prompt_still_in_composer(page, video_prompt):
        print("   -> [Send Retry] Prompt abhi bhi box mein hai — pressing Enter & re-clicking '→' Send button...")
        try:
            page.keyboard.press("Escape")
            time.sleep(0.4)
        except Exception:
            pass

        # Re-click the '→' Send button with real mouse click + Enter
        retry_info = _find_and_click_composer_send_button(page)
        if retry_info:
            try:
                page.mouse.move(retry_info["x"], retry_info["y"])
                time.sleep(0.2)
                page.mouse.down()
                time.sleep(0.1)
                page.mouse.up()
                print(f"   -> [Send Retry] Mouse-clicked '→' Send button at ({int(retry_info['x'])}, {int(retry_info['y'])})!")
            except Exception:
                pass
        time.sleep(1.0)
        if _is_prompt_still_in_composer(page, video_prompt):
            try:
                page.keyboard.press("Enter")
                time.sleep(1.0)
            except Exception:
                pass


# ====================================================================
# 6. SCENE-ACCOUNT STATUS WRITER (`scene_account_reports` FOLDER)
# ====================================================================

def save_scene_account_reports(
    source_name: str,
    scenes: list,
    scene_account_map: dict,
    skipped_scenes: list,
    today_exhausted_accounts: set,
    write_master: bool = False,
):
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    pdf_stem = Path(source_name).stem if source_name else "Flow_Scenes"
    pdf_report_file = REPORTS_DIR / f"{pdf_stem}_Scene_Account_Report.txt"

    skipped_by_no = {item["scene_no"]: item for item in skipped_scenes}
    completed_nums = sorted(scene_account_map.keys())
    dropped_nums = sorted(skipped_by_no.keys())

    accounts_summary = {}
    for s_no, acc_name in sorted(scene_account_map.items()):
        accounts_summary.setdefault(acc_name, []).append(f"Scene_{s_no:02d}")

    lines = [
        "==========================================================================",
        "   ITIHASKAR SAMAY - SCENE & ACCOUNT STATUS REPORT (FLOW AI BOT v3.0)",
        "==========================================================================",
        f"PDF / Source File          : {source_name}",
        f"Date & Time                : {now_str}",
        f"Total Scenes Selected      : {len(scenes)} -> {[s['scene_no'] for s in scenes]}",
        f"Total Scenes BANE (YES)    : {len(completed_nums)} -> {completed_nums}",
        f"Total Scenes NAHI BANE (NO): {len(dropped_nums)} -> {dropped_nums}",
        f"Today's Exhausted Accounts : {sorted(list(today_exhausted_accounts)) if today_exhausted_accounts else 'None (Sabhi active hain)'}",
        "--------------------------------------------------------------------------",
        "   ACCOUNT-WISE SUMMARY (KIS ACCOUNT MEIN KON-KON SA SCENE BANA):",
        "--------------------------------------------------------------------------",
    ]

    if accounts_summary:
        for acc_name, sc_list in accounts_summary.items():
            lines.append(f"   * {acc_name:<16} : {len(sc_list)} Videos -> {', '.join(sc_list)}")
    else:
        lines.append("   * Abhi tak kisi account mein is batch ka video nahi bana.")

    lines.extend([
        "",
        "--------------------------------------------------------------------------",
        "   SCENE-BY-SCENE TABLE (SCENE BANA YA NAHI + KIS ACCOUNT MEIN BANA):",
        "--------------------------------------------------------------------------",
        f"   {'SCENE':<12} | {'BANA YA NAHI?':<20} | {'ACCOUNT NAME':<16} | {'DETAILS / REASON'}",
        "   " + "-" * 70,
    ])

    for s in scenes:
        s_no = s["scene_no"]
        img_lbl = s["img_path"].name if s.get("img_path") else f"Scene_{s_no:02d}.png"
        if s_no in scene_account_map:
            acc_used = scene_account_map[s_no]
            lines.append(
                f"   Scene_{s_no:02d}    | Haan Bana (YES)      | {acc_used:<16} | Image: {img_lbl} (Verified Created)"
            )
        elif s_no in skipped_by_no:
            err_info = skipped_by_no[s_no]
            reason_txt = err_info.get("reason", "Policy Violation / Error")
            lines.append(
                f"   Scene_{s_no:02d}    | Nahi Bana (NO)       | {'---':<16} | {reason_txt} ({img_lbl})"
            )
        else:
            lines.append(
                f"   Scene_{s_no:02d}    | Pending...           | {'---':<16} | Waiting to process ({img_lbl})"
            )

    if skipped_scenes:
        lines.extend([
            "",
            "--------------------------------------------------------------------------",
            "   DROPPED / POLICY ERROR SCENES KE VIDEO PROMPTS (JO NAHI BANE):",
            "--------------------------------------------------------------------------",
        ])
        for item in skipped_scenes:
            img_lbl = item.get("img_name", f"Scene_{item['scene_no']:02d}.png")
            lines.append(
                f"\n[Scene_{item['scene_no']:02d} | Image: {img_lbl}] -> NAHI BANA (NO)\n"
                f"   Reason       : {item['reason']}\n"
                f"   Video Prompt : {item['video_prompt']}"
            )
    else:
        lines.append("\n[100% SUCCESS] Abhi tak koi bhi scene Policy Error se drop nahi hua hai.")

    lines.append("==========================================================================\n")
    report_content = "\n".join(lines)

    # Save PDF-specific report & root report immediately (Real-Time!)
    pdf_report_file.write_text(report_content, encoding="utf-8")
    REPORT_FILE.write_text(report_content, encoding="utf-8")

    if write_master:
        with open(MASTER_STATUS_FILE, "a", encoding="utf-8") as mf:
            mf.write(report_content + "\n")

    return pdf_report_file


# ====================================================================
# 7. MASTER FLOW AI VIDEO PIPELINE (100% HANDS-FREE AUTO VERIFY & DROP)
# ====================================================================

def run_flow_video_bot(scenes, source_name="PDF", stealth_mode=False):
    print("\n========================================================")
    print("   BOT 2: FLOW AI VIDEO GENERATOR SHURU (v3.0 - AUTO-VERIFY)")
    print("========================================================")

    set_keep_awake(True, allow_screen_off=stealth_mode)
    if stealth_mode:
        print("[Stealth Mode ON] Chrome chhupa kar chalega aur 5 second mein Laptop Screen OFF ho jayegi!")
        print("                  (Bot 100% apne-aap kaam karega aur Dropped scenes ko skip karke save kar lega)")

    flow_folders = get_flow_account_folders()
    today_exhausted_accounts = load_today_exhausted_accounts()

    if today_exhausted_accounts:
        print(f"\n[Same-Day Memory Active ({get_today_date_str()})]")
        print(f"   -> Aaj in Flow AI accounts ke credits pehle hi khatam ho chuke hain: {sorted(list(today_exhausted_accounts))}")
        print("   -> Bot inhe dobara NAHI kholega aur seedha agle active account par jayega!")

    acc_idx = 0
    vids_made_in_curr_acc = 0
    settings_configured = False

    completed_scenes = []
    scene_account_map = {}  # {scene_no: "Flow_Account_X"}
    skipped_scenes = []

    with sync_playwright() as p:
        context = None
        page = None

        try:
            for scene in scenes:
                scene_no = scene["scene_no"]
                img_path = scene["img_path"]
                done_marker = VIDEOS_DIR / f"Scene_{scene_no:02d}.done"

                print(f"\n--------------------------------------------------------")
                print(f"   PROCESSING VIDEO FOR SCENE {scene_no:02d} (Image: {img_path.name})")
                print(f"   Video Prompt: {scene['video_prompt'][:80]}...")
                print(f"--------------------------------------------------------")

                while acc_idx < len(flow_folders):
                    acc_folder = flow_folders[acc_idx]

                    # Skip accounts that already hit the credit limit earlier TODAY!
                    if acc_folder.name in today_exhausted_accounts:
                        print(f"   [Skip Exhausted Account] '{acc_folder.name}' mein aaj ({get_today_date_str()}) credits khatam ho chuke hain -> Skipping to next account!")
                        if context is not None:
                            try:
                                context.close()
                            except Exception:
                                pass
                            context = None
                            page = None
                        acc_idx += 1
                        vids_made_in_curr_acc = 0
                        settings_configured = False
                        continue

                    if context is None:
                        print(f"\n========================================================")
                        print(f"   OPENING FLOW AI IN {acc_folder.name}")
                        print(f"========================================================")
                        chrome_args = [
                            "--disable-blink-features=AutomationControlled",
                            "--test-type",
                        ] + ([] if os.name == "nt" else ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"])
                        if stealth_mode:
                            chrome_args += ["--window-position=-3200,-3200", "--window-size=1920,1080"]
                        else:
                            chrome_args += ["--start-maximized"]

                        context = p.chromium.launch_persistent_context(
                            user_data_dir=str(acc_folder),
                            channel="chrome",
                            headless=False,
                            args=chrome_args,
                            ignore_default_args=["--no-sandbox"] if os.name == "nt" else [],
                            chromium_sandbox=(os.name == "nt"),
                            no_viewport=True,
                        )
                        page = context.pages[0] if context.pages else context.new_page()
                        page.goto(FLOW_AI_URL, wait_until="domcontentloaded", timeout=60000)
                        time.sleep(6)
                        enter_flow_project(page)
                        settings_configured = False

                        if stealth_mode:
                            turn_off_laptop_screen()
                    else:
                        dismiss_all_flow_popups(page)
                        if "/project/" not in page.url:
                            enter_flow_project(page)
                        if stealth_mode:
                            turn_off_laptop_screen()

                    if check_flow_credits_exhausted(page):
                        print(f"   [Credits Exhausted] {acc_folder.name} ke credits khatam! Switching to next Flow AI account...")
                        mark_account_exhausted_today(acc_folder.name, today_exhausted_accounts)
                        context.close()
                        context = None
                        page = None
                        acc_idx += 1
                        vids_made_in_curr_acc = 0
                        settings_configured = False
                        continue

                    ensure_agent_mode_off(page)

                    if not settings_configured:
                        configure_flow_settings_popover(page)
                        settings_configured = True

                    # Upload & attach image
                    attached = upload_and_attach_scene_image(page, img_path)
                    up_err = check_flow_generation_error(page)
                    if not attached or up_err:
                        drop_reason = up_err or "Image upload ya 'Add to prompt' reject ho gaya"
                        skipped_scenes.append({
                            "scene_no": scene_no,
                            "img_name": img_path.name,
                            "reason": drop_reason,
                            "video_prompt": scene["video_prompt"],
                        })
                        clear_failed_prompt_and_popups(page)
                        save_scene_account_reports(
                            source_name, scenes, scene_account_map, skipped_scenes, today_exhausted_accounts
                        )
                        print(f"---> [AUTO-DROP] Scene {scene_no:02d} ({img_path.name}) dropped ({drop_reason}). Moving to next scene...")
                        break

                    # Record state BEFORE clicking Send (Credits + Canvas Cards)
                    credits_before = get_flow_remaining_credits(page)
                    cards_before = count_flow_project_cards(page)
                    if credits_before is not None:
                        print(f"   -> [Credits Check] Generation se pehle credits: {credits_before}")

                    type_prompt_and_click_send(page, scene["video_prompt"])
                    print(f"   -> Scene {scene_no:02d} video generation lag gaya! Auto-monitoring (Hands-Free)...")
                    time.sleep(6)

                    if check_flow_credits_exhausted(page):
                        print(f"\n   [Credits Exhausted!] {acc_folder.name} ke credits khatam ho gaye!")
                        mark_account_exhausted_today(acc_folder.name, today_exhausted_accounts)
                        print(f"   -> Switching to next Flow AI account for Scene {scene_no:02d}...")
                        context.close()
                        context = None
                        page = None
                        acc_idx += 1
                        vids_made_in_curr_acc = 0
                        settings_configured = False
                        continue

                    # Hands-Free Render & Error Monitoring Loop
                    print(f"   -> Waiting while Scene {scene_no:02d} video renders on Flow AI...")
                    detected_err = ""
                    saw_rendering_progress = False
                    credits_exhausted_midway = False

                    for tick in range(40):
                        if check_flow_credits_exhausted(page):
                            credits_exhausted_midway = True
                            break

                        # 1. Check immediately for any Policy Violation / Generation Error
                        err_now = check_flow_generation_error(page)
                        if err_now:
                            detected_err = err_now
                            print(f"   -> [Auto-Error Detected!] {detected_err} -> Immediately dropping Scene {scene_no:02d}!")
                            break

                        # 2. Check if `%` progress (1%..99%) or active rendering state is on screen
                        still_rendering = page.evaluate("""() => {
                            const els = Array.from(document.querySelectorAll('div, span, p'));
                            return els.some(el => {
                                if (el.children.length > 0) return false;
                                const txt = (el.innerText || '').trim().toLowerCase();
                                if (/^\\d{1,2}%$/.test(txt)) return true;
                                if (txt === 'generating...' || txt === 'creating...' || txt === 'rendering...') return true;
                                return false;
                            });
                        }""")
                        if still_rendering:
                            saw_rendering_progress = True

                        # Break once rendering has started and completed, or after ~40s if nothing started
                        if saw_rendering_progress and not still_rendering and tick >= 3:
                            break
                        if not saw_rendering_progress and not still_rendering and tick >= 9:
                            break
                        time.sleep(4)

                    if credits_exhausted_midway or check_flow_credits_exhausted(page):
                        mark_account_exhausted_today(acc_folder.name, today_exhausted_accounts)
                        context.close()
                        context = None
                        page = None
                        acc_idx += 1
                        vids_made_in_curr_acc = 0
                        settings_configured = False
                        continue

                    # Final post-render check (wait 2s for UI / credits / error toast to settle)
                    time.sleep(2)
                    if not detected_err:
                        detected_err = check_flow_generation_error(page)

                    credits_after = get_flow_remaining_credits(page)
                    cards_after = count_flow_project_cards(page)

                    if credits_before is not None and credits_after is not None:
                        print(f"   -> [Credits Check] Before: {credits_before} | After: {credits_after}")

                    # 3-LAYER AUTOMATIC DECISION: BANA (YES) vs NAHI BANA (NO)
                    video_created = False
                    failure_reason = detected_err

                    if detected_err:
                        video_created = False
                    elif credits_before is not None and credits_after is not None:
                        if credits_after < credits_before:
                            # Layer 1: Credits decreased -> 100% video was created!
                            video_created = True
                        elif credits_after == credits_before and cards_after <= cards_before:
                            # Credits did NOT decrease and no new card appeared -> Video did NOT generate!
                            video_created = False
                            failure_reason = "Video nahi bana (Credits kam nahi huye / Policy Error se reject hua)"
                        else:
                            video_created = True
                    else:
                        # Fallback to Layer 2 (New Canvas Card OR completed rendering cycle without error)
                        if cards_after > cards_before or saw_rendering_progress:
                            video_created = True
                        else:
                            video_created = False
                            failure_reason = "Video nahi bana (Na rendering chali aur na naya video card aaya)"

                    if not video_created:
                        clear_failed_prompt_and_popups(page)
                        skipped_scenes.append({
                            "scene_no": scene_no,
                            "img_name": img_path.name,
                            "reason": failure_reason or "Flow AI Policy Violation / Generation Failed",
                            "video_prompt": scene["video_prompt"],
                        })
                        print(f"   [SCENE DROPPED - AUTO SKIP] Scene {scene_no:02d} ({img_path.name}): {failure_reason}")
                    else:
                        vids_made_in_curr_acc += 1
                        done_marker.write_text(
                            f"Scene_{scene_no:02d} | Status: BANA (YES) | Account: {acc_folder.name} | Time: {datetime.now()}\n",
                            encoding="utf-8",
                        )
                        completed_scenes.append(scene_no)
                        scene_account_map[scene_no] = acc_folder.name
                        print(f"   [SCENE {scene_no:02d} VIDEO DONE!] Generated on {acc_folder.name} (Total on this account: {vids_made_in_curr_acc})")

                    # Save report in real-time after EVERY scene!
                    save_scene_account_reports(
                        source_name, scenes, scene_account_map, skipped_scenes, today_exhausted_accounts
                    )
                    break
                else:
                    print("\n[STOP] Aaj ke liye saare Flow AI accounts ke credits khatam ho gaye!")
                    break

        finally:
            set_keep_awake(False)
            if context is not None:
                if stealth_mode:
                    try:
                        context.close()
                    except Exception:
                        pass
                else:
                    print("\n[Note] Saare scenes process ho chuke hain aur Report save ho gayi hai!")
                    input("[Jab aap Chrome band karna chahein tab yahan ENTER dabayein] >> ")
                    try:
                        context.close()
                    except Exception:
                        pass

    # ================================================================
    # AUTO RECONCILE: DROPPED SCENES = PROCESSED SCENES - OUTPUT SCENES
    # ================================================================
    completed_set = set(completed_scenes)
    already_skipped_nums = {item["scene_no"] for item in skipped_scenes}

    for s in scenes:
        s_no = s["scene_no"]
        if s_no not in completed_set and s_no not in already_skipped_nums:
            img_name_str = s["img_path"].name if s.get("img_path") else f"Scene_{s_no:02d}.png"
            skipped_scenes.append({
                "scene_no": s_no,
                "img_name": img_name_str,
                "reason": "Video generate nahi ho paya (Credits Exhausted / Policy Violation)",
                "video_prompt": s["video_prompt"],
            })
            already_skipped_nums.add(s_no)

    skipped_scenes.sort(key=lambda x: x["scene_no"])

    # Final save of Scene & Account Status Report inside `scene_account_reports/` folder
    saved_pdf_report = save_scene_account_reports(
        source_name=source_name,
        scenes=scenes,
        scene_account_map=scene_account_map,
        skipped_scenes=skipped_scenes,
        today_exhausted_accounts=today_exhausted_accounts,
        write_master=True,
    )

    # Print summary on terminal
    print("\n" + "=" * 68)
    print("   FINAL FLOW AI VIDEO & ACCOUNT REPORT (ITIHASKAR SAMAY - v3.0)")
    print("=" * 68)
    print(f"Source File                : {source_name}")
    print(f"Total Scenes Processed     : {len(scenes)} -> {[s['scene_no'] for s in scenes]}")
    print(f"Successfully Generated     : {len(completed_scenes)} Videos -> {sorted(completed_scenes)}")
    print(f"Dropped / Skipped Scenes   : {len(skipped_scenes)} Scenes ({len(scenes)} - {len(completed_scenes)}) -> {[x['scene_no'] for x in skipped_scenes]}")
    print("-" * 68)
    print("   SCENE-WISE ACCOUNT STATUS:")
    for s in scenes:
        s_no = s["scene_no"]
        if s_no in scene_account_map:
            print(f"   * Scene_{s_no:02d} : BANA (YES)      -> Account: {scene_account_map[s_no]}")
        else:
            err_item = next((x for x in skipped_scenes if x["scene_no"] == s_no), {})
            print(f"   * Scene_{s_no:02d} : NAHI BANA (NO)  -> Reason : {err_item.get('reason', 'Policy / Error')}")
    print("=" * 68)
    print(f"1. PDF Scene-Account Report : scene_account_reports/{saved_pdf_report.name}")
    print(f"2. Master All-Scenes Report : scene_account_reports/{MASTER_STATUS_FILE.name}")
    print(f"3. Daily Credit Memory File : scene_account_reports/{DAILY_CREDIT_FILE.name}")
    print("=" * 68 + "\n")


# ====================================================================
# 8. INTERACTIVE MENU
# ====================================================================

def main():
    while True:
        exhausted_today = load_today_exhausted_accounts()
        exhausted_note = (
            f" [Today Exhausted: {', '.join(sorted(exhausted_today))}]"
            if exhausted_today
            else " [All Accounts Active Today]"
        )

        print("\n========================================================")
        print("   ITIHASKAR SAMAY - BOT 2: FLOW AI VIDEO BOT (v3.0)")
        print(f"   Date: {get_today_date_str()}{exhausted_note}")
        print("========================================================")
        print("1. Flow AI Accounts Setup Karein (Jio Pro Accounts - ChatGPT se Alag)")
        print("2. PDF Chunein & Flow AI Videos Generate Karein (100% Hands-Free Auto-Drop & Report)")
        print("3. Aaj Ki Credit Exhausted Memory Reset Karein (Force Start from Flow_Account_1)")
        print("4. Exit (Bahar Niklein)")
        print("========================================================")

        choice = input("Apna option chunein (1/2/3/4): ").strip()

        if choice == "1":
            setup_flow_accounts_interactively()
        elif choice == "2":
            scenes, source_name, stealth_mode = select_and_load_scenes_for_video()
            if not scenes:
                print("\n[Error] Selected range mein koi scene image ('output_images/Scene_XX.png') nahi mili!")
                print("Pehle Bot 1 (ChatGPT Bot) se images download karein.")
                continue
            run_flow_video_bot(scenes, source_name, stealth_mode)
        elif choice == "3":
            reset_today_credit_memory()
        elif choice == "4":
            print("Alvida! Best of luck for your next Itihaskar Samay video!")
            break
        else:
            print("Galat option! Kripya 1, 2, 3, ya 4 dabayein.")


if __name__ == "__main__":
    main()