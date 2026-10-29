import { ParsedScene } from './botEngine';
import { formatSceneImageName } from './botEngine';

export interface GeneratedSceneImage {
  sceneNo: number;
  fileName: string;
  accountUsed: string;
  createdAt: string;
  sizeBytes: number;
  dataUrl: string;
  chatUrl: string;
  imagePrompt: string;
  referenceCharUsed?: string;
  attachmentMode?: 'First-Time Computer Upload' | 'Add from Library' | 'None';
}

export interface GeneratedSceneVideo {
  sceneNo: number;
  fileName: string;
  sourceImageName: string;
  accountUsed: string;
  createdAt: string;
  status: 'BANA (YES)' | 'NAHI BANA (NO)';
  reason: string;
  videoPrompt: string;
  creditsBefore: number;
  creditsAfter: number;
}

/**
 * Renders a realistic 16:9 documentary storyboard frame as a PNG Data URL for `output_images/Scene_XX.png`
 */
export function renderScenePngDataUrl(scene: ParsedScene, accountName: string): {
  dataUrl: string;
  sizeBytes: number;
} {
  if (typeof document === 'undefined') {
    return { dataUrl: '', sizeBytes: 48200 };
  }

  const canvas = document.createElement('canvas');
  canvas.width = 960;
  canvas.height = 540;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return { dataUrl: '', sizeBytes: 48200 };
  }

  const promptLower = scene.imagePrompt.toLowerCase();

  // Select atmospheric documentary color grading based on prompt keywords
  let gradTop = '#0c1322';
  let gradMid = '#1e293b';
  let gradBot = '#3b2818';
  let accentGlow = '#f59e0b';

  if (promptLower.includes('dusk') || promptLower.includes('purple')) {
    gradTop = '#1e1035';
    gradMid = '#4c1d4b';
    gradBot = '#9a3412';
    accentGlow = '#fb923c';
  } else if (promptLower.includes('blue energy') || promptLower.includes('blue light') || promptLower.includes('water')) {
    gradTop = '#061224';
    gradMid = '#0c2d48';
    gradBot = '#0f172a';
    accentGlow = '#38bdf8';
  } else if (promptLower.includes('dawn') || promptLower.includes('sunrise') || promptLower.includes('golden')) {
    gradTop = '#1c1917';
    gradMid = '#78350f';
    gradBot = '#b45309';
    accentGlow = '#fcd34d';
  } else if (promptLower.includes('shaft') || promptLower.includes('chamber') || promptLower.includes('lantern')) {
    gradTop = '#09090b';
    gradMid = '#1c1917';
    gradBot = '#292524';
    accentGlow = '#f59e0b';
  }

  const bgGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGrad.addColorStop(0, gradTop);
  bgGrad.addColorStop(0.58, gradMid);
  bgGrad.addColorStop(1, gradBot);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Subtle radial cinematic key light
  const radGrad = ctx.createRadialGradient(
    canvas.width * 0.55,
    canvas.height * 0.42,
    20,
    canvas.width * 0.55,
    canvas.height * 0.42,
    380
  );
  radGrad.addColorStop(0, accentGlow + '44');
  radGrad.addColorStop(0.6, accentGlow + '12');
  radGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = radGrad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Architectural / Documentary Silhouette Geometry
  ctx.save();
  ctx.strokeStyle = accentGlow + '40';
  ctx.lineWidth = 1.5;

  if (promptLower.includes('pyramid')) {
    // Draw Giza Pyramid silhouette / cross-section
    ctx.beginPath();
    ctx.moveTo(480, 110);
    ctx.lineTo(220, 410);
    ctx.lineTo(740, 410);
    ctx.closePath();
    ctx.fillStyle = '#09090b88';
    ctx.fill();
    ctx.stroke();

    if (promptLower.includes('cutaway') || promptLower.includes('shaft')) {
      // Internal shafts and chambers
      ctx.strokeStyle = accentGlow + 'aa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(480, 290);
      ctx.lineTo(330, 210);
      ctx.moveTo(480, 290);
      ctx.lineTo(630, 210);
      ctx.moveTo(480, 345);
      ctx.lineTo(360, 285);
      ctx.moveTo(480, 345);
      ctx.lineTo(600, 285);
      ctx.stroke();

      ctx.fillStyle = accentGlow;
      ctx.fillRect(464, 280, 32, 22);
      ctx.fillRect(468, 336, 24, 18);
    }
  } else {
    // Cinematic frame grid & light beam
    ctx.beginPath();
    ctx.moveTo(160, 90);
    ctx.lineTo(800, 90);
    ctx.lineTo(800, 410);
    ctx.lineTo(160, 410);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();

  // Letterbox bars & metadata overlay
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)';
  ctx.fillRect(0, 0, canvas.width, 54);
  ctx.fillRect(0, canvas.height - 110, canvas.width, 110);

  // Top Header Text
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 18px monospace';
  const fileName = formatSceneImageName(scene.sceneNo);
  ctx.fillText(`ITIHASKAR SAMAY  ·  ${fileName}`, 28, 34);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '14px monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`16:9 HD  ·  ${accountName}`, canvas.width - 28, 34);

  // Bottom Prompt & Screenplay Excerpt
  ctx.textAlign = 'left';
  ctx.fillStyle = accentGlow;
  ctx.font = 'bold 15px sans-serif';
  const lineText = scene.sceneLine
    ? `SCENE ${scene.sceneNo}: "${scene.sceneLine.slice(0, 86)}"`
    : `SCENE ${scene.sceneNo}`;
  ctx.fillText(lineText, 28, canvas.height - 76);

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '13px sans-serif';
  const promptExcerpt1 = scene.imagePrompt.slice(0, 108);
  const promptExcerpt2 = scene.imagePrompt.slice(108, 216);
  ctx.fillText(promptExcerpt1, 28, canvas.height - 48);
  if (promptExcerpt2) {
    ctx.fillText(
      promptExcerpt2 + (scene.imagePrompt.length > 216 ? '...' : ''),
      28,
      canvas.height - 26
    );
  }

  const dataUrl = canvas.toDataURL('image/png');
  const sizeBytes = Math.round((dataUrl.length * 3) / 4);
  return { dataUrl, sizeBytes: Math.max(sizeBytes, 38400) };
}

