function el(id) {
  return document.getElementById(id);
}

function isMetaMaskAvailable() {
  return (
    typeof window !== 'undefined' &&
    window.ethereum &&
    window.ethereum.isMetaMask
  );
}

function shortAddr(addr) {
  if (!addr) return '—';
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

const CONTRACT_ADDRESS = '0x518C5BdCdc7E0aBd76F606d89C116Aa4B2D5e67c';
const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'mint',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
];

const POLYGON_CHAIN_HEX = '0x89';
const EXPLORER_TX = 'https://polygonscan.com/tx/';

let provider;
let signer;
let contract;

const NETWORKS = {
  '0x89': 'Polygon',
  '0x13881': 'Mumbai',
  '0x1': 'Ethereum',
};

function showWalletPanel() {
  el('walletPanel').classList.remove('wallet-hidden');
}

function hideWalletPanel() {
  el('walletPanel').classList.add('wallet-hidden');
}

function hideDisconnectButton() {
  el('disconnectBtn').style.display = 'none';
}

function showDisconnectButton() {
  el('disconnectBtn').style.display = 'inline-flex';
}

async function updateNetworkBubble() {
  try {
    const network = await provider.getNetwork();
    const chainId = network.chainId;

    const chainNames = {
      137: 'Polygon',
      80002: 'Polygon Amoy',
      1: 'Ethereum',
      11155111: 'Sepolia',
    };

    const chainName = chainNames[chainId] || `Chain ${chainId}`;

    const address = await signer.getAddress();
    const balanceWei = await provider.getBalance(address);
    const balance = parseFloat(ethers.formatEther(balanceWei)).toFixed(4);

    const networkBubble = document.getElementById('networkBubble');
    networkBubble.textContent = `${chainName} — ${balance} POL`;

    networkBubble.classList.remove('wallet-hidden');
  } catch (err) {
    console.error('Network bubble update error:', err);
  }
}

function ensureMetaMaskOrShowError() {
  const status = el('status');

  if (!isMetaMaskAvailable()) {
    status.textContent = 'MetaMask не установлен';

    const connect = el('connectBtn');
    connect.textContent = 'Установить MetaMask';
    connect.onclick = () =>
      window.open('https://metamask.io/download/', '_blank');

    hideWalletPanel();
    return false;
  }
  return true;
}

async function connectMetaMask() {
  const status = el('status');

  if (!ensureMetaMaskOrShowError()) return;

  try {
    status.textContent = 'Connecting...';

    provider = new ethers.BrowserProvider(window.ethereum);
    const accounts = await provider.send('eth_requestAccounts', []);

    const account = accounts?.[0];
    if (!account) {
      status.textContent = 'No account';
      return;
    }

    const chainIdHex = await provider.send('eth_chainId', []);
    if (chainIdHex !== POLYGON_CHAIN_HEX) {
      try {
        await provider.send('wallet_switchEthereumChain', [
          { chainId: POLYGON_CHAIN_HEX },
        ]);
      } catch (e) {
        status.textContent = 'Switch to Polygon';
        return;
      }
    }

    await updateNetworkBubble(POLYGON_CHAIN_HEX);

    signer = await provider.getSigner();
    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // ⬇️ вот это добавили
    await updateNetworkBubble();

    el('walletBubble').textContent = shortAddr(account);
    el('mintBtn').disabled = false;
    showWalletPanel();
    showDisconnectButton();

    status.textContent = 'Connected: ' + shortAddr(account);

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  } catch (err) {
    console.error(err);
    status.textContent = 'Connect error: ' + (err.message || err);
  }
}

async function disconnectUI() {
  hideWalletPanel();
  hideDisconnectButton();
  el('walletBubble').textContent = '—';
  el('networkBubble').textContent = '—';
  el('mintBtn').disabled = true;
  el('status').textContent = 'Disconnected';

  try {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  } catch (_) {}
}

function handleAccountsChanged(accounts) {
  if (!accounts.length) return disconnectUI();
  el('walletBubble').textContent = shortAddr(accounts[0]);
}

function handleChainChanged(chainIdHex) {
  updateNetworkBubble(chainIdHex);
  el('mintBtn').disabled = chainIdHex !== POLYGON_CHAIN_HEX;
}

function readableError(err) {
  const msg = err?.message || String(err);

  // User rejected
  if (
    msg.includes('4001') ||
    msg.includes('denied') ||
    msg.includes('User denied')
  ) {
    return 'Вы отменили транзакцию в MetaMask 😐';
  }

  // Not enough funds
  if (msg.includes('insufficient funds')) {
    return 'Недостаточно POL для минта.';
  }

  // Wrong network
  if (msg.includes('chain') && msg.includes('not')) {
    return 'Нужно переключиться на сеть Polygon.';
  }

  // Gas or execution error
  if (msg.includes('execution reverted')) {
    return 'Транзакция отклонена смарт-контрактом.';
  }

  // Default
  return 'Произошла ошибка. Проверьте MetaMask.';
}

async function mintOnce() {
  const status = el('status');

  if (!contract) {
    status.textContent = 'Contract not initialised';
    return;
  }

  try {
    status.textContent = 'Sending transaction...';

    const tx = await contract.mint({
      value: ethers.parseEther('8'),
    });

    status.textContent = 'Waiting for confirmation...';

    const receipt = await tx.wait(1);

    if (receipt.status === 1) {
      status.innerHTML = `Mint OK! <a href="${EXPLORER_TX}${tx.hash}" target="_blank">View</a>`;
    } else {
      status.textContent = 'Mint failed.';
    }
  } catch (err) {
    console.error(err);
    status.textContent = 'Mint error: ' + readableError(err);
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  hideWalletPanel();
  hideDisconnectButton();

  el('connectBtn').addEventListener('click', connectMetaMask);
  el('disconnectBtn').addEventListener('click', disconnectUI);
  el('mintBtn').addEventListener('click', mintOnce);

  if (window.ethereum) {
    provider = new ethers.BrowserProvider(window.ethereum);
    const acc = await provider.send('eth_accounts', []);
    if (acc && acc.length) connectMetaMask().catch(() => {});
  }
});
