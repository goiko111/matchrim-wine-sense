import type { LocalOCRResult106 } from './nativeOCR106';

// 150: a bottle lying on a rack is photographed with its label on its side, and the reader was only asked about
// the photo as it came: it returned loose letters, and the search offered wines that had nothing to do with the
// bottle. When the upright reading says little, or its lines run down the photo instead of across it, the same
// photo is read turned a quarter either way and the reading with the most text wins. A normal photo is read once.

type Reading = Pick<LocalOCRResult106, 'lines' | 'width' | 'height'>;

/** How much a reading says: the letters of its real words (three letters or more), weighed by how sure the reader was. */
export const readingWeight150 = (reading: Reading): number => reading.lines.reduce((sum, line) =>
  sum + line.confidence * (line.text.match(/\p{L}{3,}/gu) ?? []).join('').length, 0);

/** A line box that is taller than wide, in pixels, is text running down the photo. */
export const linesRunDown150 = (reading: Reading): boolean => {
  const boxes = reading.lines.filter(line => (line.text.match(/\p{L}/gu) ?? []).length >= 3);
  if (!boxes.length) return false;
  const down = boxes.filter(line => line.box.height * reading.height > line.box.width * reading.width * 1.3).length;
  return down * 2 > boxes.length;
};

export const worthTurning150 = (reading: Reading): boolean => readingWeight150(reading) < 14 || linesRunDown150(reading);

/** The photo turned a quarter clockwise (`turns` 1) or anticlockwise (3), as a JPEG data URL; null when it cannot be drawn. */
export const turnPhoto150 = (dataUrl: string, turns: 1 | 3): Promise<string | null> => new Promise(resolve => {
  try {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalHeight; canvas.height = image.naturalWidth;
        const context = canvas.getContext('2d');
        if (!context || !canvas.width || !canvas.height) { resolve(null); return; }
        context.translate(canvas.width / 2, canvas.height / 2);
        context.rotate(turns * Math.PI / 2);
        context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
        resolve(canvas.toDataURL('image/jpeg', 0.9));
      } catch { resolve(null); }
    };
    image.onerror = () => resolve(null);
    image.src = dataUrl;
  } catch { resolve(null); }
});

type Box = Reading['lines'][number]['box'];
/** A line box seen in a photo turned `quarters` more quarters clockwise. */
export const turnBox150 = (box: Box, quarters: number): Box => {
  let value = box;
  for (let step = 0; step < ((quarters % 4) + 4) % 4; step += 1) value = { x: Math.max(0, 1 - value.y - value.height), y: value.x, width: value.height, height: value.width };
  return value;
};

/**
 * Reads a label and, only when the upright reading is poor, the two sideways turns too. The reader and the turn are
 * injected so the checks can stand in for the phone. A turn that fails leaves the reading already in hand.
 * The reader cannot tell a label lying to the left from one lying to the right (it reads both, and one of them with a
 * wrong letter), so the winning turn also keeps the lines only the other readings saw, placed in its own frame.
 */
export const readLabelAnyWay150 = async <R extends Reading>(dataUrl: string, read: (image: string) => Promise<R>,
  turn: (image: string, turns: 1 | 3) => Promise<string | null> = turnPhoto150): Promise<{ reading: R; image: string; turned: 0 | 1 | 3 }> => {
  const upright = await read(dataUrl);
  const all: { reading: R; image: string; turned: 0 | 1 | 3 }[] = [{ reading: upright, image: dataUrl, turned: 0 }];
  if (!worthTurning150(upright)) return all[0];
  let best = all[0], weight = readingWeight150(upright);
  for (const turns of [1, 3] as const) {
    try {
      const image = await turn(dataUrl, turns);
      if (!image) continue;
      const reading = await read(image);
      all.push({ reading, image, turned: turns });
      const value = readingWeight150(reading);
      // The turned reading must clearly say more: a tie stays with the photo as the user took it.
      if (value > weight * 1.3 && value >= 8 && !linesRunDown150(reading)) { best = all[all.length - 1]; weight = value; }
    } catch (error) { if ((error as Error | null)?.name === 'AbortError') throw error; }
  }
  if (best.turned === 0) return best;
  const seen = new Set(best.reading.lines.map(line => line.text.toLowerCase()));
  const lines = [...best.reading.lines];
  for (const other of all) {
    if (other === best) continue;
    for (const line of other.reading.lines) {
      if (lines.length >= 100 || line.confidence < 0.3 || seen.has(line.text.toLowerCase())) continue;
      seen.add(line.text.toLowerCase());
      lines.push({ ...line, box: turnBox150(line.box, best.turned - other.turned) });
    }
  }
  return { ...best, reading: { ...best.reading, lines } };
};
