const video = document.getElementById("player");

// Auto next episode (dummy)
video.addEventListener("ended", () => {
  alert("Next Episode");
});

// History
localStorage.setItem("last_watch", window.location.href);

// Disable context menu
video.addEventListener("contextmenu", e => e.preventDefault());
