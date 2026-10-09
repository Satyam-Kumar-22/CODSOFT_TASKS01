
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.getElementById("navLinks");

menuBtn.addEventListener("click", () => {
  const isOpen = navLinks.classList.toggle("active");
  menuBtn.setAttribute("aria-expanded", isOpen);
  menuBtn.textContent = isOpen ? "✕" : "☰";
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", () => {
    navLinks.classList.remove("active");
    menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.textContent = "☰";
  });
});

document.getElementById("year").textContent =
  new Date().getFullYear();

const contactForm = document.getElementById("contactForm");
const formStatus = document.getElementById("formStatus");

contactForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const message = document.getElementById("message").value.trim();

  if (!name || !email || !message) {
    formStatus.textContent = "Please fill in all fields.";
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    formStatus.textContent = "Please enter a valid email address.";
    return;
  }

  formStatus.textContent =
    "Form validated successfully! No message has been sent yet.";

  contactForm.reset();
});
