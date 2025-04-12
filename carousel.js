let index = 0;
        const totalSlides = 2;
        const carousel = document.querySelector(".carousel");

        function slideImage() {
            index++;
            carousel.style.transition = "transform 1s ease-in-out";
            carousel.style.transform = `translateX(-${index * 250}px)`;

            if (index === totalSlides) {
                setTimeout(() => {
                    carousel.style.transition = "none";
                    carousel.style.transform = "translateX(0px)"; 
                    index = 0;
                }, 1000); 
            }
        }

        setInterval(slideImage, 5000);