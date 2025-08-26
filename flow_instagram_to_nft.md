
# Instagram → IPFS → Polygon (NFT) — End‑to‑End Flow

> Contoh implementasi **tokenisasi konten Instagram** menjadi NFT di Polygon (bisa juga Ethereum). Termasuk langkah OAuth, ambil media, upload ke IPFS, mint ERC‑721 (dengan royalti ERC‑2981), dan listing di marketplace.

---

## 0) Prasyarat
- **Akun Meta Developer** + App (Instagram Basic Display / Instagram Graph API).
- **Client ID, Client Secret, Redirect URI**.
- **Wallet** (MetaMask) + RPC Polygon (Alchemy/Infura/QuickNode).
- **Node.js** (v18+), **Hardhat**, **OpenZeppelin**.
- **Pinning service IPFS** (Pinata / web3.storage / NFT.Storage).

---

## 1) OAuth Instagram (Basic Display)
Gunakan **Basic Display API** jika ingin baca media milik user untuk diminting.

### 1.1 Authorize
```
GET https://api.instagram.com/oauth/authorize
  ?client_id=IG_CLIENT_ID
  &redirect_uri=REDIRECT_URI
  &scope=user_profile,user_media
  &response_type=code
```

### 1.2 Tukar code → access_token
```
POST https://api.instagram.com/oauth/access_token
Content-Type: application/x-www-form-urlencoded

client_id=IG_CLIENT_ID&client_secret=IG_CLIENT_SECRET&grant_type=authorization_code&redirect_uri=REDIRECT_URI&code=AUTH_CODE
```
**Respon**: `access_token`, `user_id` (short‑lived). Tukar ke **long‑lived**:
```
GET https://graph.instagram.com/access_token
  ?grant_type=ig_exchange_token
  &client_secret=IG_CLIENT_SECRET
  &access_token=SHORT_LIVED_TOKEN
```

### 1.3 Ambil media user
```
GET https://graph.instagram.com/me/media
  ?fields=id,caption,media_type,media_url,permalink,thumbnail_url,timestamp
  &access_token=LONG_LIVED_TOKEN
```

---

## 2) Ambil file & siapkan metadata
- Download `media_url` (gambar/video). Untuk video, simpan thumbnail juga jika perlu.
- Buat **metadata JSON** sesuai standar NFT:

```json
{
  "name": "My IG Post #1",
  "description": "Tokenisasi postingan Instagram 2025-08-21",
  "image": "ipfs://<CID_IMAGE>",
  "animation_url": "ipfs://<CID_VIDEO>",
  "external_url": "https://instagram.com/p/<shortcode>",
  "attributes": [
    {"trait_type": "platform", "value": "instagram"},
    {"trait_type": "media_type", "value": "IMAGE"}
  ]
}
```

---

## 3) Upload ke IPFS (contoh Pinata & web3.storage)

### 3.1 Pinata (file)
```
POST https://api.pinata.cloud/pinning/pinFileToIPFS
Headers:
  Authorization: Bearer <PINATA_JWT>
Body (form-data):
  file: <binary>
```
**Respon**: `IpfsHash` (CID).

### 3.2 Pinata (JSON metadata)
```
POST https://api.pinata.cloud/pinning/pinJSONToIPFS
Headers:
  Authorization: Bearer <PINATA_JWT>
Body (JSON):
  { ...metadata... }
```

### 3.3 web3.storage (alternatif)
```
POST https://api.web3.storage/upload
Headers:
  Authorization: Bearer <WEB3STORAGE_TOKEN>
Body:
  <file or CAR>
```

---

## 4) Smart Contract ERC‑721 + Royalti (ERC‑2981)

**contracts/IGContentNFT.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";

contract IGContentNFT is ERC721URIStorage, ERC2981, Ownable {
    uint256 public nextTokenId;

    constructor(address defaultRoyaltyReceiver, uint96 feeNumerator)
        ERC721("IGContentNFT", "IGCN")
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

    // OpenZeppelin compatibility
    function supportsInterface(bytes4 interfaceId)
        public view override(ERC721, ERC2981) returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
```

**Deploy dengan Hardhat (Polygon):**
```bash
npm i --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm i @openzeppelin/contracts dotenv
```

**hardhat.config.ts (ringkas):**
```ts
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv"; dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    polygon: {
      url: process.env.POLYGON_RPC,
      accounts: [process.env.PRIVATE_KEY!]
    }
  }
};
export default config;
```

**scripts/deploy.ts**
```ts
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const Factory = await ethers.getContractFactory("IGContentNFT");
  const contract = await Factory.deploy(deployer.address, 500); // 5% royalti
  await contract.waitForDeployment();
  console.log("Deployed at:", await contract.getAddress());
}
main();
```

---

## 5) Mint NFT (tokenURI = ipfs://CID_METADATA)

**scripts/mint.ts**
```ts
import { ethers } from "hardhat";

