// ===== Instagram Integration (instagram.js) =====

// Token akses dari proses login Instagram Graph API
const INSTAGRAM_ACCESS_TOKEN = "YOUR_IG_ACCESS_TOKEN";
const GRAPH_API_URL = "https://graph.instagram.com";

// Ambil list media user
async function ambilPostinganInstagram(limit = 12) {
  try {
    const url = `${GRAPH_API_URL}/me/media?fields=id,caption,media_url,permalink,timestamp,media_type&access_token=${INSTAGRAM_ACCESS_TOKEN}&limit=${limit}`;
    const res = await fetch(url);
    const data = await res.json();

    // Cek token expired
    if (data.error) {
      console.error("Instagram API Error:", data.error);
      if (data.error.code === 190) {
        alert("Token Instagram kadaluarsa. Silakan login ulang.");
      } else {
        alert(`Gagal mengambil postingan IG: ${data.error.message}`);
      }
      return;
    }

    renderGridInstagram(data.data);
  } catch (err) {
    console.error("Gagal memanggil API Instagram:", err);
    alert("Terjadi kesalahan saat mengambil postingan IG.");
  }
}

// Render grid IG
function renderGridInstagram(posts) {
  const container = document.getElementById("instagram-posts");
  container.innerHTML = "";

  if (!posts || posts.length === 0) {
    container.innerHTML = "<p>Tidak ada postingan ditemukan.</p>";
    return;
  }

  posts.forEach(post => {
    const card = document.createElement("div");
    card.className = "insta-card";
    card.style.border = "1px solid #ccc";
    card.style.borderRadius = "8px";
    card.style.padding = "10px";
    card.style.textAlign = "center";

    card.innerHTML = `
      <img src="${post.media_url}" alt="IG Post" style="max-width:100%;border-radius:6px;">
      <p>${post.caption ? post.caption.substring(0, 50) + "..." : "Tanpa caption"}</p>
      <button onclick="pilihPostingIG('${post.id}', '${post.media_url}', \`${post.caption || ""}\`, '${post.permalink}', '${post.timestamp}')">
        Pilih untuk NFT
      </button>
    `;
    container.appendChild(card);
  });
}

// Saat user pilih posting → prefill form NFT
function pilihPostingIG(id, mediaUrl, caption, permalink, timestamp) {
  // Notifikasi hak cipta
  alert("Pastikan Anda memiliki hak penuh atas media ini sebelum mint NFT.");

  // Prefill form Mint NFT
  const titleField = document.getElementById("nftName");
  const descField = document.getElementById("nftDescription");

  if (titleField) titleField.value = caption || "NFT Tanpa Judul";
  if (descField) descField.value = `${caption || ""}\n\nLink: ${permalink}\nTanggal: ${new Date(timestamp).toLocaleString()}`;

  // Simpan media URL untuk digunakan saat mint
  localStorage.setItem("selectedIgMediaUrl", mediaUrl);

  alert("Postingan dipilih. Silakan lanjutkan mint NFT.");
}

// Opsional: Ambil image IG jadi Blob untuk upload ke IPFS
async function getSelectedImageFile() {
  const mediaUrl = localStorage.getItem("selectedIgMediaUrl");
  if (!mediaUrl) return null;

  const response = await fetch(mediaUrl);
  const blob = await response.blob();
  const fileName = "instagram_post.jpg";
  return new File([blob], fileName, { type: blob.type });
}
