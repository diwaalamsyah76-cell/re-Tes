// ===== NFT Functions (nft.js) =====

// ===== Konfigurasi =====
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
const CONTRACT_ABI = []; // Masukkan ABI contract ERC-721 / ERC-1155 di sini

// ===== Mint NFT =====
async function mintNFT(name, description, imageFile) {
  if (!window.ethereum) {
    alert("MetaMask tidak terdeteksi!");
    return;
  }

  try {
    // 1. Upload file image ke IPFS via ipfs.js
    const imageUrl = await uploadToIPFS(imageFile);
    if (!imageUrl) {
      alert("Upload gambar gagal. Mint dibatalkan.");
      return;
    }

    // 2. Upload metadata ke IPFS
    const metadataUrl = await uploadMetadata({
      name,
      description,
      image: imageUrl
    });
    if (!metadataUrl) {
      alert("Upload metadata gagal. Mint dibatalkan.");
      return;
    }

    // 3. Mint NFT ke blockchain
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    const tx = await contract.mint(await signer.getAddress(), metadataUrl);
    console.log("Minting NFT, hash:", tx.hash);

    await tx.wait();
    alert("NFT berhasil di-mint!");
  } catch (err) {
    console.error("Gagal mint NFT:", err);
    alert("Mint NFT gagal. Lihat console untuk detail.");
  }
}

// ===== Load My NFTs =====
async function loadMyNFTs() {
  if (!window.ethereum) {
    alert("MetaMask tidak terdeteksi!");
    return;
  }

  try {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    const signer = provider.getSigner();
    const address = await signer.getAddress();

    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
    const balance = await contract.balanceOf(address);

    const nftContainer = document.getElementById("my-nft-list");
    nftContainer.innerHTML = "";

    for (let i = 0; i < balance; i++) {
      const tokenId = await contract.tokenOfOwnerByIndex(address, i);
      const tokenUri = await contract.tokenURI(tokenId);

      // Ambil metadata dari IPFS
      const res = await fetch(tokenUri);
      const metadata = await res.json();

      // Tampilkan NFT di UI
      const card = document.createElement("div");
      card.className = "nft-card";
      card.innerHTML = `
        <img src="${metadata.image}" alt="${metadata.name}">
        <h4>${metadata.name}</h4>
        <p>${metadata.description}</p>
        <small>Token ID: ${tokenId}</small>
      `;
      nftContainer.appendChild(card);
    }
  } catch (err) {
    console.error("Gagal load NFT:", err);
    alert("Gagal memuat NFT. Lihat console untuk detail.");
  }
}
