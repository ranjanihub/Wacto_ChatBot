(function () {
  if (document.getElementById("wacto-chat-launcher")) return;

  const iframe = document.createElement("iframe");
  iframe.src = "https://wacto-chat-bot.vercel.app/widget";
  iframe.id = "wacto-chat-frame";

  Object.assign(iframe.style, {
    position: "fixed",
    bottom: "90px",
    right: "20px",
    width: "380px",
    height: "620px",
    border: "none",
    borderRadius: "16px",
    background: "transparent",
    display: "none",
    zIndex: "999999",
    overflow: "hidden"
  });

  document.body.appendChild(iframe);

  const launcher = document.createElement("div");
  launcher.id = "wacto-chat-launcher";

  launcher.innerHTML = `
    <img
      src="https://wacto-chat-bot.vercel.app/logo.jpg"
      alt="Wacto Chat"
      style="
        width:60px;
        height:60px;
        border-radius:50%;
        cursor:pointer;
        box-shadow:0 4px 12px rgba(0,0,0,.2);
        object-fit:cover;
      "
    />
  `;

  Object.assign(launcher.style, {
    position: "fixed",
    bottom: "20px",
    right: "20px",
    zIndex: "999999",
    cursor: "pointer"
  });

  document.body.appendChild(launcher);

  const closeBtn = document.createElement("button");
  closeBtn.innerHTML = "✕";

  Object.assign(closeBtn.style, {
    position: "fixed",
    bottom: "730px",
    right: "20px",
    width: "30px",
    height: "30px",
    border: "none",
    borderRadius: "50%",
    background: "#542ccd",
    color: "#fff",
    cursor: "pointer",
    display: "none",
    zIndex: "1000000"
  });

  document.body.appendChild(closeBtn);

  launcher.addEventListener("click", () => {
    const isOpen = iframe.style.display === "block";
    iframe.style.display = isOpen ? "none" : "block";
    closeBtn.style.display = isOpen ? "none" : "block";
  });

  closeBtn.addEventListener("click", () => {
    iframe.style.display = "none";
    closeBtn.style.display = "none";
  });

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "WACTO_WIDGET_CLOSE") {
      iframe.style.display = "none";
      closeBtn.style.display = "none";
    }
  });

  if (window.innerWidth < 768) {
    iframe.style.width = "95vw";
    iframe.style.height = "80vh";
    iframe.style.right = "2.5vw";
    iframe.style.bottom = "80px";
  }
})();
