
# TikTok → IPFS → Polygon (NFT) — End‑to‑End Flow

> Blueprint implementasi **tokenisasi konten TikTok** menjadi NFT di Polygon. Memakai OAuth 2.0 TikTok untuk akses video milik user, upload aset ke IPFS, mint ERC‑721 (royalti ERC‑2981), lalu tampil di marketplace.

> ⚠️ Nama endpoint & scope TikTok dapat berubah. Gunakan dokumentasi resmi TikTok for Developers untuk URL terbaru. Di bawah ini ditulis sebagai **pola umum + placeholder** agar mudah diadaptasi.

---

## 0) Prasyarat
- **TikTok for Developers** app (Login Kit / Open API) dengan OAuth 2.0 diaktifkan.
- **Client ID, Client Secret, Redirect URI**.
- Scope yang relevan (contoh/placeholder): `user.info.basic`, `video.list` (atau setara untuk membaca video milik user).
- **Wallet** (MetaMask) + RPC Polygon (Alchemy/Infura/QuickNode).
- **Node.js** (v18+), **Hardhat**, **OpenZeppelin**.
- **Pinning service IPFS** (Pinata / web3.storage / NFT.Storage).

---

## 1) OAuth TikTok (placeholder pola umum)

### 1.1 Authorize
```
GET https://<tiktok-oauth-host>/oauth/authorize
 ?client_id=CLIENT_ID
 &redirect_uri=REDIRECT_URI
 &response_type=code
 &scope=user.info.basic%20video.list
 &state=RANDOM_STATE
```

### 1.2 Tukar code → access_token
```
POST https://<tiktok-oauth-host>/oauth/token
Content-Type: application/x-www-form-urlencoded

client_id=CLIENT_ID&
client_secret=CLIENT_SECRET&
grant_type=authorization_code&
redirect_uri=REDIRECT_URI&
code=AUTH_CODE
```

**Respon**: `access_token` (dan mungkin `refresh_token`).

---

## 2) Ambil Daftar Video User (placeholder)
```
GET https://<tiktok-api-host>/v2/video/list/
Headers: Authorization: Bearer ACCESS_TOKEN
Query:  page_size=20&cursor=...
```
**Respon** berisi data video milik user (id, cover/thumbnail, title/desc, url/permalink, timestamp). Pilih video yang ingin ditokenisasi.

👉 Alternatif: jika tidak ada endpoint publik untuk konten user, minta **input manual** berupa **URL video TikTok** lalu ambil metadata publik (judul, cover thumbnail).

---

## 3) Siapkan Metadata NFT
- Unduh **thumbnail/cover** (lebih aman secara hak cipta daripada menyimpan file video penuh).
- Buat metadata JSON sesuai standar NFT.

```json
{
  "name": "TikTok NFT - My Clip",
  "description": "Tokenisasi video TikTok milik kreator.",
  "image": "ipfs://<CID_THUMBNAIL>",
  "animation_url": "https://www.tiktok.com/@username/video/VIDEO_ID",
  "external_url": "https://www.tiktok.com/@username/video/VIDEO_ID",
  "attributes": [
    {"trait_type": "platform", "value": "tiktok"},
    {"trait_type": "likes", "value": 1234},
    {"trait_type": "shares", "value": 56}
  ]
}
```

> **Catatan:** `animation_url` menunjuk ke URL resmi TikTok. Hindari mere-host video penuh ke IPFS tanpa izin eksplisit dari kreator/hak cipta.

---

## 4) Upload ke IPFS
### 4.1 Pin file (thumbnail)
```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Headers: Authorization: Bearer <PINATA_JWT>
Body (form-data): file: <binary>
```
### 4.2 Pin JSON metadata
```
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
Headers: Authorization: Bearer <PINATA_JWT>
Body: { ...metadata... }
```

---

## 5) Smart Contract ERC‑721 + Royalti (ERC‑2981)

**contracts/TikTokNFT.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract TikTokNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId;

    constructor(address defaultRoyaltyReceiver, uint96 feeNumerator)
        ERC721("TikTokNFT", "TTNFT")
        Ownable(msg.sender)
    {
        _setDefaultRoyalty(defaultRoyaltyReceiver, feeNumerator); // 500 = 5%
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

## 6) Mint di Polygon
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
app.get("/tiktok/mint/:videoId", async (req, res) => {
  const { videoId } = req.params;

  // (A) Ambil metadata video via TikTok API (placeholder).
  // const data = await fetch(`https://<tiktok-api-host>/v2/video/get/?video_id=${videoId}`, {
  //   headers: { Authorization: `Bearer ${accessToken}` }
  // }).then(r=>r.json());

  // (B) Jika tidak ada akses API, minta client kirim URL + metadata publik.
  const videoUrl = `https://www.tiktok.com/@username/video/${videoId}`;
  const thumbUrl = "<cover_image_url_from_api_or_scraper>";
  const bin = await fetch(thumbUrl).then(r=>r.arrayBuffer());

  // Upload thumbnail ke IPFS
  const fd = new FormData();
  fd.append("file", Buffer.from(bin), { filename: "thumb.jpg" });
  const up = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}` },
    body: fd
  }).then(r=>r.json());
  const imageCid = up.IpfsHash;

  // Build metadata
  const metadata = {
    name: `TikTok Video ${videoId}`,
    description: "Minted from TikTok content",
    image: `ipfs://${imageCid}`,
    animation_url: videoUrl,
    attributes: [{ trait_type: "platform", value: "tiktok" }]
  };

  // Pin metadata ke IPFS
  const metaUp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT}`, "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  }).then(r=>r.json());
  const tokenURI = `ipfs://${metaUp.IpfsHash}`;

  // Mint NFT
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
- NFT otomatis muncul di **OpenSea (Polygon)** setelah mint.  
- Royalti mengikuti **ERC‑2981**.  
- Pastikan metadata sudah final (gunakan CID IPFS permanen).

---

## 9) Catatan Legal & Praktis
- **Hormati hak cipta**: jangan simpan video penuh tanpa izin tertulis.  
- Gunakan `animation_url` menunjuk ke halaman video TikTok resmi.  
- Sediakan **Terms & License** yang menjelaskan bahwa NFT ≠ hak cipta konten.  
- Pertimbangkan model **utility** (NFT sebagai akses ke konten privat, fan perks, dsb.).

---

## 10) Checklist Implementasi
1. Buat app TikTok (OAuth 2.0).  
2. Dapatkan `code` → `access_token` (+ `refresh_token`).  
3. Ambil daftar video milik user (atau minta URL video).  
4. Upload cover/thumbnail ke IPFS.  
5. Buat & pin metadata JSON ke IPFS.  
6. Deploy kontrak ERC‑721 + ERC‑2981 (Polygon).  
7. Mint NFT (`tokenURI = ipfs://CID_metadata`).  
8. Verifikasi di Polygonscan & OpenSea.  

