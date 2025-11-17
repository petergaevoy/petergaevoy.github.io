/* ============================================================
   Helpers
============================================================ */
const el = (id) => document.getElementById(id);

const shortAddr = (a) => (a ? a.slice(0, 6) + '...' + a.slice(-4) : '—');

function ipfsToHttp(uri) {
  if (!uri) return uri;
  if (uri.startsWith('ipfs://'))
    return 'https://ipfs.io/ipfs/' + uri.replace('ipfs://', '');
  return uri;
}

/* ============================================================
   Error Normalizer
============================================================ */
function normalizeErrorMessage(err) {
  console.log('RAW ERROR:', err);

  // -----------------------------
  // Extract all text recursively
  // -----------------------------
  function extractStrings(obj, result = []) {
    if (!obj) return result;

    if (typeof obj === 'string') {
      result.push(obj.toLowerCase());
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        extractStrings(obj[key], result);
      }
    }
    return result;
  }

  const allText = extractStrings(err).join(' | ');

  // -----------------------------
  // Detect insufficient funds
  // -----------------------------
  if (
    allText.includes('insufficient') ||
    allText.includes('exceeds') ||
    allText.includes('balance') ||
    allText.includes('not enough') ||
    allText.includes('funds') ||
    allText.includes('cost >') ||
    allText.includes('too low')
  ) {
    return 'Not enough POL to mint.';
  }

  // -----------------------------
  // User reject
  // -----------------------------
  if (
    allText.includes('user rejected') ||
    err?.code === 'ACTION_REJECTED' ||
    allText.includes('4001')
  ) {
    return 'Transaction cancelled.';
  }

  // -----------------------------
  // Wrong network
  // -----------------------------
  if (allText.includes('chain') || allText.includes('network')) {
    return 'Please switch to Polygon.';
  }

  // -----------------------------
  // Fallback
  // -----------------------------
  return (
    err?.info?.error?.message || err?.message || 'Unknown blockchain error.'
  );
}

/* ============================================================
   Config
============================================================ */
const CONTRACT_ADDRESS = '0x518C5BdCdc7E0aBd76F606d89C116Aa4B2D5e67c';
const POLYGON_CHAIN = '0x89';

/* Standard ABI */
const ABI = [
  {
    /* Transfer Event */ anonymous: false,
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    name: 'mint',
    type: 'function',
    stateMutability: 'payable',
    inputs: [],
    outputs: [],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenOfOwnerByIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'index', type: 'uint256' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ type: 'string' }],
  },
];

/* ============================================================
   State
============================================================ */
let provider, signer, contract;

/* ============================================================
   UI Updates
============================================================ */

async function updateNetworkBubble() {
  try {
    const net = await provider.getNetwork();
    const chainId = Number(net.chainId);
    const chainName = chainId === 137 ? 'Polygon' : 'Chain ' + chainId;
    const addr = await signer.getAddress();
    const balance = Number(
      ethers.formatEther(await provider.getBalance(addr))
    ).toFixed(4);

    el('networkBubble').textContent = `${chainName} — ${balance} POL`;
  } catch (e) {
    console.error(e);
  }
}

function clearGallery() {
  el('gallery').innerHTML = '';
}

/* ============================================================
   MODAL
============================================================ */
function openModal(meta) {
  el('modalImage').src = meta.image;
  el('modalName').textContent = meta.name || 'Unnamed NFT';
  el('modalDesc').textContent = meta.description || '';

  el('modalAttrs').innerHTML = (meta.attributes || [])
    .map(
      (a) => `
      <div class="attr-item">
        <b>${a.trait_type}:</b> ${a.value}
      </div>
    `
    )
    .join('');

  el('nftModal').classList.remove('hidden');
}

function closeModal() {
  el('nftModal').classList.add('hidden');
}

/* ============================================================
   Gallery
============================================================ */

function addGalleryCard(meta) {
  const div = document.createElement('div');
  div.className = 'gallery-item';
  div.innerHTML = `
    <img src="${meta.image}">
    <div class="gallery-item-title">${meta.name}</div>
  `;
  div.onclick = () => openModal(meta);
  el('gallery').appendChild(div);
}