const CONTRACT = "0xYourContractAddress";
const TOKEN_URI = "ipfs://bafy.../metadata.json";
const TO = "0xBuyerOrCreator";

async function main() {
  const nft = await ethers.getContractAt("IGContentNFT", CONTRACT);
  const tx = await nft.mintTo(TO, TOKEN_URI);
  console.log("Mint tx:", tx.hash);
  await tx.wait();
  console.log("Done.");
}
main();
```

---

## 6) Backend ringkas (Node/Express) — Pseudocode

```ts
// app.ts (sketsa, tidak lengkap)
import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import { ethers } from "ethers";
import dotenv from "dotenv"; dotenv.config();

const app = express();

app.get("/oauth/callback", async (req, res) => {
  const code = req.query.code as string;
  // 1) Exchange code -> access_token
  const tokenResp = await fetch("https://api.instagram.com/oauth/access_token", {
    method: "POST",
    headers: {"Content-Type": "application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      client_id: process.env.IG_CLIENT_ID!,
      client_secret: process.env.IG_CLIENT_SECRET!,
      grant_type: "authorization_code",
      redirect_uri: process.env.REDIRECT_URI!,
      code
    })
  }).then(r => r.json());

  // 2) Get user media
  const mediaResp = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${tokenResp.access_token}`).then(r=>r.json());

  // 3) Download first media
  const mediaUrl = mediaResp.data[0].media_url;
  const bin = await fetch(mediaUrl).then(r=>r.arrayBuffer());

  // 4) Upload to IPFS (Pinata)
  const fd = new FormData();
  fd.append("file", Buffer.from(bin), { filename: "asset.jpg" });
  const up = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT!}` },
    body: fd
  }).then(r=>r.json());
  const imageCid = up.IpfsHash;

  // 5) Build & pin metadata
  const metadata = {
    name: "IG Post NFT",
    description: "Minted from Instagram content",
    image: `ipfs://${imageCid}`,
    external_url: mediaResp.data[0].permalink,
    attributes: [{trait_type: "platform", value: "instagram"}]
  };
  const metaUp = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PINATA_JWT!}`, "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  }).then(r=>r.json());

  const tokenURI = `ipfs://${metaUp.IpfsHash}`;

  // 6) Mint on Polygon
  const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC!);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const nft = new ethers.Contract(process.env.CONTRACT!, [ // ABI potongan
    "function mintTo(address to, string tokenURI) public returns (uint256)"
  ], wallet);
  const tx = await nft.mintTo(wallet.address, tokenURI);
  const receipt = await tx.wait();

  res.json({ tokenURI, tx: receipt?.transactionHash });
});

app.listen(3000, () => console.log("Server running on :3000"));
```

---

## 7) Listing di Marketplace
- **OpenSea** otomatis membaca NFT dari kontrak di Polygon (tidak perlu upload ulang).
- Pastikan **metadata “frozen”** (CID IPFS permanen).
- Royalti mengikuti **ERC‑2981** (sebagian marketplace membacanya langsung).

---

## 8) Catatan Legal & Keamanan
- **Hak cipta** tetap milik kreator; NFT = sertifikat kepemilikan token, bukan hak penuh.
- Simpan **hash konten** di metadata untuk anti‑tamper.
- Gunakan **rate limit / webhook verifikasi** saat tarik media dari API.
- Enkripsi **client secret** & gunakan **PKCE** untuk OAuth (jika SPA).
- Sediakan **Terms & License** yang memisahkan lisensi **kode** vs **konten**.

---

## 9) Checklist Implementasi Cepat
1. Siapkan app Instagram + redirect URI.  
2. OAuth → dapatkan long‑lived token.  
3. Ambil media_url → unduh → pin ke IPFS.  
4. Bangun metadata JSON → pin ke IPFS.  
5. Deploy kontrak ERC‑721 + ERC‑2981 (Polygon).  
6. Panggil `mintTo(to, tokenURI)`.  
7. Verifikasi di Polygonscan / OpenSea.  
8. Dokumentasikan lisensi & hak penggunaan.

