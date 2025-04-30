        // Get the audio element
        const audio = document.getElementById('audio');

        // Add click event listener to the whole document
        document.addEventListener('click', function() {
            // Play the audio when any click happens
            audio.play();
        });