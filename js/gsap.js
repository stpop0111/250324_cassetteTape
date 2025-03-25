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