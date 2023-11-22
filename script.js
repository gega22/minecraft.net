document.addEventListener("DOMContentLoaded", function () {
    var audio = document.getElementById("backgroundMusic");
    var playButton = document.getElementById("playButton");

    // You can adjust the volume (0.0 to 1.0)
    audio.volume = 0.5;

    // Function to play or pause the music
    function toggleMusic() {
        if (audio.paused) {
            audio.play();
            playButton.textContent = "Pause Background Music";
        } else {
            audio.pause();
            playButton.textContent = "Play Background Music";
        }
    }

    // Event listener for the play/pause button
    playButton.addEventListener("click", toggleMusic);

    // You can also stop the music by clicking the button again
    playButton.addEventListener("dblclick", function () {
        audio.pause();
        audio.currentTime = 0; // Reset the audio to the beginning
        playButton.textContent = "Play Background Music";
    });
});
