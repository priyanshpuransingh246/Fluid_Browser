r"""
====================================================================
ITIHASKAR SAMAY - BOT 1: CHATGPT IMAGE BOT (v20 - LIBRARY REUSE + v15 DOWNLOAD ENGINE)
Channel: http://www.youtube.com/@ItihaskarSamay
File Name: itihaskar_samay_bot.py (Save in C:\Itihaskar_Bot\itihaskar_samay_bot.py)
What's New in v20:
  1. Smart 'Add from Library' Character Image Reuse (Same Account):
     - Jab kisi ChatGPT account mein koi character image (jaise `OLD CHANGEZ KHAN` ya
       `YOUNG ADULT CHANGEZ KHAN`) PEHLI baar use hoti hai, toh computer se upload hoti hai.
     - Usi same account mein jab wahi image DUSRI ya agli baar chahiye hoti hai, toh bot
       dobara upload karne ki bajaye:
         (+) icon click karta hai -> 'Add from library' kholta hai -> 'Search Library' mein
         image ka naam search karta hai -> Select wale Tick (✓) par click karta hai ->
         aur 'Add to chat' par click kar deta hai!
     - Agar account switch hota hai (Account_1 -> Account_2), toh naye account mein pehli baar
       upload karega aur phir us account mein bhi Library se hi lega!
  2. Restored v15 Image Download Engine + Lightbox Click Download Fallback.
  3. Fixed Python 3.14 SyntaxWarning using raw docstring r'''
====================================================================
"""

import os
import sys
import csv
import re
import time
import site
import shutil
import ctypes
import base64
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
    if os.name == "nt":
        try:
            ctypes.windll.user32.PostMessageW(0xFFFF, 0x0112, 0xF170, 2)
        except Exception:
            pass


# ====================================================================
# 2. SETTINGS & FOLDERS
# ====================================================================

BASE_DIR = Path(__file__).parent.resolve()
ACCOUNTS_DIR = BASE_DIR / "chrome_accounts"
IMAGES_DIR = BASE_DIR / "output_images"
CSV_FILE = BASE_DIR / "scenes_template.csv"
REPORT_FILE = BASE_DIR / "skipped_scenes_report.txt"
DOWNLOADS_DIR = Path.home() / "Downloads"

TOTAL_ACCOUNTS = 7
CHATGPT_URL = "https://chatgpt.com/"

ACCOUNTS_DIR.mkdir(exist_ok=True)
IMAGES_DIR.mkdir(exist_ok=True)


def get_account_folders():
    folders = []
    for i in range(1, TOTAL_ACCOUNTS + 1):
        folder = ACCOUNTS_DIR / f"Account_{i}"
        folder.mkdir(exist_ok=True)
        folders.append(folder)
    return folders


def get_scene_image_path(scene_no: int) -> Path:
    p_upper = IMAGES_DIR / f"Scene_{scene_no:02d}.png"
    p_lower = IMAGES_DIR / f"scene_{scene_no:02d}.png"
    if p_lower.exists() and p_lower.stat().st_size > 10000 and not p_upper.exists():
        return p_lower
    return p_upper


# ====================================================================
# 3. REFERENCE CHARACTER IMAGE DETECTOR (`OLD CHANGEZ KHAN` etc.)
# ====================================================================

def detect_reference_image_for_prompt(image_prompt: str):
    m = re.search(r"USE\s+UPLOADED\s+IMAGE\s+AS\s+([^.\n]+)", image_prompt, re.IGNORECASE)
    if not m:
        return None, ""

    raw_char_name = m.group(1).strip()
    clean_char_name = re.sub(r"\([^)]*\)", "", raw_char_name).strip()

    image_extensions = (".jpeg", ".jpg", ".png", ".webp")
    all_folder_images = [
        f for f in BASE_DIR.iterdir()
        if f.is_file() and f.suffix.lower() in image_extensions
    ]

    def norm(s: str) -> str:
        return re.sub(r"[^a-z0-9]+", " ", s.lower()).strip()

    target_norm = norm(raw_char_name)
    clean_norm = norm(clean_char_name)

    for img_file in all_folder_images:
        stem_norm = norm(img_file.stem)
        if stem_norm and (
            stem_norm == target_norm
            or stem_norm == clean_norm
            or stem_norm in target_norm
            or clean_norm in stem_norm
        ):
            return img_file, raw_char_name

    target_words = [w for w in clean_norm.split() if len(w) > 2]
    for img_file in all_folder_images:
        stem_norm = norm(img_file.stem)
        if target_words and all(w in stem_norm for w in target_words[:2]):
            return img_file, raw_char_name

    return None, raw_char_name


# ====================================================================
# 4. OPTION 1: CHATGPT ACCOUNT SETUP
# ====================================================================

