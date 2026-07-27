/**
 * jeux.js — Système de jeux jouables directement sur le portfolio.
 *
 * Architecture réutilisable : chaque projet jouable s'enregistre dans
 * l'objet `JEUX` avec un titre et une fonction `monter(container)` qui
 * construit le jeu dans le conteneur de la modale. Pour ajouter un nouveau
 * projet jouable, il suffit d'ajouter une entrée à `JEUX` et un bouton
 * `<button class="play-link" data-jeu="mon-id">` dans projets.html.
 */
(function () {
    'use strict';

    const JEUX = {};

    /* ============================================================
     *  TIC TAC TOE — IA imbattable (minimax) + mode 2 joueurs
     * ============================================================ */
    JEUX.tictactoe = {
        titre: 'Tic Tac Toe Enhanced',
        monter: function (container) {
            const CLE_SCORES = 'ttt_scores';
            const HUMAIN = 'X';
            const IA = 'O';

            let plateau = Array(9).fill('');
            let modeIA = true;          // true = vs IA, false = 2 joueurs
            let difficile = true;       // IA imbattable (minimax) ou aléatoire
            let joueurCourant = HUMAIN; // en mode 2 joueurs : X puis O
            let partieFinie = false;
            let occupe = false;         // évite les clics pendant que l'IA "réfléchit"

            const scores = chargerScores();

            container.innerHTML = `
                <div class="ttt">
                    <div class="ttt-controls">
                        <div class="ttt-modes" role="group" aria-label="Mode de jeu">
                            <button type="button" class="ttt-btn ttt-mode actif" data-mode="ia">Contre l'IA</button>
                            <button type="button" class="ttt-btn ttt-mode" data-mode="2j">2 joueurs</button>
                        </div>
                        <div class="ttt-diff" role="group" aria-label="Difficulté">
                            <button type="button" class="ttt-btn ttt-difficulte" data-diff="facile">Facile</button>
                            <button type="button" class="ttt-btn ttt-difficulte actif" data-diff="difficile">Imbattable</button>
                        </div>
                    </div>

                    <p class="ttt-status" aria-live="polite">À toi de jouer&nbsp;!</p>

                    <div class="ttt-board" role="grid" aria-label="Grille de morpion">
                        ${plateau.map((_, i) => `<button type="button" class="ttt-cell" data-i="${i}" role="gridcell" aria-label="Case ${i + 1}"></button>`).join('')}
                    </div>

                    <div class="ttt-scores">
                        <div class="ttt-score"><span class="ttt-score-label ttt-x">Joueur (X)</span><span class="ttt-score-val" data-score="x">0</span></div>
                        <div class="ttt-score"><span class="ttt-score-label">Nuls</span><span class="ttt-score-val" data-score="n">0</span></div>
                        <div class="ttt-score"><span class="ttt-score-label ttt-o" data-o-label>IA (O)</span><span class="ttt-score-val" data-score="o">0</span></div>
                    </div>

                    <div class="ttt-actions">
                        <button type="button" class="ttt-btn ttt-primary ttt-rejouer"><i class="fas fa-redo"></i> Nouvelle partie</button>
                        <button type="button" class="ttt-btn ttt-reset"><i class="fas fa-trash"></i> Réinitialiser les scores</button>
                    </div>
                </div>
            `;

            const elStatus = container.querySelector('.ttt-status');
            const elCells = Array.from(container.querySelectorAll('.ttt-cell'));
            const elBoard = container.querySelector('.ttt-board');
            const elDiffGroup = container.querySelector('.ttt-diff');
            const elOLabel = container.querySelector('[data-o-label]');

            afficherScores();

            // --- Événements des cases ---
            elCells.forEach((cell) => {
                cell.addEventListener('click', () => jouer(parseInt(cell.dataset.i, 10)));
            });

            // --- Choix du mode ---
            container.querySelectorAll('.ttt-mode').forEach((btn) => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.ttt-mode').forEach((b) => b.classList.remove('actif'));
                    btn.classList.add('actif');
                    modeIA = btn.dataset.mode === 'ia';
                    elDiffGroup.style.display = modeIA ? '' : 'none';
                    elOLabel.textContent = modeIA ? 'IA (O)' : 'Joueur (O)';
                    nouvellePartie();
                });
            });

            // --- Choix de la difficulté ---
            container.querySelectorAll('.ttt-difficulte').forEach((btn) => {
                btn.addEventListener('click', () => {
                    container.querySelectorAll('.ttt-difficulte').forEach((b) => b.classList.remove('actif'));
                    btn.classList.add('actif');
                    difficile = btn.dataset.diff === 'difficile';
                    nouvellePartie();
                });
            });

            container.querySelector('.ttt-rejouer').addEventListener('click', nouvellePartie);
            container.querySelector('.ttt-reset').addEventListener('click', () => {
                scores.x = 0; scores.o = 0; scores.n = 0;
                sauvegarderScores();
                afficherScores();
            });

            /* ---------- Logique de jeu ---------- */

            function jouer(i) {
                if (partieFinie || occupe || plateau[i] !== '') return;

                if (modeIA) {
                    placer(i, HUMAIN);
                    if (finDePartie()) return;
                    // Tour de l'IA
                    occupe = true;
                    elBoard.classList.add('ttt-thinking');
                    setTimeout(() => {
                        const coup = difficile ? meilleurCoup() : coupAleatoire();
                        if (coup !== -1) placer(coup, IA);
                        occupe = false;
                        elBoard.classList.remove('ttt-thinking');
                        finDePartie();
                    }, 320);
                } else {
                    placer(i, joueurCourant);
                    if (finDePartie()) return;
                    joueurCourant = joueurCourant === HUMAIN ? IA : HUMAIN;
                    elStatus.textContent = `Au tour de ${joueurCourant === HUMAIN ? 'X' : 'O'}`;
                }
            }

            function placer(i, symbole) {
                plateau[i] = symbole;
                const cell = elCells[i];
                cell.textContent = symbole;
                cell.classList.add(symbole === HUMAIN ? 'ttt-cell-x' : 'ttt-cell-o');
                cell.disabled = true;
            }

            function finDePartie() {
                const info = gagnant(plateau);
                if (info) {
                    partieFinie = true;
                    surligner(info.ligne);
                    if (info.symbole === HUMAIN) {
                        scores.x++;
                        elStatus.textContent = modeIA ? '🎉 Gagné !' : '🎉 X gagne !';
                    } else {
                        scores.o++;
                        elStatus.textContent = modeIA ? '🤖 L\'IA gagne !' : '🎉 O gagne !';
                    }
                    sauvegarderScores();
                    afficherScores();
                    return true;
                }
                if (plateau.every((c) => c !== '')) {
                    partieFinie = true;
                    scores.n++;
                    elStatus.textContent = '🤝 Match nul !';
                    sauvegarderScores();
                    afficherScores();
                    return true;
                }
                return false;
            }

            function nouvellePartie() {
                plateau = Array(9).fill('');
                partieFinie = false;
                occupe = false;
                joueurCourant = HUMAIN;
                elBoard.classList.remove('ttt-thinking');
                elCells.forEach((cell) => {
                    cell.textContent = '';
                    cell.disabled = false;
                    cell.classList.remove('ttt-cell-x', 'ttt-cell-o', 'ttt-win');
                });
                elStatus.textContent = modeIA ? 'À toi de jouer !' : 'Au tour de X';
            }

            /* ---------- IA ---------- */

            function coupAleatoire() {
                const libres = plateau.map((c, i) => (c === '' ? i : -1)).filter((i) => i !== -1);
                return libres.length ? libres[Math.floor(Math.random() * libres.length)] : -1;
            }

            function meilleurCoup() {
                let meilleurScore = -Infinity;
                let coup = -1;
                for (let i = 0; i < 9; i++) {
                    if (plateau[i] === '') {
                        plateau[i] = IA;
                        const score = minimax(plateau, 0, false);
                        plateau[i] = '';
                        if (score > meilleurScore) {
                            meilleurScore = score;
                            coup = i;
                        }
                    }
                }
                return coup;
            }

            function minimax(etat, profondeur, maximise) {
                const info = gagnant(etat);
                if (info) return info.symbole === IA ? 10 - profondeur : profondeur - 10;
                if (etat.every((c) => c !== '')) return 0;

                if (maximise) {
                    let meilleur = -Infinity;
                    for (let i = 0; i < 9; i++) {
                        if (etat[i] === '') {
                            etat[i] = IA;
                            meilleur = Math.max(meilleur, minimax(etat, profondeur + 1, false));
                            etat[i] = '';
                        }
                    }
                    return meilleur;
                }
                let pire = Infinity;
                for (let i = 0; i < 9; i++) {
                    if (etat[i] === '') {
                        etat[i] = HUMAIN;
                        pire = Math.min(pire, minimax(etat, profondeur + 1, true));
                        etat[i] = '';
                    }
                }
                return pire;
            }

            /* ---------- Utilitaires ---------- */

            const LIGNES = [
                [0, 1, 2], [3, 4, 5], [6, 7, 8],
                [0, 3, 6], [1, 4, 7], [2, 5, 8],
                [0, 4, 8], [2, 4, 6]
            ];

            function gagnant(etat) {
                for (const ligne of LIGNES) {
                    const [a, b, c] = ligne;
                    if (etat[a] && etat[a] === etat[b] && etat[a] === etat[c]) {
                        return { symbole: etat[a], ligne };
                    }
                }
                return null;
            }

            function surligner(ligne) {
                ligne.forEach((i) => elCells[i].classList.add('ttt-win'));
            }

            function afficherScores() {
                container.querySelector('[data-score="x"]').textContent = scores.x;
                container.querySelector('[data-score="o"]').textContent = scores.o;
                container.querySelector('[data-score="n"]').textContent = scores.n;
            }

            function chargerScores() {
                try {
                    const brut = localStorage.getItem(CLE_SCORES);
                    if (brut) {
                        const s = JSON.parse(brut);
                        return { x: s.x | 0, o: s.o | 0, n: s.n | 0 };
                    }
                } catch (e) { /* localStorage indisponible */ }
                return { x: 0, o: 0, n: 0 };
            }

            function sauvegarderScores() {
                try {
                    localStorage.setItem(CLE_SCORES, JSON.stringify(scores));
                } catch (e) { /* ignore */ }
            }
        }
    };

    /* ============================================================
     *  GÉNÉRATEUR DE DICTIONNAIRE DE MOTS DE PASSE
     *  Réécriture web de l'app WPF (Oumar Diogo Bah & Eli Daniel Senyo).
     *  Génère toutes les combinaisons de caractères pour des longueurs
     *  données. Plafonné pour ne pas figer le navigateur.
     * ============================================================ */
    JEUX.dictionnaire = {
        titre: 'Générateur de Dictionnaire de Mots de Passe',
        monter: function (container) {
            const PLAFOND = 200000; // limite de combinaisons pour rester fluide

            container.innerHTML = `
                <div class="dico">
                    <div class="dico-row">
                        <label class="dico-field">Longueur min
                            <input type="number" class="dico-num" data-min value="1" min="1">
                        </label>
                        <label class="dico-field">Longueur max
                            <input type="number" class="dico-num" data-max value="3" min="1">
                        </label>
                    </div>

                    <fieldset class="dico-fieldset">
                        <legend>Caractères permis</legend>
                        <div class="dico-sets">
                            <div class="dico-set">
                                <label class="dico-check"><input type="checkbox" data-lower checked> Minuscules (a-z)</label>
                                <input type="text" class="dico-custom" data-lower-custom placeholder="ou perso : abcd">
                            </div>
                            <div class="dico-set">
                                <label class="dico-check"><input type="checkbox" data-upper> Majuscules (A-Z)</label>
                                <input type="text" class="dico-custom" data-upper-custom placeholder="ou perso : ABCD">
                            </div>
                            <div class="dico-set">
                                <label class="dico-check"><input type="checkbox" data-number> Chiffres (0-9)</label>
                                <input type="text" class="dico-custom" data-number-custom placeholder="ou perso : 123">
                            </div>
                        </div>
                    </fieldset>

                    <fieldset class="dico-fieldset">
                        <legend>Caractères spéciaux</legend>
                        <div class="dico-special">
                            <label class="dico-check"><input type="checkbox" data-sp value="#"> #</label>
                            <label class="dico-check"><input type="checkbox" data-sp value="$"> $</label>
                            <label class="dico-check"><input type="checkbox" data-sp value="%"> %</label>
                            <label class="dico-check"><input type="checkbox" data-sp value="&amp;"> &amp;</label>
                            <label class="dico-check"><input type="checkbox" data-sp value="*"> *</label>
                            <label class="dico-check"><input type="checkbox" data-sp value="?"> ?</label>
                        </div>
                        <input type="text" class="dico-custom" data-sp-custom placeholder="ou perso : @!+">
                    </fieldset>

                    <button type="button" class="ttt-btn ttt-primary dico-generate"><i class="fas fa-cogs"></i> Générer le dictionnaire</button>

                    <div class="dico-progress-wrap">
                        <div class="dico-stats">
                            <span>Mots générés : <strong data-count>0</strong></span>
                            <span>Temps : <strong data-time>00:00</strong></span>
                        </div>
                        <div class="dico-bar"><div class="dico-bar-fill" data-bar></div></div>
                    </div>

                    <div class="dico-actions">
                        <button type="button" class="ttt-btn dico-download" disabled><i class="fas fa-download"></i> Télécharger .txt</button>
                    </div>

                    <textarea class="dico-log" data-log readonly placeholder="Le journal et l'aperçu s'afficheront ici…"></textarea>
                </div>
            `;

            const minEl = container.querySelector('[data-min]');
            const maxEl = container.querySelector('[data-max]');
            const genBtn = container.querySelector('.dico-generate');
            const downloadBtn = container.querySelector('.dico-download');
            const barEl = container.querySelector('[data-bar]');
            const countEl = container.querySelector('[data-count]');
            const timeEl = container.querySelector('[data-time]');
            const logEl = container.querySelector('[data-log]');

            let lignes = [];
            let etat = null;

            genBtn.addEventListener('click', generer);
            downloadBtn.addEventListener('click', telecharger);

            function val(sel) {
                const el = container.querySelector(sel);
                return el ? el.value.trim() : '';
            }
            function coche(sel) {
                const el = container.querySelector(sel);
                return el ? el.checked : false;
            }

            // Réplique GetAllowedCharacters() : le champ perso remplace le set de base.
            function construireCharset() {
                let s = '';
                const lc = val('[data-lower-custom]');
                s += lc !== '' ? lc : (coche('[data-lower]') ? 'abcdefghijklmnopqrstuvwxyz' : '');
                const uc = val('[data-upper-custom]');
                s += uc !== '' ? uc : (coche('[data-upper]') ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : '');
                const nc = val('[data-number-custom]');
                s += nc !== '' ? nc : (coche('[data-number]') ? '0123456789' : '');
                container.querySelectorAll('[data-sp]:checked').forEach((cb) => { s += cb.value; });
                const sp = val('[data-sp-custom]');
                if (sp !== '') s += sp;
                return Array.from(new Set(s.split(''))).join('');
            }

            function generer() {
                if (etat) return; // génération déjà en cours

                const min = parseInt(minEl.value, 10);
                const max = parseInt(maxEl.value, 10);
                if (!(min >= 1)) { logEl.value = 'Erreur : la longueur minimale doit être un nombre positif.'; return; }
                if (!(max >= min)) { logEl.value = 'Erreur : la longueur maximale doit être supérieure ou égale à la minimale.'; return; }

                const charset = construireCharset();
                if (charset.length === 0) { logEl.value = 'Erreur : sélectionne au moins un type de caractères.'; return; }

                let total = 0, tropGrand = false;
                for (let l = min; l <= max; l++) {
                    total += Math.pow(charset.length, l);
                    if (total > PLAFOND) { tropGrand = true; break; }
                }
                if (tropGrand) {
                    logEl.value = `⚠️ Trop de combinaisons à générer (plus de ${PLAFOND.toLocaleString('fr-FR')}).\n` +
                        `Avec ${charset.length} caractères et une longueur max de ${max}, le total dépasse la limite de la démo.\n` +
                        `Réduis la longueur max ou le nombre de caractères.`;
                    return;
                }

                lignes = [];
                const lengths = [];
                for (let l = min; l <= max; l++) lengths.push(l);
                etat = {
                    charset: charset,
                    lengths: lengths,
                    li: 0,
                    indices: new Array(lengths[0]).fill(0),
                    total: total,
                    done: 0,
                    debut: performance.now()
                };

                genBtn.disabled = true;
                downloadBtn.disabled = true;
                logEl.value = `Début de la génération avec ${charset.length} caractères : ${charset}\n` +
                    `Longueurs ${min} à ${max} — ${total.toLocaleString('fr-FR')} combinaisons\n\n`;
                setTimeout(tick, 0);
            }

            function tick() {
                const st = etat;
                if (!st) return;
                const CHUNK = 8000;
                let n = 0;
                while (n < CHUNK) {
                    if (st.li >= st.lengths.length) { finir(); return; }
                    const len = st.lengths[st.li];
                    let mot = '';
                    for (let i = 0; i < len; i++) mot += st.charset[st.indices[i]];
                    lignes.push(mot);
                    st.done++;
                    n++;
                    if (!incrementer(st.indices, st.charset.length)) {
                        st.li++;
                        if (st.li < st.lengths.length) {
                            st.indices = new Array(st.lengths[st.li]).fill(0);
                        }
                    }
                }
                const pct = Math.min(100, (st.done / st.total) * 100);
                barEl.style.width = pct.toFixed(1) + '%';
                countEl.textContent = st.done.toLocaleString('fr-FR');
                timeEl.textContent = fmtTemps(performance.now() - st.debut);
                setTimeout(tick, 0);
            }

            function incrementer(indices, base) {
                for (let i = indices.length - 1; i >= 0; i--) {
                    if (indices[i] < base - 1) { indices[i]++; return true; }
                    indices[i] = 0;
                }
                return false;
            }

            function finir() {
                const st = etat;
                const ecoule = performance.now() - st.debut;
                barEl.style.width = '100%';
                countEl.textContent = st.done.toLocaleString('fr-FR');
                timeEl.textContent = fmtTemps(ecoule);
                const apercu = lignes.slice(0, 500);
                logEl.value += `Génération terminée en ${fmtTemps(ecoule)}\n` +
                    `Total : ${st.done.toLocaleString('fr-FR')} mots de passe\n\n` +
                    `Aperçu (${apercu.length} première(s) ligne(s)) :\n` + apercu.join('\n');
                logEl.scrollTop = 0;
                downloadBtn.disabled = false;
                genBtn.disabled = false;
                etat = null;
            }

            function telecharger() {
                if (!lignes.length) return;
                const blob = new Blob([lignes.join('\n')], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'dictionnaire.txt';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                setTimeout(() => URL.revokeObjectURL(url), 1000);
            }

            function fmtTemps(ms) {
                const t = Math.floor(ms / 1000);
                const m = String(Math.floor(t / 60)).padStart(2, '0');
                const s = String(t % 60).padStart(2, '0');
                return m + ':' + s;
            }
        }
    };

    /* ============================================================
     *  Montage : chaque conteneur [data-jeu-inline="id"] reçoit le jeu
     *  correspondant. Il suffit d'ajouter un tel conteneur dans une
     *  page de démo pour rendre un projet jouable.
     * ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('[data-jeu-inline]').forEach(function (el) {
            const jeu = JEUX[el.getAttribute('data-jeu-inline')];
            if (jeu) jeu.monter(el);
        });
    });
})();
