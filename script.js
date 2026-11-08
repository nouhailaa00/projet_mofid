/* =========================================================
   OFPPT — script.js
   Étape 1 : thème clair / sombre + affichage du mot de passe.
   La logique de connexion sera ajoutée à l'étape suivante.
   ========================================================= */

const THEME_KEY = 'ofppt_theme';

// Thème enregistré, sinon celui du système
function getInitialTheme() {
    try {
        const saved = localStorage.getItem(THEME_KEY);
        if (saved) return saved;
    } catch (e) { /* stockage indisponible */ }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
}

// Appliqué immédiatement (le script est dans <head>)
applyTheme(getInitialTheme());

// ---------- Bouton du thème ----------
function initThemeToggle() {
    const button = document.getElementById('themeToggle');

    button.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
    });
}

// ---------- Afficher / masquer un mot de passe ----------
// Chaque bouton .eye indique son champ avec data-target="id-du-champ"
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
