document.addEventListener("DOMContentLoaded", () => {
  // ===================================
  // 1. Navbar Toggle & Menu (MOBILE)
  // ===================================
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  // Mencari ion-icon di dalam tombol, jika tidak ada, null
  const icon = menuBtn ? menuBtn.querySelector("ion-icon") : null;

  // Fungsi Toggle Menu
  if (menuBtn && menu && icon) {
    menuBtn.addEventListener("click", () => {
      // Cek apakah menu sedang tertutup (ada class translate-x-full)
      const isClosed = menu.classList.contains("translate-x-full");

      if (isClosed) {
        // BUKA MENU
        menu.classList.remove("translate-x-full");
        icon.setAttribute("name", "close-outline");
      } else {
        // TUTUP MENU
        menu.classList.add("translate-x-full");
        icon.setAttribute("name", "menu-outline");
      }
    });
  }

  // Fungsi Global untuk menutup menu (bisa dipanggil dari HTML onclick="closeMenu()")
  window.closeMenu = function () {
    if (menu && icon) {
      menu.classList.add("translate-x-full");
      icon.setAttribute("name", "menu-outline");
    }
  };

  // ===================================
  // 2. Efek Scroll Navbar & Active Link
  // ===================================
  const navbar = document.getElementById("navbar");
  const sections = document.querySelectorAll("section");
  const navLinks = document.querySelectorAll(".nav-link");

  if (navbar) {
    window.addEventListener("scroll", () => {
      // A. Ubah Background Navbar saat Scroll
      if (window.scrollY > 50) {
        navbar.classList.add("bg-[#27AE60]/90", "shadow-xl");
        navbar.classList.remove("bg-transparent", "border-b-2"); // Hapus border saat scroll agar lebih bersih
      } else {
        navbar.classList.remove("bg-[#27AE60]/90", "shadow-xl");
        navbar.classList.add("bg-transparent", "border-b-2"); // Kembalikan border saat di atas
      }

      // B. Highlight Link Aktif
      let current = "";
      sections.forEach((section) => {
        const sectionTop = section.offsetTop - 150;
        const sectionHeight = section.clientHeight;
        if (
          window.scrollY >= sectionTop &&
          window.scrollY < sectionTop + sectionHeight
        ) {
          current = section.getAttribute("id");
        }
      });

      navLinks.forEach((link) => {
        link.classList.remove("text-yellow-300", "font-bold");
        if (link.getAttribute("href") === `#${current}`) {
          link.classList.add("text-yellow-300", "font-bold");
        }
      });
    });
  }

  // ===================================
  // 3. Carousel (Fasilitas)
  // ===================================
  const slider = document.querySelector(".slider");
  
  if (slider) {
    // Event listener hanya ditambahkan jika elemen .slider ada
    document.addEventListener("click", (e) => {
      const items = slider.querySelectorAll(".item");
      
      if (e.target.matches(".next")) {
        slider.append(items[0]); // Pindahkan item pertama ke akhir
      }
      
      if (e.target.matches(".prev")) {
        slider.prepend(items[items.length - 1]); // Pindahkan item terakhir ke awal
      }
    });
  }

  // ===================================
  // 4. Scroll Reveal (Animasi)
  // ===================================
  // Cek apakah library ScrollReveal sudah dimuat
  if (typeof ScrollReveal !== "undefined") {
    const sr = ScrollReveal({
      reset: true,
      distance: "60px",
      duration: 2500,
      delay: 400,
    });

    sr.reveal(".about-content", { origin: "bottom", opacity: 0 });
    sr.reveal(".about-image", { origin: "left", opacity: 0 });
    
    // Visi Misi
    sr.reveal("#tentang h3", { origin: "left", interval: 200 });
    sr.reveal("#tentang ul li", { origin: "bottom", interval: 100 });

    // Program Cards
    sr.reveal(".program-card", { 
      origin: "bottom", 
      interval: 200, 
      scale: 0.9 
    });
    
    // Judul Section
    sr.reveal("h1", { origin: "top", distance: "30px" });
  }
});