(function () {

    // Chat button
    const btn = document.createElement("button");

    btn.innerHTML = "";

    btn.style.position = "fixed";
    btn.style.bottom = "130px";
    btn.style.right = "20px";
    btn.style.width = "60px";
    btn.style.height = "60px";
    btn.style.borderRadius = "50%";
    btn.style.border = "none";
    btn.style.cursor = "pointer";
    btn.style.zIndex = "999999";

    document.body.appendChild(btn);

    // iframe hidden initially
    const iframe = document.createElement("iframe");

    iframe.src = "https://wacto-chat-bot.vercel.app/widget";

    iframe.style.position = "fixed";
    iframe.style.bottom = "200px";
    iframe.style.right = "20px";
    iframe.style.width = "380px";
    iframe.style.height = "650px";
    iframe.style.border = "none";
    iframe.style.zIndex = "999998";

    iframe.style.display = "none";

    document.body.appendChild(iframe);

    btn.addEventListener("click", () => {

        iframe.style.display =
            iframe.style.display === "none"
                ? "block"
                : "none";

    });

})();