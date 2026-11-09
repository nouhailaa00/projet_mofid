/* =========================================================
   OFPPT — reset.js
   نسيت كلمة المرور: إرسال رمز بالبريد الإلكتروني، ثم
   اختيار كلمة مرور جديدة.

   يعتمد على auth.js (يجب تحميله قبله) :
       <script src="auth.js" defer></script>
       <script src="reset.js" defer></script>

   إرسال البريد: خدمة Formspree المجانية (formspree.io).
   أنشئ نموذجاً ثم الصق معرّفه في الأسفل.
   ========================================================= */

(() => {
    'use strict';

    /* ---------- 1. الإعدادات ---------- */

    const CONFIG = {
        formspreeId:       '',    // مثال: 'xyzabcde'  ← https://formspree.io/f/xyzabcde
        cooldownSeconds:   30,    // الحد الأدنى بين إرسالين (بالثواني)
        codeMinutes:       10,    // مدة صلاحية الرمز (بالدقائق)
        maxCodeAttempts:   5,     // عدد محاولات إدخال الرمز
        minPasswordLength: 8
    };

    const MESSAGES = {
        needUser:     'Entrez votre nom d\'utilisateur.',
        notEnabled:   'L\'envoi d\'e-mails n\'est pas encore activé : renseignez formspreeId dans reset.js.',
        cooldown:     seconds => `Patientez ${seconds} s avant de redemander un code.`,
        sent:         'Si ce compte existe, un code vient d\'être envoyé à son adresse e-mail (vérifiez aussi les spams).',
        sendFailed:   'Envoi impossible. Vérifiez votre connexion Internet et réessayez.',
        expired:      'Le code a expiré. Demandez-en un nouveau.',
        tooMany:      'Trop d\'essais. Demandez un nouveau code.',
        badCodeFormat:'Le code doit contenir 6 chiffres.',
        badCode:      'Code incorrect.',
        weak:         `Le mot de passe doit contenir au moins ${CONFIG.minPasswordLength} caractères, avec une lettre et un chiffre.`,
        mismatch:     'Les deux mots de passe ne sont pas identiques.',
        saveFailed:   'Le navigateur bloque l\'enregistrement du nouveau mot de passe.',
        done:         'Mot de passe modifié. Connectez-vous avec le nouveau.',
        noCrypto:     'Ce navigateur ne permet pas la vérification sécurisée. Ouvrez la page en HTTPS ou sur localhost.'
    };


    /* ---------- 2. عناصر الصفحة ---------- */

    const $ = id => document.getElementById(id);

    const els = {
        loginForm:  $('loginForm'),
        resetForm:  $('resetForm'),
        loginMsg:   $('message'),
        resetMsg:   $('resetMessage'),
        title:      $('cardTitle'),
        subtitle:   $('cardSub'),
        step1:      $('resetStep1'),
        step2:      $('resetStep2'),
        user:       $('rUser'),
        code:       $('rCode'),
        newPass:    $('rNew'),
        newPass2:   $('rNew2'),
        sendBtn:    $('sendCode')
    };

    if (!els.resetForm) return;   // الصفحة لا تحتوي على النموذج


    /* ---------- 3. الحالة (في الذاكرة فقط) ---------- */

    let pending  = null;   // { username, salt, codeHash, expires, attempts }
    let lastSend = 0;


    /* ---------- 4. دوال مساعدة ---------- */

    function showMessage(el, text, type) {
        el.textContent = text;
        el.className = `message ${type}`;
    }
    function clearMessage(el) { el.className = 'message'; el.textContent = ''; }

    /** رمز من 6 أرقام يُولَّد بمولّد عشوائي آمن. */
    function generateCode() {
        return String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
    }

    const isStrongEnough = pwd =>
        pwd.length >= CONFIG.minPasswordLength && /[A-Za-z]/.test(pwd) && /\d/.test(pwd);


    /* ---------- 5. التنقل بين العرضين ---------- */

    function showStep(step) {
        els.step1.hidden = step !== 1;
        els.step2.hidden = step !== 2;
    }

    function showView(view) {
        const isReset = view === 'reset';

        els.loginForm.hidden = isReset;
        els.resetForm.hidden = !isReset;

        els.title.textContent = isReset ? 'Mot de passe oublié' : 'Bienvenue !';
        els.subtitle.textContent = isReset
            ? 'Nous vous enverrons un code de vérification par e-mail.'
            : 'Connectez-vous à votre espace surveillant général.';

        pending = null;
        showStep(1);
        clearMessage(els.resetMsg);
        clearMessage(els.loginMsg);
        els.resetForm.reset();
    }


    /* ---------- 6. الخطوة 1: إرسال الرمز ---------- */

    async function sendCode() {
        clearMessage(els.resetMsg);

        const username = els.user.value.trim();
        if (!username) return showMessage(els.resetMsg, MESSAGES.needUser, 'error');
        if (!(window.crypto && crypto.subtle)) return showMessage(els.resetMsg, MESSAGES.noCrypto, 'error');

        const wait = Math.ceil((lastSend + CONFIG.cooldownSeconds * 1000 - Date.now()) / 1000);
        if (wait > 0) return showMessage(els.resetMsg, MESSAGES.cooldown(wait), 'error');

        if (!CONFIG.formspreeId) return showMessage(els.resetMsg, MESSAGES.notEnabled, 'error');

        els.sendBtn.disabled = true;
        try {
            const account = Auth.findAccount(username);
            const code    = generateCode();
            const salt    = Auth.randomSalt();

            // الحساب غير موجود: لا نقول شيئاً (لا نكشف أي معلومة)
            if (account && account.email) await emailCode(account.email, code);

            pending = {
                username: account ? account.username : null,
                salt,
                codeHash: await Auth.hashPassword(code, salt),   // الرمز لا يُحفظ أبداً كنص صريح
                expires:  Date.now() + CONFIG.codeMinutes * 60 * 1000,
                attempts: 0
            };
            lastSend = Date.now();

            showStep(2);
            showMessage(els.resetMsg, MESSAGES.sent, 'success');
            els.code.focus();
        } catch (error) {
            showMessage(els.resetMsg, MESSAGES.sendFailed, 'error');
        } finally {
            els.sendBtn.disabled = false;
        }
    }

    async function emailCode(email, code) {
        const response = await fetch(`https://formspree.io/f/${CONFIG.formspreeId}`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({
                _subject: 'OFPPT – Code de réinitialisation du mot de passe',
                email,
                message: `Votre code de réinitialisation : ${code}\n\n` +
                         `Valable ${CONFIG.codeMinutes} minutes. ` +
                         'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message.'
            })
        });
        if (!response.ok) throw new Error('send');
    }


    /* ---------- 7. الخطوة 2: التحقق من الرمز وتغيير كلمة المرور ---------- */

    async function changePassword(event) {
        event.preventDefault();
        clearMessage(els.resetMsg);

        // هل الرمز ما زال صالحاً؟
        if (!pending || Date.now() > pending.expires) {
            showStep(1);
            return showMessage(els.resetMsg, MESSAGES.expired, 'error');
        }
        if (pending.attempts >= CONFIG.maxCodeAttempts) {
            pending = null;
            showStep(1);
            return showMessage(els.resetMsg, MESSAGES.tooMany, 'error');
        }

        // هل الحقول صحيحة؟
        const code = els.code.value.trim();
        const pass = els.newPass.value;
        const pass2 = els.newPass2.value;

        if (!/^\d{6}$/.test(code))  return showMessage(els.resetMsg, MESSAGES.badCodeFormat, 'error');
        if (!isStrongEnough(pass))  return showMessage(els.resetMsg, MESSAGES.weak, 'error');
        if (pass !== pass2)         return showMessage(els.resetMsg, MESSAGES.mismatch, 'error');

        // هل الرمز صحيح؟
        pending.attempts += 1;
        const hash = await Auth.hashPassword(code, pending.salt);
        if (!pending.username || !Auth.safeEqual(hash, pending.codeHash)) {
            return showMessage(els.resetMsg, MESSAGES.badCode, 'error');
        }

        // حفظ كلمة المرور الجديدة (الـ hash فقط)
        try {
            await Auth.setPassword(pending.username, pass);
        } catch (error) {
            return showMessage(els.resetMsg, MESSAGES.saveFailed, 'error');
        }

        showView('login');
        showMessage(els.loginMsg, MESSAGES.done, 'success');
    }


    /* ---------- 8. الأحداث ---------- */

    $('forgotPassword').addEventListener('click', event => { event.preventDefault(); showView('reset'); });
    $('backLogin').addEventListener('click',      event => { event.preventDefault(); showView('login'); });
    $('backStep1').addEventListener('click',      () => { showStep(1); clearMessage(els.resetMsg); });

    els.sendBtn.addEventListener('click', sendCode);
    els.user.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); sendCode(); } });
    els.resetForm.addEventListener('submit', changePassword);

    // الرمز يحتوي على أرقام فقط
    els.code.addEventListener('input', () => { els.code.value = els.code.value.replace(/\D/g, ''); });
})();