def setup_accounts_interactively():
    print("\n========================================================")
    print("   CHATGPT ACCOUNT SETUP MODE (Sirf Ek Baar Karna Hai)")
    print("========================================================")
    num_input = input(f"Kitne ChatGPT accounts login karne hain? (Default {TOTAL_ACCOUNTS}): ").strip()
    count = int(num_input) if num_input.isdigit() and 1 <= int(num_input) <= 20 else TOTAL_ACCOUNTS

    with sync_playwright() as p:
        for i in range(1, count + 1):
            acc_folder = ACCOUNTS_DIR / f"Account_{i}"
            acc_folder.mkdir(exist_ok=True)

            print(f"\n---> [Account {i}/{count}] Chrome khul raha hai ({acc_folder.name})...")
            context = p.chromium.launch_persistent_context(
                user_data_dir=str(acc_folder),
                channel="chrome",
                headless=False,
                args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
                ignore_default_args=["--no-sandbox"],
                no_viewport=True,
            )

            page = context.pages[0] if context.pages else context.new_page()
            page.goto(CHATGPT_URL)

            print(f"   1. Khule huye Chrome mein apne {i}-number Gmail se ChatGPT mein login karein.")
            print("   2. Login hone ke baad yahan Terminal mein ENTER dabayein.")
            input(f"   [Account {i} Login poora hone ke baad ENTER dabayein] >> ")

            context.close()
            print(f"   [Saved!] Account_{i} ka login save ho gaya!")
            time.sleep(1.5)

    print("\n========================================================")
    print("SAARE CHATGPT ACCOUNTS KA SETUP COMPLETE HO GAYA!")
    print("========================================================\n")


# ====================================================================
# 5. MULTI-PDF SELECTOR + START & END SCENE RANGE
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


def select_and_load_scenes():
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

    min_scene = scenes[0]["scene_no"]
    max_scene = scenes[-1]["scene_no"]
    print(f"[Success] '{source_name}' se total {len(scenes)} scenes load huye (Scene {min_scene} se Scene {max_scene} tak).")

    start_in = input(
        f"\n---> Kahan se shuru karna hai? (Start Scene Number {min_scene}-{max_scene}, Default {min_scene}): "
    ).strip()
    start_no = int(start_in) if start_in.isdigit() else min_scene

    end_in = input(
        f"---> Kahan tak image banani hai? (End Scene Number {start_no}-{max_scene}, Default {max_scene}): "
    ).strip()
    end_no = int(end_in) if end_in.isdigit() else max_scene

    filtered = [s for s in scenes if start_no <= s["scene_no"] <= end_no]
    if filtered:
        scenes = filtered
        print(f"\n[Range Set] Ab Scene {start_no:02d} se Scene {end_no:02d} tak (Total {len(scenes)} scenes) ki images banengi!")

    stealth_in = input(
        "\n---> Kya 'College / Screen-Off Stealth Mode' chalu karna hai (Chrome chhupa rahega + Screen OFF ho jayegi)? (y/n, Default n): "
    ).strip().lower()
    stealth_mode = stealth_in in ("y", "yes", "1", "haan")

    return scenes, source_name, stealth_mode


# ====================================================================
# 6. CHATGPT HELPERS (Library Reuse + Restored v15 Engine + Lightbox!)
# ====================================================================

def check_chatgpt_limit_reached(page) -> bool:
    limit_phrases = [
        "reached your image generation limit",
        "reached your image creation limit",
        "you've hit the free plan limit for image",
        "hit the free plan limit for image",
        "you've reached your limit for image",
        "wait before generating more images",
        "too many requests in 1 hour",
        "you've reached the current usage cap",
        "resets in ",
        "limit resets",
    ]
    try:
        body_text = page.locator("main").inner_text(timeout=2500).lower()
        if any(phrase in body_text for phrase in limit_phrases):
            return True
    except Exception:
        pass
    return False


def check_chatgpt_generation_refusal(page) -> str:
    if check_chatgpt_limit_reached(page):
        return ""

    refusal_phrases = {
        "content policy": "ChatGPT Content Guideline Refusal",
        "against our policies": "ChatGPT Guideline Refusal",
        "i cannot generate": "ChatGPT Declined Image Generation",
        "i can't generate": "ChatGPT Declined Image Generation",
        "i'm unable to generate": "ChatGPT Unable to Generate Image",
        "i am unable to generate": "ChatGPT Unable to Generate Image",
        "i can't create images": "ChatGPT Declined Image Creation",
        "unable to create this image": "ChatGPT Unable to Create Image",
    }
    try:
        body_text = page.locator("main").inner_text(timeout=2500).lower()
        if "creating image" in body_text:
            return ""
        for phrase, reason in refusal_phrases.items():
            if phrase in body_text:
                return reason
    except Exception:
        pass
    return ""


