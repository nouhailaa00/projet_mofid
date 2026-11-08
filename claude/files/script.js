/* ===== OFPPT - script.js (partagé : index.html + dashboard.html) ===== */
(function () {
    'use strict';

    // ---------- Configuration ----------
    var LOGIN_PAGE = 'index.html';
    var DASHBOARD_PAGE = 'dashboard.html';
    var SESSION_KEY = 'ofppt_session';

    // TODO : remplacez par un appel à votre API / base de données.
    // Compte de démonstration uniquement.
    var DEMO_USERS = [{ username: 'admin', password: 'admin1234', name: 'Surveillant général' }];

    // ---------- Session ----------
    function saveSession(user, remember) {
        var data = JSON.stringify({ username: user.username, name: user.name, at: Date.now() });
        try {
            (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, data);
        } catch (e) { /* stockage indisponible */ }
    }
    function getSession() {
        try {
            var raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }
    function clearSession() {
        try { sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY); } catch (e) {}
    }

    // ---------- Utilitaires ----------
    function showMsg(el, text, type) {
        el.textContent = text;
        el.className = 'message ' + type;
    }
    function hideMsg(el) { el.className = 'message'; el.textContent = ''; }

    // Particules décoratives
    function makeParticles() {
        for (var i = 0; i < 18; i++) {
            var p = document.createElement('span');
            p.className = 'particle';
            p.style.left = Math.random() * 100 + 'vw';
            p.style.animationDuration = 8 + Math.random() * 10 + 's';
            p.style.animationDelay = Math.random() * 8 + 's';
            document.body.appendChild(p);
        }
    }

    // =========================================================
    //  PAGE LOGIN (index.html)
    // =========================================================
    function initLogin() {
        // Déjà connecté ? -> directement au dashboard
        if (getSession()) { window.location.replace(DASHBOARD_PAGE); return; }

        var loginForm = document.getElementById('loginForm');
        var resetForm = document.getElementById('resetForm');
        var msg = document.getElementById('message');
        var resetMsg = document.getElementById('resetMessage');
        var title = document.getElementById('cardTitle');
        var sub = document.getElementById('cardSub');
        var pwd = document.getElementById('password');
        var toggle = document.getElementById('togglePassword');

        // Afficher / masquer le mot de passe
        function togglePwd() {
            pwd.type = pwd.type === 'password' ? 'text' : 'password';
        }
        toggle.addEventListener('click', togglePwd);
        toggle.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePwd(); }
        });

        // Connexion
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var username = document.getElementById('email').value.trim();
            var password = pwd.value;
            var remember = document.getElementById('remember').checked;

            var user = DEMO_USERS.filter(function (u) {
                return u.username === username && u.password === password;
            })[0];

            if (!user) {
                showMsg(msg, 'Utilisateur ou mot de passe incorrect.', 'error');
                return;
            }
            saveSession(user, remember);
            showMsg(msg, 'Connexion réussie, redirection…', 'success');
            setTimeout(function () { window.location.href = DASHBOARD_PAGE; }, 600);
        });

        // Mot de passe oublié
        function showReset(show) {
            loginForm.style.display = show ? 'none' : '';
            resetForm.style.display = show ? '' : 'none';
            title.textContent = show ? 'Mot de passe oublié' : 'Bienvenue !';
            sub.textContent = show
                ? 'Un code de vérification vous sera envoyé par e-mail.'
                : 'Connectez-vous à votre espace surveillant général.';
            hideMsg(msg); hideMsg(resetMsg);
            document.getElementById('resetStep1').style.display = '';
            document.getElementById('resetStep2').style.display = 'none';
        }
        document.getElementById('forgotPassword').addEventListener('click', function (e) { e.preventDefault(); showReset(true); });
        document.getElementById('backLogin').addEventListener('click', function (e) { e.preventDefault(); showReset(false); });

        document.getElementById('sendCode').addEventListener('click', function () {
            // TODO : appeler votre API pour envoyer le code par e-mail
            document.getElementById('resetStep1').style.display = 'none';
            document.getElementById('resetStep2').style.display = '';
            showMsg(resetMsg, 'Code envoyé. Vérifiez votre boîte e-mail.', 'success');
        });

        resetForm.addEventListener('submit', function (e) {
            e.preventDefault();
            var code = document.getElementById('rCode').value.trim();
            var p1 = document.getElementById('rNew').value;
            var p2 = document.getElementById('rNew2').value;

            if (!/^\d{6}$/.test(code)) return showMsg(resetMsg, 'Le code doit contenir 6 chiffres.', 'error');
            if (p1.length < 8) return showMsg(resetMsg, 'Le mot de passe doit contenir au moins 8 caractères.', 'error');
            if (p1 !== p2) return showMsg(resetMsg, 'Les mots de passe ne correspondent pas.', 'error');

            // TODO : appeler votre API pour valider le code et changer le mot de passe
            showMsg(resetMsg, 'Mot de passe modifié. Vous pouvez vous connecter.', 'success');
            setTimeout(function () { showReset(false); }, 1500);
        });
    }

    // =========================================================
    //  PAGE DASHBOARD (dashboard.html)
    // =========================================================
    function initDashboard() {
        var session = getSession();
        // Non connecté ? -> retour à la page de connexion
        if (!session) { window.location.replace(LOGIN_PAGE); return; }

        document.body.style.visibility = 'visible';
        document.getElementById('userName').textContent = session.name || session.username;

        document.getElementById('logoutBtn').addEventListener('click', function () {
            clearSession();
            window.location.replace(LOGIN_PAGE);
        });
    }

    // ---------- Démarrage ----------
    document.addEventListener('DOMContentLoaded', function () {
        makeParticles();
        var page = document.body.getAttribute('data-page');
        if (page === 'login') initLogin();
        else if (page === 'dashboard') initDashboard();
    });
})();
