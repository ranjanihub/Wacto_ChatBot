(function () {
  const iframe = document.createElement("iframe");

  iframe.src = "https://wacto-chat-bot.vercel.app";
  iframe.id = "wacto-chat-frame";

  iframe.style.position = "fixed";
  iframe.style.bottom = "100px";
  iframe.style.right = "20px";
  iframe.style.width = "400px";
  iframe.style.height = "650px";
  iframe.style.border = "none";
  iframe.style.borderRadius = "12px";
  iframe.style.boxShadow = "0 5px 20px rgba(0,0,0,.15)";
  iframe.style.display = "none";
  iframe.style.zIndex = "999999";

  document.body.appendChild(iframe);

  const button = document.createElement("div");

  button.id = "wacto-chat-launcher";

  button.innerHTML = `
    <img
      src="https://wacto-chat-bot.vercel.app/wacto-logo.png"
      style="width:60px;height:60px;border-radius:50%;cursor:pointer;"
    />
  `;

  button.style.position = "fixed";
  button.style.bottom = "100px";
  button.style.right = "20px";
  button.style.zIndex = "1000000";

  document.body.appendChild(button);

  button.addEventListener("click", () => {
    iframe.style.display =
      iframe.style.display === "none"
        ? "block"
        : "none";
  });
})();