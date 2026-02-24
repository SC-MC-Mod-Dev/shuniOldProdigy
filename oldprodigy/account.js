// account.js
// Basic account system using Supabase Auth + Postgres.
// - Data is stored in a `saves` table on Supabase.
// - No localStorage is used; every operation hits the backend.
// Fill in the SUPABASE_URL and SUPABASE_ANON_KEY below and create a
// table `saves` with columns `(user_id text primary key, data text, updated_at timestamptz)`.

(function(){
    // configure with your supabase values
    const SUPABASE_URL = "https://xyctirgrlrxzedeskbwi.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_eOMUBwC0PIfjid1nD9U5qA_1hNtBaak";

    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const ui = {
        currentUser: null,
        showLogin: function() { /* overridden by index page script */ },
        hideLogin: function() { /* overridden by index page script */ },
        updateLoginState: function(user) {
            // placeholder; index.html wires this to update UI elements
        }
    };

    async function signIn(email, password) {
        return supabase.auth.signInWithPassword({ email, password });
    }
    async function signUp(email, password) {
        return supabase.auth.signUp({ email, password });
    }
    async function signOut() {
        return supabase.auth.signOut();
    }

    async function _getUserId() {
        const {
            data: { user }
        } = await supabase.auth.getUser();
        return user ? user.id : null;
    }

    async function saveGameStateString(str) {
        const uid = await _getUserId();
        if (!uid) throw new Error('not logged in');
        // upsert the row
        await supabase.from('saves').upsert({ user_id: uid, data: str, updated_at: new Date().toISOString() });
    }

    async function loadGameStateString() {
        const uid = await _getUserId();
        if (!uid) throw new Error('not logged in');
        const { data, error } = await supabase
            .from('saves')
            .select('data')
            .eq('user_id', uid)
            .single();
        if (error) {
            if (error.details && error.details.includes('No rows')) return null;
            throw error;
        }
        return data ? data.data : null;
    }

    function _commonCloudAction(action) {
        if (!ui.currentUser) {
            ui.showLogin();
            return;
        }
        action();
    }

    function cloudSave() {
        _commonCloudAction(async function() {
            let s;
            if (typeof window.getProdigySaveString === 'function') {
                s = window.getProdigySaveString();
            } else {
                try {
                    const t = a && a.a && a.a.instance && a.a.instance.prodigy && a.a.instance.prodigy.gameContainer && a.a.instance.prodigy.gameContainer.get('17c-5504');
                    if (t) {
                        await new Promise((resolve, reject) => {
                            t.setSaveCallback(function(str) {
                                s = str;
                                resolve();
                            });
                            if (window.forceSaveCharacter) window.forceSaveCharacter();
                            else if (window.prodigy && window.prodigy.player && window.prodigy.player.forceSaveCharacter) window.prodigy.player.forceSaveCharacter();
                        });
                    }
                } catch (e) {
                    console.warn('cloudSave fallback error', e);
                }
            }
            if (s !== undefined) {
                try {
                    await saveGameStateString(s);
                    alert('saved to account');
                } catch (e) {
                    alert(e);
                }
            } else {
                alert('could not locate game save callback');
            }
        });
    }

    function cloudLoad() {
        _commonCloudAction(async function() {
            try {
                const str = await loadGameStateString();
                if (!str) { alert('no cloud save found'); return; }
                if (typeof window.applyProdigySaveString === 'function') {
                    window.applyProdigySaveString(str);
                    alert('loaded from account');
                } else if (window.importSave) {
                    window.importSave(str);
                    alert('loaded from account');
                } else {
                    prompt('copy your save string and paste it into the game import dialog', str);
                }
            } catch (e) {
                alert(e);
            }
        });
    }

    supabase.auth.onAuthStateChange((event, session) => {
        const user = session && session.user ? session.user : null;
        ui.currentUser = user;
        ui.updateLoginState(user);
    });

    window.Account = {
        ui,
        signIn,
        signUp,
        signOut,
        saveGameStateString,
        loadGameStateString,
        cloudSave,
        cloudLoad
    };
})();
