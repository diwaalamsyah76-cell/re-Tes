// ===== App Initialization (app.js) =====

document.addEventListener("DOMContentLoaded", () => {
  console.log("Aplikasi NFTVerse dimulai...");

  // === Auto Connect Wallet jika sebelumnya sudah connect
  const savedAccount = localStorage.getItem("connectedAccount");
  if (savedAccount && typeof connectWallet === "function") {
    connectWallet();
  }

  // === Event: Connect Wallet
  const walletBtn = document.getElementById("walletButton");
  if (walletBtn) {
    walletBtn.addEventListener("click", () => {
      if (typeof connectWallet === "function") {
        connectWallet();
      } else {
        console.error("Fungsi connectWallet tidak ditemukan.");
      }
    });
  }

  // === Event: Mint NFT
  const mintBtn = document.getElementById("mintNftButton");
  if (mintBtn) {
    mintBtn.addEventListener("click", async () => {
      const name = document.getElementById("nftName").value;
      const desc = document.getElementById("nftDescription").value;
      const file = document.getElementById("nftImage").files[0];

      if (typeof mintNFT === "function") {
        await mintNFT(name, desc, file);
      } else {
        console.error("Fungsi mintNFT tidak ditemukan.");
      }
    });
  }

  // === Event: Load NFTs
  const loadNftsBtn = document.getElementById("loadNftsButton");
  if (loadNfts Btn) {
    loadNftsBtn.add Event Listener("click", async () => {
      if (typeof loadMyNFTs === "function") {
        await loadMyNFTs();
      } else {
        console.error("Fungsi loadMyNFTs tidak ditemukan.");
      }
    });
  }

  // === Event: AmbilPostinganInstagram
  constigBtn = document.getElementById("loadIgPostsButton");
  if (igBtn) {
    igBtn.addEventListener("click", async () => {
      if (typeofambilPostinganInstagram === "function") {
        awaitambilPostinganInstagram();
      } else {
        console.error("Fungsi ambil Postingan Instagram tidak ditemukan.");
      }
    });
  }

  // === Event: Pilih Postingan IG (delegasi)
  const ig Posts Container = document.getElementById("instagram-posts");
  if (ig Posts Container) {
    ig Posts Container.add Event Listener("click", (e) => {
      if (e.target.tagName === "BUTTON" && e.target.dataset.postId) {
        const { postId, mediaUrl, caption } = e.target.dataset;
        if (typeof pilih Posting === "function") {
          pilih Posting(post Id, media Url, caption);
        }
      }
    });
  }

  // === UI Init (Sidebar, Login, dsb.)
  if (typeof toggle Menu === "function") {
    console.log("UI module aktif.");
  }
});
