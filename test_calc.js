const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// Read the HTML file
const htmlPath = path.join(__dirname, 'corrosion-rate.html');
console.log('Reading from path:', htmlPath);
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Set up virtual DOM
const dom = new JSDOM(htmlContent, {
    runScripts: 'dangerously',
    resources: 'usable'
});

const { window } = dom;

// Wait for DOM to load
window.addEventListener('DOMContentLoaded', () => {
    try {
        console.log('DOM Loaded. Executing tests...');

        // 1. Mock MathJax, Chart context, scrollIntoView
        window.MathJax = window.MathJax || {};
        window.MathJax.typesetPromise = () => Promise.resolve();

        window.HTMLCanvasElement.prototype.getContext = () => {
            return {
                // Return dummy context
            };
        };

        window.Element.prototype.scrollIntoView = () => {};

        window.Chart = function() {
            return {
                destroy: () => {}
            };
        };

        window.jspdf = {
            jsPDF: function() {
                return {
                    setPage: () => {},
                    setFont: () => {},
                    setFontSize: () => {},
                    setTextColor: () => {},
                    setDrawColor: () => {},
                    setLineWidth: () => {},
                    line: () => {},
                    text: () => {},
                    autoTable: function() {
                        this.lastAutoTable = { finalY: 100 };
                    },
                    addPage: () => {},
                    save: () => {}
                };
            }
        };

        // 2. Check presets
        const loadPreset = window.loadPreset;
        if (typeof loadPreset !== 'function') {
            throw new Error('loadPreset is not defined on window');
        }
        
        loadPreset('marine');
        console.log('Preset "marine" loaded. Checking input values...');
        
        const wVal = window.document.getElementById('weightLoss').value;
        const tVal = window.document.getElementById('exposureTime').value;
        const aVal = window.document.getElementById('surfaceArea').value;
        const pfVal = window.document.getElementById('pittingFactor').value;
        const densityVal = window.document.getElementById('density').value;
        
        console.log(`Weight Loss: ${wVal} (Expected: 1500)`);
        console.log(`Exposure Time: ${tVal} (Expected: 720)`);
        console.log(`Surface Area: ${aVal} (Expected: 15)`);
        console.log(`Pitting Factor: ${pfVal} (Expected: 1.5)`);
        console.log(`Density: ${densityVal} (Expected: 7.85)`);

        if (wVal !== '1500' || tVal !== '720' || aVal !== '15' || pfVal !== '1.5' || densityVal !== '7.85') {
            throw new Error('Preset values do not match expectations');
        }
        console.log('Preset verification PASSED.');

        // 3. Perform calculation
        const performCalculation = window.performCalculation;
        if (typeof performCalculation !== 'function') {
            throw new Error('performCalculation is not defined on window');
        }

        performCalculation();
        console.log('Calculation performed. Checking results...');

        const resultContainer = window.document.getElementById('result-container');
        if (resultContainer.classList.contains('hidden')) {
            throw new Error('Result container should not have class "hidden" after calculation');
        }

        const calcDetails = window.document.getElementById('calculation-details');
        const stepBlocks = calcDetails.querySelectorAll('.step-block');
        console.log(`Found ${stepBlocks.length} step blocks in calculation details.`);
        if (stepBlocks.length !== 10) {
            throw new Error(`Expected exactly 10 step blocks, but found ${stepBlocks.length}`);
        }

        // Verify HTML contents of step blocks contain expected elements
        stepBlocks.forEach((block, idx) => {
            const title = block.querySelector('.step-title');
            if (!title) {
                throw new Error(`Step block ${idx + 1} is missing a .step-title element`);
            }
            console.log(` - Step ${idx + 1} Title: ${title.textContent}`);
        });

        // Check values in result table
        const tableBody = window.document.getElementById('result-table-body');
        const rows = tableBody.querySelectorAll('tr');
        console.log(`Found ${rows.length} rows in the result table.`);
        
        let foundCR = false;
        let foundPitting = false;
        let foundLife = false;
        
        rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            const name = cells[0].textContent;
            const val = cells[1].textContent;
            console.log(`Row: ${name} = ${val}`);
            if (name.includes('Corrosion Rate')) {
                foundCR = true;
                if (parseFloat(val) !== 9.4480) {
                    throw new Error(`Expected Corrosion Rate 9.4480, got ${val}`);
                }
            } else if (name.includes('Max Pitting Rate')) {
                foundPitting = true;
                if (parseFloat(val) !== 14.1720) {
                    throw new Error(`Expected Pitting Rate 14.1720, got ${val}`);
                }
            } else if (name.includes('Est. Remaining Life') || name.includes('Life')) {
                foundLife = true;
                if (parseFloat(val) !== 13.2) {
                    throw new Error(`Expected Remaining Life 13.2, got ${val}`);
                }
            }
        });
        
        if (!foundCR || !foundPitting || !foundLife) {
            throw new Error('Some expected rows (Corrosion Rate, Pitting, Life) were not found in the results table');
        }
        console.log('Calculation verification PASSED.');

        // 4. Test FAQ Accordion toggle
        const toggleFaq = window.toggleFaq;
        if (typeof toggleFaq !== 'function') {
            throw new Error('toggleFaq is not defined on window');
        }
        
        const faqCard = window.document.getElementById('faq-1');
        const faqTrigger = faqCard.querySelector('.faq-trigger');
        const faqContent = faqCard.querySelector('.faq-content');
        
        console.log('Initial FAQ card active:', faqCard.classList.contains('active'));
        toggleFaq(faqTrigger);
        console.log('FAQ card active after toggle:', faqCard.classList.contains('active'));
        if (!faqCard.classList.contains('active')) {
            throw new Error('FAQ card should be active after toggle');
        }
        toggleFaq(faqTrigger);
        console.log('FAQ card active after second toggle:', faqCard.classList.contains('active'));
        if (faqCard.classList.contains('active')) {
            throw new Error('FAQ card should not be active after second toggle');
        }
        console.log('FAQ accordion toggle verification PASSED.');

        // 5. Test Embed clipboard copy
        const copyEmbedCode = window.copyEmbedCode;
        if (typeof copyEmbedCode !== 'function') {
            throw new Error('copyEmbedCode is not defined on window');
        }
        // Mock navigator.clipboard
        window.navigator.clipboard = {
            writeText: (text) => {
                console.log('Copied to clipboard:', text);
                return Promise.resolve();
            }
        };
        copyEmbedCode();
        console.log('Embed copy verification PASSED.');

        // 6. Test PDF report generator
        window.lastResult = {
            name: 'Carbon Steel (Typical)',
            D: 7.85,
            W: 1500,
            T: 720,
            A: 15,
            K: 534,
            CR: 9.4480,
            unit: 'mpy',
            crUnit: 'MPY',
            areaUnit: 'in²',
            allowance: 125,
            PF: 1.5,
            pittingRate: 14.1720,
            life: 13.2,
            allowUnit: 'mils'
        };

        const generatePDF = window.generatePDF;
        if (typeof generatePDF !== 'function') {
            throw new Error('generatePDF is not defined on window');
        }
        generatePDF();
        console.log('PDF generation execution verification PASSED.');

        console.log('All tests completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('Test FAILED:', err.message);
        console.error(err.stack);
        process.exit(1);
    }
});
