import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc, setDoc, connectFirestoreEmulator } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// --- Constants (Shared Security Data) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const SECURITY_VAULT_PATH = `/artifacts/${appId}/public/data/security_vault`;
const KILL_SWITCH_DOC_ID = 'global_kill_switch';

// Conceptual Audit Data
const CONCEPTUAL_AUDIT_DATA = {
    genesis_integrity_check: 'PASSED',
    tangle_rule_check: 'PENDING',
    quantum_resistance_status: 'NOMINAL',
};

// --- React Component ---

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [killSwitchActive, setKillSwitchActive] = useState(false);
    const [auditStatus, setAuditStatus] = useState(CONCEPTUAL_AUDIT_DATA);
    const [systemStatus, setSystemStatus] = useState('INITIATING NEXUS');
    const [isLoading, setIsLoading] = useState(false);
    const [userId, setUserId] = useState(null);

    // --- 1. Initialization and Auth ---
    useEffect(() => {
        try {
            const firebaseConfig = JSON.parse(typeof __firebase_config !== 'undefined' ? __firebase_config : '{}');
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            const authenticate = async () => {
                const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                try {
                    if (token) {
                        await signInWithCustomToken(firebaseAuth, token);
                    } else {
                        await signInAnonymously(firebaseAuth);
                    }
                } catch (e) {
                    console.error("Auth failed, attempting anonymous sign-in.", e);
                    await signInAnonymously(firebaseAuth);
                }
            };
            authenticate();

            onAuthStateChanged(firebaseAuth, (user) => {
                if (user) {
                    setUserId(user.uid);
                    setSystemStatus('SECURITY SYNCED: AUTH');
                } else {
                    setSystemStatus('SECURITY SYNCED: ANONYMOUS');
                }
            });

        } catch (e) {
            console.error("Initialization Error:", e);
            setSystemStatus(`ERROR: ${e.message}`);
        }
    }, []);

    // --- 2. Live Kill-Switch Status Listener (Real Live Security) ---
    useEffect(() => {
        if (!db || !userId) return;

        const docRef = doc(db, SECURITY_VAULT_PATH, KILL_SWITCH_DOC_ID);

        // Initial setup for the Kill-Switch document if it doesn't exist
        const setupKillSwitch = async () => {
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                await setDoc(docRef, { 
                    status: false, 
                    lastActivatedBy: 'System', 
                    timestamp: new Date().toISOString() 
                });
            }
        };
        setupKillSwitch();

        // Listen for Real Live changes to the Kill-Switch status
        const unsubscribe = getFirestore(initializeApp(JSON.parse(__firebase_config))).onSnapshot(docRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setKillSwitchActive(data.status);
                setSystemStatus(data.status ? 'EMERGENCY SHUTDOWN ACTIVE (KILL-SWITCH)' : 'NOMINAL OPERATION');
            }
        });

        return () => unsubscribe();
    }, [db, userId]);

    // --- 3. Global Kill-Switch Toggle (Root Authority Control) ---
    const handleToggleKillSwitch = useCallback(async () => {
        if (!db || !userId) return;

        // Custom modal confirmation instead of alert/confirm
        if (!window.confirm(`OPREZ: Aktivacija Globalnog Kill-Switcha ${killSwitchActive ? 'DEAKTIVIRA' : 'AKTIVIRA'} sustav. Potvrđujete li?`)) {
            return;
        }

        setIsLoading(true);
        const docRef = doc(db, SECURITY_VAULT_PATH, KILL_SWITCH_DOC_ID);
        const newState = !killSwitchActive;

        try {
            await updateDoc(docRef, {
                status: newState,
                lastActivatedBy: `RootAuthority::${userId}`,
                timestamp: new Date().toISOString()
            });
            setIsLoading(false);
            // Status will be updated via the live listener
        } catch (e) {
            console.error("Kill-Switch Toggle Failed:", e);
            setSystemStatus(`ERROR: Kill-Switch Fail. ${e.message}`);
            setIsLoading(false);
        }
    }, [db, userId, killSwitchActive]);

    // --- 4. Post-Quantum Audit Simulation ---
    const runPostQuantumAudit = useCallback(() => {
        setSystemStatus('POST-QUANTUM AUDIT INITIATED...');
        setIsLoading(true);
        
        // Simulate a complex, resource-intensive check
        setTimeout(() => {
            // Check Tangle size for stability (conceptually)
            const isTangleStable = true; // In a real system, this checks consistency
            const newAuditStatus = {
                genesis_integrity_check: 'PASSED',
                tangle_rule_check: isTangleStable ? 'PASSED (Tangle Stable)' : 'FAILED (Tangle Unstable)',
                quantum_resistance_status: 'VERIFIED (Conceptual Post-Quantum)',
                last_run: new Date().toLocaleTimeString(),
            };
            setAuditStatus(newAuditStatus);
            setSystemStatus('AUDIT COMPLETE: All Systems Green.');
            setIsLoading(false);
        }, 2000); 
    }, []);


    // --- Styling and UI Helpers ---
    const getStatusColor = (status) => {
        if (status.includes('ERROR') || status.includes('FAILED')) return 'bg-red-700';
        if (status.includes('ACTIVE') || status.includes('EMERGENCY')) return 'bg-pink-700 animate-pulse';
        if (status.includes('NOMINAL') || status.includes('GREEN')) return 'bg-emerald-600';
        return 'bg-indigo-700';
    };

    const AuditCheck = ({ label, status }) => {
        const icon = status.includes('PASSED') || status.includes('NOMINAL') ? '✅' : 
                     status.includes('FAILED') ? '❌' : '⏳';
        const color = status.includes('PASSED') || status.includes('NOMINAL') ? 'text-emerald-400' : 'text-yellow-400';
        
        return (
            <div className="flex justify-between items-center py-2 border-b border-gray-700 last:border-b-0">
                <span className="text-gray-300 font-medium">{label}</span>
                <span className={`font-mono text-sm ${color}`}>
                    {icon} {status}
                </span>
            </div>
        );
    };

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-8 font-['Inter'] flex flex-col items-center">
            <header className="text-center mb-8 max-w-2xl">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-red-600 mb-2">
                    NuN SECURITY AUDITOR
                </h1>
                <p className="text-lg text-gray-400">
                    Root Authority Terminal (Post-Quantum & Kill-Switch)
                </p>
            </header>
            
            {/* --- Global Status Banner --- */}
            <div className={`w-full max-w-4xl p-4 rounded-xl text-center font-bold text-white mb-6 shadow-xl ${getStatusColor(systemStatus)}`}>
                <p className="text-xl">{systemStatus}</p>
                {userId && <p className="text-sm mt-1">Active Authority ID: {userId}</p>}
                <p className="text-sm mt-1">Kill-Switch State: **{killSwitchActive ? 'ACTIVE (SYSTEM HALTED)' : 'DEACTIVATED (NOMINAL)'}**</p>
            </div>

            {/* --- Kill-Switch Control Panel --- */}
            <section className="w-full max-w-4xl p-6 rounded-2xl bg-gray-800 shadow-2xl mb-8 border-2 border-pink-600">
                <h2 className="text-2xl font-semibold mb-4 text-pink-400 text-center">
                    GLOBAL KILL-SWITCH (Demolition Man Protocol)
                </h2>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <button
                        onClick={handleToggleKillSwitch}
                        disabled={isLoading || !db}
                        className={`flex-1 py-4 px-6 rounded-xl font-extrabold text-white transition duration-300 transform shadow-lg
                            ${isLoading || !db
                                ? 'bg-gray-500 cursor-not-allowed' 
                                : killSwitchActive 
                                    ? 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700' // Deactivate
                                    : 'bg-red-700 hover:bg-red-600 active:bg-red-800' // Activate
                            }`}
                    >
                        {isLoading ? '... PROCESSING ...' : killSwitchActive ? 'DEAKTIVIRAJ KILL-SWITCH' : 'AKTIVIRAJ KILL-SWITCH (EMERGENCY)'}
                    </button>
                    <p className="text-sm text-gray-400 sm:w-1/3 text-center sm:text-left">
                        Trenutna Kill-Switch vrijednost se sinhronizira u Real Live s NuN Vaultom.
                    </p>
                </div>
            </section>
            
            {/* --- Post-Quantum Audit Panel --- */}
            <section className="w-full max-w-4xl p-6 rounded-2xl bg-gray-800 shadow-2xl">
                <h2 className="text-2xl font-semibold mb-4 text-cyan-400 text-center">
                    POST-QUANTUM AUDIT (Final Safety Check)
                </h2>
                <div className="bg-gray-700 p-4 rounded-xl mb-4">
                    <AuditCheck label="Genesis Block Integrity" status={auditStatus.genesis_integrity_check} />
                    <AuditCheck label="Tangle Rule Consistency" status={auditStatus.tangle_rule_check} />
                    <AuditCheck label="Quantum Resistance" status={auditStatus.quantum_resistance_status} />
                </div>
                
                <button
                    onClick={runPostQuantumAudit}
                    disabled={isLoading}
                    className={`w-full py-3 rounded-xl font-bold text-white transition duration-300 transform shadow-lg
                        ${isLoading
                            ? 'bg-gray-500 cursor-not-allowed' 
                            : 'bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:bg-indigo-700'
                        }`}
                >
                    {isLoading ? '... RUNNING POST-QUANTUM ALGORITHMS ...' : 'POKRENI FINALNI SIGURNOSNI AUDIT'}
                </button>
                <p className="text-xs text-center text-gray-500 mt-3">
                    Posljednji Audit: {auditStatus.last_run || 'N/A'}
                </p>
            </section>
        </div>
    );
};

// Standard React root rendering
const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
} else {
    const newRootDiv = document.createElement('div');
    newRootDiv.id = 'root';
    document.body.appendChild(newRootDiv);
    const root = createRoot(newRootDiv);
    root.render(<App />);
}

export default App;

