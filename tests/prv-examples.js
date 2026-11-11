/**
 * Formula check for static worked examples in pressurereliefvalve.html.
 *
 * NOTE: This script is a formula check for the static HTML/LaTeX workbook
 * examples only. It is NOT a test of the live calculator JavaScript engine.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const TOLERANCE_PCT = 0.5;
const htmlPath = path.join(__dirname, '..', 'pressurereliefvalve.html');
const html = fs.readFileSync(htmlPath, 'utf8');

function extractSection(startMarker, endMarker) {
    const startIdx = html.indexOf(startMarker);
    assert.notStrictEqual(startIdx, -1, `Could not find marker: ${startMarker}`);
    const endIdx = endMarker ? html.indexOf(endMarker, startIdx) : html.length;
    assert.notStrictEqual(endIdx, -1, `Could not find end marker: ${endMarker}`);
    return html.slice(startIdx, endIdx);
}

function extractNumber(block, regex, label) {
    const match = block.match(regex);
    assert.ok(match, `Missing displayed value for ${label}`);
    const value = Number(match[1].replace(/,/g, ''));
    assert.ok(Number.isFinite(value), `Invalid number for ${label}: ${match[1]}`);
    return value;
}

function checkWithinTolerance(label, displayed, expected) {
    const relDiffPct = (Math.abs(displayed - expected) / Math.abs(expected)) * 100;
    const status = relDiffPct <= TOLERANCE_PCT ? 'PASS' : 'FAIL';
    console.log(
        `[${status}] ${label}: displayed=${displayed}, expected=${expected.toFixed(4)}, diff=${relDiffPct.toFixed(4)}%`
    );
    if (relDiffPct > TOLERANCE_PCT) {
        throw new Error(
            `${label} differs by ${relDiffPct.toFixed(4)}% (> ${TOLERANCE_PCT}% limit): displayed=${displayed}, expected=${expected}`
        );
    }
}

console.log('PRV Static Worked-Example Formula Check (HTML/LaTeX only, not live engine)\n');

// ---------------------------------------------------------------------------
// Case 1: Methane Gas (Critical Flow)
// ---------------------------------------------------------------------------
const gasBlock = extractSection('id="gas-wb"', 'id="liquid-wb"');

const gasInputs = {
    P_set: 100,       // psig
    overpressure: 10, // %
    P_atm: 14.7,      // psia
    P_back: 5,        // psig
    k: 1.31,
    T_F: 150,         // deg F
    Kd: 0.975,
    Kb: 1.0,
    Kc: 1.0,
    W: 50000,         // lb/hr
    M: 16.04,
    Z: 1.0
};

const gasP1 = gasInputs.P_set * (1 + gasInputs.overpressure / 100) + gasInputs.P_atm;
const gasP2 = gasInputs.P_back + gasInputs.P_atm;
const gasRcf = Math.pow(2 / (gasInputs.k + 1), gasInputs.k / (gasInputs.k - 1));
const gasR = gasP2 / gasP1;
const gasT = gasInputs.T_F + 459.67;
const gasExp = (gasInputs.k + 1) / (gasInputs.k - 1);
const gasC = 520 * Math.sqrt(gasInputs.k * Math.pow(2 / (gasInputs.k + 1), gasExp));
const gasA =
    (gasInputs.W / (gasC * gasInputs.Kd * gasP1 * gasInputs.Kb * gasInputs.Kc)) *
    Math.sqrt((gasT * gasInputs.Z) / gasInputs.M);
const gasFr = (gasInputs.W / 366) * Math.sqrt((gasInputs.k * gasT) / ((gasInputs.k + 1) * gasInputs.M));

console.log('--- Case 1: Methane Gas ---');
checkWithinTolerance('Gas P1 (psia)', extractNumber(gasBlock, /P_1 = 100.*?\\mathbf\{([\d.,]+)\s*\\text\{ psia\}\}/, 'Gas P1'), gasP1);
checkWithinTolerance('Gas P2 (psia)', extractNumber(gasBlock, /P_2 = P_\{\\text\{back\}\}.*?\\mathbf\{([\d.,]+)\s*\\text\{ psia\}\}/, 'Gas P2'), gasP2);
checkWithinTolerance('Gas r_cf', extractNumber(gasBlock, /r_\{cf\} =.*?\\mathbf\{([\d.,]+)\}/, 'Gas r_cf'), gasRcf);
checkWithinTolerance('Gas r = P2/P1', extractNumber(gasBlock, /r = \\frac\{P_2\}\{P_1\}.*?\\mathbf\{([\d.,]+)\}/, 'Gas r'), gasR);
checkWithinTolerance('Gas T (Rankine)', extractNumber(gasBlock, /T = 150 \+ 459\.67 = \\mathbf\{([\d.,]+)\s*\\text\{ R\}\}/, 'Gas T'), gasT);
checkWithinTolerance('Gas C exponent (k+1)/(k-1)', extractNumber(gasBlock, /\\left\(\\frac\{2\}\{2\.31\}\\right\)\^\{([\d.,]+)\}/, 'Gas C exponent'), gasExp);
checkWithinTolerance('Gas C coefficient', extractNumber(gasBlock, /\$\$C = 520.*?= \\mathbf\{([\d.,]+)\}\$\$/, 'Gas C'), gasC);
checkWithinTolerance('Gas C used in A formula', extractNumber(gasBlock, /\$\$A = \\frac\{50,000\}\{([\d.,]+)\s*\\cdot/, 'Gas C in A'), gasC);
checkWithinTolerance('Gas required area A (in^2)', extractNumber(gasBlock, /\$\$A = \\frac\{50,000\}.*?= \\mathbf\{([\d.,]+)\s*\\text\{ in\}\^2\}\$\$/, 'Gas A'), gasA);
checkWithinTolerance('Gas reaction force Fr (lbf)', extractNumber(gasBlock, /\$\$F_r = \\frac\{W\}\{366\}.*?= \\mathbf\{([\d.,]+)\s*\\text\{ lbf\}\}\$\$/, 'Gas Fr'), gasFr);
checkWithinTolerance('Gas Step 10 required A (in^2)', extractNumber(gasBlock, /\\text\{Required \} A = ([\d.,]+)\s*\\text\{ in\}\^2/, 'Gas Step 10 A'), gasA);

// ---------------------------------------------------------------------------
// Case 2: Viscous Crude Oil (Liquid Sizing)
// ---------------------------------------------------------------------------
const liquidBlock = extractSection('id="liquid-wb"', 'id="steam-wb"');

const liqInputs = {
    P_set: 150,       // psig
    overpressure: 10, // %
    P_atm: 14.7,      // psia
    P_back: 15,       // psig
    G: 0.90,
    mu: 120,          // cP
    Kd: 0.62,
    Kw: 1.0,
    Kc: 1.0,
    Q: 150            // GPM
};

const liqP1 = liqInputs.P_set * (1 + liqInputs.overpressure / 100) + liqInputs.P_atm;
const liqP2 = liqInputs.P_back + liqInputs.P_atm;
const liqDp = liqP1 - liqP2;
const liqAu = (liqInputs.Q / (38 * liqInputs.Kd * liqInputs.Kw * liqInputs.Kc)) * Math.sqrt(liqInputs.G / liqDp);
const liqReInit = (liqInputs.Q * 2800 * liqInputs.G) / (liqInputs.mu * Math.sqrt(liqAu));

// Iterative Kv convergence matching API 520 viscosity correction
let liqKv = 1.0;
let liqA = liqAu;
for (let i = 0; i < 20; i++) {
    const re = (liqInputs.Q * 2800 * liqInputs.G) / (liqInputs.mu * Math.sqrt(liqA));
    let nextKv = Math.pow(0.9935 + 2.878 / Math.sqrt(re) + 342.75 / Math.pow(re, 1.5), -1);
    nextKv = Math.min(1.0, Math.max(0.1, nextKv));
    const nextA = (liqInputs.Q / (38 * liqInputs.Kd * liqInputs.Kw * liqInputs.Kc * nextKv)) * Math.sqrt(liqInputs.G / liqDp);
    if (Math.abs(nextA - liqA) < 1e-5) {
        liqKv = nextKv;
        liqA = nextA;
        break;
    }
    liqKv = nextKv;
    liqA = nextA;
}

console.log('\n--- Case 2: Viscous Crude Oil ---');
checkWithinTolerance('Liquid P1 (psia)', extractNumber(liquidBlock, /P_1 = 150.*?\\mathbf\{([\d.,]+)\s*\\text\{ psia\}\}/, 'Liquid P1'), liqP1);
checkWithinTolerance('Liquid P2 (psia)', extractNumber(liquidBlock, /P_2 = 15.*?\\mathbf\{([\d.,]+)\s*\\text\{ psia\}\}/, 'Liquid P2'), liqP2);
checkWithinTolerance('Liquid dP (psi)', extractNumber(liquidBlock, /\\Delta P = P_1 - P_2.*?\\mathbf\{([\d.,]+)\s*\\text\{ psi\}\}/, 'Liquid dP'), liqDp);
checkWithinTolerance('Liquid uncorrected area Au (in^2)', extractNumber(liquidBlock, /\$\$A_u = \\frac\{150\}.*?= \\mathbf\{([\d.,]+)\s*\\text\{ in\}\^2\}\$\$/, 'Liquid Au'), liqAu);
checkWithinTolerance('Liquid Au in Re formula (in^2)', extractNumber(liquidBlock, /\\sqrt\{([\d.,]+)\}\}\s*=\s*\\mathbf/, 'Liquid Au in Re'), liqAu);
checkWithinTolerance('Liquid initial Reynolds number Re', extractNumber(liquidBlock, /\$\$Re = \\frac\{Q.*?= \\mathbf\{([\d.,]+)\}\$\$/, 'Liquid Re'), liqReInit);
checkWithinTolerance('Liquid viscosity factor Kv', extractNumber(liquidBlock, /\$\$K_v =.*?= \\mathbf\{([\d.,]+)\}\$\$/, 'Liquid Kv'), liqKv);
checkWithinTolerance('Liquid Au in final A formula (in^2)', extractNumber(liquidBlock, /A = \\frac\{A_u\}\{K_v\} = \\frac\{([\d.,]+)\}\{[\d.,]+\}/, 'Liquid Au in final A'), liqAu);
checkWithinTolerance('Liquid Kv in final A formula', extractNumber(liquidBlock, /A = \\frac\{A_u\}\{K_v\} = \\frac\{[\d.,]+\}\{([\d.,]+)\}/, 'Liquid Kv in final A'), liqKv);
checkWithinTolerance('Liquid final required area A (in^2)', extractNumber(liquidBlock, /A = \\frac\{A_u\}\{K_v\}.*?= \\mathbf\{([\d.,]+)\s*\\text\{ in\}\^2\}\$\$/, 'Liquid A'), liqA);
checkWithinTolerance('Liquid Step 10 required A (in^2)', extractNumber(liquidBlock, /\\text\{Required \} A = ([\d.,]+)\s*\\text\{ in\}\^2/, 'Liquid Step 10 A'), liqA);

console.log('\nAll static PRV worked-example checks passed within 0.5% tolerance.');
