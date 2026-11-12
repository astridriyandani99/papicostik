import './style.css';
import Chart from 'chart.js/auto';
import { questions, TRAIT_INFO, DIMENSIONS } from './data.js';
import {
    getAllTokens,
    addSingleToken,
    batchGenerateTokens,
    deleteToken,
    validateToken,
    markTokenUsed,
    getActiveSessionToken,
    setActiveSessionToken,
    verifyAdminPin,
    setAdminPin,
    exportTokensToCSV,
    createRandomTokenCode
} from './tokenManager.js';

// Application State
const state = {
    currentIndex: 0,
    answers: new Array(90).fill(null), // Array of 'A' or 'B'
    isAnimating: false,
    startTime: null,
    timerInterval: null,
    elapsedSeconds: 0,
    soundEnabled: true,
    activeToken: null,
    participant: {
        name: '',
        role: '',
        email: '',
        phone: '',
        gender: '',
        birthYear: '',
        education: '',
        date: new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    radarChartInstance: null,
    currentGridFilter: 'all',
    currentAnswersFilter: 'all',
    adminCurrentFilter: 'all',
    adminGenerateMode: 'single', // 'single' or 'batch'
    lastGeneratedTokens: []
};

// DOM Elements Cache
let DOM = {};

function initDOMCache() {
    DOM = {
        screenToken: document.getElementById('screen-token'),
        screenIntro: document.getElementById('screen-intro'),
        screenQuestion: document.getElementById('screen-question'),
        screenReview: document.getElementById('screen-review'),
        screenResult: document.getElementById('screen-result'),
        questionWrapper: document.getElementById('question-wrapper'),
        bottomNav: document.getElementById('bottom-nav'),
        headerTimer: document.getElementById('header-timer'),
        timerDisplay: document.getElementById('timer-display'),
        btnGrid: document.getElementById('btn-grid'),
        gridBtnBadge: document.getElementById('grid-btn-badge'),
        progressBar: document.getElementById('progress-bar'),
        headerProgressText: document.getElementById('header-progress-text'),
        headerUserDisplay: document.getElementById('header-user-display'),
        bottomQNumber: document.getElementById('bottom-q-number'),
        btnPrev: document.getElementById('btn-prev'),
        btnNext: document.getElementById('btn-next'),
        btnStart: document.getElementById('btn-start'),
        btnResume: document.getElementById('btn-resume'),
        btnClear: document.getElementById('btn-clear'),
        resumeLabel: document.getElementById('resume-label'),
        inputName: document.getElementById('input-name'),
        inputRole: document.getElementById('input-role'),
        inputEmail: document.getElementById('input-email'),
        inputPhone: document.getElementById('input-phone'),
        inputGender: document.getElementById('input-gender'),
        inputBirthYear: document.getElementById('input-birth-year'),
        inputEducation: document.getElementById('input-education'),
        gridModal: document.getElementById('grid-modal'),
        gridModalContent: document.getElementById('grid-modal-content'),
        gridContainer: document.getElementById('grid-container'),
        btnCloseGrid: document.getElementById('btn-close-grid'),
        btnJumpUnanswered: document.getElementById('btn-jump-unanswered'),
        countUnanswered: document.getElementById('count-unanswered'),
        countAnswered: document.getElementById('count-answered'),
        gridModalStats: document.getElementById('grid-modal-stats'),
        tutorialModal: document.getElementById('tutorial-modal'),
        tutorialModalContent: document.getElementById('tutorial-modal-content'),
        btnCloseTutorial: document.getElementById('btn-close-tutorial'),
        btnUnderstoodTutorial: document.getElementById('btn-understood-tutorial'),
        btnTutorialHeader: document.getElementById('btn-tutorial-header'),
        btnOpenTutorialInline: document.getElementById('btn-open-tutorial-inline'),
        btnTutorialShortcut: document.getElementById('btn-tutorial-shortcut'),
        btnSoundToggle: document.getElementById('btn-sound-toggle'),

        // Token Gate Elements
        inputGateToken: document.getElementById('input-gate-token'),
        btnValidateToken: document.getElementById('btn-validate-token'),
        btnPasteToken: document.getElementById('btn-paste-token'),
        btnUseDemoToken: document.getElementById('btn-use-demo-token'),
        gateTokenError: document.getElementById('gate-token-error'),
        gateTokenErrorText: document.getElementById('gate-token-error-text'),
        introVerifiedTokenPill: document.getElementById('intro-verified-token-pill'),
        introTokenCodeText: document.getElementById('intro-token-code-text'),
        btnChangeToken: document.getElementById('btn-change-token'),

        // Admin Modal Elements
        btnAdminHeader: document.getElementById('btn-admin-header'),
        btnOpenAdminFromGate: document.getElementById('btn-open-admin-from-gate'),
        adminLoginModal: document.getElementById('admin-login-modal'),
        adminLoginContent: document.getElementById('admin-login-content'),
        inputAdminPin: document.getElementById('input-admin-pin'),
        adminLoginError: document.getElementById('admin-login-error'),
        btnCancelAdminLogin: document.getElementById('btn-cancel-admin-login'),
        btnSubmitAdminLogin: document.getElementById('btn-submit-admin-login'),

        adminPanelModal: document.getElementById('admin-panel-modal'),
        adminPanelContent: document.getElementById('admin-panel-content'),
        btnCloseAdminPanel: document.getElementById('btn-close-admin-panel'),
        adminTotalTokensBadge: document.getElementById('admin-total-tokens-badge'),

        // Admin Generator Form
        btnModeSingle: document.getElementById('btn-mode-single'),
        btnModeBatch: document.getElementById('btn-mode-batch'),
        wrapperBatchCount: document.getElementById('wrapper-batch-count'),
        inputGenCount: document.getElementById('input-gen-count'),
        inputGenPrefix: document.getElementById('input-gen-prefix'),
        inputGenType: document.getElementById('input-gen-type'),
        inputGenLabel: document.getElementById('input-gen-label'),
        inputGenExpiry: document.getElementById('input-gen-expiry'),
        btnSubmitGenerate: document.getElementById('btn-submit-generate'),
        generatedTokensContainer: document.getElementById('generated-tokens-container'),
        btnCopyGeneratedTokens: document.getElementById('btn-copy-generated-tokens'),

        // Admin List
        adminTokenSearch: document.getElementById('admin-token-search'),
        adminTokensTableBody: document.getElementById('admin-tokens-table-body'),
        btnExportTokensCsv: document.getElementById('btn-export-tokens-csv'),

        // Admin PIN Setting
        inputCurrentPin: document.getElementById('input-current-pin'),
        inputNewPin: document.getElementById('input-new-pin'),
        btnSavePin: document.getElementById('btn-save-pin')
    };
}

// Audio Feedback (Zero-latency Web Audio API)
let audioCtx = null;

function playTapSound(type = 'select') {
    if (!state.soundEnabled) return;
    try {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        if (!audioCtx) return;

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        
        const now = audioCtx.currentTime;
        if (type === 'select') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(520, now);
            osc.frequency.exponentialRampToValueAtTime(740, now + 0.05);
            gain.gain.setValueAtTime(0.07, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
            osc.start(now);
            osc.stop(now + 0.06);
        } else if (type === 'nav') {
            osc.type = 'sine';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.04);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
        } else if (type === 'complete') {
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now);
            osc.frequency.exponentialRampToValueAtTime(880, now + 0.16);
            gain.gain.setValueAtTime(0.12, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
            osc.start(now);
            osc.stop(now + 0.22);
        }
    } catch {
        // Silently ignore browser audio autoplay restrictions
    }
}

function triggerHaptic(duration = 10) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            navigator.vibrate(duration);
        } catch {
            // Ignore
        }
    }
}

