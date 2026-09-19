const wallet = "0xaA15b2871F844dB9Bd4076e78293FB797646fc64";
const contactEmail = "aiginol011@gmail.com";

const directEmail = document.querySelector("#direct-email");
if (directEmail) {
  directEmail.textContent = contactEmail;
  directEmail.href = `mailto:${contactEmail}`;
}


document.querySelectorAll("[data-package]").forEach((link) => {
  link.addEventListener("click", () => {
    const brief = document.querySelector('textarea[name="brief"]');
    brief.value = `สนใจแพ็กเกจ "${link.dataset.package}" อยากให้ช่วยเรื่อง: `;
  });
});

document.querySelector("#copy-wallet").addEventListener("click", async () => {
  await navigator.clipboard.writeText(wallet);
  const status = document.querySelector("#copy-status");
  status.textContent = "คัดลอกแล้ว";
  window.setTimeout(() => { status.textContent = ""; }, 2200);
});

document.querySelector("#contact-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const subject = encodeURIComponent(`โปรเจกต์ automation จาก ${data.get("name")}`);
  const body = encodeURIComponent(
    `ชื่อ/ธุรกิจ: ${data.get("name")}\nช่องทางติดต่อ: ${data.get("contact")}\n\nโจทย์:\n${data.get("brief")}`,
  );
  window.location.href = `mailto:${contactEmail}?subject=${subject}&body=${body}`;
});
