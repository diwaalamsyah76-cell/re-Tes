let currentProvider;

async function connectWallet() {
  if (typeof window.ethereum !== 'undefined') {
    currentProvider = new ethers.BrowserProvider(window.ethereum);
    try {
      const accounts = await currentProvider.send("eth_requestAccounts", []);
      const userAccount = accounts[0];
      document.getElementById("walletButton").textContent = `Connected`;
      document.getElementById("walletAddress").textContent = userAccount;
      document.getElementById("walletInfo").style.display = "block";

      // Ambil saldo
      const balance = await currentProvider.getBalance(userAccount);
      const eth = ethers.formatEther(balance);
      document.getElementById("walletBalance").textContent = parseFloat(eth).toFixed(4);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      alert('Wallet connection failed');
    }
  } else {
    alert('MetaMask or Ethereum-based wallet not found');
  }
}

function disconnectWallet() {
  document.getElementById("walletInfo").style.display = "none";
  document.getElementById("walletAddress").textContent = "";
  document.getElementById("walletBalance").textContent = "...";
  document.getElementById("walletButton").textContent = "Connect Wallet";
  alert('Wallet disconnected');
}
