import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseScenesFromText,
  detectReferenceImageForPrompt,
  filterScenesByRange,
  getCharacterAttachmentStrategy,
  evaluateFlowVideoCreation,
  parseDailyCreditTracker,
  formatSceneImageName,
  generateFlowStatusReport,
  generateChatGptReport,
} from './botEngine';

test('parseScenesFromText parses scene blocks and strips page footers accurately', () => {
  const samplePdfText = `
Great Pyramid Part 2 | Scenes 1-40 | Itihaskar Samay | Page 1
SCENE 1
SCENE LINE:
Saal 1993.
SCREENPLAY:
Wide shot - subah ki pehli roshni mein Giza ka Great Pyramid.
IMAGE PROMPT:
A wide shot of the Great Pyramid of Giza at dawn, circa 1993 CE. Cinematic lighting, 16:9 aspect ratio.
VIDEO PROMPT:
Starting from the uploaded image as the first frame, keep its style consistent.

SCENE 2
SCENE LINE:
Giza ke Great Pyramid ke theek beecho-beech...
SCREENPLAY:
Wide cutaway-style shot.
IMAGE PROMPT:
USE UPLOADED IMAGE AS OLD CHANGEZ KHAN. A wide shot inside a Mongol camp.
VIDEO PROMPT:
Starting from the uploaded image as the first frame, camera pushes in slowly.
`;

  const scenes = parseScenesFromText(samplePdfText, [
    'OLD_CHANGEZ_KHAN_fe741f17.jpeg',
    'YOUNG_ADULT_CHANGEZ_KHAN_5f1c90d7.jpeg',
  ]);

  assert.equal(scenes.length, 2);
  assert.equal(scenes[0].sceneNo, 1);
  assert.equal(scenes[0].sceneLine, 'Saal 1993.');
  assert.equal(
    scenes[0].imagePrompt,
    'A wide shot of the Great Pyramid of Giza at dawn, circa 1993 CE. Cinematic lighting, 16:9 aspect ratio.'
  );
  assert.equal(scenes[1].sceneNo, 2);
  assert.equal(scenes[1].referenceCharName, 'OLD CHANGEZ KHAN');
  assert.equal(
    scenes[1].referenceImageFile,
    'OLD_CHANGEZ_KHAN_fe741f17.jpeg'
  );
});

test('detectReferenceImageForPrompt matches character filenames with or without hash suffixes', () => {
  const files = [
    'OLD_CHANGEZ_KHAN_fe741f17.jpeg',
    'YOUNG_ADULT_CHANGEZ_KHAN_5f1c90d7.jpeg',
  ];

  const res1 = detectReferenceImageForPrompt(
    'Create an image: USE UPLOADED IMAGE AS YOUNG ADULT CHANGEZ KHAN. Standing on steppe.',
    files
  );
  assert.equal(res1.rawCharName, 'YOUNG ADULT CHANGEZ KHAN');
  assert.equal(res1.matchedFile, 'YOUNG_ADULT_CHANGEZ_KHAN_5f1c90d7.jpeg');

  const res2 = detectReferenceImageForPrompt(
    'A close-up of a limestone door.',
    files
  );
  assert.equal(res2.matchedFile, null);
  assert.equal(res2.rawCharName, '');
});

test('getCharacterAttachmentStrategy switches from First-Time Computer Upload to Add from Library on same account', () => {
  const uploadedInAcc = new Set<string>();
  const file = 'OLD_CHANGEZ_KHAN.jpeg';

  assert.equal(
    getCharacterAttachmentStrategy(file, uploadedInAcc),
    'First-Time Computer Upload'
  );
  uploadedInAcc.add(file.toLowerCase());
  assert.equal(
    getCharacterAttachmentStrategy(file, uploadedInAcc),
    'Add from Library'
  );
});

test('filterScenesByRange filters scenes inclusively', () => {
  const mockScenes = [1, 2, 3, 4, 5].map((n) => ({
    sceneNo: n,
    sceneLine: '',
    screenplay: '',
    imagePrompt: '',
    videoPrompt: '',
  }));
  const filtered = filterScenesByRange(mockScenes, 2, 4);
  assert.deepEqual(
    filtered.map((s) => s.sceneNo),
    [2, 3, 4]
  );
});

