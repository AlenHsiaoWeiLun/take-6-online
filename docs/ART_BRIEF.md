# Bullheads 美術生成清單（給 ChatGPT）

> 這份是從 `scripts/art-prompts.json` 自動產生的（`npm run art:brief`）。要改 prompt 請改 JSON，再重新產生。

共 **18 張必做**、**12 張選做**。沒做的位置會繼續用現在程式畫的版本，所以可以分批做。

## 怎麼用

1. 開一個**新的** ChatGPT 對話，全部圖片都在同一個對話裡做，風格才會一致。
2. 上傳參考圖：`docs/art-reference/style-sheet.png` 和 `docs/art-reference/bull-mark-smug.png`。
3. 貼上下面的「第一則訊息」。
4. **先只做 `character-bruno`**。風格滿意了，之後每則都加一句：*“Use exactly the same style as the Bruno image.”*
5. 每張下載成 PNG，**檔名改成清單上的 id**（例如 `character-daisy.png`），放進 `scripts/art-incoming/`。
6. 做完跟 Claude 說一聲（或自己跑 `npm run art:import`），會自動轉成 WebP、縮成正確尺寸並換上網站。

### 驗收重點（不合格就請 ChatGPT 重畫）

- 牛角要**誇張地大**，要有**金色鼻環**，表情要**欠揍、得意**，不能是可愛吉祥物。
- **扁平幾何**：不要 3D、黏土、塑膠光澤或寫實風。
- 圖裡**不能有任何文字或數字**（除非該項有特別要求）。
- 標「透明背景」的一定要是透明 PNG。如果 ChatGPT 給了白底，請它 *“make the background transparent”*；不行也沒關係，匯入時可以自動去白底。
- 角色頭像會被裁成**圓形**，重要的東西不要放在四個角落。

## 第一則訊息（先貼這個）

```text
You are the illustrator for my game "Bullheads". I attached a style reference sheet — match it closely.

Art direction for "Bullheads", a fast, cheeky, chaotic party card game where friends sabotage each other and swallow rows of penalty cards. Bold FLAT GEOMETRIC vector illustration: chunky confident shapes, thick clean silhouettes, hard edges, minimal soft shading, a very slight offset-print misregistration and fine paper grain. Limited palette: bull red #E5484D, deep red #B8323A, cream #FFF1D6, ink black #14161D, hay gold #F5B942, plus at most one accent colour per image. Bulls are drawn as geometric heads with OVERSIZED sweeping horns, a gold nose ring and big simple eyes with very expressive brows. Attitude: smug, mischievous, a little obnoxious — never babyish, never a cute app mascot. NOT 3D, NOT clay, NOT glossy, NOT photoreal, no gradients-heavy app-icon look. Playing cards, when shown, are cream with a coloured top band and small bull-head pips. No text, letters, numbers, watermarks or logos unless the brief explicitly asks for them.

For every request I will give you: one image, the exact size, and whether the background must be transparent. Generate exactly one image per request, no text in the image, and keep the style consistent across the whole series. Reply "ready" and wait for the first brief.
```

## 必做（18 張）

### `character-bruno`