def open_new_chat_in_chatgpt(page):
    try:
        page.keyboard.press("Escape")
        time.sleep(0.5)
    except Exception:
        pass

    new_chat_selectors = [
        "[data-testid='create-new-chat-button']",
        "a:has-text('New chat')",
        "button:has-text('New chat')",
        "[aria-label*='New chat' i]",
        "nav a[href='/']",
    ]
    for sel in new_chat_selectors:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1500):
                btn.click()
                time.sleep(2.5)
                return
        except Exception:
            continue

    page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)
    time.sleep(3)


def count_large_images(page) -> int:
    """EXACT v15 function jo aapke laptop par 100% kaam kar raha tha!"""
    try:
        return page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('main img, article img'));
            return imgs.filter(img => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 200).length;
        }""")
    except Exception:
        return 0


def is_still_creating_image(page) -> bool:
    try:
        stop_btn = page.locator("button[data-testid='stop-button']").first
        if stop_btn.is_visible(timeout=400):
            return True
    except Exception:
        pass
    return False


def click_chatgpt_composer_plus_button(page) -> bool:
    """
    Clicks the '+' button on the left side of 'Ask ChatGPT' prompt bar
    (as shown in Screenshot 48209f87.png) to open the popup menu!
    """
    plus_selectors = [
        "button[data-testid='composer-plus-btn']",
        "button[aria-label='Attach files']",
        "button[aria-label*='Add' i][aria-haspopup='menu']",
    ]
    for sel in plus_selectors:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=800):
                btn.click()
                return True
        except Exception:
            continue

    try:
        return page.evaluate("""() => {
            const box = document.querySelector('#prompt-textarea') || document.querySelector('[contenteditable="true"]');
            if (!box) return false;
            const bRect = box.getBoundingClientRect();
            const btns = Array.from(document.querySelectorAll('button, [role="button"]')).filter(b => {
                const r = b.getBoundingClientRect();
                return (
                    r.width >= 20 && r.width <= 60 &&
                    r.height >= 20 && r.height <= 60 &&
                    Math.abs(r.top - bRect.top) < 65 &&
                    r.left <= bRect.left + 55 &&
                    r.left >= bRect.left - 80
                );
            }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);

            if (btns.length > 0) {
                btns[0].click();
                return true;
            }
            return false;
        }""")
    except Exception:
        return False


def select_reference_image_from_chatgpt_library(page, ref_img_path: Path) -> bool:
    """
    Exact workflow from your 3 screenshots (48209f87.png, 100625.jpg, edited-image_2.png):
      1. Click '+' button in 'Ask ChatGPT' prompt bar.
      2. Click 'Add from library' ('Browse and search your files').
      3. In 'Add from Library' modal, click 'Search Library' input box & type image name.
      4. Click the matching image row / right-side select tick circle (○ -> ✓) until 'Add to chat' appears.
      5. Click 'Add to chat' button!
    """
    img_stem = ref_img_path.stem.strip()
    clean_stem = re.sub(r"\([^)]*\)", "", img_stem).strip()

    print(f"   -> [Library Reuse] '{ref_img_path.name}' is account mein pehle upload ho chuki hai! Opening '+' -> 'Add from library'...")

    # Step 1: Click '+' icon in prompt bar
    if not click_chatgpt_composer_plus_button(page):
        print("   -> [Library Note] Prompt bar ka '+' button nahi mila.")
        return False
    time.sleep(1.5)

    # Step 2: Click 'Add from library'
    clicked_lib = False
    for sel in [
        "[role='menuitem']:has-text('Add from library')",
        "button:has-text('Add from library')",
        "div[role='button']:has-text('Add from library')",
    ]:
        try:
            item = page.locator(sel).first
            if item.is_visible(timeout=2000):
                # Check if disabled (greyed out when library is empty)
                is_disabled = item.get_attribute("aria-disabled") == "true" or item.get_attribute("disabled") is not None
                if is_disabled:
                    print("   -> [Library Note] 'Add from library' abhi greyed-out (empty) hai, computer se upload karenge.")
                    page.keyboard.press("Escape")
                    time.sleep(0.5)
                    return False
                item.click()
                clicked_lib = True
                break
        except Exception:
            continue

    if not clicked_lib:
        clicked_lib = page.evaluate("""() => {
            const els = Array.from(document.querySelectorAll('[role="menuitem"], button, [role="button"], div, span'));
            for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width === 0 || r.height === 0 || r.height > 80) continue;
                const txt = (el.innerText || '').trim().toLowerCase();
                if (txt.startsWith('add from library')) {
                    if (el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled')) return false;
                    el.click();
                    return true;
                }
            }
            return false;
        }""")

    if not clicked_lib:
        print("   -> [Library Note] 'Add from library' option click nahi ho paya.")
        try:
            page.keyboard.press("Escape")
        except Exception:
            pass
        return False

    print("   -> 'Add from Library' modal khul gaya! Searching image name...")
    time.sleep(2.0)

    # Step 3: Search the image name in 'Search Library'
    search_box = page.locator("input[placeholder*='Search Library' i], input[placeholder*='Search' i]").first
    search_queries = [img_stem]
    if clean_stem and clean_stem.lower() != img_stem.lower():
        search_queries.append(clean_stem)

    for query in search_queries:
        try:
            if search_box.is_visible(timeout=2500):
                search_box.click()
                time.sleep(0.3)
                page.keyboard.press("Control+A")
                page.keyboard.press("Backspace")
                page.keyboard.insert_text(query)
                time.sleep(1.8)
        except Exception:
            pass

        # Step 4: Find matching row in 'Add from Library' modal and click its select tick (○ -> ✓)
        row_info = page.evaluate("""(targetQuery) => {
            const qLower = targetQuery.toLowerCase().trim();
            const qWords = qLower.replace(/[^a-z0-9]+/g, ' ').trim().split(/\\s+/).filter(w => w.length > 2);

            const dialogs = Array.from(document.querySelectorAll('[role="dialog"], dialog')).filter(d => {
                const r = d.getBoundingClientRect();
                return r.width > 250 && r.height > 200;
            });
            const root = dialogs.length > 0 ? dialogs[dialogs.length - 1] : document.body;

            // Find all candidate item rows inside the modal list (below 'Search Library' input)
            const allEls = Array.from(root.querySelectorAll('div, li, button, [role="option"], [role="button"], label'));
            const candidateRows = [];

            for (const el of allEls) {
                const r = el.getBoundingClientRect();
                // Each row in Screenshot 100625.jpg is ~400-650px wide and ~42-78px tall
                if (r.width < 260 || r.height < 36 || r.height > 85) continue;
                const txt = (el.innerText || '').trim();
                if (!txt || txt.toLowerCase().includes('search library') || txt.toLowerCase().includes('add from library')) continue;
                const lowerTxt = txt.toLowerCase();

                const exactMatch = lowerTxt.includes(qLower);
                const wordMatch = qWords.length > 0 && qWords.every(w => lowerTxt.includes(w));
                if (exactMatch || wordMatch) {
                    candidateRows.push({
                        el: el,
                        rect: r,
                        text: txt.split('\\n')[0],
                        area: r.width * r.height
                    });
                }
            }

            if (candidateRows.length === 0) return null;

            // Pick the topmost matching row (most recent upload, e.g. '(3)')
            candidateRows.sort((a, b) => a.rect.top - b.rect.top || b.rect.width - a.rect.width);
            const best = candidateRows[0];
            best.el.click();

            return {
                text: best.text,
                centerX: best.rect.left + best.rect.width / 2,
                centerY: best.rect.top + best.rect.height / 2,
                tickX: best.rect.right - 26,
                tickY: best.rect.top + best.rect.height / 2
            };
        }""", query)

        if row_info:
            print(f"   -> Found in Library: '{row_info['text']}'! Clicking select tick (✓)...")
            time.sleep(0.8)

            # Check if 'Add to chat' button is already visible; if not, click the right-side circular tick (○)
            add_to_chat_btn = page.locator("button:has-text('Add to chat'), [role='button']:has-text('Add to chat')").first
            if not add_to_chat_btn.is_visible(timeout=800):
                try:
                    page.mouse.click(row_info["tickX"], row_info["tickY"])
                    time.sleep(1.0)
                except Exception:
                    pass

            if not add_to_chat_btn.is_visible(timeout=800):
                try:
                    page.mouse.click(row_info["centerX"], row_info["centerY"])
                    time.sleep(1.0)
                except Exception:
                    pass

            # Step 5: Click 'Add to chat' button (as shown in edited-image_2.png)
            if add_to_chat_btn.is_visible(timeout=2500):
                add_to_chat_btn.click()
                print(f"   -> [Library Success!] Clicked 'Add to chat' for '{row_info['text']}'!")
                time.sleep(2.5)
                return True

            clicked_add_js = page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button, [role="button"]'));
                const btn = btns.find(b => {
                    const r = b.getBoundingClientRect();
                    return r.width > 0 && r.height > 0 && (b.innerText || '').trim().toLowerCase() === 'add to chat';
                });
                if (btn) {
                    btn.click();
                    return true;
                }
                return false;
            }""")
            if clicked_add_js:
                print(f"   -> [Library Success!] Clicked 'Add to chat' for '{row_info['text']}'!")
                time.sleep(2.5)
                return True

    print("   -> [Library Note] Image Library mein nahi mili, modal band karke computer se upload karenge...")
    try:
        page.keyboard.press("Escape")
        time.sleep(0.8)
    except Exception:
        pass
    return False


