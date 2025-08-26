
# YouTube → IPFS → Polygon (NFT) — End‑to‑End Flow

> Contoh implementasi **tokenisasi konten YouTube** menjadi NFT di Polygon. Termasuk langkah OAuth Google, ambil metadata video, upload ke IPFS, mint ERC‑721 (dengan royalti ERC‑2981), dan listing di marketplace.

---

## 0) Prasyarat
- **Google Cloud Project** dengan YouTube Data API v3 aktif.
- **Client ID, Client Secret, Redirect URI** (OAuth 2.0).
- **API Key** (untuk akses data publik YouTube).
- **Wallet** (MetaMask) + RPC Polygon (Alchemy/Infura/QuickNode).
- **Node.js** (v18+), **Hardhat**, **OpenZeppelin**.
- **Pinning service IPFS** (Pinata / web3.storage / NFT.Storage).

---

## 1) OAuth YouTube (Google OAuth 2.0)

### 1.1 Authorize User
```
GET https://accounts.google.com/o/oauth2/v2/auth
 ?client_id=CLIENT_ID
 &redirect_uri=REDIRECT_URI
 &response_type=code
 &scope=https://www.googleapis.com/auth/youtube.readonly
 &access_type=offline
```

### 1.2 Tukar code → access_token
```
POST https://oauth2.googleapis.com/token
Content-Type: application/x-www-form-urlencoded

code=AUTH_CODE&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET&
redirect_uri=REDIRECT_URI&
grant_type=authorization_code
```

Respon: `access_token`, `refresh_token` (untuk long-term).

---

## 2) Ambil Metadata Video
```
GET https://www.googleapis.com/youtube/v3/videos
  ?id=VIDEO_ID
  &part=snippet,contentDetails,statistics
  &key=API_KEY
```

Respon (ringkas):
```json
{
  "items": [
    {
      "id": "abcd1234",
      "snippet": {
        "title": "My Video Title",
        "description": "Deskripsi video...",
        "thumbnails": { "high": { "url": "https://..." } },
        "channelTitle": "Nama Channel"
      },
      "contentDetails": { "duration": "PT2M30S" },
      "statistics": { "viewCount": "1023" }
    }
  ]
}
```

---

## 3) Siapkan Metadata NFT
```json
{
  "name": "YouTube NFT - My Video",
  "description": "Tokenisasi video YouTube",
  "image": "ipfs://<CID_THUMBNAIL>",
  "animation_url": "https://youtube.com/watch?v=abcd1234",
  "external_url": "https://youtube.com/watch?v=abcd1234",
  "attributes": [
    {"trait_type": "channel", "value": "Nama Channel"},
    {"trait_type": "views", "value": 1023}
  ]
}
```

⚠️ **Catatan:** biasanya hanya **thumbnail + link resmi** yang dipin ke IPFS, bukan file video penuh (hak cipta).

---

## 4) Upload ke IPFS

### Pin File (thumbnail)
```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Headers:
  Authorization: Bearer <PINATA_JWT>
Body (form-data):
  file: <binary>
```

### Pin JSON Metadata
```
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
Headers:
  Authorization: Bearer <PINATA_JWT>
  Content-Type: application/json
Body:
  { ...metadata... }
```

---

## 5) Smart Contract ERC‑721 + Royalti (ERC‑2981)

**contracts/YouTubeNFT.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract YouTubeNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId;

    constructor(address defaultRoyaltyReceiver, uint96 feeNumerator)
        ERC721("YouTubeNFT", "YTNFT")
        Ownable(msg.sender)
    {
        _setDefaultRoyalty(defaultRoyaltyReceiver, feeNumerator); // e.g., 500 = 5%
    }

    function mintTo(address to, string memory tokenURI_) external onlyOwner returns (uint256) {
        uint256 tokenId = ++nextTokenId;
        _mint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        return tokenId;
    }

    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

---

## 6) Mint NFT (Polygon)
```ts
const CONTRACT = "0xYourContractAddress";
const TOKEN_URI = "ipfs://bafy.../metadata.json";

const nft = new ethers.Contract(CONTRACT, [
  "function mintTo(address to, string tokenURI) public returns (uint256)"
], wallet);

const tx = await nft.mintTo(wallet.address, TOKEN_URI);
await tx.wait();
```

---

## 7) Backend Sketsa (Node/Express, Pseudocode)

```ts
app.get("/youtube/:videoId", async (req, res) => {
  const { videoId } = req.params;

  // 1. Ambil metadata video
  const data = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,statistics&key=${process.env.YT_API_KEY}`).then(r=>r.json());
  const video = data.items[0];

  // 2. Upload thumbnail ke IPFS
  const thumbUrl = video.snippet.thumbnails.high.url;
  const bin = await fetch(thumbUrl).then(r => r.arrayBuffer());
  const fd = new FormData();
  fd.append("file", Buffer.from(bin), { filename: "thumb.jpg" });
  const up = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: fd
  }).then(r => r.json());
  const imageCid = up.IpfsHash;

  // 3. Buat metadata JSON
  const metadata = {
    name: video.snippet.title,
    description: video.snippet.description,
    image: `ipfs://${imageCid}`,
    animation_url: `https://youtube.com/watch?v=${videoId}`,
    attributes: [{ trait_type: "channel", value: video.snippet.channelTitle }]
  };

  // 4. Pin metadata
  const metaUp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  }).then(r => r.json());

  const tokenURI = `ipfs://${metaUp.IpfsHash}`;

  // 5. Mint NFT
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  const nft = new ethers.Contract(process.env.CONTRACT, [
    "function mintTo(address to, string tokenURI) public returns (uint256)"
  ], wallet);
  const tx = await nft.mintTo(wallet.address, tokenURI);
  const receipt = await tx.wait();

  res.json({ tokenURI, tx: receipt.transactionHash });
});
```

---

## 8) Marketplace
- NFT otomatis terbaca di **OpenSea** (Polygon).  
- Metadata dari IPFS → ditampilkan sebagai koleksi.  
- Royalti diatur via **ERC‑2981**.  

---

## 9) Catatan Legal & Praktis
- **Video penuh YouTube tidak boleh di-rehost** tanpa izin → gunakan link resmi (`animation_url`).  
- Thumbnail aman dipin ke IPFS.  
- NFT = sertifikat kepemilikan token, **bukan hak cipta video**.  
- Bisa dipakai untuk **membership, akses konten eksklusif, tiket event, dsb.**  

---

## 10) Checklist Implementasi
1. Buat Google Cloud Project + aktifkan YouTube API.  
2. Dapatkan OAuth client + API key.  
3. Ambil metadata video (snippet + stats).  
4. Upload thumbnail + metadata JSON ke IPFS.  
5. Deploy kontrak ERC‑721 + ERC‑2981 (Polygon).  
6. Mint NFT dengan `tokenURI = ipfs://CID_metadata`.  
7. Tampilkan / jual di marketplace.  

