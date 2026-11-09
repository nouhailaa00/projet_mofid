/* =========================================================
   OFPPT — dashboard.js
   يحمي لوحة التحكم ويعرض معلومات الجلسة.
   يعتمد على auth.js (يجب تحميله قبله).
   ========================================================= */

(() => {
    'use strict';

    const LOGIN_PAGE = 'index.html';

    /* ---------- 1. حماية الصفحة ---------- */

    function redirectToLogin() { window.location.replace(LOGIN_PAGE); }

    // غير مسجَّل دخوله (أو انتهت الجلسة): العودة إلى صفحة الدخول
    if (!window.Auth || !Auth.isLoggedIn()) {
        redirectToLogin();
        return;
    }

    // زر «السابق» في المتصفح بعد تسجيل الخروج
    window.addEventListener('pageshow', event => {
        if (event.persisted && !Auth.isLoggedIn()) redirectToLogin();
    });


    /* ---------- 2. العرض ---------- */

    const $ = id => document.getElementById(id);

    function greeting() {
        const hour = new Date().getHours();
        return hour >= 18 || hour < 5 ? 'Bonsoir' : 'Bonjour';
    }

    function initials(name) {
        return name.trim().split(/\s+/).map(word => word[0]).slice(0, 2).join('').toUpperCase() || '?';
    }

    function showSession() {
        const session = Auth.getSession();
        const name = session.name || session.username;

        $('userName').textContent    = name;
        $('welcomeName').textContent = name;
        $('userAvatar').textContent  = initials(name);
        $('greeting').textContent    = greeting();
        $('todayDate').textContent   = new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        showSession();
        $('logoutBtn').addEventListener('click', () => Auth.logout());
        document.body.hidden = false;       // الجلسة صالحة: نعرض الصفحة
    });
})();
