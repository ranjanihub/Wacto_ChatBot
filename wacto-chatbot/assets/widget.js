(function () {

    const iframe = document.createElement("iframe");

    iframe.src =
      "https://wacto-chat-bot.vercel.app/widget";

    iframe.style.position = "fixed";
    iframe.style.bottom = "20px";
    iframe.style.right = "20px";
    iframe.style.width = "380px";
    iframe.style.height = "650px";
    iframe.style.border = "none";
    iframe.style.zIndex = "999999";

    document.body.appendChild(iframe);

})();