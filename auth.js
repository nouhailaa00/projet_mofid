/* =========================================================
   OFPPT — auth.js
   التحقق من اسم المستخدم وكلمة المرور.

   كلمة المرور لا تُخزَّن أبداً كنص صريح: نحتفظ فقط
   ببصمتها (hash بخوارزمية PBKDF2-SHA256 مع salt).

   الربط: <script src="auth.js" defer></script>
   يُضاف في index.html (بالإضافة إلى script.js).
   ========================================================= */

(() => {
    'use strict';

    /* ---------- 1. الإعدادات ---------- */

    const CONFIG = {
        dashboardPage: 'dashboard.html',
        sessionKey:    'ofppt_session',
        iterations:    150000,            // يجب أن تكون نفس القيمة المستخدمة عند إنشاء الـ hash
        maxAttempts:   5,                 // عدد المحاولات المسموحة قبل القفل
        lockSeconds:   60,                // مدة القفل بالثواني
        sessionHours:  8,                 // مدة الجلسة العادية بالساعات
        rememberDays:  30                 // المدة عند تفعيل «Se souvenir de moi» بالأيام
    };

    /* الحسابات المسموحة.
    لإنشاء حساب جديد: افتح Console في المتصفح واكتب
        Auth.createAccount('nom@ofppt', 'MotDePasse')
       ثم انسخ النتيجة إلى هنا. */
    const ACCOUNTS = [
        {
            username: 'admin',
            name:     'Administration',
            email:    'boraahled12@gmail.com',   // العنوان الذي يستقبل رمز إعادة التعيين
            salt:     '17fbed0a8b6d106fc7730ca861dbc3fd',
            hash:     'b5fa42dc18166c9b7ec3fdda24249e50d0dfe8803c73724de78291ec48581aba'
            // كلمة المرور التجريبية: Ofppt@2026  (يجب تغييرها!)
        }
    ];

    const PASSWORDS_KEY = 'ofppt_passwords';   // كلمات المرور المعدَّلة (الـ hash فقط)

    const MESSAGES = {
        invalid:   'Utilisateur ou mot de passe incorrect.',
        empty:     'Veuillez remplir tous les champs.',
        success:   'Connexion réussie, redirection…',
        noCrypto:  'Ce navigateur ne permet pas la vérification sécurisée. Ouvrez la page en HTTPS ou sur localhost.',
        locked:    seconds => `Trop de tentatives. Réessayez dans ${seconds} s.`
    };


    /* ---------- 2. التجزئة (Hash) ---------- */

    const hexToBytes = hex => Uint8Array.from(hex.match(/../g).map(b => parseInt(b, 16)));
    const bytesToHex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');

    /** يحسب hash بخوارزمية PBKDF2-SHA256 لكلمة مرور مع salt (بصيغة hex). */
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

    /** مقارنة بزمن ثابت (لا تكشف أين تختلف النصوص). */
    function safeEqual(a, b) {
        if (a.length !== b.length) return false;
        let diff = 0;
        for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
        return diff === 0;
    }

    /** يولّد salt عشوائياً (بصيغة hex). */
    const randomSalt = () => bytesToHex(crypto.getRandomValues(new Uint8Array(16)));

    /** أداة إنشاء حساب: تُستخدم من Console في المتصفح. */
    async function createAccount(username, password) {
        const salt = randomSalt();
        const hash = await hashPassword(password, salt);
        const account = { username: username.trim().toLowerCase(), name: '', salt, hash };
        console.log(JSON.stringify(account, null, 4));
        return account;
    }


    /* ---------- 3. الحسابات والتحقق من بيانات الدخول ---------- */

    // حساب وهمي: نفس زمن الحساب عندما لا يكون المستخدم موجوداً
    const DUMMY = { salt: '00000000000000000000000000000000', hash: '' };

    const normalize = username => username.trim().toLowerCase();

    function findAccount(username) {
        return ACCOUNTS.find(a => a.username === normalize(username)) || null;
    }

    function readOverrides() {
        try { return JSON.parse(localStorage.getItem(PASSWORDS_KEY)) || {}; }
        catch (e) { return {}; }
    }

    /** salt و hash الحاليان للحساب (كلمة المرور المعدَّلة إن وُجدت). */
    function getCredentials(account) {
        return readOverrides()[account.username] || account;
    }

    /** يحفظ كلمة مرور جديدة (الـ hash فقط). */
    async function setPassword(username, newPassword) {
        const account = findAccount(username);
        if (!account) throw new Error('Compte introuvable');

        const salt = randomSalt();
        const hash = await hashPassword(newPassword, salt);
        const overrides = readOverrides();
        overrides[account.username] = { salt, hash };
        localStorage.setItem(PASSWORDS_KEY, JSON.stringify(overrides));
    }

    /** يعيد الحساب إن كانت البيانات صحيحة، وإلا null. */
    async function verifyCredentials(username, password) {
        const account = findAccount(username);
        const target  = account ? getCredentials(account) : DUMMY;

        const computed = await hashPassword(password, target.salt);
        const valid    = safeEqual(computed, target.hash);

        return account && valid ? account : null;
    }


    /* ---------- 4. تحديد عدد المحاولات ---------- */

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


    /* ---------- 5. الجلسة ---------- */

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
        } catch (e) { /* التخزين محجوب من المتصفح */ }
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


    /* ---------- 6. نموذج تسجيل الدخول ---------- */

    function initLoginForm() {
        const form      = document.getElementById('loginForm');
        if (!form) return;                         // لسنا في صفحة تسجيل الدخول

        const userInput = document.getElementById('email');
        const passInput = document.getElementById('password');
        const remember  = document.getElementById('remember');
        const message   = document.getElementById('message');
        const button    = form.querySelector('button[type="submit"]');

        // مسجَّل دخوله مسبقاً: مباشرة إلى لوحة التحكم
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


    /* ---------- 7. الواجهة العامة (API) ----------
       في dashboard.html :
           if (!Auth.isLoggedIn()) window.location.replace('index.html');
           document.getElementById('logout').onclick = () => Auth.logout();   */

    window.Auth = {
        isLoggedIn, getSession, logout, createAccount,
        // تستخدمها reset.js
        findAccount, setPassword, verifyCredentials, hashPassword, randomSalt, safeEqual
    };
})();