def upload_reference_image_to_chatgpt(page, ref_img_path: Path, already_uploaded_in_acc: bool = False) -> bool:
    """
    - Agar `already_uploaded_in_acc == True` hai (yaani same account mein yeh image
      ek baar upload ho chuki hai), toh pehle '+' -> 'Add from library' -> Search ->
      Select Tick (✓) -> 'Add to chat' karega!
    - Agar pehli baar hai (ya Library mein nahi mili), toh computer se upload karega!
    """
    if already_uploaded_in_acc:
        if select_reference_image_from_chatgpt_library(page, ref_img_path):
            return True

    resolved_ref = str(ref_img_path.resolve())
    print(f"   -> [Character Upload] Uploading reference image '{ref_img_path.name}' from computer to ChatGPT...")

    try:
        file_inputs = page.locator("input[type='file']")
        if file_inputs.count() > 0:
            file_inputs.first.set_input_files(resolved_ref, timeout=10000)
            print(f"   -> '{ref_img_path.name}' attached! Waiting 6s for upload to complete...")
            time.sleep(6)
            return True
    except Exception:
        pass

    try:
        if click_chatgpt_composer_plus_button(page):
            time.sleep(1.2)
            if page.locator("input[type='file']").count() > 0:
                page.locator("input[type='file']").first.set_input_files(resolved_ref, timeout=10000)
                print(f"   -> '{ref_img_path.name}' attached! Waiting 6s for upload to complete...")
                time.sleep(6)
                return True

            add_photos_item = page.locator(
                "[role='menuitem']:has-text('Add photos'), button:has-text('Add photos'), div:has-text('Add photos & files')"
            ).first
            if add_photos_item.is_visible(timeout=2500):
                with page.expect_file_chooser(timeout=10000) as fc_info:
                    add_photos_item.click()
                fc_info.value.set_files(resolved_ref)
                print(f"   -> '{ref_img_path.name}' selected via 'Add photos & files'! Waiting 6s...")
                time.sleep(6)
                return True
    except Exception as e:
        print(f"   -> [Character Upload Note] {e}")

    return False