test('evaluateFlowVideoCreation implements 3-layer BANA (YES) vs NAHI BANA (NO) decision', () => {
  // Layer 1: Policy error detected
  const errRes = evaluateFlowVideoCreation({
    detectedError: 'Flow AI Rejected Video Prompt (Policy Violation)',
    creditsBefore: 100,
    creditsAfter: 100,
    cardsBefore: 2,
    cardsAfter: 2,
    sawRenderingProgress: false,
  });
  assert.equal(errRes.videoCreated, false);
  assert.equal(
    errRes.failureReason,
    'Flow AI Rejected Video Prompt (Policy Violation)'
  );

  // Layer 2: Credits decreased -> BANA (YES)
  const creditRes = evaluateFlowVideoCreation({
    detectedError: '',
    creditsBefore: 500,
    creditsAfter: 480,
    cardsBefore: 2,
    cardsAfter: 2,
    sawRenderingProgress: false,
  });
  assert.equal(creditRes.videoCreated, true);

  // Layer 3: No credit info, but new card appeared -> BANA (YES)
  const cardRes = evaluateFlowVideoCreation({
    detectedError: '',
    creditsBefore: null,
    creditsAfter: null,
    cardsBefore: 3,
    cardsAfter: 4,
    sawRenderingProgress: false,
  });
  assert.equal(cardRes.videoCreated, true);

  // Neither rendering nor card nor credit drop -> NAHI BANA (NO)
  const failRes = evaluateFlowVideoCreation({
    detectedError: '',
    creditsBefore: null,
    creditsAfter: null,
    cardsBefore: 3,
    cardsAfter: 3,
    sawRenderingProgress: false,
  });
  assert.equal(failRes.videoCreated, false);
  assert.match(failRes.failureReason, /Video nahi bana/);
});

test('parseDailyCreditTracker preserves same-day memory and auto-resets on a new day', () => {
  const savedSameDay = JSON.stringify({
    date: '2026-10-29',
    exhausted_accounts: ['Flow_Account_1', 'Flow_Account_2'],
  });
  const sameDayRes = parseDailyCreditTracker(savedSameDay, '2026-10-29');
  assert.deepEqual(sameDayRes.exhaustedAccounts, [
    'Flow_Account_1',
    'Flow_Account_2',
  ]);
  assert.equal(sameDayRes.wasResetForNewDay, false);

  const nextDayRes = parseDailyCreditTracker(savedSameDay, '2026-10-30');
  assert.deepEqual(nextDayRes.exhaustedAccounts, []);
  assert.equal(nextDayRes.wasResetForNewDay, true);
});

test('formatSceneImageName and report generators format outputs properly', () => {
  assert.equal(formatSceneImageName(5), 'Scene_05.png');
  assert.equal(formatSceneImageName(41), 'Scene_41.png');

  const scenes = [
    {
      sceneNo: 41,
      sceneLine: 'Line 41',
      screenplay: 'Shot 41',
      imagePrompt: 'Img 41',
      videoPrompt: 'Vid 41',
    },
    {
      sceneNo: 51,
      sceneLine: 'Line 51',
      screenplay: 'Shot 51',
      imagePrompt: 'Img 51',
      videoPrompt: 'Vid 51',
    },
  ];

  const flowReport = generateFlowStatusReport({
    sourceName: 'Great_Pyramid_Part2_Scenes_41-80.pdf',
    dateStr: '2026-10-29 14:30:00',
    scenes,
    sceneAccountMap: { 41: 'Flow_Account_1' },
    skippedScenes: [
      {
        sceneNo: 51,
        imgName: 'Scene_51.png',
        reason: 'Video nahi bana',
        videoPrompt: 'Vid 51',
      },
    ],
    todayExhaustedAccounts: ['Flow_Account_1'],
  });

  assert.match(flowReport, /Haan Bana \(YES\)/);
  assert.match(flowReport, /Nahi Bana \(NO\)/);
  assert.match(flowReport, /Flow_Account_1/);

  const chatReport = generateChatGptReport({
    sourceName: 'Great_Pyramid_Part2_Scenes_41-80.pdf',
    dateStr: '2026-10-29 12:00:00',
    scenes,
    completedScenes: [41],
    skippedScenes: [
      {
        sceneNo: 51,
        stage: 'ChatGPT Image Generation',
        reason: 'Slow Network Timeout',
        imagePrompt: 'Img 51',
      },
    ],
  });
  assert.match(chatReport, /ITIHASKAR SAMAY - BOT 1/);
  assert.match(chatReport, /Slow Network Timeout/);
});
