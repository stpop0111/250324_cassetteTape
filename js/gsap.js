document.addEventListener('DOMContentLoaded', () => {
    const repeatableText = new RepeatableText();
});


class RepeatableText {
    constructor() {
        this.text = document.querySelectorAll('.copy');
        this.animate();
    }

    animate() {
        gsap.to(this.text, {
            yPercent: -100,
            duration: 10,
            ease: 'linear',
            repeat: -1,
        })
    }
}

class modalWindow {
    constructor() {
        this.modalWrapper = douument.querySelector('.modal__wrapper');
        this.modal = document.querySelector('.modal');
        this.modalClosebtn = document.querySelector('.modal__closeButton');
        this.animate();
    }

    animate() {
        modal.querySelector(this.modalClosebtn).addEventListener('click', () => {
            this.closeAnimate();
        });
        modal.addEventListener('click', () => {
            this.closeAnimate();
        });
    }

    closeAnimate() {
            gsap.to(modal, {
                opacity: 0,
                duration: 1,
                ease: "power2.out",
                onComplete: () => {
                    modal.style.display = 'none';
                }
            })
    }
}