def type_and_send_chatgpt_prompt(
    page, prompt_text: str, ref_img_path: Path = None, uploaded_refs_in_curr_acc: set = None
) -> int:
    """
    1. Agar reference image (`OLD CHANGEZ KHAN` etc.) hai:
       - Check karta hai ki kya is current account mein yeh image pehle upload ho chuki hai
         (`ref_key in uploaded_refs_in_curr_acc`).
       - Agar haan, toh `+` -> `Add from library` -> Search -> Tick -> `Add to chat` karta hai!
       - Agar nahi (pehli baar hai), toh computer se upload karta hai aur `uploaded_refs_in_curr_acc`
         mein save kar leta hai taaki agli baar Library se hi le!
    2. Image attach hone ke baad `prev_img_count = count_large_images(page)` leta hai.
    3. Prompt send karta hai aur `prev_img_count` return karta hai!
    """
    for dismiss_sel in ["button:has-text('Stay logged in')", "button:has-text('Okay')", "button:has-text('Dismiss')"]:
        try:
            btn = page.locator(dismiss_sel).first
            if btn.is_visible(timeout=800):
                btn.click()
                time.sleep(0.8)
        except Exception:
            pass

    if ref_img_path is not None and ref_img_path.exists():
        ref_key = ref_img_path.name.lower()
        already_in_acc = uploaded_refs_in_curr_acc is not None and (ref_key in uploaded_refs_in_curr_acc)
        attached_ok = upload_reference_image_to_chatgpt(page, ref_img_path, already_uploaded_in_acc=already_in_acc)
        if attached_ok and uploaded_refs_in_curr_acc is not None:
            uploaded_refs_in_curr_acc.add(ref_key)

    selectors = [
        "div#prompt-textarea[contenteditable='true']",
        "#prompt-textarea",
        "div.ProseMirror[contenteditable='true']",
        "textarea[placeholder]",
        "[contenteditable='true']",
    ]
    box = None
    for sel in selectors:
        loc = page.locator(sel).first
        try:
            if loc.is_visible(timeout=4000):
                box = loc
                break
        except Exception:
            continue

    if box is None:
        raise RuntimeError("ChatGPT prompt box not found on screen")

    box.click()
    time.sleep(0.4)
    page.keyboard.press("Control+A")
    page.keyboard.press("Backspace")
    page.keyboard.insert_text(prompt_text)
    time.sleep(0.4)
    page.keyboard.type(" ")
    time.sleep(1.0)

    # Count existing large images right before clicking Send!
    prev_img_count = count_large_images(page)

    send_selectors = [
        "button[data-testid='send-button']",
        "button[aria-label*='Send']",
        "form button[type='submit']",
    ]
    for _ in range(25):
        for s_sel in send_selectors:
            s_btn = page.locator(s_sel).first
            try:
                if s_btn.is_visible(timeout=500) and s_btn.is_enabled():
                    s_btn.click()
                    return prev_img_count
            except Exception:
                continue
        time.sleep(1)

    page.keyboard.press("Enter")
    return prev_img_count


