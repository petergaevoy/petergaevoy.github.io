---
title: "DIY crypto wallet out of rain drops ☔️"
date: "2025-06-22 00:11:11"
categories: [web3]
tags: [web3, diy, nature]
image:
  path: assets/img/raindrop-generation/concrete-raindrops.png
---

### When rain starts - where do you look? 👀

I've always been drawn to look down at the street and see how raindrops spread across pavement - marking first watter drop hits on the ground before they cover it all. 

Today was no different. When first rain drops hit my head, as usual, I started looking down - but this time, rain had not much concrete to cover apart from lawn and trees, sinse I was walking outside my family's countryside residence.

### Im my world 🗺️

The only concrete in rains posession was a little alley near our house made of perfectly <b>square cement blocks</b>. They obserb rain drops flawelessly, creating a perfectly visible pattern.

The idea of using this natural random generation instantly came to me.<br>As a <b>square</b> makes a <u>perfect</u> shape to extract data from.

### Let's extract some DATA 📊

A square cement block can be seen as a grid: <i>number</i> by <i>number</i>.<br>So all we need to do is define the <i>number</i> (grid size) and extract coordinates to work with.

![Coordinate map representation](/assets/img/raindrop-generation/hits-track.png){: width="200" height="200"}
_What needs to be done_

### Instant idea 💡
Was to create a naturally-generated crypto wallet. And the best ratio for this job is `256x256`.

> 1. To generate a wallet mnemonic, 128 bits of entropy are needed (BIP-39).  
> 2. <b>Every</b> coordinate <b>X</b> or <b>Y</b> on a 256×256 grid ranges from 0 to 255 — representing 1 byte = 8 bits.
> 3. So a pair of (x, y) = 2 bytes = 16 bits of entropy. 
> 4. 128 / 16 = 8 pairs of (x, y) are needed to generate a 12-word seed phrase in BIP-39 standard.

### Execution 👨🏻‍💻
I took a <b>picture</b> of a cement square and mapped the rain hits coordinates onto a `256x256` grid using `GIMP`.

```javascript
// Coordinates of 8 raindrops on a 256 by 256 square grid
const raindrops = [
  { x: 23, y: 112 },
  { x: 65,  y: 34 },
  { x: 136,  y: 188 },
  { x: 110,   y: 120 },
  { x: 101,  y: 140 },
  { x: 227, y: 180 },
  { x: 144,  y: 38 },
  { x: 228, y: 56 },
];
```
All that’s  left is to use `BIP-39` to finish the job;

```javascript
import { entropyToMnemonic } from 'bip39';

const entropyBytes = Uint8Array.from(raindrops.flatMap(({ x, y }) => [x, y]));
const mnemonic = entropyToMnemonic(Buffer.from(entropyBytes));

console.log("🧠 Mnemonic:", mnemonic); 
// 🧠 Mnemonic: blast link emerge badge shoulder destroy normal organ region license ribbon immense
```
<b>Feel free to create your own unique wallet using the guide and code above — it’s also [available on my GitHub](https://github.com/petergaevoy/rain-wallet).</b>

> <b>NO NEED TO WAIT FOR RAIN:</b> Grab a coloring brush and <b>splash</b> some <b style="color:#F8C8DC">c</b><b style="color:#AED9E0">o</b><b style="color:#B8E0D2">l</b><b style="color:#FFF5BA">o</b><b style="color:#D6E2D6">r</b> onto white paper — random splashes guaranteed 🤝🏼  
{: .prompt-tip }