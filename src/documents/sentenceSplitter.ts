export interface SentenceBlock {
  text: string;
  paragraph: number;
  index: number;
}

export function splitSentences(body: string): SentenceBlock[] {
  const paragraphs = body.replace(/\r\n?/g, "\n").split(/\n{2,}/);
  const blocks: SentenceBlock[] = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const lines = paragraph.split("\n").filter((line) => line.trim());
    lines.forEach((line) => {
      const matches = line.match(/[^。！？.!?]+[。！？.!?]+|[^。！？.!?]+$/g) ?? [];
      matches.forEach((match) => {
        const text = match.trim();
        if (text) blocks.push({ text, paragraph: paragraphIndex, index: blocks.length });
      });
    });
  });
  return blocks;
}
