// ===== Wallet Functions (wallet.js) =====

// Ganti dengan chain yang diinginkan (contoh: Sepolia testnet)
const TARGET_CHAIN_ID = "0xaa36a7"; // Hex chain ID Sepolia = 11155111

/**
 * Connect ke MetaMask
 */
async function connectWallet() {
  if (typeof window.ethereum === "undefined") {
    alert("MetaMask tidak terdeteksi! Silakan install MetaMask terlebih dahulu.");
    return;
  }

  try {
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const account = accounts[0];
    document.getElementById("walletButton").textContent =
      `Connected: ${account.slice(0, 6)}...${account.slice(-4)}`;

    // Simpan alamat di localStorage
    localStorage.setItem("connectedAccount", account);

    // Cek network
    await checkNetwork();
  } catch (err) {
    console.error("Wallet connection failed:", err);
    alert("Gagal menghubungkan wallet.");
  }
}

/**
 * Periksa apakah user di chain yang benar
 */
async function checkNetwork() {
  if (!window.ethereum) return;

  const chainId = await window.ethereum.request({ method: "eth_chainId" });
  if (chainId !== TARGET_CHAIN_ID) {
    alert("Jaringan tidak sesuai! Pindahkan MetaMask ke jaringan yang benar.");
    try {
      // Minta MetaMask ganti jaringan
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: TARGET_CHAIN_ID }]
      });
    } catch (switchError) {
      console.error("Gagal switch network:", switchError);
      // Kalau chain belum ada di MetaMask
      if (switchError.code === 4902) {
        alert("Chain belum ada di MetaMask, silakan tambahkan manual.");
      }
    }
  }
}

// Auto reconnect kalau wallet pernah connect sebelumnya
window.addEventListener("DOMContentLoaded", async () => {
  if (localStorage.getItem("connectedAccount")) {
    await connectWallet();
  }
});
