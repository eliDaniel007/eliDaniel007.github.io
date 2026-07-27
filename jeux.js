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
     *  Gestion de la modale
     * ============================================================ */
    document.addEventListener('DOMContentLoaded', function () {
        const modal = document.getElementById('jeuModal');
        if (!modal) return;

        const body = document.getElementById('jeuModalBody');
        const titre = modal.querySelector('.jeu-titre');
        const boutonFermer = modal.querySelector('.jeu-close');

        function ouvrir(id) {
            const jeu = JEUX[id];
            if (!jeu) return;
            titre.textContent = jeu.titre;
            body.innerHTML = '';
            jeu.monter(body);
            modal.classList.add('show');
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            boutonFermer.focus();
        }

        function fermer() {
            modal.classList.remove('show');
            modal.setAttribute('aria-hidden', 'true');
            body.innerHTML = '';
            document.body.style.overflow = '';
        }

        document.querySelectorAll('.play-link[data-jeu]').forEach((btn) => {
            btn.addEventListener('click', () => ouvrir(btn.dataset.jeu));
        });

        boutonFermer.addEventListener('click', fermer);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) fermer();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.classList.contains('show')) fermer();
        });
    });
})();