def try_download_created_image(page, img_path: Path, prev_img_count: int) -> bool:
    if is_still_creating_image(page):
        return False

    curr_large = count_large_images(page)
    if curr_large <= prev_img_count:
        return False

    # TARIKA 1: Exact v15 Direct Fetch from `main img, article img`!
    try:
        b64_data = page.evaluate("""async () => {
            const imgs = Array.from(document.querySelectorAll('main img, article img'))
                .filter(img => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 200);
            if (imgs.length === 0) return null;
            const lastImg = imgs[imgs.length - 1];
            try {
                const resp = await fetch(lastImg.src);
                const blob = await resp.blob();
                if (blob.size < 10000) return null;
                return await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                return null;
            }
        }""")
        if b64_data:
            raw_bytes = base64.b64decode(b64_data)
            if len(raw_bytes) > 10000:
                with open(img_path, "wb") as f:
                    f.write(raw_bytes)
                if img_path.exists() and img_path.stat().st_size > 10000:
                    return True
    except Exception:
        pass

    # TARIKA 2 (From Screenshot 202022.jpg): Click image -> Lightbox -> Top-right '↓' button!
    try:
        clicked_img = page.evaluate("""() => {
            const imgs = Array.from(document.querySelectorAll('main img, article img'))
                .filter(img => img.complete && img.naturalWidth >= 200 && img.naturalHeight >= 200);
            if (imgs.length === 0) return false;
            imgs[imgs.length - 1].click();
            return true;
        }""")
        if clicked_img:
            time.sleep(1.5)
            dl_btn_coords = page.evaluate("""() => {
                const btns = Array.from(document.querySelectorAll('button, a, [role="button"]'));
                for (const b of btns) {
                    const r = b.getBoundingClientRect();
                    if (r.width === 0 || r.height === 0) continue;
                    const a = (b.getAttribute('aria-label') || b.getAttribute('title') || '').toLowerCase();
                    if (a.includes('download')) {
                        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                    }
                }
                const shareBtn = btns.find(b => {
                    const r = b.getBoundingClientRect();
                    return r.top < 200 && r.left > window.innerWidth * 0.7 && (b.innerText || '').trim().toLowerCase().includes('share');
                });
                if (shareBtn) {
                    const sRect = shareBtn.getBoundingClientRect();
                    const leftOfShare = btns.filter(b => {
                        if (b === shareBtn) return false;
                        const r = b.getBoundingClientRect();
                        return r.width >= 20 && Math.abs(r.top - sRect.top) < 30 && r.left < sRect.left && (sRect.left - r.left) < 100;
                    }).sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
                    if (leftOfShare.length > 0) {
                        const dlBtn = leftOfShare[leftOfShare.length - 1];
                        const r = dlBtn.getBoundingClientRect();
                        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
                    }
                }
                return null;
            }""")
            if dl_btn_coords:
                before_dl = set(DOWNLOADS_DIR.glob("*")) if DOWNLOADS_DIR.exists() else set()
                try:
                    with page.expect_download(timeout=30000) as dl_info:
                        page.mouse.click(dl_btn_coords["x"], dl_btn_coords["y"])
                    dl = dl_info.value
                    dl.save_as(str(img_path))
                except Exception:
                    time.sleep(3)
                    if DOWNLOADS_DIR.exists():
                        after_dl = set(DOWNLOADS_DIR.glob("*"))
                        new_files = [f for f in (after_dl - before_dl) if f.is_file() and not f.name.endswith(".crdownload") and f.stat().st_size > 5000]
                        if new_files:
                            newest = max(new_files, key=lambda f: f.stat().st_mtime)
                            shutil.move(str(newest), str(img_path))

                page.keyboard.press("Escape")
                time.sleep(0.8)
                if img_path.exists() and img_path.stat().st_size > 10000:
                    return True
            else:
                page.keyboard.press("Escape")
                time.sleep(0.5)
    except Exception:
        pass

    # TARIKA 3: Exact v15 Direct Element Screenshot Fallback
    try:
        imgs = page.locator("article img, main img")
        count = imgs.count()
        for i in range(count - 1, -1, -1):
            el = imgs.nth(i)
            box = el.bounding_box()
            if box and box["width"] >= 200 and box["height"] >= 200:
                el.screenshot(path=str(img_path))
                if img_path.exists() and img_path.stat().st_size > 10000:
                    return True
    except Exception:
        pass

    return False


# ====================================================================
# 7. MASTER CHATGPT IMAGE PIPELINE
# ====================================================================

