export interface ParsedScene {
  sceneNo: number;
  sceneLine: string;
  screenplay: string;
  imagePrompt: string;
  videoPrompt: string;
  referenceCharName?: string;
  referenceImageFile?: string | null;
}

export interface SkippedChatGptScene {
  sceneNo: number;
  stage: string;
  reason: string;
  imagePrompt: string;
}

export interface SkippedFlowScene {
  sceneNo: number;
  imgName: string;
  reason: string;
  videoPrompt: string;
}

export interface FlowReportParams {
  sourceName: string;
  dateStr: string;
  scenes: ParsedScene[];
  sceneAccountMap: Record<number, string>;
  skippedScenes: SkippedFlowScene[];
  todayExhaustedAccounts: string[];
}

export interface ChatGptReportParams {
  sourceName: string;
  dateStr: string;
  scenes: ParsedScene[];
  completedScenes: number[];
  skippedScenes: SkippedChatGptScene[];
}

/**
 * Port of `detect_reference_image_for_prompt` from `itihaskar_samay_bot.py` (v20)
 * Detects `USE UPLOADED IMAGE AS <CHAR_NAME>` in an image prompt and matches against workspace character files.
 */
export function detectReferenceImageForPrompt(
  imagePrompt: string,
  availableFiles: string[]
): { matchedFile: string | null; rawCharName: string } {
  const match = imagePrompt.match(/USE\s+UPLOADED\s+IMAGE\s+AS\s+([^.\n]+)/i);
  if (!match) {
    return { matchedFile: null, rawCharName: '' };
  }

  const rawCharName = match[1].trim();
  const cleanCharName = rawCharName.replace(/\([^)]*\)/g, '').trim();

  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();

  const targetNorm = norm(rawCharName);
  const cleanNorm = norm(cleanCharName);

  const getStemNorm = (fileName: string) => {
    const base = fileName.split('/').pop() || fileName;
    const withoutExt = base.replace(/\.[^.]+$/, '');
    // Also strip hash suffix like _fe741f17 if present
    const withoutHash = withoutExt.replace(/_[0-9a-f]{8}$/i, '');
    return norm(withoutHash);
  };

  for (const file of availableFiles) {
    const stemNorm = getStemNorm(file);
    if (
      stemNorm &&
      (stemNorm === targetNorm ||
        stemNorm === cleanNorm ||
        targetNorm.includes(stemNorm) ||
        stemNorm.includes(cleanNorm))
    ) {
      return { matchedFile: file, rawCharName };
    }
  }

  const targetWords = cleanNorm.split(/\s+/).filter((w) => w.length > 2);
  for (const file of availableFiles) {
    const stemNorm = getStemNorm(file);
    if (
      targetWords.length > 0 &&
      targetWords.slice(0, 2).every((w) => stemNorm.includes(w))
    ) {
      return { matchedFile: file, rawCharName };
    }
  }

  return { matchedFile: null, rawCharName };
}

/**
 * Port of `load_scenes_from_pdf` text regex parser from `itihaskar_samay_bot.py` (v20) & `flow_video_bot.py` (v3.0)
 */
