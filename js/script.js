document.addEventListener("DOMContentLoaded", () => {
  // ===============================================
  // DEFINISI ELEMENT
  // ===============================================
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  const navbar = document.getElementById("navbar");
  const icon = menuBtn ? menuBtn.querySelector("ion-icon") : null;
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
  let ticking = false;
  function handleScroll() {
    if (!navbar) return;

    // Cek apakah Menu sedang terbuka?
    // Jika TIDAK punya class translate-x-full, berarti TERBUKA.
    const isMenuOpen = menu && !menu.classList.contains("translate-x-full");
    
    // Jika menu terbuka, berhenti disini agar warna header tidak berubah
    if (isMenuOpen) return;

    // A. Ubah Style Navbar
    if (window.scrollY > 50) {
      navbar.classList.add("scrolled");
      navbar.classList.remove("py-4");
    } else {
      navbar.classList.remove("scrolled");
      navbar.classList.add("py-4");
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
      link.classList.remove("text-yellow-300");
      link.classList.add("text-white");
      if (link.getAttribute("href") === `#${current}`) { 
        link.classList.add("text-yellow-300");
        link.classList.remove("text-white");
      }
    });
  }

  // Optimasi event scroll menggunakan requestAnimationFrame
  // Mencegah browser kewalahan (lag) karena event scroll yang dipanggil puluhan kali per detik
  window.addEventListener("scroll", () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  });

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
      navbar.classList.remove("scrolled", "py-4");
      navbar.classList.add("bg-transparent", "border-none");
    }
    document.body.style.overflow = 'hidden'; // Mengunci scroll pada layar
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
    document.body.style.overflow = ''; // Membuka kunci scroll kembali
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
    sr.reveal("section h1", { origin: "top", distance: "30px" });
    sr.reveal(".news-card", { origin: "bottom", interval: 200 });
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

// ===============================================
// 5. PENGATURAN WEB DINAMIS (DARI SUPABASE)
// ===============================================
document.addEventListener("DOMContentLoaded", async () => {
  // Setup Supabase Client secara aman jika belum ada
  let client = window.supabaseClient;
  if (!client && typeof supabase !== 'undefined') {
    const supabaseUrl = 'https://ejhmwxqbpmjkvudazjmc.supabase.co';
    const supabaseKey = 'sb_publishable_pfloSKirXdrAE2lj7ygHNg_o-aMJPjz';
    client = supabase.createClient(supabaseUrl, supabaseKey);
  }

  if (client) {
    try {
      const { data, error } = await client.from('pengaturan_web').select('*').eq('id', 1).maybeSingle();
      if (data && !error) {
        // Ambil elemen berdasarkan ID
        const heroHome = document.getElementById('hero-bg-home');
        const heroPpdb = document.getElementById('hero-bg-ppdb');
        const heroProfil = document.getElementById('home'); // ID Home ada di halaman profil
        
        const brosur1 = document.getElementById('img-brosur-1');
        const brosur2 = document.getElementById('img-brosur-2');
        const brosur3 = document.getElementById('img-brosur-3');

        // Fungsi helper untuk verifikasi gambar sebelum diterapkan
        // Jika link mati/gagal dimuat, akan diabaikan dan tetap menggunakan foto bawaan sistem (fallback otomatis)
        const applyImageSafe = (element, url, isBg = false) => {
          if (!element || !url) return;
          const tempImg = new Image();
          tempImg.onload = () => {
            if (isBg) { element.style.backgroundImage = `url('${url}')`; }
            else { element.src = url; }
          };
          tempImg.src = url; // Memicu proses load, jika error (link tidak valid) tidak terjadi apa-apa
        };

        applyImageSafe(heroHome, data.bg_home, true);
        applyImageSafe(heroPpdb, data.bg_ppdb, true);
        if (window.location.pathname.includes('profil.html')) { applyImageSafe(heroProfil, data.bg_profil, true); }

        applyImageSafe(brosur1, data.brosur_1, false);
        applyImageSafe(brosur2, data.brosur_2, false);
        applyImageSafe(brosur3, data.brosur_3, false);
      }
    } catch (e) {
      console.warn("Gagal memuat pengaturan web dinamis:", e);
    }
  }
});