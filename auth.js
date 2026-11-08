/* =========================================================
   OFPPT — auth.js
   Vérification de l'utilisateur et du mot de passe.

   Le mot de passe n'est jamais stocké en clair : on garde
   uniquement son empreinte (hash PBKDF2-SHA256 + sel).

   Intégration : <script src="auth.js" defer></script>
   à ajouter dans index.html (en plus de script.js).
   ========================================================= */

(() => {
    'use strict';

    /* ---------- 1. Configuration ---------- */

    const CONFIG = {
        dashboardPage: 'dashboard.html',
        sessionKey:    'ofppt_session',
        iterations:    150000,            // doit être identique à celle utilisée pour créer les hash
        maxAttempts:   5,                 // essais autorisés avant blocage
        lockSeconds:   60,                // durée du blocage
        sessionHours:  8,                 // durée de session normale
        rememberDays:  30                 // durée avec « Se souvenir de moi »
    };

    /* Comptes autorisés.
       Pour créer un nouveau compte : ouvrez la console du navigateur et tapez
           Auth.createAccount('nom@ofppt', 'MotDePasse')
       puis copiez le résultat ici. */
    const ACCOUNTS = [
        {
            username: 'admin',
            name:     'Administration',
            email:    'boraahled12@gmail.com',   // adresse qui reçoit le code de réinitialisation
            salt:     '27fed048ded467dfb2cc3b9b516c8fb0',
            hash:     'd789ab4dbcd5c173fbcdb4068c4c1b4458edef744bb37c38501e16ee7d2384b4'
            // Mot de passe de démonstration : Ofppt@2026  (à changer !)
        }
    ];

    const PASSWORDS_KEY = 'ofppt_passwords';   // mots de passe modifiés (hash uniquement)

    const MESSAGES = {
        invalid:   'Utilisateur ou mot de passe incorrect.',
        empty:     'Veuillez remplir tous les champs.',
        success:   'Connexion réussie, redirection…',
        noCrypto:  'Ce navigateur ne permet pas la vérification sécurisée. Ouvrez la page en HTTPS ou sur localhost.',
        locked:    seconds => `Trop de tentatives. Réessayez dans ${seconds} s.`
    };


    /* ---------- 2. Hachage ---------- */

    const hexToBytes = hex => Uint8Array.from(hex.match(/../g).map(b => parseInt(b, 16)));
    const bytesToHex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');

    /** Calcule le hash PBKDF2-SHA256 d'un mot de passe avec un sel (en hexadécimal). */
    async function hashPassword(password, saltHex) {
        const key = await crypto.subtle.importKey(
            'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
        );
        const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(saltHex), iterations: CONFIG.iterations },
            key, 256
        );
        return bytesToHex(bits);
    }

    /** Comparaison à temps constant (évite de révéler où les chaînes diffèrent). */
    function safeEqual(a, b) {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return diff === 0;
    }

    /** Génère un sel aléatoire (hexadécimal). */
    const randomSalt = () => bytesToHex(crypto.getRandomValues(new Uint8Array(16)));

    /** Outil de création de compte : à utiliser dans la console du navigateur. */
    async function createAccount(username, password) {
        const salt = randomSalt();
        const hash = await hashPassword(password, salt);
        const account = { username: username.trim().toLowerCase(), name: '', salt, hash };
        console.log(JSON.stringify(account, null, 4));
        return account;
    }


    /* ---------- 3. Comptes et vérification des identifiants ---------- */

    // Faux compte : même durée de calcul quand l'utilisateur n'existe pas
    const DUMMY = { salt: '00000000000000000000000000000000', hash: '' };

    const normalize = username => username.trim().toLowerCase();

    function findAccount(username) {
        return ACCOUNTS.find(a => a.username === normalize(username)) || null;
    }

    function readOverrides() {
        try { return JSON.parse(localStorage.getItem(PASSWORDS_KEY)) || {}; }
        catch (e) { return {}; }
    }

    /** Sel + hash actuels d'un compte (mot de passe modifié s'il existe). */
    function getCredentials(account) {
        return readOverrides()[account.username] || account;
    }

    /** Enregistre un nouveau mot de passe (uniquement son hash). */
    async function setPassword(username, newPassword) {
        const account = findAccount(username);
        if (!account) throw new Error('Compte introuvable');

        const salt = randomSalt();
        const hash = await hashPassword(newPassword, salt);
        const overrides = readOverrides();
        overrides[account.username] = { salt, hash };
        localStorage.setItem(PASSWORDS_KEY, JSON.stringify(overrides));
    }

    /** Retourne le compte si les identifiants sont valides, sinon null. */
    async function verifyCredentials(username, password) {
        const account = findAccount(username);
        const target  = account ? getCredentials(account) : DUMMY;

        const computed = await hashPassword(password, target.salt);
        const valid    = safeEqual(computed, target.hash);

        return account && valid ? account : null;
    }


    /* ---------- 4. Limitation des tentatives ---------- */

    const ATTEMPTS_KEY = 'ofppt_attempts';

    function readAttempts() {
        try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY)) || { count: 0, lockedUntil: 0 }; }
        catch (e) { return { count: 0, lockedUntil: 0 }; }
    }
    function writeAttempts(data) {
        try { localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data)); } catch (e) {}
    }
    function remainingLockSeconds() {
        return Math.max(0, Math.ceil((readAttempts().lockedUntil - Date.now()) / 1000));
    }
    function registerFailure() {
        const data = readAttempts();
        data.count += 1;
        if (data.count >= CONFIG.maxAttempts) {
            data.count = 0;
            data.lockedUntil = Date.now() + CONFIG.lockSeconds * 1000;
        }
        writeAttempts(data);
    }
    function resetAttempts() { writeAttempts({ count: 0, lockedUntil: 0 }); }


    /* ---------- 5. Session ---------- */

    function startSession(account, remember) {
        const hours = remember ? CONFIG.rememberDays * 24 : CONFIG.sessionHours;
        const session = {
            username: account.username,
            name:     account.name,
            expires:  Date.now() + hours * 3600 * 1000
        };
        const storage = remember ? localStorage : sessionStorage;

        try {
            sessionStorage.removeItem(CONFIG.sessionKey);
            localStorage.removeItem(CONFIG.sessionKey);
            storage.setItem(CONFIG.sessionKey, JSON.stringify(session));
        } catch (e) { /* stockage bloqué par le navigateur */ }
    }

    function getSession() {
        try {
            const raw = sessionStorage.getItem(CONFIG.sessionKey) || localStorage.getItem(CONFIG.sessionKey);
            const session = raw ? JSON.parse(raw) : null;
            if (session && session.expires > Date.now()) return session;
        } catch (e) {}
        logout(false);
        return null;
    }

    function isLoggedIn() { return getSession() !== null; }

    function logout(redirect = true) {
        try {
            sessionStorage.removeItem(CONFIG.sessionKey);
            localStorage.removeItem(CONFIG.sessionKey);
        } catch (e) {}
        if (redirect) window.location.replace('index.html');
    }


    /* ---------- 6. Formulaire de connexion ---------- */

    function initLoginForm() {
        const form      = document.getElementById('loginForm');
        if (!form) return;                         // on n'est pas sur la page de connexion

        const userInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const remember  = document.getElementById('remember');
        const message   = document.getElementById('message');
        const button    = form.querySelector('button[type="submit"]');

        // Déjà connecté : direct au tableau de bord
        if (isLoggedIn()) {
            window.location.replace(CONFIG.dashboardPage);
            return;
        }

        const showMessage = (text, type) => {
            message.textContent = text;
            message.className = `message ${type}`;
        };
        const clearMessage = () => { message.className = 'message'; message.textContent = ''; };

        userInput.addEventListener('input', clearMessage);
        passInput.addEventListener('input', clearMessage);

        form.addEventListener('submit', async event => {
            event.preventDefault();

            if (!(window.crypto && crypto.subtle)) return showMessage(MESSAGES.noCrypto, 'error');

            const username = userInput.value.trim();
            const password = passInput.value;
            if (!username || !password) return showMessage(MESSAGES.empty, 'error');

            const wait = remainingLockSeconds();
            if (wait > 0) return showMessage(MESSAGES.locked(wait), 'error');

            button.disabled = true;
            try {
                const account = await verifyCredentials(username, password);

                if (!account) {
                    registerFailure();
                    const lockedFor = remainingLockSeconds();
                    showMessage(lockedFor > 0 ? MESSAGES.locked(lockedFor) : MESSAGES.invalid, 'error');
                    passInput.value = '';
                    return;
                }

                resetAttempts();
                startSession(account, remember.checked);
                showMessage(MESSAGES.success, 'success');
                setTimeout(() => window.location.replace(CONFIG.dashboardPage), 500);
            } finally {
                button.disabled = false;
            }
        });
    }

    document.addEventListener('DOMContentLoaded', initLoginForm);


    /* ---------- 7. API publique ----------
       Dans dashboard.html :
           if (!Auth.isLoggedIn()) window.location.replace('index.html');
           document.getElementById('logout').onclick = () => Auth.logout();   */

    window.Auth = {
        isLoggedIn, getSession, logout, createAccount,
        // utilisées par reset.js
        findAccount, setPassword, verifyCredentials, hashPassword, randomSalt, safeEqual
    };
})();
