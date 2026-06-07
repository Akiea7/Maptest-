// إضافة تفاعل بسيط عند الضغط على زر "وقع العقد"
document.getElementById('explore-btn').addEventListener('click', function(e) {
    // سنقوم بإضافة تأثيرات أنيميشن قوية هنا في الخطوات القادمة
    console.log("تم البدء في استكشاف عالم فاوستس المظلم...");
});
// تأثير الظهور عند النزول بالشاشة (Scroll Reveal Animation)
window.addEventListener('scroll', reveal);

function reveal() {
    // نحدد كل العناصر اللي نريدها تظهر
    let reveals = document.querySelectorAll('.section-title, .pact-text');

    for (let i = 0; i < reveals.length; i++) {
        let windowHeight = window.innerHeight;
        let revealTop = reveals[i].getBoundingClientRect().top;
        let revealPoint = 150; // النقطة اللي يبدأ بيها الظهور

        // إذا وصل السكرول للعنصر، نضيف كلاس 'visible'
        if (revealTop < windowHeight - revealPoint) {
            reveals[i].classList.add('visible');
        }
    }
}

// تشغيل الدالة مرة وحدة بالبداية حتى تشتغل إذا كان المستخدم مسوي سكرول مسبقاً
reveal();