def run_chatgpt_image_bot(scenes, source_name="PDF", stealth_mode=False):
    print("\n========================================================")
    print("   BOT 1: CHATGPT IMAGE GENERATOR & DOWNLOADER SHURU (v20)")
    print("========================================================")

    set_keep_awake(True, allow_screen_off=stealth_mode)
    if stealth_mode:
        print("[Stealth Mode ON] Chrome chhupa kar chalega aur 5 second mein Laptop Screen OFF ho jayegi!")
        print("                  (Screen wapas jalane ke liye bas mouse hilayein ya koi key dabayein)")

    account_folders = get_account_folders()
    acc_idx = 0
    imgs_made_in_curr_acc = 0
    # Tracks which character reference images have already been uploaded in the current ChatGPT account!
    uploaded_refs_in_curr_acc = set()

    completed_scenes = []
    skipped_scenes = []

    with sync_playwright() as p:
        context = None
        page = None

        try:
            for scene in scenes:
                scene_no = scene["scene_no"]
                img_path = get_scene_image_path(scene_no)

                if img_path.exists() and img_path.stat().st_size > 10000:
                    print(f"\n[Skip - Already Exists] Scene {scene_no:02d} ki image pehle se folder mein hai: {img_path.name}")
                    completed_scenes.append(scene_no)
                    continue

                ref_img_path, ref_char_name = detect_reference_image_for_prompt(scene["image_prompt"])
                if ref_char_name:
                    if ref_img_path:
                        mode_lbl = (
                            "Add from Library"
                            if ref_img_path.name.lower() in uploaded_refs_in_curr_acc
                            else "First-Time Computer Upload"
                        )
                        print(f"\n[Character Reference Detected] '{ref_char_name}' -> File: '{ref_img_path.name}' ({mode_lbl})")
                    else:
                        print(f"\n[Warning] Prompt mein 'USE UPLOADED IMAGE AS {ref_char_name}' likha hai, lekin '{BASE_DIR}' folder mein '{ref_char_name}' naam ki image nahi mili!")

                while acc_idx < len(account_folders):
                    acc_folder = account_folders[acc_idx]

                    if context is None:
                        print(f"\n========================================================")
                        print(f"   OPENING CHROME FOR {acc_folder.name}")
                        print(f"========================================================")
                        # Reset library tracker when opening a new account!
                        uploaded_refs_in_curr_acc.clear()

                        chrome_args = ["--disable-blink-features=AutomationControlled"]
                        if stealth_mode:
                            chrome_args += ["--window-position=-3200,-3200", "--window-size=1920,1080"]
                        else:
                            chrome_args += ["--start-maximized"]

                        context = p.chromium.launch_persistent_context(
                            user_data_dir=str(acc_folder),
                            channel="chrome",
                            headless=False,
                            args=chrome_args,
                            ignore_default_args=["--no-sandbox"],
                            no_viewport=True,
                            accept_downloads=True,
                        )
                        page = context.pages[0] if context.pages else context.new_page()
                        page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)
                        time.sleep(6)

                        if stealth_mode:
                            turn_off_laptop_screen()
                    else:
                        print(f"\n[New Chat] Scene {scene_no:02d} ke liye 'New chat' khol rahe hain ({acc_folder.name})...")
                        open_new_chat_in_chatgpt(page)
                        if stealth_mode:
                            turn_off_laptop_screen()

                    print(f"[Scene {scene_no:02d}] Prompt bheja ja raha hai ({acc_folder.name}, Images made on this account: {imgs_made_in_curr_acc})...")
                    print(f"   Prompt: {scene['image_prompt'][:75]}...")

                    try:
                        prev_img_count = type_and_send_chatgpt_prompt(
                            page,
                            f"Create an image: {scene['image_prompt']}",
                            ref_img_path,
                            uploaded_refs_in_curr_acc,
                        )
                    except Exception:
                        page.goto(CHATGPT_URL, wait_until="domcontentloaded", timeout=60000)
                        time.sleep(5)
                        prev_img_count = type_and_send_chatgpt_prompt(
                            page,
                            f"Create an image: {scene['image_prompt']}",
                            ref_img_path,
                            uploaded_refs_in_curr_acc,
                        )

                    print(f"   -> Waiting in this chat until Scene {scene_no:02d} image is created & downloaded...")
                    time.sleep(10)

                    limit_hit = False
                    scene_saved = False
                    refusal_reason = ""

                    for tick in range(60):
                        if check_chatgpt_limit_reached(page):
                            print(f"\n   [Limit Reached!] {acc_folder.name} par image limit khatam hone ka message aa gaya!")
                            print(f"   -> Switching to next account for Scene {scene_no:02d}...")
                            context.close()
                            context = None
                            page = None
                            acc_idx += 1
                            imgs_made_in_curr_acc = 0
                            uploaded_refs_in_curr_acc.clear()
                            limit_hit = True
                            break

                        refusal_reason = check_chatgpt_generation_refusal(page)
                        if refusal_reason:
                            print(f"   [SCENE DROPPED] Scene {scene_no:02d} refused: {refusal_reason}")
                            break

                        if try_download_created_image(page, img_path, prev_img_count):
                            imgs_made_in_curr_acc += 1
                            completed_scenes.append(scene_no)
                            print(f"   [IMAGE DOWNLOADED & SAVED!] '{img_path.name}' saved in 'output_images' folder! (Total from {acc_folder.name}: {imgs_made_in_curr_acc})")
                            scene_saved = True
                            break

                        if tick % 5 == 0 and tick > 0:
                            print(f"      ... Still waiting for Scene {scene_no:02d} image to finish creating ({tick * 4}s elapsed)...")

                        time.sleep(4)

                    if limit_hit:
                        continue

                    if scene_saved:
                        break

                    reason_str = refusal_reason or "Slow Network Timeout: 4 minute mein image download nahi ho payi"
                    skipped_scenes.append({
                        "scene_no": scene_no,
                        "stage": "ChatGPT Image Generation",
                        "reason": reason_str,
                        "image_prompt": scene["image_prompt"],
                    })
                    print(f"---> Scene {scene_no:02d} added to Drop List ({reason_str}). Moving to next scene...")
                    break
                else:
                    print("\n[STOP] Saare ChatGPT accounts par Limit Reached message aa chuka hai!")
                    break

        finally:
            set_keep_awake(False)
            if context is not None:
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
            skipped_scenes.append({
                "scene_no": s_no,
                "stage": "ChatGPT Image Generation",
                "reason": "Output mein image nahi aayi (Policy Violation / Limit Reached)",
                "image_prompt": s["image_prompt"],
            })
            already_skipped_nums.add(s_no)

    skipped_scenes.sort(key=lambda x: x["scene_no"])
    dropped_scene_numbers = [item["scene_no"] for item in skipped_scenes]

    # ================================================================
    # FINAL SUMMARY REPORT
    # ================================================================
    print("\n" + "=" * 60)
    print("   FINAL CHATGPT IMAGE GENERATION REPORT (ITIHASKAR SAMAY)")
    print("=" * 60)
    print(f"Source File               : {source_name}")
    print(f"Saved Images Folder       : {IMAGES_DIR}")
    print(f"Total Scenes Requested    : {len(scenes)} -> {[s['scene_no'] for s in scenes]}")
    print(f"Successfully Downloaded   : {len(completed_scenes)} Images -> {sorted(completed_scenes)}")
    print(f"Dropped / Skipped Scenes  : {len(skipped_scenes)} Scenes ({len(scenes)} - {len(completed_scenes)}) -> {dropped_scene_numbers}")
    print("-" * 60)

    report_lines = [
        "============================================================",
        "ITIHASKAR SAMAY - BOT 1 (CHATGPT IMAGE BOT) REPORT",
        f"Source File: {source_name} | Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        "============================================================",
        f"Total Scenes Requested  : {len(scenes)} -> {[s['scene_no'] for s in scenes]}",
        f"Successfully Downloaded : {len(completed_scenes)} Images -> {sorted(completed_scenes)}",
        f"Dropped / Skipped Scenes: {len(skipped_scenes)} Scenes ({len(scenes)} - {len(completed_scenes)}) -> {dropped_scene_numbers}",
        "",
    ]

    if not skipped_scenes:
        print("Badhai ho! Saari images safaltapoorvak 'output_images' folder mein Scene_XX.png naam se save ho gayi hain!")
        report_lines.append("All requested scene images were generated and downloaded successfully!")
    else:
        print("\nNEECHE DIYE GAYE SCENES DROP HUYE HAIN:")
        for item in skipped_scenes:
            line = (
                f"\n[Scene {item['scene_no']:02d}] Dropped at: {item['stage']}\n"
                f"   Reason       : {item['reason']}\n"
                f"   Image Prompt : {item['image_prompt']}"
            )
            print(line)
            report_lines.append(line)

    with open(REPORT_FILE, "w", encoding="utf-8") as rf:
        rf.write("\n".join(report_lines))

    print("\n" + "=" * 60)
    print(f"Report saved to: '{REPORT_FILE.name}'")
    print("=" * 60 + "\n")