- 用在：Player avatar (circle-cropped) in lobby, table, results, leaderboard
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-bruno.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of BRUNO, a cocky young bull: rust-red head, huge cream horns, gold nose ring, one eyebrow raised in a smug grin. Front-facing geometric bull head filling about 70% of the frame, perfectly centred, nothing important in the corners (it will be cropped to a circle). Solid flat deep-navy (#1F2A44) background.
```

### `character-daisy`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-daisy.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of DAISY, a sweet-looking cow who is secretly ruthless: cream-white head, short gold horns, pink snout, a white daisy tucked behind one ear, innocent half-smile with narrowed calculating eyes. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat hay-gold (#F5B942) background.
```

### `character-tank`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-tank.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of TANK, a huge dark-brown bull who always ends up swallowing the row: thick horns, red bandana with white dots tied across the forehead, heavy brows, grumpy tough-guy frown. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat bull-red (#E5484D) background.
```

### `character-mocha`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-mocha.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of MOCHA, an unbothered milk-chocolate bull: sleepy heavy-lidded eyes, teal knitted scarf, tiny smirk — calm even while buried in penalty cards. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat muted teal (#4F8A8B) background.
```

### `character-ziggy`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-ziggy.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of ZIGGY, a chaotic purple bull who plays the 55 just to watch: violet head, pale-gold horns, gold star sticker on one cheek, cheeky wink with tongue poking out. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat hay-gold (#F5B942) background.
```

### `character-nova`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-nova.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of NOVA, a card-counting slate-blue bull: round white-rimmed glasses, one eyebrow raised, knowing smug look as if she already calculated your doom. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat sky-blue (#5AC8FA) background.
```

### `character-sage`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-sage.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of SAGE, an old wise sage-green cow with a sly streak: cream horns, drooping eyelids, faint mischievous smile, a small sprig of grass in her mouth. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat deep-red (#B8323A) background.
```

### `character-bolt`

- 用在：Player avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-bolt.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Avatar portrait of BOLT, a hyperactive golden-yellow bull who plays too fast: chunky red headphones, wide-open excited grin, eyes a little too big, tiny lightning-bolt shapes around him. Front-facing geometric head filling about 70% of the frame, centred, circle-crop safe. Solid flat ink-black (#14161D) background.
```

### `character-aurum`

- 用在：Premium (Plus) avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-aurum.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Premium avatar portrait of AURUM, a regal bull made of flat gold shapes: small jewelled crown between the horns, gold nose ring, chin raised, unbearably smug expression. Keep it flat and geometric (no metallic 3D rendering) — suggest gold with 2–3 flat tones. Front-facing, head filling about 70% of the frame, centred, circle-crop safe. Solid flat dark-bronze (#5A3A0C) background.
```

### `character-nebula`

- 用在：Premium (Plus) avatar
- 尺寸：1024x1024（square）
- 存檔名稱：**`character-nebula.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

Premium avatar portrait of NEBULA, a cosmic bull: deep indigo head speckled with tiny flat stars, lilac horns, a glowing cyan-to-pink visor band over the eyes, confident smirk. Flat geometric shapes, no 3D. Front-facing, head filling about 70% of the frame, centred, circle-crop safe. Solid flat hot-pink (#FF7AC6) background.
```

### `og-cover`

- 用在：Link preview on LINE / Facebook / X / Discord (headline text is added by code on the left)
- 尺寸：1536x1024（landscape）
- 存檔名稱：**`og-cover.png`**

```text
Generate ONE image, 1536x1024 landscape, in exactly the Bullheads style from the reference and my style message.

Wide banner, ink-black (#0B0D12) background with warm red and gold glow on the right. RIGHT HALF: a single row of five cream playing cards lined up on a dark teal table, and a sixth card slamming down at the end of the row, cards exploding outward, a big red starburst, a smug geometric bull head with huge horns popping up beside the chaos. LEFT 45% must stay EMPTY dark space for a headline. Dynamic, loud, party-game energy.
```

### `texture-felt`

- 用在：Game table surface (tiled)
- 尺寸：1024x1024（square）
- 存檔名稱：**`texture-felt.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message.

SEAMLESS TILEABLE top-down texture of deep teal-green (#14352F) card-table felt with fine woven fibres and a very faint repeating pattern of tiny geometric bull heads in a slightly darker tone. Even lighting, no vignette, no objects, low contrast so cards stay readable on top.
```

### `texture-cardback`

- 用在：Back of every face-down card (classic style)
- 尺寸：1024x1536（portrait）
- 存檔名稱：**`texture-cardback.png`**

```text
Generate ONE image, 1024x1536 portrait, in exactly the Bullheads style from the reference and my style message.

Playing-card back design, portrait, filling the entire frame edge to edge, front-on and perfectly flat (no perspective, no shadow, no table). Bull red (#E5484D) field with a thin cream border, a tight symmetrical repeating pattern of tiny geometric bull heads and diamonds, and one bold cream geometric bull-head medallion (huge horns, nose ring) in the centre. Must read clearly when shown very small.
```

### `product-plus`

- 用在：Plus store page hero
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`product-plus.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Product shot of a premium collector card-deck box in matte ink black with gold foil edges and a gold geometric bull-head emblem on the front, lid half open, three cards fanned out of it (one ivory with gold edges, one black with neon edges, one soft green). Three-quarter view, bold flat illustration with crisp highlights (not photoreal). TRANSPARENT background, soft contact shadow only.
```

### `render-trophy`

- 用在：Leaderboard header
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`render-trophy.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

A trophy cup whose handles are a pair of huge sweeping bull horns, gold with flat geometric shading, a small gold nose ring hanging from the front, on a short ink-black plinth. Centred, TRANSPARENT background.
```

### `illustration-empty`

- 用在：Empty leaderboard / waiting states
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`illustration-empty.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

A bored geometric bull sitting alone at an empty dark-teal card table with four empty card outlines, tapping a single card on the table, waiting for friends to show up. Slightly impatient expression. TRANSPARENT background, subject centred.
```

### `illustration-win`

- 用在：Results screen when YOU win
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`illustration-win.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Victory sticker: a smug geometric bull head wearing a small crown, sunglasses pushed up on the horns, surrounded by a burst of cream cards and gold confetti shapes, pure "I told you so" energy. Sticker style with a thick white outline around the whole shape. TRANSPARENT background.
```

### `illustration-lose`

- 用在：Results screen when you finish LAST
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`illustration-lose.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Defeat sticker: a geometric bull head half-buried under an avalanche of cream penalty cards covered in little bull-head pips, dizzy spiral eyes, one horn sticking out, a tiny white flag. Funny, not sad. Sticker style with a thick white outline around the whole shape. TRANSPARENT background.
```

## 選做（12 張）

### `background-home`

- 用在：Very faint backdrop behind the whole site
- 尺寸：1536x1024（landscape）
- 存檔名稱：**`background-home.png`**

```text
Generate ONE image, 1536x1024 landscape, in exactly the Bullheads style from the reference and my style message.

Wide, very dark ink-black background with a subtle chaotic pattern of scattered tilted cream playing cards and small geometric bull heads, heavily darkened (only 10–15% visible), plus soft red and gold light blooms in the corners. Lots of calm empty space in the centre and top-left for text. Must stay subtle; it sits behind UI.
```

### `product-theme-midnight`

- 用在：Plus page: Midnight card style preview
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`product-theme-midnight.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Three fanned playing cards in a 'Midnight' style: ink-black faces with glowing neon-coloured top bands (violet, cyan, pink) and neon bull-head pips, no numbers. Flat geometric illustration, TRANSPARENT background.
```

### `product-theme-gilded`

- 用在：Plus page: Gilded card style preview
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`product-theme-gilded.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Three fanned playing cards in a 'Gilded' style: ivory faces with gold foil borders, dark bands and gold bull-head pips, no numbers. Flat geometric illustration with crisp flat highlights, TRANSPARENT background.
```

### `product-theme-meadow`

- 用在：Plus page: Meadow card style preview
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`product-theme-meadow.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Three fanned playing cards in a 'Meadow' style: soft green faces with a hand-drawn grass pattern, muted colour bands and green bull-head pips, no numbers. Flat geometric illustration, TRANSPARENT background.
```

### `sticker-lol`

- 用在：In-game reaction (replaces 😂)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-lol.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull head crying with laughter, eyes squeezed shut, big tears flying sideways, mouth wide open. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-wow`

- 用在：In-game reaction (replaces 😱)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-wow.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull head in total shock, huge round eyes, tiny pupils, horns jolted upward, sweat drop. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-angry`

- 用在：In-game reaction (replaces 😤)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-angry.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: furious geometric bull head, steam blasting out of both nostrils, deep V brows, bright red face. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-clap`

- 用在：In-game reaction (replaces 👏)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-clap.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: smug geometric bull slow-clapping with two small hooves, sarcastic half-lidded eyes. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-fire`

- 用在：In-game reaction (replaces 🔥)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-fire.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull head with flaming horns and sunglasses, 'on fire' swagger. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-moo`

- 用在：In-game reaction (replaces 🐮)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-moo.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull head mooing loudly straight at the viewer, mouth wide open, motion lines, nose ring swinging. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-skull`

- 用在：In-game reaction (replaces 💀)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-skull.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull head turned ghost-white with X eyes and a tiny soul floating out of the top, 'I'm dead' joke. Thick white sticker outline. TRANSPARENT background.
```

### `sticker-pray`

- 用在：In-game reaction (replaces 🙏)
- 尺寸：1024x1024（square）・**透明背景**
- 存檔名稱：**`sticker-pray.png`**

```text
Generate ONE image, 1024x1024 square, in exactly the Bullheads style from the reference and my style message. Transparent background (PNG with alpha).

Reaction sticker: geometric bull with hooves pressed together begging, huge shiny puppy eyes, 'please don't give me that row'. Thick white sticker outline. TRANSPARENT background.
```

## 交件檢查表

- [ ] `character-bruno.png`
- [ ] `character-daisy.png`
- [ ] `character-tank.png`
- [ ] `character-mocha.png`
- [ ] `character-ziggy.png`
- [ ] `character-nova.png`
- [ ] `character-sage.png`
- [ ] `character-bolt.png`
- [ ] `character-aurum.png`
- [ ] `character-nebula.png`
- [ ] `og-cover.png`
- [ ] `texture-felt.png`
- [ ] `texture-cardback.png`
- [ ] `product-plus.png`
- [ ] `render-trophy.png`
- [ ] `illustration-empty.png`
- [ ] `illustration-win.png`
- [ ] `illustration-lose.png`
- [ ] `background-home.png`（選做）
- [ ] `product-theme-midnight.png`（選做）
- [ ] `product-theme-gilded.png`（選做）
- [ ] `product-theme-meadow.png`（選做）
- [ ] `sticker-lol.png`（選做）
- [ ] `sticker-wow.png`（選做）
- [ ] `sticker-angry.png`（選做）
- [ ] `sticker-clap.png`（選做）
- [ ] `sticker-fire.png`（選做）
- [ ] `sticker-moo.png`（選做）
- [ ] `sticker-skull.png`（選做）
- [ ] `sticker-pray.png`（選做）