export function parseScenesFromText(
  fullText: string,
  availableRefFiles: string[] = []
): ParsedScene[] {
  const cleanedLines: string[] = [];
  for (const line of fullText.split(/\r?\n/)) {
    if (/\|\s*Page\s*\d+/i.test(line)) {
      continue;
    }
    cleanedLines.push(line);
  }
  const cleanText = cleanedLines.join('\n');

  const pattern =
    /SCENE\s+(\d+)\s*\n([\s\S]*?)IMAGE\s+PROMPT:\s*\n([\s\S]*?)\s*\nVIDEO\s+PROMPT:\s*\n([\s\S]*?)(?=\n\s*(?:NOTE:|SCENE\s+\d+)|$)/gi;

  const scenes: ParsedScene[] = [];
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(cleanText)) !== null) {
    const sceneNo = parseInt(match[1], 10);
    const metaBlock = match[2] || '';
    const imgPrompt = match[3].replace(/\s+/g, ' ').trim();
    const vidPrompt = match[4].replace(/\s+/g, ' ').trim();

    let sceneLine = '';
    let screenplay = '';

    const sceneLineMatch = metaBlock.match(
      /SCENE\s+LINE:\s*\n([\s\S]*?)(?=SCREENPLAY:|$)/i
    );
    if (sceneLineMatch) {
      sceneLine = sceneLineMatch[1].replace(/\s+/g, ' ').trim();
    }

    const screenplayMatch = metaBlock.match(/SCREENPLAY:\s*\n([\s\S]*?)$/i);
    if (screenplayMatch) {
      screenplay = screenplayMatch[1].replace(/\s+/g, ' ').trim();
    }

    const { matchedFile, rawCharName } = detectReferenceImageForPrompt(
      imgPrompt,
      availableRefFiles
    );

    scenes.push({
      sceneNo,
      sceneLine,
      screenplay,
      imagePrompt: imgPrompt,
      videoPrompt: vidPrompt,
      referenceCharName: rawCharName || undefined,
      referenceImageFile: matchedFile,
    });
  }

  return scenes.sort((a, b) => a.sceneNo - b.sceneNo);
}

/**
 * Filters scenes inclusively between `startNo` and `endNo`.
 */
export function filterScenesByRange(
  scenes: ParsedScene[],
  startNo: number,
  endNo: number
): ParsedScene[] {
  const low = Math.min(startNo, endNo);
  const high = Math.max(startNo, endNo);
  return scenes.filter((s) => s.sceneNo >= low && s.sceneNo <= high);
}

/**
 * Determines whether a reference image should be uploaded from computer or picked via
 * ChatGPT's '+' -> 'Add from library' -> 'Search Library' -> Tick (✓) -> 'Add to chat'
 * within the same ChatGPT account.
 */
export function getCharacterAttachmentStrategy(
  refFileName: string,
  uploadedRefsInCurrentAccount: Set<string>
): 'First-Time Computer Upload' | 'Add from Library' {
  const key = refFileName.trim().toLowerCase();
  if (uploadedRefsInCurrentAccount.has(key)) {
    return 'Add from Library';
  }
  return 'First-Time Computer Upload';
}

/**
 * Port of Flow AI v3.0 3-Layer Automatic Decision (`BANA (YES)` vs `NAHI BANA (NO)`):
 * Layer 1: Explicit Policy/Generation error check
 * Layer 2: Credit deduction check (creditsAfter < creditsBefore)
 * Layer 3: Canvas card count increase or completed rendering progress cycle
 */
export function evaluateFlowVideoCreation(params: {
  detectedError: string;
  creditsBefore: number | null;
  creditsAfter: number | null;
  cardsBefore: number;
  cardsAfter: number;
  sawRenderingProgress: boolean;
}): { videoCreated: boolean; failureReason: string } {
  const {
    detectedError,
    creditsBefore,
    creditsAfter,
    cardsBefore,
    cardsAfter,
    sawRenderingProgress,
  } = params;

  if (detectedError) {
    return { videoCreated: false, failureReason: detectedError };
  }

  if (creditsBefore !== null && creditsAfter !== null) {
    if (creditsAfter < creditsBefore) {
      return { videoCreated: true, failureReason: '' };
    }
    if (creditsAfter === creditsBefore && cardsAfter <= cardsBefore) {
      return {
        videoCreated: false,
        failureReason:
          'Video nahi bana (Credits kam nahi huye / Policy Error se reject hua)',
      };
    }
    return { videoCreated: true, failureReason: '' };
  }

  if (cardsAfter > cardsBefore || sawRenderingProgress) {
    return { videoCreated: true, failureReason: '' };
  }

  return {
    videoCreated: false,
    failureReason:
      'Video nahi bana (Na rendering chali aur na naya video card aaya)',
  };
}

/**
 * Port of `load_today_exhausted_accounts` from `flow_video_bot.py` (v3.0)
 * Same-day credit memory + automatic reset on a new day.
 */
