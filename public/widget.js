(function () {
if (document.getElementById("wacto-chat-launcher")) return;

const iframe = document.createElement("iframe");
iframe.src = "https://wacto-chat-bot.vercel.app/embed";
iframe.id = "wacto-chat-frame";

Object.assign(iframe.style, {
position: "fixed",
bottom: "100px",
right: "20px",
width: "400px",
height: "650px",
border: "none",
borderRadius: "12px",
boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
background: "transparent",
display: "none",
zIndex: "-100",
overflow: "hidden"
});

document.body.appendChild(iframe);

const launcher = document.createElement("div");
launcher.id = "wacto-chat-launcher";

launcher.innerHTML = `     <img
      src="https://wacto-chat-bot.vercel.app/logo.jpg"
      alt="Wacto Chat"
      style="
        width:60px;
        height:60px;
        border-radius:50%;
        cursor:pointer;
        box-shadow:0 4px 12px rgba(0,0,0,.2);
      "
    />
  `;

Object.assign(launcher.style, {
position: "fixed",
bottom: "100px",
right: "20px",
zIndex: "999999",
cursor: "pointer"
});

document.body.appendChild(launcher);

launcher.addEventListener("click", () => {
iframe.style.display =
iframe.style.display === "none" ? "block" : "none";
});

const closeBtn = document.createElement("button");
closeBtn.innerHTML = "✕";

Object.assign(closeBtn.style, {
position: "fixed",
bottom: "720px",
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

```
iframe.style.display = isOpen ? "none" : "block";
closeBtn.style.display = isOpen ? "none" : "block";
```

});

closeBtn.addEventListener("click", () => {
iframe.style.display = "none";
closeBtn.style.display = "none";
});

if (window.innerWidth < 768) {
iframe.style.width = "95vw";
iframe.style.height = "80vh";
iframe.style.right = "2.5vw";
iframe.style.bottom = "80px";
}
})();
