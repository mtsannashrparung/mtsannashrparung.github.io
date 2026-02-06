document.addEventListener("DOMContentLoaded", () => {
  // ===============================================
  // DEFINISI ELEMENT
  // ===============================================
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  const navbar = document.getElementById("navbar");
  const icon = menuBtn ? menuBtn.querySelector("ion-icon") : null;
  const slider = document.querySelector(".slider");
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  // ===============================================
  // 0. INITIALIZATION
  // ===============================================
  // [PERBAIKAN 1] Gunakan translate-x-full (100%) agar menu benar-benar hilang ke kanan.
  // Jika pakai 40%, menu masih nongol separuh.
  if (menu) {
    menu.classList.add("translate-x-full");
  }

  // ===============================================
  // 1. LOGIKA SCROLL
  // ===============================================
  function handleScroll() {
    if (!navbar) return;

    // Cek apakah Menu sedang terbuka?
    // Jika TIDAK punya class translate-x-full, berarti TERBUKA.
    const isMenuOpen = menu && !menu.classList.contains("translate-x-full");
    
    // Jika menu terbuka, berhenti disini agar warna header tidak berubah
    if (isMenuOpen) return;

    // A. Ubah Style Navbar
    if (window.scrollY > 50) {
      navbar.classList.add("bg-[#27AE60]/90", "shadow-xl", "backdrop-blur-sm");
      navbar.classList.remove("bg-transparent", "border-b-2", "border-green-200");
    } else {
      navbar.classList.remove("bg-[#27AE60]/90", "shadow-xl", "backdrop-blur-sm");
      navbar.classList.add("bg-transparent", "border-b-2", "border-green-200");
    }

    // B. Highlight Link Aktif
    let current = "";
    sections.forEach((section) => {
      const sectionTop = section.offsetTop - 150;
      const sectionHeight = section.clientHeight;
      if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
        current = section.getAttribute("id");
      }
    });

    navLinks.forEach((link) => {
      link.classList.remove("text-yellow-300", "font-bold");
      if (link.getAttribute("href") === `#${current}`) {
        link.classList.add("text-yellow-300", "font-bold");
      }
    });
  }

  // [PERBAIKAN 2] Hapus tanda kurung () di dalam addEventListener
  // Salah: window.addEventListener("scroll", handleScroll()); -> Fungsi jalan duluan sebelum discroll
  // Benar: window.addEventListener("scroll", handleScroll); -> Fungsi jalan SAAT discroll
  window.addEventListener("scroll", handleScroll);
  
  // Jalankan sekali saat load agar style navbar langsung benar
  handleScroll(); 

  // ===============================================
  // 2. LOGIKA MENU (TOGGLE)
  // ===============================================
  
  function openMenuActions() {
    menu.classList.remove("translate-x-full");
    if (icon) icon.setAttribute("name", "close-outline");

    // Saat menu BUKA, buat navbar jadi invisible (transparan total)
    if (navbar) {
      navbar.classList.remove("bg-[#27AE60]/90", "bg-[#27AE60]", "shadow-xl", "backdrop-blur-sm", "border-b-2", "border-green-200");
      navbar.classList.add("bg-transparent", "border-none");
    }
  }

  function closeMenuActions() {
    // [PERBAIKAN 3] Kembalikan ke translate-x-full agar menu tertutup sempurna
    menu.classList.add("translate-x-full");
    
    if (icon) icon.setAttribute("name", "menu-outline");

    if (navbar) {
      navbar.classList.remove("border-none");
      // Panggil handleScroll segera supaya style navbar kembali
      handleScroll(); 
    }
  }

  if (menuBtn && menu && navbar) {
    // Event Klik Tombol
    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isClosed = menu.classList.contains("translate-x-full");
      if (isClosed) {
        openMenuActions();
      } else {
        closeMenuActions();
      }
    });

    // Event Klik Luar (Click Outside)
    document.addEventListener("click", (e) => {
      const isMenuOpen = !menu.classList.contains("translate-x-full");
      if (isMenuOpen && !menu.contains(e.target) && !menuBtn.contains(e.target)) {
        closeMenuActions();
      }
    });
  }

  window.closeMenu = function () {
    if (menu) closeMenuActions();
  };

  // ===============================================
  // 3. LOGIKA CAROUSEL & ANIMASI
  // ===============================================
  if (slider) {
    document.addEventListener("click", (e) => {
      const items = slider.querySelectorAll(".item");
      if (e.target.matches(".next")) slider.append(items[0]);
      if (e.target.matches(".prev")) slider.prepend(items[items.length - 1]);
    });
  }

  if (typeof ScrollReveal !== "undefined") {
    const sr = ScrollReveal({
      reset: true,
      distance: "60px",
      duration: 1000,
      delay: 400,
    });

    sr.reveal(".about-content", { origin: "bottom", opacity: 0 });
    sr.reveal(".about-image", { origin: "left", opacity: 0 });
    sr.reveal("#tentang h3", { origin: "left", interval: 200 });
    sr.reveal("#tentang ul li", { origin: "bottom", interval: 100 });
    sr.reveal(".program-card", { origin: "bottom", interval: 200, scale: 0.9 });
    sr.reveal("h1", { origin: "top", distance: "30px" });
  }
});

// ===============================================
// 4. LIGHTBOX FUNCTION (GLOBAL)
// ===============================================
function openLightbox(element) {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  
  if (lightbox && lightboxImg) {
    // Set gambar popup sesuai gambar yang diklik
    lightboxImg.src = element.src;
    
    // Tampilkan lightbox
    lightbox.classList.remove("hidden");
    
    // Animasi zoom in halus
    setTimeout(() => {
      lightboxImg.classList.remove("scale-90");
      lightboxImg.classList.add("scale-100");
    }, 10);
  }
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  
  if (lightbox) {
    // Sembunyikan lightbox
    lightbox.classList.add("hidden");
    if (lightboxImg) {
      lightboxImg.classList.remove("scale-100");
      lightboxImg.classList.add("scale-90");
    }
  }
}