// Toast notification helper
function showToast(message, type = 'info') {
    const existing = document.getElementById('app-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'app-toast';
    toast.className = `fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-lg flex items-center gap-2 transform transition-all duration-300 translate-y-3 opacity-0 ${
        type === 'success' ? 'bg-emerald-600 text-white shadow-emerald-500/20' : 
        type === 'error' ? 'bg-red-600 text-white shadow-red-500/20' : 
        'bg-slate-900 text-white shadow-slate-900/30'
    }`;
    toast.innerHTML = `
        <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
        toast.classList.remove('translate-y-3', 'opacity-0');
    });

    setTimeout(() => {
        toast.classList.add('translate-y-3', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Token Gate Verification
function handleTokenVerification(tokenString) {
    const code = (tokenString || (DOM.inputGateToken && DOM.inputGateToken.value) || '').trim();
    if (!code) {
        showTokenGateError('Silakan ketik atau tempel token asesmen Anda.');
        return;
    }

    const check = validateToken(code);
    if (!check.valid) {
        showTokenGateError(check.message);
        return;
    }

    // Token is valid!
    hideTokenGateError();
    state.activeToken = check.token.code;
    setActiveSessionToken(check.token.code);

    playTapSound('select');
    showToast(`Token ${check.token.code} berhasil diverifikasi!`, 'success');

    // Update screen
    DOM.screenToken.classList.add('hidden');
    DOM.screenIntro.classList.remove('hidden');
    
    if (DOM.introVerifiedTokenPill) DOM.introVerifiedTokenPill.classList.remove('hidden');
    if (DOM.introTokenCodeText) DOM.introTokenCodeText.textContent = check.token.code;

    // Check if there is an in-progress test
    const answeredCount = state.answers.filter(Boolean).length;
    if (answeredCount > 0) {
        DOM.btnResume.classList.remove('hidden');
        DOM.btnClear.classList.remove('hidden');
    }
}

function showTokenGateError(msg) {
    if (DOM.gateTokenError && DOM.gateTokenErrorText) {
        DOM.gateTokenErrorText.textContent = msg;
        DOM.gateTokenError.classList.remove('hidden');
    }
    if (DOM.inputGateToken) {
        DOM.inputGateToken.classList.add('border-rose-500', 'bg-rose-50/50');
        DOM.inputGateToken.focus();
    }
}

function hideTokenGateError() {
    if (DOM.gateTokenError) DOM.gateTokenError.classList.add('hidden');
    if (DOM.inputGateToken) DOM.inputGateToken.classList.remove('border-rose-500', 'bg-rose-50/50');
}

// Setup Event Listeners
function setupEventListeners() {
    // Sound toggle
    if (DOM.btnSoundToggle) {
        DOM.btnSoundToggle.addEventListener('click', () => {
            state.soundEnabled = !state.soundEnabled;
            updateSoundIcon();
            showToast(state.soundEnabled ? 'Efek audio diaktifkan' : 'Efek audio dibisukan');
        });
    }

    // Token Gate interactions
    if (DOM.btnValidateToken) {
        DOM.btnValidateToken.addEventListener('click', (e) => {
            e.preventDefault();
            handleTokenVerification();
        });
    }

    const formTokenGate = document.getElementById('form-token-gate');
    if (formTokenGate) {
        formTokenGate.addEventListener('submit', (e) => {
            e.preventDefault();
            handleTokenVerification();
        });
    }

    if (DOM.inputGateToken) {
        DOM.inputGateToken.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
            hideTokenGateError();
        });
    }

    if (DOM.btnPasteToken) {
        DOM.btnPasteToken.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && DOM.inputGateToken) {
                    DOM.inputGateToken.value = text.trim().toUpperCase();
                    hideTokenGateError();
                    DOM.inputGateToken.focus();
                    showToast('Token ditempel dari clipboard');
                }
            } catch {
                showToast('Izin clipboard tidak diberikan', 'error');
            }
        });
    }

    if (DOM.btnUseDemoToken) {
        DOM.btnUseDemoToken.addEventListener('click', () => {
            if (DOM.inputGateToken) {
                DOM.inputGateToken.value = 'PAPI-DEMO-2026';
                hideTokenGateError();
                handleTokenVerification('PAPI-DEMO-2026');
            }
        });
    }

    if (DOM.btnChangeToken) {
        DOM.btnChangeToken.addEventListener('click', () => {
            if (confirm('Ganti token asesmen? Anda akan kembali ke halaman verifikasi token.')) {
                setActiveSessionToken(null);
                state.activeToken = null;
                DOM.screenIntro.classList.add('hidden');
                DOM.screenToken.classList.remove('hidden');
                if (DOM.inputGateToken) {
                    DOM.inputGateToken.value = '';
                    DOM.inputGateToken.focus();
                }
            }
        });
    }

    // Admin Access Triggers
    if (DOM.btnAdminHeader) DOM.btnAdminHeader.addEventListener('click', openAdminLoginModal);
    if (DOM.btnOpenAdminFromGate) DOM.btnOpenAdminFromGate.addEventListener('click', openAdminLoginModal);
    if (DOM.btnCancelAdminLogin) DOM.btnCancelAdminLogin.addEventListener('click', closeAdminLoginModal);

    const formAdminLogin = document.getElementById('form-admin-login');
    if (formAdminLogin) {
        formAdminLogin.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAdminLogin();
        });
    }

    if (DOM.btnSubmitAdminLogin) {
        DOM.btnSubmitAdminLogin.addEventListener('click', handleAdminLogin);
    }

    if (DOM.btnCloseAdminPanel) DOM.btnCloseAdminPanel.addEventListener('click', closeAdminPanelModal);

    // Admin Panel Tabs
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchAdminTab(this.dataset.tab);
        });
    });

    // Admin Generator Mode Toggle
    if (DOM.btnModeSingle) {
        DOM.btnModeSingle.addEventListener('click', () => {
            state.adminGenerateMode = 'single';
            DOM.btnModeSingle.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
            DOM.btnModeSingle.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
            DOM.btnModeBatch.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
            DOM.btnModeBatch.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
            if (DOM.wrapperBatchCount) DOM.wrapperBatchCount.classList.add('hidden');
        });
    }

    if (DOM.btnModeBatch) {
        DOM.btnModeBatch.addEventListener('click', () => {
            state.adminGenerateMode = 'batch';
            DOM.btnModeBatch.classList.add('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
            DOM.btnModeBatch.classList.remove('border-slate-200', 'bg-white', 'text-slate-600');
            DOM.btnModeSingle.classList.remove('border-indigo-600', 'bg-indigo-50', 'text-indigo-700', 'font-bold');
            DOM.btnModeSingle.classList.add('border-slate-200', 'bg-white', 'text-slate-600');
            if (DOM.wrapperBatchCount) DOM.wrapperBatchCount.classList.remove('hidden');
        });
    }

    if (DOM.btnSubmitGenerate) {
        DOM.btnSubmitGenerate.addEventListener('click', handleAdminGenerateToken);
    }

    if (DOM.btnCopyGeneratedTokens) {
        DOM.btnCopyGeneratedTokens.addEventListener('click', () => {
            if (state.lastGeneratedTokens.length > 0) {
                const text = state.lastGeneratedTokens.map(t => `${t.code} (${t.label})`).join('\n');
                navigator.clipboard.writeText(text).then(() => {
                    showToast('Seluruh token baru disalin ke clipboard!', 'success');
                });
            }
        });
    }

    // Admin Token Filter & Search
    document.querySelectorAll('.admin-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.admin-filter-btn').forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white', 'shadow-2xs');
                b.classList.add('text-slate-600');
            });
            this.classList.add('bg-indigo-600', 'text-white', 'shadow-2xs');
            this.classList.remove('text-slate-600');
            state.adminCurrentFilter = this.dataset.filter;
            renderAdminTokensTable();
        });
    });

    if (DOM.adminTokenSearch) {
        DOM.adminTokenSearch.addEventListener('input', () => {
            renderAdminTokensTable();
        });
    }

    if (DOM.btnExportTokensCsv) {
        DOM.btnExportTokensCsv.addEventListener('click', () => {
            exportTokensToCSV();
            showToast('Daftar token berhasil diekspor ke CSV!', 'success');
        });
    }

    // Admin PIN Form
    const formChangePin = document.getElementById('form-change-pin');
    if (formChangePin) {
        formChangePin.addEventListener('submit', (e) => {
            e.preventDefault();
            handleAdminChangePin();
        });
    }
    if (DOM.btnSavePin) {
        DOM.btnSavePin.addEventListener('click', handleAdminChangePin);
    }

    // Tutorial triggers
    if (DOM.btnTutorialHeader) DOM.btnTutorialHeader.addEventListener('click', openTutorialModal);
    if (DOM.btnOpenTutorialInline) DOM.btnOpenTutorialInline.addEventListener('click', openTutorialModal);
    if (DOM.btnTutorialShortcut) DOM.btnTutorialShortcut.addEventListener('click', openTutorialModal);
    if (DOM.btnCloseTutorial) DOM.btnCloseTutorial.addEventListener('click', closeTutorialModal);
    if (DOM.btnUnderstoodTutorial) DOM.btnUnderstoodTutorial.addEventListener('click', closeTutorialModal);
    if (DOM.tutorialModal) {
        DOM.tutorialModal.addEventListener('click', (e) => {
            if (e.target === DOM.tutorialModal) closeTutorialModal();
        });
    }

    // Assessment Start / Resume / Clear
    if (DOM.btnStart) DOM.btnStart.addEventListener('click', () => startAssessment(false));
    if (DOM.btnResume) DOM.btnResume.addEventListener('click', () => startAssessment(true));
    if (DOM.btnClear) DOM.btnClear.addEventListener('click', () => {
        if (confirm('Hapus seluruh data progres tersimpan? Anda akan memulai dari awal.')) {
            clearPersistedState();
        }
    });

    // Navigation buttons
    if (DOM.btnPrev) DOM.btnPrev.addEventListener('click', () => navigateQuestion(-1));
    if (DOM.btnNext) DOM.btnNext.addEventListener('click', () => navigateQuestion(1));

    // Question Grid Modal
    if (DOM.btnGrid) DOM.btnGrid.addEventListener('click', openGridModal);
    if (DOM.btnCloseGrid) DOM.btnCloseGrid.addEventListener('click', closeGridModal);
    if (DOM.gridModal) {
        DOM.gridModal.addEventListener('click', (e) => {
            if (e.target === DOM.gridModal) closeGridModal();
        });
    }

    if (DOM.btnJumpUnanswered) {
        DOM.btnJumpUnanswered.addEventListener('click', () => {
            const firstEmpty = state.answers.findIndex(a => a === null);
            if (firstEmpty !== -1) {
                closeGridModal();
                renderQuestion(firstEmpty, 0);
            } else {
                closeGridModal();
                showReviewScreen();
            }
        });
    }

    // Grid filter buttons
    document.querySelectorAll('.grid-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.grid-filter-btn').forEach(b => {
                b.classList.remove('bg-indigo-50', 'text-indigo-700');
                b.classList.add('text-slate-500');
            });
            this.classList.add('bg-indigo-50', 'text-indigo-700');
            this.classList.remove('text-slate-500');
            state.currentGridFilter = this.dataset.filter;
            renderGridItems();
        });
    });

    // Review Screen Actions
    const reviewBackBtn = document.getElementById('btn-review-back');
    if (reviewBackBtn) {
        reviewBackBtn.addEventListener('click', () => {
            DOM.screenReview.classList.add('hidden');
            DOM.screenQuestion.classList.remove('hidden');
            DOM.bottomNav.classList.remove('hidden');
            renderQuestion(89, -1);
        });
    }

    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) {
        submitBtn.addEventListener('click', generateFinalResults);
    }

    // Result Screen Actions
    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) exportCsvBtn.addEventListener('click', exportScoresToCSV);

    const exportAnswersBtn = document.getElementById('btn-export-answers-csv');
    if (exportAnswersBtn) exportAnswersBtn.addEventListener('click', exportAnswersToCSV);

    const matrixCsvBtn = document.getElementById('btn-export-matrix-csv');
    if (matrixCsvBtn) matrixCsvBtn.addEventListener('click', exportScoresToCSV);

    const tabAnswersCsvBtn = document.getElementById('btn-export-answers-tab');
    if (tabAnswersCsvBtn) tabAnswersCsvBtn.addEventListener('click', exportAnswersToCSV);

    const printBtn = document.getElementById('btn-print');
    if (printBtn) printBtn.addEventListener('click', () => window.print());

    const copySummaryBtn = document.getElementById('btn-copy-summary');
    if (copySummaryBtn) copySummaryBtn.addEventListener('click', copySummaryToClipboard);

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            if (confirm('Apakah Anda yakin ingin mengulang asesmen dari awal? Data laporan saat ini akan dibersihkan.')) {
                clearPersistedState();
            }
        });
    }

    // Result Tabs Navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Search Matrix in Tab 3
    const searchInput = document.getElementById('matrix-search');
    if (searchInput) {
        let debounceTimer = null;
        searchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();
                document.querySelectorAll('#matrix-table-body tr').forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(query) ? '' : 'none';
                });
            }, 60);
        });
    }

    // Answers Filter and Search in Tab 4
    document.querySelectorAll('.answers-filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.answers-filter-btn').forEach(b => {
                b.classList.remove('bg-indigo-600', 'text-white', 'shadow-2xs');
                b.classList.add('text-slate-600');
            });
            this.classList.add('bg-indigo-600', 'text-white', 'shadow-2xs');
            this.classList.remove('text-slate-600');
            state.currentAnswersFilter = this.dataset.filter;
            renderAnswersSheetTable(this.dataset.filter);
        });
    });

    const answersSearchInput = document.getElementById('answers-search');
    if (answersSearchInput) {
        let debounceTimer = null;
        answersSearchInput.addEventListener('input', function(e) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                const query = e.target.value.toLowerCase().trim();
                document.querySelectorAll('#answers-table-body tr').forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(query) ? '' : 'none';
                });
            }, 60);
        });
    }
}

// Admin Modal Handlers
function openAdminLoginModal() {
    if (!DOM.adminLoginModal) return;
    if (DOM.inputAdminPin) DOM.inputAdminPin.value = '';
    if (DOM.adminLoginError) DOM.adminLoginError.classList.add('hidden');

    DOM.adminLoginModal.classList.remove('hidden');
    void DOM.adminLoginModal.offsetWidth;
    DOM.adminLoginModal.classList.remove('opacity-0');
    DOM.adminLoginContent.classList.remove('scale-95');
    DOM.adminLoginContent.classList.add('scale-100');
    if (DOM.inputAdminPin) DOM.inputAdminPin.focus();
}

function closeAdminLoginModal() {
    if (!DOM.adminLoginModal) return;
    DOM.adminLoginModal.classList.add('opacity-0');
    DOM.adminLoginContent.classList.add('scale-95');
    DOM.adminLoginContent.classList.remove('scale-100');
    setTimeout(() => {
        DOM.adminLoginModal.classList.add('hidden');
    }, 200);
}

function handleAdminLogin() {
    const pin = (DOM.inputAdminPin && DOM.inputAdminPin.value) || '';
    if (verifyAdminPin(pin)) {
        closeAdminLoginModal();
        openAdminPanelModal();
    } else {
        if (DOM.adminLoginError) {
            DOM.adminLoginError.classList.remove('hidden');
            DOM.inputAdminPin.classList.add('border-rose-500');
            DOM.inputAdminPin.focus();
        }
    }
}

function openAdminPanelModal() {
    if (!DOM.adminPanelModal) return;
    DOM.adminPanelModal.classList.remove('hidden');
    void DOM.adminPanelModal.offsetWidth;
    DOM.adminPanelModal.classList.remove('opacity-0');
    DOM.adminPanelContent.classList.remove('scale-95');
    DOM.adminPanelContent.classList.add('scale-100');

    renderAdminTokensTable();
    updateAdminStats();
}

function closeAdminPanelModal() {
    if (!DOM.adminPanelModal) return;
    DOM.adminPanelModal.classList.add('opacity-0');
    DOM.adminPanelContent.classList.add('scale-95');
    DOM.adminPanelContent.classList.remove('scale-100');
    setTimeout(() => {
        DOM.adminPanelModal.classList.add('hidden');
    }, 200);
}

function switchAdminTab(tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabId) {
            btn.classList.add('border-indigo-600', 'text-indigo-600', 'font-bold');
            btn.classList.remove('border-transparent', 'text-slate-500', 'font-semibold');
        } else {
            btn.classList.remove('border-indigo-600', 'text-indigo-600', 'font-bold');
            btn.classList.add('border-transparent', 'text-slate-500', 'font-semibold');
        }
    });

    document.querySelectorAll('.admin-pane').forEach(p => {
        if (p.id === tabId) {
            p.classList.remove('hidden');
        } else {
            p.classList.add('hidden');
        }
    });

    if (tabId === 'admin-tab-list') {
        renderAdminTokensTable();
    }
}

function updateAdminStats() {
    const tokens = getAllTokens();
    if (DOM.adminTotalTokensBadge) DOM.adminTotalTokensBadge.textContent = tokens.length;
}

function handleAdminGenerateToken() {
    const prefix = (DOM.inputGenPrefix && DOM.inputGenPrefix.value) || 'PAPI';
    const label = (DOM.inputGenLabel && DOM.inputGenLabel.value) || 'Kandidat Asesmen';
    const type = (DOM.inputGenType && DOM.inputGenType.value) || 'single';
    const expiryDays = Number((DOM.inputGenExpiry && DOM.inputGenExpiry.value) || 0);

    if (state.adminGenerateMode === 'single') {
        const res = addSingleToken({ prefix, label, type, expiryDays });
        if (res.success) {
            state.lastGeneratedTokens = [res.token];
            renderGeneratedPreview(state.lastGeneratedTokens);
            showToast(`Token ${res.token.code} berhasil digenerate!`, 'success');
        } else {
            showToast(res.message, 'error');
        }
    } else {
        const count = Number((DOM.inputGenCount && DOM.inputGenCount.value) || 5);
        const res = batchGenerateTokens({ count, prefix, label, type, expiryDays });
        if (res.success) {
            state.lastGeneratedTokens = res.tokens;
            renderGeneratedPreview(state.lastGeneratedTokens);
            showToast(`Berhasil generate ${res.tokens.length} token massal!`, 'success');
        }
    }
    updateAdminStats();
}

function renderGeneratedPreview(tokenList) {
    if (!DOM.generatedTokensContainer) return;
    DOM.generatedTokensContainer.innerHTML = '';

    if (DOM.btnCopyGeneratedTokens) {
        DOM.btnCopyGeneratedTokens.classList.toggle('hidden', tokenList.length === 0);
    }

    tokenList.forEach(t => {
        const card = document.createElement('div');
        card.className = "p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between shadow-2xs hover:border-indigo-300 transition-colors";
        card.innerHTML = `
            <div>
                <div class="font-mono font-black text-indigo-700 text-xs sm:text-sm tracking-wide flex items-center gap-2">
                    <span>${t.code}</span>
                    <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${t.type === 'multi' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                        ${t.type === 'multi' ? 'Multi-use' : '1x Pakai'}
                    </span>
                </div>
                <div class="text-[11px] text-slate-500 font-medium">${t.label || '-'}</div>
            </div>
            <button type="button" class="btn-copy-single px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs font-semibold cursor-pointer transition-colors" data-code="${t.code}">
                Salin
            </button>
        `;
        card.querySelector('.btn-copy-single').addEventListener('click', function() {
            navigator.clipboard.writeText(this.dataset.code).then(() => {
                showToast(`Token ${this.dataset.code} disalin!`, 'success');
            });
        });
        DOM.generatedTokensContainer.appendChild(card);
    });
}

function renderAdminTokensTable() {
    if (!DOM.adminTokensTableBody) return;
    DOM.adminTokensTableBody.innerHTML = '';

    const allTokens = getAllTokens();
    const query = (DOM.adminTokenSearch && DOM.adminTokenSearch.value.toLowerCase().trim()) || '';
    const filter = state.adminCurrentFilter;

    const filtered = allTokens.filter(t => {
        if (filter === 'active' && (t.isUsed && t.type === 'single')) return false;
        if (filter === 'used' && !t.isUsed) return false;
        if (query) {
            const matchCode = t.code.toLowerCase().includes(query);
            const matchLabel = (t.label || '').toLowerCase().includes(query);
            const matchUser = (t.usedBy || '').toLowerCase().includes(query);
            return matchCode || matchLabel || matchUser;
        }
        return true;
    });

    if (filtered.length === 0) {
        DOM.adminTokensTableBody.innerHTML = `
            <tr>
                <td colspan="7" class="px-4 py-8 text-center text-slate-400 text-xs">
                    Tidak ada token yang sesuai kriteria pencarian.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach((t, i) => {
        const isExpired = t.expiresAt && Date.now() > new Date(t.expiresAt).getTime();
        const isUsed = t.isUsed && t.type === 'single';
        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="px-3.5 py-3 text-center text-slate-400 font-bold">${i + 1}</td>
            <td class="px-3.5 py-3 font-mono font-bold text-indigo-700">
                <span>${t.code}</span>
            </td>
            <td class="px-3.5 py-3 text-slate-700 font-semibold">${t.label || '-'}</td>
            <td class="px-3.5 py-3 text-center">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${t.type === 'multi' ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}">
                    ${t.type === 'multi' ? 'Multi' : '1x Pakai'}
                </span>
            </td>
            <td class="px-3.5 py-3 text-center">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isExpired ? 'bg-red-50 text-red-700 border border-red-200' : 
                    (isUsed ? 'bg-slate-100 text-slate-600 border border-slate-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200')
                }">
                    ${isExpired ? 'Kedaluwarsa' : (isUsed ? 'Terpakai' : 'Aktif')}
                </span>
            </td>
            <td class="px-3.5 py-3 text-slate-600">
                ${t.usedBy ? `<strong>${t.usedBy}</strong>` : '<span class="text-slate-400">-</span>'}
            </td>
            <td class="px-3.5 py-3 text-center">
                <div class="flex items-center justify-center gap-1">
                    <button type="button" class="btn-copy-row p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer" title="Salin Kode Token" data-code="${t.code}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
                    </button>
                    <button type="button" class="btn-del-row p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer" title="Hapus Token" data-code="${t.code}">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-copy-row').addEventListener('click', function() {
            navigator.clipboard.writeText(this.dataset.code).then(() => {
                showToast(`Token ${this.dataset.code} disalin!`, 'success');
            });
        });

        tr.querySelector('.btn-del-row').addEventListener('click', function() {
            if (confirm(`Hapus token "${this.dataset.code}"?`)) {
                deleteToken(this.dataset.code);
                renderAdminTokensTable();
                updateAdminStats();
                showToast('Token dihapus');
            }
        });

        DOM.adminTokensTableBody.appendChild(tr);
    });
}

