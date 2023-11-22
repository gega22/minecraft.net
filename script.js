document.addEventListener("DOMContentLoaded", function () {
    var audio = document.getElementById("backgroundMusic");
    var playButton = document.getElementById("playButton");

    // You can adjust the volume (0.0 to 1.0)
    audio.volume = 0.5;

    // Function to play the music
    function playMusic() {
        audio.play();
        playButton.style.display = "none"; // Hide the play button once music starts
    }

    // Event listener for the play button
    playButton.addEventListener("click", playMusic);

    // You can pause the music if needed
    // audio.pause();
});