async function loadOwnedNfts() {
  clearGallery();

  const addr = await signer.getAddress();
  const count = Number(await contract.balanceOf(addr));

  for (let i = 0; i < count; i++) {
    try {
      const tokenId = await contract.tokenOfOwnerByIndex(addr, i);
      let uri = await contract.tokenURI(tokenId);
      uri = ipfsToHttp(uri);

      const meta = await fetch(uri).then((r) => r.json());
      meta.image = ipfsToHttp(meta.image);

      addGalleryCard(meta);
    } catch (e) {
      console.error('NFT load error', e);
    }
  }
}

/* ============================================================
   Wallet Connect
============================================================ */

async function connectWallet() {
  if (!window.ethereum) {
    alert('MetaMask not detected');
    return;
  }

  await window.ethereum.request({ method: 'eth_requestAccounts' });

  provider = new ethers.BrowserProvider(window.ethereum);

  const chain = await provider.send('eth_chainId', []);
  if (chain !== POLYGON_CHAIN) {
    await provider.send('wallet_switchEthereumChain', [
      { chainId: POLYGON_CHAIN },
    ]);
  }

  signer = await provider.getSigner();
  contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

  const addr = await signer.getAddress();

  el('walletPanel').classList.remove('wallet-hidden');
  el('walletBubble').textContent = shortAddr(addr);

  el('connectBtn').classList.add('hidden');
  el('mintBtn').classList.remove('hidden');
  el('disconnectBtn').classList.remove('hidden');

  await updateNetworkBubble();
  await loadOwnedNfts();

  el('status').textContent = 'Connected';
}

function disconnectWallet() {
  el('walletPanel').classList.add('wallet-hidden');

  el('connectBtn').classList.remove('hidden');
  el('mintBtn').classList.add('hidden');

  el('disconnectBtn').classList.add('hidden');

  el('walletBubble').textContent = '—';
  el('networkBubble').textContent = '—';
  el('status').textContent = 'Disconnected';

  clearGallery();
}

/* ============================================================
   Mint Function
============================================================ */
async function mint() {
  const status = el('status');

  try {
    status.textContent = 'Checking wallet…';

    const addr = await signer.getAddress();

    // 🔥 1. CHECK MAX TOKENS PER WALLET
    const owned = Number(await contract.balanceOf(addr));
    if (owned >= 3) {
      status.textContent = 'Mint error: You already own the maximum of 3 NFTs.';
      return;
    }

    status.textContent = 'Sending transaction…';

    // 🔥 price 8 POL
    const tx = await contract.mint({ value: ethers.parseEther('8') });

    status.textContent = 'Waiting for confirmation…';
    const r = await tx.wait();

    // Transfer event signature
    const transferSig =
      '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

    const transferLog = r.logs.find(
      (l) =>
        l.topics &&
        l.topics.length === 4 &&
        l.topics[0].toLowerCase() === transferSig.toLowerCase()
    );

    if (!transferLog) {
      status.textContent =
        'Mint succeeded but Transfer log not found (unexpected).';
      clearGallery();
      await loadOwnedNfts();
      return;
    }

    const tokenIdBigInt = ethers.getBigInt(transferLog.topics[3]);
    const tokenIdStr = tokenIdBigInt.toString();

    let uri = await contract.tokenURI(tokenIdStr);
    uri = ipfsToHttp(uri);

    const meta = await fetch(uri).then((res) => res.json());
    meta.image = ipfsToHttp(meta.image);

    // 🔥 Show modal
    openModal(meta);

    clearGallery();
    await loadOwnedNfts();

    status.textContent = `Mint successful! Token ID: ${tokenIdStr}`;
  } catch (err) {
    status.textContent = 'Mint error: ' + normalizeErrorMessage(err);
  }
}

/* ============================================================
   Events
============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  el('connectBtn').onclick = connectWallet;
  el('disconnectBtn').onclick = disconnectWallet;
  el('mintBtn').onclick = mint;

  el('modalClose').onclick = closeModal;
  el('nftModal').onclick = (e) => {
    if (e.target.id === 'nftModal') closeModal();
  };

  el('disconnectBtn').classList.add('hidden');
});