function handleAdminChangePin() {
    const curPin = (DOM.inputCurrentPin && DOM.inputCurrentPin.value) || '';
    const newPin = (DOM.inputNewPin && DOM.inputNewPin.value) || '';

    if (!verifyAdminPin(curPin)) {
        showToast('PIN saat ini salah!', 'error');
        if (DOM.inputCurrentPin) DOM.inputCurrentPin.focus();
        return;
    }

    const res = setAdminPin(newPin);
    if (res.success) {
        showToast(res.message, 'success');
        if (DOM.inputCurrentPin) DOM.inputCurrentPin.value = '';
        if (DOM.inputNewPin) DOM.inputNewPin.value = '';
    } else {
        showToast(res.message, 'error');
    }
}

function updateSoundIcon() {
    if (!DOM.btnSoundToggle) return;
    if (state.soundEnabled) {
        DOM.btnSoundToggle.innerHTML = `
            <svg class="w-3.5 h-3.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path></svg>
            <span class="hidden sm:inline">Suara: On</span>
        `;
        DOM.btnSoundToggle.title = 'Suara aktif (klik untuk membisukan)';
    } else {
        DOM.btnSoundToggle.innerHTML = `
            <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"></path></svg>
            <span class="hidden sm:inline">Suara: Off</span>
        `;
        DOM.btnSoundToggle.title = 'Suara dibisukan (klik untuk mengaktifkan)';
    }
}

