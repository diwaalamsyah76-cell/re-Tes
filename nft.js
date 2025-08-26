// ===== NFT Functions (nft.js) =====

// ===== Konfigurasi =====
const CONTRACT_ADDRESS = "YOUR_CONTRACT_ADDRESS";
const CONTRACT_ABI = []; // Masukkan ABI contract ERC-721 / ERC-1155 di sini
const WEB3STORAGE_TOKEN = "YOUR_WEB3STORAGE_API_KEY";

// Inisialisasi Web3.Storage
const client = new Web3Storage({ token: WEB3STORAGE_TOKEN });

// ===== Mint NFT =====
async function mintNFT(name, description, imageFile) {
  if (!window.ethereum) {
    alert("MetaMask tidak terdeteksi!");
    return;
  }

  try {
    // 1. Upload file image ke IPFS
    const imageCid = await client.put([imageFile], { wrapWithDirectory: false });
    const imageUrl = `https://${imageCid}.ipfs.w3s.link`;

    // 2. Buat metadata JSON
    const metadata = {
      name,
      description,
      image: imageUrl
    };

    // 3. Upload metadata JSON ke IPFS
    const blob = new Blob([JSON.stringify(metadata)], { type: "application/json" });
    const metadataFile = new File([blob], "metadata.json");
    const metadataCid = await client.put([metadataFile], {
    
     // 4.// Jika user pilih IG post dan tidak upload file manual
if (!imageFile) {
  imageFile = await getSelectedImageFile();
}


     // 5. Jika user tidak memilih file manual, pakai gambar IG yang dipilih
if (!imageFile) {
  imageFile = await getSelectedImageFile();
}
if (!imageFile) {
  alert("Tidak ada gambar. Upload file atau pilih posting IG terlebih dahulu.");
  return;
}