export function parseDailyCreditTracker(
  rawJson: string | null,
  todayDateStr: string
): { exhaustedAccounts: string[]; wasResetForNewDay: boolean } {
  if (!rawJson) {
    return { exhaustedAccounts: [], wasResetForNewDay: false };
  }
  try {
    const parsed = JSON.parse(rawJson);
    const savedDate = parsed?.date || '';
    if (savedDate === todayDateStr) {
      const list = Array.isArray(parsed.exhausted_accounts)
        ? parsed.exhausted_accounts.map(String)
        : [];
      return { exhaustedAccounts: list, wasResetForNewDay: false };
    }
    return { exhaustedAccounts: [], wasResetForNewDay: Boolean(savedDate) };
  } catch {
    return { exhaustedAccounts: [], wasResetForNewDay: false };
  }
}

/**
 * Formats Scene filename e.g. `Scene_01.png` or `Scene_41.png`
 */
export function formatSceneImageName(sceneNo: number): string {
  const padded = sceneNo < 10 ? `0${sceneNo}` : `${sceneNo}`;
  return `Scene_${padded}.png`;
}

/**
 * Generates the exact Flow AI v3.0 Scene & Account Status Report (`Scene_Account_Status_Report.txt`)
 */
export function generateFlowStatusReport(params: FlowReportParams): string {
  const {
    sourceName,
    dateStr,
    scenes,
    sceneAccountMap,
    skippedScenes,
    todayExhaustedAccounts,
  } = params;

  const skippedByNo = new Map<number, SkippedFlowScene>();
  for (const item of skippedScenes) {
    skippedByNo.set(item.sceneNo, item);
  }

  const completedNums = Object.keys(sceneAccountMap)
    .map(Number)
    .sort((a, b) => a - b);
  const droppedNums = Array.from(skippedByNo.keys()).sort((a, b) => a - b);

  const accountsSummary: Record<string, string[]> = {};
  for (const sNo of completedNums) {
    const accName = sceneAccountMap[sNo];
    if (!accountsSummary[accName]) {
      accountsSummary[accName] = [];
    }
    const padded = sNo < 10 ? `0${sNo}` : `${sNo}`;
    accountsSummary[accName].push(`Scene_${padded}`);
  }

  const exhaustedDisplay =
    todayExhaustedAccounts.length > 0
      ? `[${todayExhaustedAccounts.map((a) => `'${a}'`).join(', ')}]`
      : 'None (Sabhi active hain)';

  const lines: string[] = [
    '==========================================================================',
    '   ITIHASKAR SAMAY - SCENE & ACCOUNT STATUS REPORT (FLOW AI BOT v3.0)',
    '==========================================================================',
    `PDF / Source File          : ${sourceName}`,
    `Date & Time                : ${dateStr}`,
    `Total Scenes Selected      : ${scenes.length} -> [${scenes.map((s) => s.sceneNo).join(', ')}]`,
    `Total Scenes BANE (YES)    : ${completedNums.length} -> [${completedNums.join(', ')}]`,
    `Total Scenes NAHI BANE (NO): ${droppedNums.length} -> [${droppedNums.join(', ')}]`,
    `Today's Exhausted Accounts : ${exhaustedDisplay}`,
    '--------------------------------------------------------------------------',
    '   ACCOUNT-WISE SUMMARY (KIS ACCOUNT MEIN KON-KON SA SCENE BANA):',
    '--------------------------------------------------------------------------',
  ];

  const accountNames = Object.keys(accountsSummary);
  if (accountNames.length > 0) {
    for (const accName of accountNames) {
      const scList = accountsSummary[accName];
      lines.push(
        `   * ${accName.padEnd(16, ' ')} : ${scList.length} Videos -> ${scList.join(', ')}`
      );
    }
  } else {
    lines.push('   * Abhi tak kisi account mein is batch ka video nahi bana.');
  }

  lines.push(
    '',
    '--------------------------------------------------------------------------',
    '   SCENE-BY-SCENE TABLE (SCENE BANA YA NAHI + KIS ACCOUNT MEIN BANA):',
    '--------------------------------------------------------------------------',
    `   ${'SCENE'.padEnd(12, ' ')} | ${'BANA YA NAHI?'.padEnd(20, ' ')} | ${'ACCOUNT NAME'.padEnd(16, ' ')} | DETAILS / REASON`,
    '   ' + '-'.repeat(70)
  );

  for (const s of scenes) {
    const sNo = s.sceneNo;
    const padded = sNo < 10 ? `0${sNo}` : `${sNo}`;
    const imgLbl = formatSceneImageName(sNo);
    const sceneLabel = `Scene_${padded}`.padEnd(12, ' ');

    if (sceneAccountMap[sNo]) {
      const accUsed = sceneAccountMap[sNo].padEnd(16, ' ');
      lines.push(
        `   ${sceneLabel} | ${'Haan Bana (YES)'.padEnd(20, ' ')} | ${accUsed} | Image: ${imgLbl} (Verified Created)`
      );
    } else if (skippedByNo.has(sNo)) {
      const errInfo = skippedByNo.get(sNo)!;
      lines.push(
        `   ${sceneLabel} | ${'Nahi Bana (NO)'.padEnd(20, ' ')} | ${'---'.padEnd(16, ' ')} | ${errInfo.reason} (${imgLbl})`
      );
    } else {
      lines.push(
        `   ${sceneLabel} | ${'Pending...'.padEnd(20, ' ')} | ${'---'.padEnd(16, ' ')} | Waiting to process (${imgLbl})`
      );
    }
  }

  if (skippedScenes.length > 0) {
    lines.push(
      '',
      '--------------------------------------------------------------------------',
      '   DROPPED / POLICY ERROR SCENES KE VIDEO PROMPTS (JO NAHI BANE):',
      '--------------------------------------------------------------------------'
    );
    for (const item of skippedScenes) {
      const padded = item.sceneNo < 10 ? `0${item.sceneNo}` : `${item.sceneNo}`;
      lines.push(
        `\n[Scene_${padded} | Image: ${item.imgName}] -> NAHI BANA (NO)`,
        `   Reason       : ${item.reason}`,
        `   Video Prompt : ${item.videoPrompt}`
      );
    }
  } else {
    lines.push(
      '\n[100% SUCCESS] Abhi tak koi bhi scene Policy Error se drop nahi hua hai.'
    );
  }

  lines.push(
    '==========================================================================\n'
  );
  return lines.join('\n');
}