// Switch Result Tabs
export function switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        if (b.dataset.tab === tabId) {
            b.classList.add('border-indigo-600', 'text-indigo-600');
            b.classList.remove('border-transparent', 'text-slate-500');
        } else {
            b.classList.remove('border-indigo-600', 'text-indigo-600');
            b.classList.add('border-transparent', 'text-slate-500');
        }
    });

    document.querySelectorAll('.tab-pane').forEach(p => {
        if (p.id === tabId) {
            p.classList.remove('hidden');
        } else {
            p.classList.add('hidden');
        }
    });
}

// State Persistence (localStorage)
function loadPersistedState() {
    try {
        const saved = localStorage.getItem('papi_kostick_state');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.answers && parsed.answers.length === 90) {
                state.answers = parsed.answers;
                state.currentIndex = parsed.currentIndex || 0;
                state.elapsedSeconds = parsed.elapsedSeconds || 0;
                if (parsed.participant) state.participant = { ...state.participant, ...parsed.participant };
                if (typeof parsed.soundEnabled === 'boolean') state.soundEnabled = parsed.soundEnabled;
                if (parsed.activeToken) state.activeToken = parsed.activeToken;

                const answeredCount = state.answers.filter(Boolean).length;
                if (answeredCount > 0) {
                    DOM.btnResume.classList.remove('hidden');
                    DOM.btnClear.classList.remove('hidden');
                    DOM.resumeLabel.textContent = `Lanjutkan Tes (${answeredCount}/90 Soal Terjawab)`;
                    
                    if (state.participant.name) DOM.inputName.value = state.participant.name;
                    if (state.participant.role) DOM.inputRole.value = state.participant.role;
                    if (state.participant.email) DOM.inputEmail.value = state.participant.email;
                    if (state.participant.phone) DOM.inputPhone.value = state.participant.phone;
                    if (state.participant.gender) DOM.inputGender.value = state.participant.gender;
                    if (state.participant.birthYear) DOM.inputBirthYear.value = state.participant.birthYear;
                    if (state.participant.education) DOM.inputEducation.value = state.participant.education;
                }
            }
        }
    } catch (e) {
        console.error('Error loading state:', e);
    }
}

function savePersistedState() {
    try {
        localStorage.setItem('papi_kostick_state', JSON.stringify({
            answers: state.answers,
            currentIndex: state.currentIndex,
            elapsedSeconds: state.elapsedSeconds,
            soundEnabled: state.soundEnabled,
            activeToken: state.activeToken,
            participant: state.participant
        }));
    } catch (e) {
        console.error('Error saving state:', e);
    }
}

function clearPersistedState() {
    localStorage.removeItem('papi_kostick_state');
    setActiveSessionToken(null);
    location.reload();
}

// Start Assessment Flow
function startAssessment(resume = false) {
    if (!resume) {
        state.answers = new Array(90).fill(null);
        state.currentIndex = 0;
        state.elapsedSeconds = 0;
    }

    // Read participant details
    state.participant.name = (DOM.inputName && DOM.inputName.value.trim()) || 'Peserta';
    state.participant.role = (DOM.inputRole && DOM.inputRole.value.trim()) || 'Umum';
    state.participant.email = (DOM.inputEmail && DOM.inputEmail.value.trim()) || '-';
    state.participant.phone = (DOM.inputPhone && DOM.inputPhone.value.trim()) || '-';
    state.participant.gender = (DOM.inputGender && DOM.inputGender.value) || '-';
    state.participant.birthYear = (DOM.inputBirthYear && DOM.inputBirthYear.value.trim()) || '-';
    state.participant.education = (DOM.inputEducation && DOM.inputEducation.value) || '-';
    
    if (DOM.headerUserDisplay) DOM.headerUserDisplay.textContent = state.participant.name;

    // Switch screen visibility
    DOM.screenIntro.classList.add('hidden');
    DOM.screenQuestion.classList.remove('hidden');
    DOM.bottomNav.classList.remove('hidden');
    DOM.headerTimer.classList.remove('hidden');
    DOM.btnGrid.classList.remove('hidden');

    startTimer();
    savePersistedState();

    // Determine target question
    if (state.currentIndex >= 90 || state.answers.every(Boolean)) {
        showReviewScreen();
    } else {
        renderQuestion(state.currentIndex, 1);
    }
}

