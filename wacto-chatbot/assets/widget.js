(function () {
  if (document.getElementById("wacto-chat-launcher")) return;

  let scriptHost = "https://wacto-chat-bot.vercel.app";
  const currentScript = document.currentScript;
  if (currentScript && currentScript.src) {
    try {
      const url = new URL(currentScript.src);
      scriptHost = url.origin;
    } catch (e) {}
  }

  const iframe = document.createElement("iframe");
  iframe.src = scriptHost + "/widget";
  iframe.id = "wacto-chat-frame";
  iframe.title = "Wacto AI Chatbot";

  Object.assign(iframe.style, {
    position: "fixed",
    bottom: "95px",
    right: "20px",
    width: "380px",
    height: "630px",
    border: "none",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    background: "transparent",
    display: "none",
    zIndex: "-100",
    overflow: "hidden"
  });

  document.body.appendChild(iframe);

  const launcher = document.createElement("div");
  launcher.id = "wacto-chat-launcher";
  launcher.innerHTML = `
    <img
      src="${scriptHost}/logo.jpg"
      alt="Wacto Chat"
      style="width: 60px; height: 60px; border-radius: 50%; cursor: pointer; box-shadow: 0 4px 16px rgba(0,0,0,0.25); object-fit: cover; display: block;"
    />
  `;

  Object.assign(launcher.style, {
    position: "fixed",
    bottom: "25px",
    right: "20px",
    zIndex: "999999",
    cursor: "pointer"
  });

  document.body.appendChild(launcher);

  let isOpen = false;
  launcher.addEventListener("click", () => {
    isOpen = !isOpen;
    if (isOpen) {
      // When OPENED: Set high z-index so chat window is on top
      iframe.style.display = "block";
      iframe.style.zIndex = "999999";
    } else {
      // When CLOSED: Set low z-index and hide so website buttons work 100%
      iframe.style.display = "none";
      iframe.style.zIndex = "-100";
    }
  });
})();