const btn = document.getElementById("menuBtn");
const menu = document.getElementById("menu");

btn.addEventListener("click", () => {
  menu.classList.toggle("hidden");
});


// Smooth scroll button effect (opsional)
  const navbar = document.getElementById("navbar");

  window.addEventListener("scroll", () => {
    if (window.scrollY > 50) {
      navbar.classList.add("bg-emerald-700/95", "shadow-lg");
    } else {
      navbar.classList.remove("bg-emerald-700/95", "shadow-lg");
    }
  });

  const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav ul li a");

window.addEventListener("scroll", () => {
  let current = "";

  sections.forEach((section) => {
    const sectionTop = section.offsetTop - 500;
    const sectionHeight = section.clientHeight;

    if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");

    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

var slideUp = {
    distance: '150%',
    origin: 'bottom',
    opacity: null,
    easing: 'ease-in'
};

var slideDown = {
    distance: '200%', 
    origin: 'top',
    opacity: null
};

var slideRight = {
    distance: '50%',
    easing : 'ease-in',
    origin: 'right',
    opacity: null,
    interval: 600
};


ScrollReveal().reveal(' .about-content', slideUp);
ScrollReveal().reveal('.about' ,slideDown);
ScrollReveal().reveal('.text-left' ,slideRight);
ScrollReveal().reveal('.program' , {scale: 0.85});
ScrollReveal().reveal('.program1',{delay: 100,
  origin:'top'
});