// Timer Functions
function startTimer() {
    if (state.timerInterval) clearInterval(state.timerInterval);
    state.timerInterval = setInterval(() => {
        state.elapsedSeconds++;
        const mins = String(Math.floor(state.elapsedSeconds / 60)).padStart(2, '0');
        const secs = String(state.elapsedSeconds % 60).padStart(2, '0');
        if (DOM.timerDisplay) DOM.timerDisplay.textContent = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    if (state.timerInterval) {
        clearInterval(state.timerInterval);
        state.timerInterval = null;
    }
}

// Render Question Card
function renderQuestion(index, direction = 0) {
    if (index < 0 || index >= 90) return;
    if (state.isAnimating) return;

    state.isAnimating = true;
    state.currentIndex = index;
    savePersistedState();
    updateProgressIndicators();

    const q = questions[index];
    const oldCard = document.getElementById('current-card');
    
    const newCard = document.createElement('div');
    newCard.id = 'current-card';
    const animClass = direction > 0 ? 'card-enter' : (direction < 0 ? 'card-enter-reverse' : 'fade-in');
    newCard.className = `w-full flex flex-col gap-3 sm:gap-4 py-2 ${animClass}`;

    const isAnsweredA = state.answers[index] === 'A';
    const isAnsweredB = state.answers[index] === 'B';

    newCard.innerHTML = `
        <div class="flex items-center justify-between mb-1 sm:mb-2">
            <span class="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider shadow-2xs">
                Soal ${q.id} <span class="text-indigo-400 font-normal">dari 90</span>
            </span>
            <span class="text-xs text-slate-400 font-medium">Pilih 1 pernyataan yang paling sesuai</span>
        </div>
        
        <!-- Option A -->
        <button type="button" class="btn-option group w-full bg-white border-2 border-slate-200 hover:border-indigo-400 p-4 sm:p-6 rounded-2xl transition-all text-left shadow-xs hover:shadow-md cursor-pointer ${isAnsweredA ? 'selected' : ''}" data-choice="A" aria-label="Opsi A: ${q.option_a.text}">
            <div class="flex items-start sm:items-center gap-3.5 sm:gap-4 pointer-events-none">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-200 group-hover:border-indigo-400 flex items-center justify-center shrink-0 text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-all option-circle bg-slate-50">
                    ${isAnsweredA ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 'A'}
                </div>
                <p class="text-sm sm:text-base md:text-lg font-medium text-slate-700 group-hover:text-slate-900 leading-snug sm:leading-relaxed transition-colors flex-1">${q.option_a.text}</p>
            </div>
        </button>

        <!-- Option B -->
        <button type="button" class="btn-option group w-full bg-white border-2 border-slate-200 hover:border-indigo-400 p-4 sm:p-6 rounded-2xl transition-all text-left shadow-xs hover:shadow-md cursor-pointer ${isAnsweredB ? 'selected' : ''}" data-choice="B" aria-label="Opsi B: ${q.option_b.text}">
            <div class="flex items-start sm:items-center gap-3.5 sm:gap-4 pointer-events-none">
                <div class="w-9 h-9 sm:w-10 sm:h-10 rounded-xl border-2 border-slate-200 group-hover:border-indigo-400 flex items-center justify-center shrink-0 text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-all option-circle bg-slate-50">
                    ${isAnsweredB ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 'B'}
                </div>
                <p class="text-sm sm:text-base md:text-lg font-medium text-slate-700 group-hover:text-slate-900 leading-snug sm:leading-relaxed transition-colors flex-1">${q.option_b.text}</p>
            </div>
        </button>
    `;

    if (oldCard) {
        oldCard.id = '';
        oldCard.className = `w-full absolute inset-0 pointer-events-none flex flex-col gap-3 sm:gap-4 py-2 ${direction > 0 ? 'card-exit' : 'card-exit-reverse'}`;
        setTimeout(() => {
            if (oldCard.parentNode) oldCard.parentNode.removeChild(oldCard);
        }, 190);
    }

    DOM.questionWrapper.appendChild(newCard);

    // Option click
    const optionBtns = newCard.querySelectorAll('.btn-option');
    optionBtns.forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            if (state.isAnimating) return;
            selectAnswer(this.dataset.choice);
        });
    });

    setTimeout(() => {
        state.isAnimating = false;
    }, 210);
}

