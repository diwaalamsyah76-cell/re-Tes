// ===== Sidebar =====
function toggleMenu() {
  const sidebar = document.getElementById('sidebar');
  sidebar.classList.toggle('active');
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) {
    const offset = 60; // Tinggi header fixed
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  } else {
    console.warn(`Section "${id}" tidak ditemukan.`);
    alert(`Section "${id}" belum dibuat. Silakan tambahkan section dengan id: ${id}`);
  }
}

// ===== Login =====
function toggleLogin() {
  const loginBox = document.getElementById("loginBox");
  loginBox.style.display = loginBox.style.display === "block" ? "none" : "block";
}

document.getElementById("loginForm").addEventListener("submit", function (e) {
  e.preventDefault();
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const message = document.getElementById("message");

  if (email === "yourexsimpel@gmail.com" && password === "123456") {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("userMenu").style.display = "block";
    document.getElementById("userName").textContent = email.split('@')[0];
    message.className = 'message success';
    message.textContent = "Login successful!";
    alert('Login successful');
  } else {
    message.className = 'message';
    message.textContent = "Invalid email or password.";
  }
});

function logout() {
  if (!confirm("Are you sure you want to logout?")) return;
  localStorage.removeItem('userLoggedIn');
  localStorage.removeItem('userEmail');
  const message = document.getElementById("message");
  message.className = 'message success';
  message.textContent = "You have logged out successfully!";
  document.getElementById("userMenu").style.display = "none";
  document.getElementById("loginBox").style.display = "block";
  document.getElementById("userName").textContent = "User";
  alert('Logout successful');
}

// ===== Wallet Sidebar =====
function showWalletSidebar(address, balance, nftCount) {
  const rbox = document.getElementById("RBox");
  rbox.style.display = "block";
  setTimeout(() => rbox.classList.add("active"), 10);
  document.getElementById("sidebarWalletAddress").textContent = address;
  document.getElementById("sidebarWalletBalance").textContent = balance;
  document.getElementById("sidebarNftCount").textContent = nftCount;
}

function hideWalletSidebar() {
  const rbox = document.getElementById("RBox");
  rbox.classList.remove("active");
  setTimeout(() => rbox.style.display = "none", 400);
}

// ===== Sosmed Menu =====
function toggleSosmedMenu() {
  const menu = document.getElementById("sosmed-menu");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function toggleForm() {
  const form = document.getElementById("form-section");
  form.style.display = form.style.display === "block" ? "none" : "block";
}

function tambahSosmed() {
  const nama = document.getElementById("nama").value.trim();
  const link = document.getElementById("link").value.trim();

  if (!nama || !link) {
    alert("Mohon isi nama dan link sosial media.");
    return;
  }

  const ul = document.getElementById("sosmed-menu");

  const li = document.createElement("li");
  li.style.margin = "8px 0";

  const a = document.createElement("a");
  a.href = link;
  a.target = "_blank";
  a.textContent = nama;
  a.className = "wallet-btn";

  li.appendChild(a);
  ul.appendChild(li);

  ul.style.display = "block"; // tampilkan menu setelah tambah
  document.getElementById("nama").value = "";
  document.getElementById("link").value = "";
}
