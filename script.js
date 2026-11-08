// 1. إدارة الأخطاء العامة في الصفحة
window.addEventListener('error', function (e) {
    try {
        var d = document.getElementById('errBanner');
        if (!d) { 
            d = document.createElement('div'); 
            d.id = 'errBanner'; 
            d.style.cssText = 'position:fixed;left:14px;bottom:14px;z-index:999;max-width:420px;padding:12px 16px;border-radius:14px;background:#4a1020;border:1px solid #ff8a9a;color:#ffd5db;font:12px/1.5 sans-serif;box-shadow:0 10px 30px #0008'; 
            document.body.appendChild(d); 
        }
        d.textContent = '⚠ Erreur dans la page : ' + (e.message || 'inconnue') + ' (ligne ' + (e.lineno || '?') + '). Envoyez une capture de ce message.';
    } catch (x) {}
});

// 2. إعدادات الدخول و الجسيمات
const loginForm = document.getElementById("loginForm");
const emailInput = document.getElementById("email");
const password = document.getElementById("password");
const togglePassword = document.getElementById("togglePassword");
const message = document.getElementById("message");
const forgotPassword = document.getElementById("forgotPassword");

for (let i = 0; i < 24; i++) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.left = Math.random() * 100 + "vw";
    particle.style.animationDuration = (5 + Math.random() * 10) + "s";
    particle.style.animationDelay = (Math.random() * 8) + "s";
    particle.style.opacity = Math.random() * 0.6;
    document.body.appendChild(particle);
}

const EYE = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.600-7 10-7 10 7 10 7-3.600 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18"/><path d="M10.600 5.100A10 10 0 0 1 12 5c6.400 0 10 7 10 7a17 17 0 0 1-3.200 4"/><path d="M6.500 6.500C3.700 8.300 2 12 2 12s3.600 7 10 7c1.600 0 3-.4 4.300-1"/><path d="M9.900 9.900a3 3 0 0 0 4.200 4.200"/></svg>`;

function togglePasswordVisibility() {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    togglePassword.innerHTML = isHidden ? EYE_OFF : EYE;
    togglePassword.setAttribute("aria-label", isHidden ? "Masquer le mot de passe" : "Afficher le mot de passe");
}

if(togglePassword) {
    togglePassword.addEventListener("click", togglePasswordVisibility);
    togglePassword.addEventListener("keydown", function(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            togglePasswordVisibility();
        }
    });
}

function showMessage(text, type) {
    if(!message) return;
    message.textContent = text;
    message.className = "message " + type;
}

// 3. إدارة جلسات الدخول وإعادة تعيين كلمة المرور
const ACCOUNTS = [
    { user: "administration@ofppt", hash: "8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92", name: "Administration" }
];
const CONTACT_MAIL = "iktabhamza6@gmail.com";
const SESSION_KEY = "sg_session";