// Select Answer & Auto Advance
function selectAnswer(choice) {
    const currentCard = document.getElementById('current-card');
    if (!currentCard) return;

    playTapSound('select');
    triggerHaptic(12);

    const btns = currentCard.querySelectorAll('.btn-option');
    btns.forEach(b => {
        b.classList.remove('selected');
        const circle = b.querySelector('.option-circle');
        if (circle) circle.innerHTML = b.dataset.choice;
    });

    const selectedBtn = currentCard.querySelector(`[data-choice="${choice}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('selected');
        const circle = selectedBtn.querySelector('.option-circle');
        if (circle) {
            circle.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
        }
    }

    state.answers[state.currentIndex] = choice;
    savePersistedState();
    updateProgressIndicators();

    setTimeout(() => {
        if (state.currentIndex === 89) {
            if (state.answers.every(Boolean)) {
                showReviewScreen();
            } else {
                openGridModal();
            }
        } else {
            navigateQuestion(1);
        }
    }, 160);
}

// Navigate Question
function navigateQuestion(dir) {
    if (state.isAnimating) return;
    const target = state.currentIndex + dir;
    if (target >= 0 && target < 90) {
        playTapSound('nav');
        renderQuestion(target, dir);
    } else if (target === 90 && dir > 0) {
        if (state.answers.every(Boolean)) {
            showReviewScreen();
        } else {
            openGridModal();
        }
    }
}

// Update Global Progress Bar and Badges
function updateProgressIndicators() {
    const answeredCount = state.answers.filter(Boolean).length;
    const pct = (answeredCount / 90) * 100;
    
    if (DOM.progressBar) DOM.progressBar.style.width = `${pct}%`;
    if (DOM.headerProgressText) {
        DOM.headerProgressText.textContent = `Soal ${state.currentIndex + 1} dari 90 (${Math.round(pct)}% Selesai)`;
    }
    if (DOM.bottomQNumber) DOM.bottomQNumber.textContent = state.currentIndex + 1;
    if (DOM.gridBtnBadge) DOM.gridBtnBadge.textContent = `${answeredCount}/90`;

    if (DOM.btnPrev) DOM.btnPrev.disabled = state.currentIndex === 0;

    if (DOM.btnNext) {
        if (state.answers[state.currentIndex]) {
            DOM.btnNext.classList.remove('opacity-0', 'pointer-events-none');
        } else {
            DOM.btnNext.classList.add('opacity-0', 'pointer-events-none');
        }
    }
}

// Keyboard Support
function setupKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
        if (document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
        
        if (DOM.screenQuestion.classList.contains('hidden')) return;

        if (e.key === '1' || e.key === 'a' || e.key === 'A') {
            e.preventDefault();
            selectAnswer('A');
        } else if (e.key === '2' || e.key === 'b' || e.key === 'B') {
            e.preventDefault();
            selectAnswer('B');
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigateQuestion(-1);
        } else if (e.key === 'ArrowRight' || e.key === 'Enter') {
            e.preventDefault();
            if (state.answers[state.currentIndex]) navigateQuestion(1);
        } else if (e.key === 'g' || e.key === 'G') {
            e.preventDefault();
            if (DOM.gridModal.classList.contains('hidden')) {
                openGridModal();
            } else {
                closeGridModal();
            }
        } else if (e.key === 'Escape') {
            closeGridModal();
            closeTutorialModal();
            closeAdminLoginModal();
            closeAdminPanelModal();
        } else if (e.key === 'h' || e.key === 'H' || e.key === '?') {
            e.preventDefault();
            if (DOM.tutorialModal.classList.contains('hidden')) {
                openTutorialModal();
            } else {
                closeTutorialModal();
            }
        }
    });
}

// Mobile Touch Swipe Gestures
function setupSwipeGestures() {
    let startX = 0;
    let endX = 0;
    const threshold = 55;

    DOM.screenQuestion.addEventListener('touchstart', e => {
        startX = e.changedTouches[0].screenX;
    }, { passive: true });

    DOM.screenQuestion.addEventListener('touchend', e => {
        endX = e.changedTouches[0].screenX;
        if (endX > startX + threshold) {
            navigateQuestion(-1);
        } else if (endX < startX - threshold) {
            if (state.answers[state.currentIndex]) navigateQuestion(1);
        }
    }, { passive: true });
}

// Question Grid Navigation Modal
function openGridModal() {
    renderGridItems();
    DOM.gridModal.classList.remove('hidden');
    void DOM.gridModal.offsetWidth;
    DOM.gridModal.classList.remove('opacity-0');
    DOM.gridModalContent.classList.remove('translate-y-full', 'sm:scale-95');
    DOM.gridModalContent.classList.add('sm:scale-100');
}

function closeGridModal() {
    DOM.gridModal.classList.add('opacity-0');
    DOM.gridModalContent.classList.add('translate-y-full', 'sm:scale-95');
    DOM.gridModalContent.classList.remove('sm:scale-100');
    setTimeout(() => {
        DOM.gridModal.classList.add('hidden');
    }, 220);
}

// Tutorial Modal
function openTutorialModal() {
    if (!DOM.tutorialModal) return;
    DOM.tutorialModal.classList.remove('hidden');
    void DOM.tutorialModal.offsetWidth;
    DOM.tutorialModal.classList.remove('opacity-0');
    DOM.tutorialModalContent.classList.remove('translate-y-full', 'sm:scale-95');
    DOM.tutorialModalContent.classList.add('sm:scale-100');
}

function closeTutorialModal() {
    if (!DOM.tutorialModal) return;
    DOM.tutorialModal.classList.add('opacity-0');
    DOM.tutorialModalContent.classList.add('translate-y-full', 'sm:scale-95');
    DOM.tutorialModalContent.classList.remove('sm:scale-100');
    setTimeout(() => {
        DOM.tutorialModal.classList.add('hidden');
    }, 220);
}

// Render 90 Item Badges inside Grid
function renderGridItems() {
    DOM.gridContainer.innerHTML = '';
    const answeredCount = state.answers.filter(Boolean).length;
    DOM.countAnswered.textContent = answeredCount;
    DOM.countUnanswered.textContent = 90 - answeredCount;
    DOM.gridModalStats.textContent = `Terjawab: ${answeredCount} / 90 Soal`;

    for (let i = 0; i < 90; i++) {
        const isCurrent = i === state.currentIndex;
        const isAnswered = Boolean(state.answers[i]);

        if (state.currentGridFilter === 'unanswered' && isAnswered) continue;
        if (state.currentGridFilter === 'answered' && !isAnswered) continue;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `w-9 h-9 sm:w-10 sm:h-10 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center border-2 transition-all cursor-pointer ${
            isCurrent ? 'ring-2 ring-indigo-600 ring-offset-2 border-indigo-600 bg-indigo-600 text-white shadow-xs' : 
            (isAnswered ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-slate-300 hover:bg-slate-100')
        }`;
        
        btn.innerHTML = `${i + 1}`;
        btn.title = `Soal ${i + 1}: ${isAnswered ? `Jawaban [${state.answers[i]}]` : 'Belum Dijawab'}`;
        
        btn.addEventListener('click', () => {
            closeGridModal();
            if (state.currentIndex !== i) {
                renderQuestion(i, i > state.currentIndex ? 1 : -1);
            }
        });

        DOM.gridContainer.appendChild(btn);
    }
}

// Review Screen
function showReviewScreen() {
    DOM.screenQuestion.classList.add('hidden');
    DOM.bottomNav.classList.add('hidden');
    DOM.screenReview.classList.remove('hidden');

    playTapSound('complete');
    triggerHaptic(30);

    const nameEl = document.getElementById('review-user-name');
    if (nameEl) nameEl.textContent = state.participant.name;
    
    const mins = Math.floor(state.elapsedSeconds / 60);
    const secs = state.elapsedSeconds % 60;
    const timeEl = document.getElementById('review-total-time');
    if (timeEl) timeEl.textContent = `${mins} menit ${secs} detik`;
}

// Psychometric Scoring and Final Analytics
function generateFinalResults() {
    stopTimer();
    DOM.screenReview.classList.add('hidden');
    DOM.screenResult.classList.remove('hidden');
    DOM.headerTimer.classList.add('hidden');
    DOM.btnGrid.classList.add('hidden');

    // Mark token as used
    if (state.activeToken) {
        markTokenUsed(state.activeToken, state.participant.name);
    }

    // 1. Calculate Scores for 20 Aspects
    const scores = {};
    Object.keys(TRAIT_INFO).forEach(k => scores[k] = 0);

    questions.forEach((q, idx) => {
        const ans = state.answers[idx];
        if (ans === 'A') {
            scores[q.option_a.trait]++;
        } else if (ans === 'B') {
            scores[q.option_b.trait]++;
        }
    });

    // 2. Populate Report Metadata
    const setElemText = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.textContent = val;
    };

    setElemText('report-user-name', state.participant.name);
    setElemText('report-user-role', state.participant.role);
    setElemText('report-user-email', state.participant.email);
    setElemText('report-user-phone', state.participant.phone);
    setElemText('report-user-education', state.participant.education);
    setElemText('report-user-gender', state.participant.gender);
    setElemText('report-user-birth-year', state.participant.birthYear);
    setElemText('report-date', state.participant.date);
    
    const mins = Math.floor(state.elapsedSeconds / 60);
    const secs = state.elapsedSeconds % 60;
    const durationStr = `${mins} Menit ${secs} Detik`;
    setElemText('report-duration', durationStr);
    setElemText('result-meta-text', `Peserta: ${state.participant.name} (${state.participant.role}) • Tanggal: ${state.participant.date} • Durasi: ${durationStr}`);

    // 3. Render Views
    renderRadarChart(scores);
    renderExecutiveSummary(scores);
    renderDimensionsAnalysis(scores);
    renderAspectMatrixTable(scores);
    renderAnswersSheetTable('all');

    showToast('Analisis psikometri berhasil disusun!', 'success');
}

// Level classification helper
function getScoreLevel(score) {
    if (score <= 1) return { label: 'Sangat Rendah', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    if (score <= 3) return { label: 'Rendah', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (score <= 5) return { label: 'Sedang / Seimbang', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (score <= 7) return { label: 'Tinggi', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    return { label: 'Sangat Tinggi', color: 'bg-purple-50 text-purple-700 border-purple-200' };
}

// Dynamic behavioral narrative based on score range
function getAspectBehaviorDescription(traitKey, score) {
    const info = TRAIT_INFO[traitKey];
    if (score >= 7) {
        return `Memiliki tingkat <strong>${info.name}</strong> yang sangat kuat. Menunjukkan komitmen tinggi dan sangat aktif mengedepankan aspek ini dalam lingkungan kerja.`;
    } else if (score >= 4) {
        return `Berada pada level proporsional (rata-rata). Mampu mengaplikasikan <strong>${info.name}</strong> secara fleksibel sesuai dengan tuntutan situasi.`;
    } else {
        return `Kecenderungan <strong>${info.name}</strong> berada di bawah rata-rata. Cenderung memprioritaskan preferensi atau pendekatan lain dalam dinamika kerja.`;
    }
}

// 1. Radar Chart Renderer
function renderRadarChart(scores) {
    const canvas = document.getElementById('radarChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const wheelKeys = ['G','L','I','T','V','S','R','D','C','E','W','F','K','Z','O','B','X','P','A','N'];
    const dataValues = wheelKeys.map(k => scores[k]);
    const displayLabels = wheelKeys.map(k => `${k}`);

    if (state.radarChartInstance) {
        state.radarChartInstance.destroy();
    }

    state.radarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: displayLabels,
            datasets: [{
                label: 'Skor Aspek PAPI (0-9)',
                data: dataValues,
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderColor: '#4f46e5',
                pointBackgroundColor: '#4f46e5',
                pointBorderColor: '#ffffff',
                pointBorderWidth: 2,
                pointRadius: 4.5,
                pointHoverRadius: 6.5,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#4f46e5',
                pointHoverBorderWidth: 3,
                borderWidth: 2.5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: '#e2e8f0', lineWidth: 1 },
                    grid: { color: '#e2e8f0', circular: true },
                    pointLabels: {
                        font: { family: "'Plus Jakarta Sans', sans-serif", size: 12, weight: '700' },
                        color: '#1e293b'
                    },
                    ticks: {
                        beginAtZero: true,
                        min: 0,
                        max: 9,
                        stepSize: 3,
                        showLabelBackdrop: false,
                        font: { size: 10, weight: '600' },
                        color: '#94a3b8'
                    }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e293b',
                    titleFont: { family: "'Plus Jakarta Sans', sans-serif", size: 13, weight: 'bold' },
                    bodyFont: { family: "'Plus Jakarta Sans', sans-serif", size: 12 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                        title: function(context) {
                            const key = wheelKeys[context[0].dataIndex];
                            return `${key}: ${TRAIT_INFO[key].name}`;
                        },
                        label: function(context) {
                            const key = wheelKeys[context.dataIndex];
                            const val = context.raw;
                            const level = getScoreLevel(val).label;
                            return `Skor: ${val}/9 (${level})`;
                        }
                    }
                }
            }
        }
    });
}

// 2. Executive Summary Renderer
function renderExecutiveSummary(scores) {
    const container = document.getElementById('top-traits-container');
    if (!container) return;
    container.innerHTML = '';

    const sortedTraits = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const top3 = sortedTraits.slice(0, 3);

    top3.forEach((traitKey) => {
        const info = TRAIT_INFO[traitKey];
        const score = scores[traitKey];
        const level = getScoreLevel(score);

        const card = document.createElement('div');
        card.className = "p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between";
        card.innerHTML = `
            <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-2xs">
                    ${traitKey}
                </div>
                <div>
                    <div class="font-bold text-xs text-slate-800">${info.name}</div>
                    <div class="text-[11px] text-slate-500">${info.dim} • ${info.type}</div>
                </div>
            </div>
            <div class="text-right">
                <span class="text-base font-extrabold text-indigo-700">${score}</span><span class="text-xs text-slate-400">/9</span>
                <span class="block text-[10px] font-bold px-2 py-0.5 rounded ${level.color} border mt-0.5">${level.label}</span>
            </div>
        `;
        container.appendChild(card);
    });

    const topNames = top3.map(k => `<strong>${TRAIT_INFO[k].name} (${scores[k]}/9)</strong>`).join(', ');
    const summaryEl = document.getElementById('executive-summary-text');
    if (summaryEl) {
        summaryEl.innerHTML = `
            Profil kandidat menunjukkan orientasi kerja yang sangat dipengaruhi oleh aspek ${topNames}. 
            Kandidat memiliki kecenderungan berperilaku yang aktif dan adaptif dalam lingkup tanggung jawabnya serta menunjukkan potensi kontribusi optimal saat ditempatkan pada lingkungan yang selaras dengan dorongan motivasi tersebut.
        `;
    }
}

// 3. Dimensions Deep-Dive Renderer
function renderDimensionsAnalysis(scores) {
    const container = document.getElementById('dimensions-container');
    if (!container) return;
    container.innerHTML = '';

    DIMENSIONS.forEach(dim => {
        const traitScores = dim.traits.map(t => scores[t]);
        const avgScore = (traitScores.reduce((a, b) => a + b, 0) / dim.traits.length).toFixed(1);
        
        let highestTrait = dim.traits[0];
        dim.traits.forEach(t => {
            if (scores[t] > scores[highestTrait]) highestTrait = t;
        });

        const highestInfo = TRAIT_INFO[highestTrait];
        const highestScore = scores[highestTrait];

        const card = document.createElement('div');
        card.className = "bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-indigo-200 transition-colors flex flex-col justify-between";
        
        const traitsBadges = dim.traits.map(t => {
            return `
                <div class="flex items-center justify-between text-xs py-1 border-b border-slate-200/60 last:border-0">
                    <span class="text-slate-600"><strong class="text-indigo-600 font-bold">${t}</strong> - ${TRAIT_INFO[t].name}</span>
                    <span class="font-extrabold text-slate-800 px-2 py-0.5 rounded bg-white border border-slate-200">${scores[t]}</span>
                </div>
            `;
        }).join('');

        card.innerHTML = `
            <div>
                <div class="flex justify-between items-start mb-3">
                    <div>
                        <h4 class="font-bold text-slate-900 text-sm sm:text-base">${dim.name}</h4>
                        <p class="text-xs text-slate-500 mt-0.5 leading-snug">${dim.desc}</p>
                    </div>
                    <div class="text-right shrink-0 ml-2">
                        <span class="text-xs text-slate-400 block font-semibold">Rata-rata</span>
                        <span class="text-lg font-black text-indigo-600">${avgScore}</span>
                    </div>
                </div>

                <div class="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-4">
                    <div class="bg-indigo-600 h-full rounded-full" style="width: ${(avgScore / 9) * 100}%"></div>
                </div>

                <div class="bg-white p-3 rounded-xl border border-slate-200/80 mb-3 space-y-1">
                    ${traitsBadges}
                </div>
            </div>

            <div class="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-xs text-indigo-950 leading-relaxed">
                <strong>Kecenderungan Utama:</strong> Dalam dimensi ini, aspek paling menonjol adalah <strong class="text-indigo-700">${highestInfo.name} (${highestScore}/9)</strong>. 
                ${highestInfo.desc}
            </div>
        `;

        container.appendChild(card);
    });
}

// 4. Aspect Matrix Table Renderer
function renderAspectMatrixTable(scores) {
    const tbody = document.getElementById('matrix-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const keys = Object.keys(TRAIT_INFO).sort((a, b) => {
        const dimOrder = DIMENSIONS.findIndex(d => d.id === TRAIT_INFO[a].dim) - DIMENSIONS.findIndex(d => d.id === TRAIT_INFO[b].dim);
        if (dimOrder !== 0) return dimOrder;
        return a.localeCompare(b);
    });

    keys.forEach(k => {
        const info = TRAIT_INFO[k];
        const score = scores[k];
        const level = getScoreLevel(score);
        const desc = getAspectBehaviorDescription(k, score);

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-3.5 text-center">
                <span class="w-8 h-8 mx-auto rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-extrabold flex items-center justify-center text-xs">
                    ${k}
                </span>
            </td>
            <td class="px-4 py-3.5">
                <div class="font-bold text-slate-800 text-xs sm:text-sm">${info.name}</div>
                <div class="text-[11px] text-slate-500 font-medium">${info.dim}</div>
            </td>
            <td class="px-4 py-3.5 text-center">
                <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${info.type === 'Peran' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                    ${info.type}
                </span>
            </td>
            <td class="px-4 py-3.5 text-center">
                <span class="text-base font-extrabold text-slate-900">${score}</span>
                <div class="w-16 mx-auto bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div class="bg-indigo-600 h-full rounded-full" style="width: ${(score / 9) * 100}%"></div>
                </div>
            </td>
            <td class="px-4 py-3.5 text-center">
                <span class="text-[11px] font-bold px-2.5 py-1 rounded-md border ${level.color}">
                    ${level.label}
                </span>
            </td>
            <td class="px-4 py-3.5 text-slate-600 text-xs leading-relaxed max-w-xs sm:max-w-md">
                ${desc}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// 5. Answers Sheet Table Renderer (90 Questions)
export function renderAnswersSheetTable(filterOpt = 'all') {
    const tbody = document.getElementById('answers-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    let countA = 0;
    let countB = 0;
    state.answers.forEach(a => {
        if (a === 'A') countA++;
        else if (a === 'B') countB++;
    });

    const countAEl = document.getElementById('count-opt-a');
    const countBEl = document.getElementById('count-opt-b');
    if (countAEl) countAEl.textContent = countA;
    if (countBEl) countBEl.textContent = countB;

    questions.forEach((q, idx) => {
        const itemNo = idx + 1;
        const ans = state.answers[idx];
        
        if (filterOpt === 'A' && ans !== 'A') return;
        if (filterOpt === 'B' && ans !== 'B') return;

        let selectedOptText = '';
        let selectedTraitKey = '';
        let altOptText = '';
        let altTraitKey = '';

        if (ans === 'A') {
            selectedOptText = q.option_a.text;
            selectedTraitKey = q.option_a.trait;
            altOptText = q.option_b.text;
            altTraitKey = q.option_b.trait;
        } else if (ans === 'B') {
            selectedOptText = q.option_b.text;
            selectedTraitKey = q.option_b.trait;
            altOptText = q.option_a.text;
            altTraitKey = q.option_a.trait;
        } else {
            selectedOptText = 'Belum dijawab';
            selectedTraitKey = '-';
            altOptText = '-';
            altTraitKey = '-';
        }

        const selInfo = TRAIT_INFO[selectedTraitKey] || { name: '-', dim: '-', type: '-' };
        const altInfo = TRAIT_INFO[altTraitKey] || { name: '-', dim: '-', type: '-' };

        const tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50/80 transition-colors";
        tr.innerHTML = `
            <td class="px-4 py-3.5 text-center">
                <span class="w-8 h-8 mx-auto rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                    ${itemNo}
                </span>
            </td>
            <td class="px-4 py-3.5 text-center">
                <span class="inline-flex items-center justify-center px-2.5 py-1 rounded-lg text-xs font-black ${ans === 'A' ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' : 'bg-purple-50 border border-purple-200 text-purple-700'}">
                    Opsi ${ans || '-'}
                </span>
            </td>
            <td class="px-4 py-3.5">
                <div class="font-semibold text-slate-900 text-xs sm:text-sm leading-snug mb-1">
                    "${selectedOptText}"
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span class="px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold">
                        Aspek ${selectedTraitKey}
                    </span>
                    <span class="text-slate-600 font-medium">${selInfo.name}</span>
                    <span class="text-slate-400">•</span>
                    <span class="text-slate-500">${selInfo.dim} (${selInfo.type})</span>
                </div>
            </td>
            <td class="px-4 py-3.5">
                <div class="text-slate-500 text-xs leading-snug mb-1">
                    "${altOptText}"
                </div>
                <div class="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
                    <span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold">
                        Aspek ${altTraitKey}
                    </span>
                    <span>${altInfo.name}</span>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Copy Text Summary for HR/WhatsApp
export function copySummaryToClipboard() {
    const scores = {};
    Object.keys(TRAIT_INFO).forEach(k => scores[k] = 0);
    questions.forEach((q, idx) => {
        const ans = state.answers[idx];
        if (ans === 'A') scores[q.option_a.trait]++;
        else if (ans === 'B') scores[q.option_b.trait]++;
    });

    const sorted = Object.keys(scores).sort((a, b) => scores[b] - scores[a]);
    const top = sorted.slice(0, 3).map(k => `• ${k} (${TRAIT_INFO[k].name}): ${scores[k]}/9`).join('\n');

    const text = `LAPORAN HASIL ASESMEN PAPI KOSTICK
----------------------------------------
Nama Peserta : ${state.participant.name}
Posisi       : ${state.participant.role}
Email        : ${state.participant.email}
Nomor Hp     : ${state.participant.phone}
Pendidikan   : ${state.participant.education}
Token Akses  : ${state.activeToken || '-'}
Tanggal Tes  : ${state.participant.date}
Durasi       : ${Math.floor(state.elapsedSeconds / 60)} Menit ${state.elapsedSeconds % 60} Detik

ASPEK DOMINAN UTAMA (TOP 3):
${top}

SKOR LENGKAP 20 ASPEK:
${Object.keys(TRAIT_INFO).map(k => `${k} (${TRAIT_INFO[k].name}): ${scores[k]}`).join(', ')}
----------------------------------------
Laporan digital di-generate otomatis via PAPI Kostick Assessment.`;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Ringkasan hasil berhasil disalin ke clipboard!', 'success');
    }).catch(err => {
        console.error('Clipboard copy failed', err);
        showToast('Gagal menyalin ringkasan ke clipboard', 'error');
    });
}

// Export Full 20-Aspect Score Breakdown to CSV
export function exportScoresToCSV() {
    const scores = {};
    Object.keys(TRAIT_INFO).forEach(k => scores[k] = 0);
    questions.forEach((q, idx) => {
        const ans = state.answers[idx];
        if (ans === 'A') scores[q.option_a.trait]++;
        else if (ans === 'B') scores[q.option_b.trait]++;
    });

    const mins = Math.floor(state.elapsedSeconds / 60);
    const secs = state.elapsedSeconds % 60;
    const durationStr = `${mins} Menit ${secs} Detik`;
    const participantName = state.participant.name || 'Peserta';
    const participantRole = state.participant.role || 'Umum';
    const participantEmail = state.participant.email || '-';
    const participantPhone = state.participant.phone || '-';
    const participantEducation = state.participant.education || '-';
    const participantGender = state.participant.gender || '-';
    const participantBirthYear = state.participant.birthYear || '-';
    const reportDate = state.participant.date || new Date().toLocaleDateString('id-ID');

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = [];
    
    rows.push([escapeCSV('LAPORAN HASIL ASESMEN PSIKOLOGIS PAPI KOSTICK')]);
    rows.push([escapeCSV('Nama Peserta'), escapeCSV(participantName)]);
    rows.push([escapeCSV('Posisi / Departemen'), escapeCSV(participantRole)]);
    rows.push([escapeCSV('Email'), escapeCSV(participantEmail)]);
    rows.push([escapeCSV('Nomor Hp'), escapeCSV(participantPhone)]);
    rows.push([escapeCSV('Pendidikan Terakhir'), escapeCSV(participantEducation)]);
    rows.push([escapeCSV('Jenis Kelamin'), escapeCSV(participantGender)]);
    rows.push([escapeCSV('Tahun Lahir'), escapeCSV(participantBirthYear)]);
    rows.push([escapeCSV('Token Asesmen'), escapeCSV(state.activeToken || '-')]);
    rows.push([escapeCSV('Tanggal Asesmen'), escapeCSV(reportDate)]);
    rows.push([escapeCSV('Total Durasi Pengerjaan'), escapeCSV(durationStr)]);
    rows.push([escapeCSV('Status Pengerjaan'), escapeCSV('90 dari 90 Butir Soal Terjawab Lengkap')]);
    rows.push([]);

    rows.push([
        escapeCSV('Kode Aspek'),
        escapeCSV('Nama Aspek'),
        escapeCSV('Dimensi Kerja'),
        escapeCSV('Tipe Aspek'),
        escapeCSV('Skor Mentah (0-9)'),
        escapeCSV('Skor Maksimal'),
        escapeCSV('Klasifikasi Tingkat'),
        escapeCSV('Definisi Karakteristik'),
        escapeCSV('Interpretasi Perilaku')
    ]);

    const keys = Object.keys(TRAIT_INFO).sort((a, b) => {
        const dimOrder = DIMENSIONS.findIndex(d => d.id === TRAIT_INFO[a].dim) - DIMENSIONS.findIndex(d => d.id === TRAIT_INFO[b].dim);
        if (dimOrder !== 0) return dimOrder;
        return a.localeCompare(b);
    });

    keys.forEach(k => {
        const info = TRAIT_INFO[k];
        const score = scores[k];
        const level = getScoreLevel(score);
        const desc = getAspectBehaviorDescription(k, score).replace(/<[^>]*>/g, '');
        const dimObj = DIMENSIONS.find(d => d.id === info.dim);
        const dimFullName = dimObj ? dimObj.name : info.dim;

        rows.push([
            escapeCSV(k),
            escapeCSV(info.name),
            escapeCSV(dimFullName),
            escapeCSV(info.type),
            escapeCSV(score),
            escapeCSV(9),
            escapeCSV(level.label),
            escapeCSV(info.desc),
            escapeCSV(desc)
        ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const sanitizedName = participantName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Peserta';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `PAPI_Kostick_Skor_${sanitizedName}_${dateStr}.csv`;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('File CSV Skor berhasil diunduh!', 'success');
}

// Export All 90 Item Answers to CSV
export function exportAnswersToCSV() {
    const mins = Math.floor(state.elapsedSeconds / 60);
    const secs = state.elapsedSeconds % 60;
    const durationStr = `${mins} Menit ${secs} Detik`;
    const participantName = state.participant.name || 'Peserta';
    const participantRole = state.participant.role || 'Umum';
    const participantEmail = state.participant.email || '-';
    const participantPhone = state.participant.phone || '-';
    const participantEducation = state.participant.education || '-';
    const participantGender = state.participant.gender || '-';
    const participantBirthYear = state.participant.birthYear || '-';
    const reportDate = state.participant.date || new Date().toLocaleDateString('id-ID');

    const escapeCSV = (val) => {
        if (val === null || val === undefined) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
    };

    const rows = [];
    
    rows.push([escapeCSV('LEMBAR JAWABAN LENGKAP ASESMEN PSIKOLOGIS PAPI KOSTICK (90 BUTIR SOAL)')]);
    rows.push([escapeCSV('Nama Peserta'), escapeCSV(participantName)]);
    rows.push([escapeCSV('Posisi / Departemen'), escapeCSV(participantRole)]);
    rows.push([escapeCSV('Email'), escapeCSV(participantEmail)]);
    rows.push([escapeCSV('Nomor Hp'), escapeCSV(participantPhone)]);
    rows.push([escapeCSV('Pendidikan Terakhir'), escapeCSV(participantEducation)]);
    rows.push([escapeCSV('Jenis Kelamin'), escapeCSV(participantGender)]);
    rows.push([escapeCSV('Tahun Lahir'), escapeCSV(participantBirthYear)]);
    rows.push([escapeCSV('Token Asesmen'), escapeCSV(state.activeToken || '-')]);
    rows.push([escapeCSV('Tanggal Asesmen'), escapeCSV(reportDate)]);
    rows.push([escapeCSV('Total Durasi Pengerjaan'), escapeCSV(durationStr)]);
    rows.push([escapeCSV('Status Pengerjaan'), escapeCSV('90 dari 90 Butir Soal Terjawab Lengkap')]);
    rows.push([]);

    rows.push([
        escapeCSV('No'),
        escapeCSV('Pilihan Jawaban'),
        escapeCSV('Teks Pernyataan Terpilih'),
        escapeCSV('Kode Aspek Terpilih'),
        escapeCSV('Nama Aspek Terpilih'),
        escapeCSV('Dimensi Kerja Terpilih'),
        escapeCSV('Tipe Aspek Terpilih'),
        escapeCSV('Teks Pernyataan Alternatif (Tidak Dipilih)'),
        escapeCSV('Kode Aspek Alternatif'),
        escapeCSV('Nama Aspek Alternatif'),
        escapeCSV('Dimensi Kerja Alternatif'),
        escapeCSV('Tipe Aspek Alternatif')
    ]);

    questions.forEach((q, idx) => {
        const itemNo = idx + 1;
        const ans = state.answers[idx];
        
        let selectedText = '';
        let selectedTrait = '';
        let altText = '';
        let altTrait = '';

        if (ans === 'A') {
            selectedText = q.option_a.text;
            selectedTrait = q.option_a.trait;
            altText = q.option_b.text;
            altTrait = q.option_b.trait;
        } else if (ans === 'B') {
            selectedText = q.option_b.text;
            selectedTrait = q.option_b.trait;
            altText = q.option_a.text;
            altTrait = q.option_a.trait;
        }

        const selInfo = TRAIT_INFO[selectedTrait] || { name: '-', dim: '-', type: '-' };
        const altInfo = TRAIT_INFO[altTrait] || { name: '-', dim: '-', type: '-' };

        const selDimObj = DIMENSIONS.find(d => d.id === selInfo.dim);
        const selDimFullName = selDimObj ? selDimObj.name : selInfo.dim;

        const altDimObj = DIMENSIONS.find(d => d.id === altInfo.dim);
        const altDimFullName = altDimObj ? altDimObj.name : altInfo.dim;

        rows.push([
            escapeCSV(itemNo),
            escapeCSV(ans || '-'),
            escapeCSV(selectedText),
            escapeCSV(selectedTrait),
            escapeCSV(selInfo.name),
            escapeCSV(selDimFullName),
            escapeCSV(selInfo.type),
            escapeCSV(altText),
            escapeCSV(altTrait),
            escapeCSV(altInfo.name),
            escapeCSV(altDimFullName),
            escapeCSV(altInfo.type)
        ]);
    });

    const csvContent = '\uFEFF' + rows.map(r => r.join(',')).join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const sanitizedName = participantName.trim().replace(/[^a-zA-Z0-9_-]/g, '_') || 'Peserta';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `PAPI_Kostick_Jawaban_${sanitizedName}_${dateStr}.csv`;

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('File CSV Lembar Jawaban berhasil diunduh!', 'success');
}

// Global Exports
window.switchTab = switchTab;
window.exportScoresToCSV = exportScoresToCSV;
window.exportAnswersToCSV = exportAnswersToCSV;
window.renderAnswersSheetTable = renderAnswersSheetTable;
window.copySummaryToClipboard = copySummaryToClipboard;

// Initialization
function init() {
    initDOMCache();
    loadPersistedState();
    updateSoundIcon();
    setupEventListeners();
    setupKeyboardShortcuts();
    setupSwipeGestures();

    // Check active session token
    const sessionToken = getActiveSessionToken() || state.activeToken;
    if (sessionToken) {
        const val = validateToken(sessionToken);
        if (val.valid) {
            state.activeToken = sessionToken;
            DOM.screenToken.classList.add('hidden');
            DOM.screenIntro.classList.remove('hidden');
            if (DOM.introVerifiedTokenPill) DOM.introVerifiedTokenPill.classList.remove('hidden');
            if (DOM.introTokenCodeText) DOM.introTokenCodeText.textContent = sessionToken;
        } else {
            setActiveSessionToken(null);
            state.activeToken = null;
            DOM.screenToken.classList.remove('hidden');
            DOM.screenIntro.classList.add('hidden');
        }
    } else {
        DOM.screenToken.classList.remove('hidden');
        DOM.screenIntro.classList.add('hidden');
    }
}

// Boot
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
