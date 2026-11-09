/* =========================================================
   OFPPT — script.js
   المرحلة 1: الوضع الفاتح / الليلي + إظهار كلمة المرور.
   منطق تسجيل الدخول في الملف auth.js.
   ========================================================= */

const THEME_KEY = 'ofppt_theme';

// الثيم المحفوظ، وإلا ثيم النظام
function getInitialTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
    } catch (e) { /* التخزين غير متاح */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

// يُطبَّق فوراً (السكريبت موجود في <head>)
applyTheme(getInitialTheme());

// ---------- زر الثيم ----------
function initThemeToggle() {
    const button = document.getElementById('themeToggle');

    button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

// ---------- إظهار / إخفاء كلمة المرور ----------
// كل زر .eye يحدد حقله عبر data-target="معرّف-الحقل"
function initPasswordToggles() {
    document.querySelectorAll('.eye[data-target]').forEach(button => {
        const input = document.getElementById(button.dataset.target);

        button.addEventListener('click', () => {
            const willShow = input.type === 'password';

            input.type = willShow ? 'text' : 'password';
            button.classList.toggle('is-visible', willShow);
            button.setAttribute('aria-pressed', String(willShow));
            button.setAttribute('aria-label', willShow ? 'Masquer le mot de passe' : 'Afficher le mot de passe');
            input.focus();
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initThemeToggle();
    initPasswordToggles();
});
