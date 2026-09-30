#!/usr/bin/env node
/** Builds docs/ART_BRIEF.md (a copy-paste brief for ChatGPT) from scripts/art-prompts.json. */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const spec = JSON.parse(await readFile(path.join(root, 'scripts/art-prompts.json'), 'utf8'));

const orientation = (size) => {
  const [w, h] = size.split('x').map(Number);
  return w === h ? 'square' : w > h ? 'landscape' : 'portrait';
};

const block = (a) => {
  const bg = a.transparent ? ' Transparent background (PNG with alpha).' : '';
  return [
    `### \`${a.id}\``,
    '',
    `- 用在：${a.where}`,
    `- 尺寸：${a.size}（${orientation(a.size)}）${a.transparent ? '・**透明背景**' : ''}`,
    `- 存檔名稱：**\`${a.id}.png\`**`,
    '',
    '```text',
    `Generate ONE image, ${a.size} ${orientation(a.size)}, in exactly the Bullheads style from the reference and my style message.${bg}`,
    '',
    a.prompt,
    '```',
    '',
  ].join('\n');
};

const must = spec.assets.filter((a) => a.priority === 'must');
const optional = spec.assets.filter((a) => a.priority !== 'must');

const md = `# Bullheads 美術生成清單（給 ChatGPT）

> 這份是從 \`scripts/art-prompts.json\` 自動產生的（\`npm run art:brief\`）。要改 prompt 請改 JSON，再重新產生。

共 **${must.length} 張必做**、**${optional.length} 張選做**。沒做的位置會繼續用現在程式畫的版本，所以可以分批做。

## 怎麼用

1. 開一個**新的** ChatGPT 對話，全部圖片都在同一個對話裡做，風格才會一致。
2. 上傳參考圖：\`docs/art-reference/style-sheet.png\` 和 \`docs/art-reference/bull-mark-smug.png\`。
3. 貼上下面的「第一則訊息」。
4. **先只做 \`character-bruno\`**。風格滿意了，之後每則都加一句：*“Use exactly the same style as the Bruno image.”*
5. 每張下載成 PNG，**檔名改成清單上的 id**（例如 \`character-daisy.png\`），放進 \`scripts/art-incoming/\`。
6. 做完跟 Claude 說一聲（或自己跑 \`npm run art:import\`），會自動轉成 WebP、縮成正確尺寸並換上網站。

### 驗收重點（不合格就請 ChatGPT 重畫）

- 牛角要**誇張地大**，要有**金色鼻環**，表情要**欠揍、得意**，不能是可愛吉祥物。
- **扁平幾何**：不要 3D、黏土、塑膠光澤或寫實風。
- 圖裡**不能有任何文字或數字**（除非該項有特別要求）。
- 標「透明背景」的一定要是透明 PNG。如果 ChatGPT 給了白底，請它 *“make the background transparent”*；不行也沒關係，匯入時可以自動去白底。
- 角色頭像會被裁成**圓形**，重要的東西不要放在四個角落。

## 第一則訊息（先貼這個）

\`\`\`text
You are the illustrator for my game "Bullheads". I attached a style reference sheet — match it closely.

${spec.style}

For every request I will give you: one image, the exact size, and whether the background must be transparent. Generate exactly one image per request, no text in the image, and keep the style consistent across the whole series. Reply "ready" and wait for the first brief.
\`\`\`

## 必做（${must.length} 張）

${must.map(block).join('\n')}
## 選做（${optional.length} 張）

${optional.map(block).join('\n')}
## 交件檢查表

${spec.assets.map((a) => `- [ ] \`${a.id}.png\`${a.priority === 'must' ? '' : '（選做）'}`).join('\n')}
`;

await writeFile(path.join(root, 'docs/ART_BRIEF.md'), md);
console.log(`wrote docs/ART_BRIEF.md (${must.length} must, ${optional.length} optional)`);