/**
 * Generates the exact ChatGPT Bot 1 Report (`skipped_scenes_report.txt`)
 */
export function generateChatGptReport(params: ChatGptReportParams): string {
  const { sourceName, dateStr, scenes, completedScenes, skippedScenes } = params;
  const sortedCompleted = [...completedScenes].sort((a, b) => a - b);
  const droppedNums = skippedScenes.map((s) => s.sceneNo).sort((a, b) => a - b);

  const lines: string[] = [
    '============================================================',
    'ITIHASKAR SAMAY - BOT 1 (CHATGPT IMAGE BOT) REPORT',
    `Source File: ${sourceName} | Date: ${dateStr}`,
    '============================================================',
    `Total Scenes Requested  : ${scenes.length} -> [${scenes.map((s) => s.sceneNo).join(', ')}]`,
    `Successfully Downloaded : ${sortedCompleted.length} Images -> [${sortedCompleted.join(', ')}]`,
    `Dropped / Skipped Scenes: ${skippedScenes.length} Scenes (${scenes.length} - ${sortedCompleted.length}) -> [${droppedNums.join(', ')}]`,
    '',
  ];

  if (skippedScenes.length === 0) {
    lines.push(
      'All requested scene images were generated and downloaded successfully!'
    );
  } else {
    for (const item of skippedScenes) {
      const padded = item.sceneNo < 10 ? `0${item.sceneNo}` : `${item.sceneNo}`;
      lines.push(
        `\n[Scene ${padded}] Dropped at: ${item.stage}`,
        `   Reason       : ${item.reason}`,
        `   Image Prompt : ${item.imagePrompt}`
      );
    }
  }

  return lines.join('\n');
}