/**
 * Generates initial pre-populated `output_images/Scene_XX.png` and `output_videos` records
 * matching the user's attached `Great_Pyramid_Part2_Scenes_41-80.pdf` reports so the user
 * immediately sees their exact Scenes 41-80 status and can test deleting all images or running new batches!
 */
export function buildInitialSeedMedia(scenes41to80: ParsedScene[]): {
  initialImages: GeneratedSceneImage[];
  initialVideos: GeneratedSceneVideo[];
} {
  const initialImages: GeneratedSceneImage[] = [];
  const initialVideos: GeneratedSceneVideo[] = [];

  // In user's report: Scenes 41-80 except Scene 73 had images downloaded
  const flowAcc1 = new Set([41, 42, 43]);
  const flowAcc2 = new Set([44, 45, 46, 47, 48]);
  const flowNoRender = new Set([51, 52, 53, 57, 61]);
  const flowPolicyErr = new Set([74, 75, 76]);

  for (const sc of scenes41to80) {
    if (sc.sceneNo === 73) {
      continue; // Dropped at ChatGPT Image Generation in user's report
    }
    const accIdx = Math.min(7, Math.floor((sc.sceneNo - 41) / 6) + 1);
    const chatAcc = `Account_${accIdx}`;
    const fileName = formatSceneImageName(sc.sceneNo);
    const rendered = renderScenePngDataUrl(sc, chatAcc);

    initialImages.push({
      sceneNo: sc.sceneNo,
      fileName,
      accountUsed: chatAcc,
      createdAt: '2026-10-27 12:20:00',
      sizeBytes: rendered.sizeBytes,
      dataUrl: rendered.dataUrl,
      chatUrl: `https://chatgpt.com/c/6ad1b181-6ec8-83ec-b756-72fbad415c${sc.sceneNo}`,
      imagePrompt: sc.imagePrompt,
      referenceCharUsed: sc.referenceCharName,
      attachmentMode: sc.referenceCharName ? 'Add from Library' : 'None',
    });

    if (flowAcc1.has(sc.sceneNo)) {
      initialVideos.push({
        sceneNo: sc.sceneNo,
        fileName: `Scene_${sc.sceneNo}.mp4`,
        sourceImageName: fileName,
        accountUsed: 'Flow_Account_1',
        createdAt: '2026-10-27 14:10:00',
        status: 'BANA (YES)',
        reason: `Image: ${fileName} (Verified Created)`,
        videoPrompt: sc.videoPrompt,
        creditsBefore: 60 - (sc.sceneNo - 41) * 20,
        creditsAfter: 40 - (sc.sceneNo - 41) * 20,
      });
    } else if (flowAcc2.has(sc.sceneNo)) {
      initialVideos.push({
        sceneNo: sc.sceneNo,
        fileName: `Scene_${sc.sceneNo}.mp4`,
        sourceImageName: fileName,
        accountUsed: 'Flow_Account_2',
        createdAt: '2026-10-27 14:18:00',
        status: 'BANA (YES)',
        reason: `Image: ${fileName} (Verified Created)`,
        videoPrompt: sc.videoPrompt,
        creditsBefore: 100 - (sc.sceneNo - 44) * 20,
        creditsAfter: 80 - (sc.sceneNo - 44) * 20,
      });
    } else if (flowNoRender.has(sc.sceneNo)) {
      initialVideos.push({
        sceneNo: sc.sceneNo,
        fileName: '',
        sourceImageName: fileName,
        accountUsed: '---',
        createdAt: '2026-10-27 14:22:00',
        status: 'NAHI BANA (NO)',
        reason:
          'Video nahi bana (Na rendering chali aur na naya video card aaya)',
        videoPrompt: sc.videoPrompt,
        creditsBefore: 460,
        creditsAfter: 460,
      });
    } else if (flowPolicyErr.has(sc.sceneNo)) {
      initialVideos.push({
        sceneNo: sc.sceneNo,
        fileName: '',
        sourceImageName: fileName,
        accountUsed: '---',
        createdAt: '2026-10-27 14:28:00',
        status: 'NAHI BANA (NO)',
        reason: 'Flow AI Rejected Video Prompt (Policy Violation)',
        videoPrompt: sc.videoPrompt,
        creditsBefore: 120,
        creditsAfter: 120,
      });
    } else {
      initialVideos.push({
        sceneNo: sc.sceneNo,
        fileName: `Scene_${sc.sceneNo}.mp4`,
        sourceImageName: fileName,
        accountUsed: 'Flow_Account_3',
        createdAt: '2026-10-27 14:30:00',
        status: 'BANA (YES)',
        reason: `Image: ${fileName} (Verified Created)`,
        videoPrompt: sc.videoPrompt,
        creditsBefore: 500,
        creditsAfter: 480,
      });
    }
  }

  return { initialImages, initialVideos };
}
