import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

try {
  if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  }
} catch {
  // Ignore worker init issues in non-browser test runners
}

/**
 * Extracts full text from any uploaded PDF or text file using pdfjs-dist,
 * preserving line breaks so `SCENE X`, `IMAGE PROMPT:`, and `VIDEO PROMPT:` parse identically to pypdf.
 */
export async function extractTextFromUploadedFile(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();

  if (!lowerName.endsWith('.pdf')) {
    return await file.text();
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      // Reconstruct lines based on Y coordinate transforms so SCENE / IMAGE PROMPT / VIDEO PROMPT headers stay on their own lines
      let lastY: number | null = null;
      let pageLines = '';
      for (const item of textContent.items as any[]) {
        const str = item.str || '';
        const y = item.transform ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
          pageLines += '\n' + str;
        } else {
          pageLines += (pageLines.endsWith('\n') || !pageLines ? '' : ' ') + str;
        }
        if (y !== null) {
          lastY = y;
        }
      }
      pageTexts.push(pageLines);
    }

    const combined = pageTexts.join('\n');
    if (/SCENE\s+\d+/i.test(combined)) {
      return combined;
    }
  } catch {
    // Fallback to raw text decoding below
  }

  const rawText = await file.text();
  return rawText;
}