function sha256(str) {
    const K = [], H = []; let n = 2;
    for (let c = 0; c < 64; n++) {
        let p = true; for (let i = 2; i * i <= n; i++) if (n % i === 0) { p = false; break; }
        if (p) { if (c < 8) H[c] = (Math.pow(n, .5) % 1) * 4294967296 | 0; K[c++] = (Math.pow(n, 1 / 3) % 1) * 4294967296 | 0; }
    }
    const b = Array.from(new TextEncoder().encode(str)), l = b.length * 8;
    b.push(0x80); while (b.length % 64 !== 56) b.push(0);
    for (let i = 7; i >= 0; i--) b.push(i > 3 ? 0 : (l >>> (i * 8)) & 255);
    const rot = (x, r) => (x >>> r) | (x << (32 - r));
    for (let o = 0; o < b.length; o += 64) {
        const w = [];
        for (let i = 0; i < 16; i++) w[i] = (b[o+4*i] << 24) | (b[o+4*i+1] << 16) | (b[o+4*i+2] << 8) | b[o+4*i+3];
        for (let i = 16; i < 64; i++) {
            const s0 = rot(w[i-15], 7) ^ rot(w[i-15], 18) ^ (w[i-15] >>> 3), s1 = rot(w[i-2], 17) ^ rot(w[i-2], 19) ^ (w[i-2] >>> 10);
            w[i] = (w[i-16] + s0 + w[i-7] + s1) | 0;
        }
        let [a, bb, c, d, e, f, g, h] = H;
        for (let i = 0; i < 64; i++) {
            const t1 = (h + (rot(e, 6) ^ rot(e, 11) ^ rot(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) | 0;
            const t2 = ((rot(a, 2) ^ rot(a, 13) ^ rot(a, 22)) + ((a & bb) ^ (a & c) ^ (bb & c))) | 0;
            h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = bb; bb = a; a = (t1 + t2) | 0;
        }
        H[0] = (H[0] + a) | 0; H[1] = (H[1] + bb) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => (x >>> 0).toString(16).padStart(8, "0")).join("");
}

function getSession() {
    try { var v = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY); if (v) return v; } catch (e) {}
    return window.name.indexOf(SESSION_KEY + ":") === 0 ? window.name : null;
}

function openDashboard() {
    window.__CONV = document.getElementById("conv-tpl").textContent.replace(/<\/script/g, "</script");
    const html = document.getElementById("dash-tpl").textContent.replace(/<\/script/g, "</script");
    document.open(); document.write(html); document.close();
}
if (getSession()) openDashboard();

if(loginForm) {
    loginForm.addEventListener("submit", function(event) {
        event.preventDefault();
        if (!loginForm.checkValidity()) {
            loginForm.reportValidity();
            return;
        }
        const user = emailInput.value.trim().toLowerCase();
        let stored = null; try { stored = localStorage.getItem(PW_KEY); } catch (e) {}
        const account = ACCOUNTS.find(a => a.user === user && (stored || a.hash) === sha256(password.value));
        if (!account) {
            showMessage("Utilisateur ou mot de passe incorrect.", "error");
            return;
        }
        const data = JSON.stringify({ user: account.user, name: account.name, t: Date.now() });
        try {
            sessionStorage.removeItem(SESSION_KEY); localStorage.removeItem(SESSION_KEY);
            (document.getElementById("remember").checked ? localStorage : sessionStorage).setItem(SESSION_KEY, data);
        } catch (e) {}
        window.name = SESSION_KEY + ":" + data;
        showMessage("Connexion réussie, redirection…", "success");
        setTimeout(openDashboard, 500);
    });
}

const FORMSPREE_ID = "";
const PW_KEY = "sg_pwhash";
const resetForm = document.getElementById("resetForm");
const resetMessage = document.getElementById("resetMessage");
let resetCode = null, resetExpire = 0, lastSend = 0;

function maskMail(m) { const [u, d] = m.split("@"); return u.slice(0, 2) + "***@" + d; }
function resetMsg(text, type) { if(resetMessage) { resetMessage.textContent = text; resetMessage.className = "message " + type; } }
function showViewStep1() { document.getElementById("resetStep1").style.display = ""; document.getElementById("resetStep2").style.display = "none"; resetCode = null; }
function showView(view) {
    const reset = view === "reset";
    if(loginForm) loginForm.style.display = reset ? "none" : "";
    if(resetForm) resetForm.style.display = reset ? "" : "none";
    document.getElementById("cardTitle").textContent = reset ? "Mot de passe oublié" : "Bienvenue !";
    document.getElementById("cardSub").textContent = reset
        ? "Un code de vérification sera envoyé à " + maskMail(CONTACT_MAIL) + "."
        : "Connectez-vous à votre espace surveillant général.";
    showViewStep1();
    if(resetMessage) { resetMessage.className = "message"; resetMessage.textContent = ""; }
}

if(forgotPassword) forgotPassword.addEventListener("click", function(event) { event.preventDefault(); showView("reset"); });
if(document.getElementById("backLogin")) document.getElementById("backLogin").addEventListener("click", function(event) { event.preventDefault(); showView("login"); });

const sendCodeBtn = document.getElementById("sendCode");
if(sendCodeBtn) {
    sendCodeBtn.addEventListener("click", function() {
        if (!FORMSPREE_ID) { resetMsg("L'envoi d'e-mails n'est pas encore activé : renseignez FORMSPREE_ID dans le fichier.", "error"); return; }
        if (Date.now() - lastSend < 30000) { resetMsg("Patientez quelques secondes avant de redemander un code.", "error"); return; }
        const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);
        const btn = this; btn.disabled = true;
        fetch("https://formspree.io/f/" + FORMSPREE_ID, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
                _subject: "OFPPT – Code de réinitialisation du mot de passe",
                email: CONTACT_MAIL,
                message: "Votre code de réinitialisation : " + code + "\n\nValable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message."
            })
        }).then(function(r) {
            if (!r.ok) throw new Error("send");
            resetCode = code; resetExpire = Date.now() + 10 * 60 * 1000; lastSend = Date.now();
            document.getElementById("resetStep1").style.display = "none";
            document.getElementById("resetStep2").style.display = "";
            resetMsg("Code envoyé à " + maskMail(CONTACT_MAIL) + ". Consultez votre boîte Gmail (et les spams).", "success");
        }).catch(function() {
            resetMsg("Envoi impossible. Vérifiez votre connexion Internet et réessayez.", "error");
        }).finally(function() { btn.disabled = false; });
    });
}

if(resetForm) {
    resetForm.addEventListener("submit", function(event) {
        event.preventDefault();
        if (!resetCode || Date.now() > resetExpire) { resetMsg("Le code a expiré. Demandez-en un nouveau.", "error"); showViewStep1(); return; }
        if (document.getElementById("rCode").value.trim() !== resetCode) { resetMsg("Code incorrect.", "error"); return; }
        const p1 = document.getElementById("rNew").value, p2 = document.getElementById("rNew2").value;
        if (p1.length < 8) { resetMsg("Le mot de passe doit contenir au moins 8 caractères.", "error"); return; }
        if (p1 !== p2) { resetMsg("Les deux mots de passe ne sont pas identiques.", "error"); return; }
        try { localStorage.setItem(PW_KEY, sha256(p1)); } catch (e) { resetMsg("Le navigateur bloque l'enregistrement du mot de passe.", "error"); return; }
        resetCode = null;
        resetMsg("Mot de passe modifié. Retour à la connexion…", "success");
        setTimeout(function() { showView("login"); showMessage("Mot de passe modifié : connectez-vous avec le nouveau.", "success"); }, 1400);
    });
}

if(emailInput) emailInput.addEventListener("input", function() { if(message) { message.className = "message"; message.textContent = ""; }});
if(password) password.addEventListener("input", function() { if(message) { message.className = "message"; message.textContent = ""; }});