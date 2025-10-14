    const bgMusic = document.getElementById("bgMusic");
    function playMusic() {
      bgMusic.play();
      document.removeEventListener("click", playMusic);
    }
    document.addEventListener("click", playMusic);