# ====================================================================
# 8. INTERACTIVE MENU
# ====================================================================

def main():
    while True:
        print("\n========================================================")
        print("   ITIHASKAR SAMAY - BOT 1: CHATGPT IMAGE BOT (v20)")
        print("========================================================")
        print("1. ChatGPT Accounts Setup Karein (7 Accounts Login - Pehli Baar)")
        print("2. PDF Chunein & Images Download Karein (Library Reuse + v15 Download + Stealth)")
        print("3. Exit (Bahar Niklein)")
        print("========================================================")

        choice = input("Apna option chunein (1/2/3): ").strip()

        if choice == "1":
            setup_accounts_interactively()
        elif choice == "2":
            scenes, source_name, stealth_mode = select_and_load_scenes()
            if not scenes:
                print("\n[Error] Folder mein koi PDF file nahi mili!")
                print(f"Kripya apni PDF files (jaise 'Changez_Khan_Scenes_162-191.pdf') ko '{BASE_DIR}' folder mein rakhein.")
                continue
            run_chatgpt_image_bot(scenes, source_name, stealth_mode)
        elif choice == "3":
            print("Alvida! Jab saari images download ho jayein, tab Flow AI Video Bot chalayenge!")
            break
        else:
            print("Galat option! Kripya 1, 2, ya 3 dabayein.")


if __name__ == "__main__":
    main()