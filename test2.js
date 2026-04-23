
    document.addEventListener('DOMContentLoaded', function() {
        // --- DATABASE & DATA TABLES ---
        // These tables are simplified representations based on common values from standards.
        // In a real-world, comprehensive tool, these would be much larger and more detailed.

        // IEC Base Ampacity (Table 52-B1 of IEC 60364-5-52) - Amps
        // Reference: 30â„ƒ ambient air, 90â„ƒ conductor temp (XLPE), single circuit, 3-core cable in conduit
        const iecBaseAmpacity = {
            copper: { // Conductor: Copper
                xlpe: { // Insulation: XLPE (90C)
                    '1.5': 21, '2.5': 28, '4': 38, '6': 49, '10': 68, '16': 90,
                    '25': 118, '35': 147, '50': 175, '70': 222, '95': 269, '120': 310,
                    '150': 354, '185': 404, '240': 477, '300': 550, '400': 650, '500': 750, '630': 870
                },
                pvc: { // Insulation: PVC (70C)
                    '1.5': 16, '2.5': 22, '4': 30, '6': 38, '10': 53, '16': 70,
                    '25': 92, '35': 114, '50': 136, '70': 172, '95': 209, '120': 240,
                    '150': 275, '185': 314, '240': 370, '300': 428, '400': 500, '500': 570, '630': 650
                }
            },
            aluminum: { // Conductor: Aluminum
                xlpe: {
                    '2.5': 22, '4': 30, '6': 38, '10': 53, '16': 70, '25': 92,
                    '35': 114, '50': 136, '70': 172, '95': 209, '120': 240,
                    '150': 275, '185': 314, '240': 370, '300': 428, '400': 500, '500': 570, '630': 650
                },
                pvc: {
                    '2.5': 17, '4': 23, '6': 30, '10': 41, '16': 55, '25': 72,
                    '35': 89, '50': 106, '70': 134, '95': 163, '120': 187,
                    '150': 214, '185': 244, '240': 288, '300': 333, '400': 390, '500': 440, '630': 500
                }
            }
        };

        // NEC Base Ampacity (Table 310.16) - Amps
        // Reference: 30â„ƒ ambient air, 3 conductors in raceway
        const necBaseAmpacity = {
            copper: {
                xlpe: { // 90C column (THHN, XHHW-2, etc.)
                    '14': 25, '12': 30, '10': 40, '8': 55, '6': 75, '4': 95, '3': 110,
                    '2': 130, '1': 150, '1/0': 170, '2/0': 195, '3/0': 225, '4/0': 260,
                    '250': 290, '300': 320, '350': 350, '400': 380, '500': 430, '600': 475, '700': 520, '750': 535, '800': 555, '1000': 610
                },
                pvc: { // 75C column (THW, RHW, etc. - most common termination rating)
                    '14': 20, '12': 25, '10': 35, '8': 50, '6': 65, '4': 85, '3': 100,
                    '2': 115, '1': 130, '1/0': 150, '2/0': 175, '3/0': 200, '4/0': 230,
                    '250': 255, '300': 285, '350': 310, '400': 335, '500': 380, '600': 420, '700': 455, '750': 470, '800': 490, '1000': 545
                }
            },
            aluminum: {
                xlpe: { // 90C column
                    '12': 25, '10': 35, '8': 45, '6': 60, '4': 75, '3': 85, '2': 100,
                    '1': 115, '1/0': 135, '2/0': 150, '3/0': 175, '4/0': 205,
                    '250': 230, '300': 255, '350': 280, '400': 305, '500': 350, '600': 385, '700': 420, '750': 435, '800': 450, '1000': 500
                },
                pvc: { // 75C column
                    '12': 20, '10': 30, '8': 40, '6': 50, '4': 65, '3': 75, '2': 90,
                    '1': 100, '1/0': 120, '2/0': 135, '3/0': 155, '4/0': 180,
                    '250': 205, '300': 230, '350': 250, '400': 270, '500': 310, '600': 340, '700': 370, '750': 385, '800': 400, '1000': 445
                }
            }
        };

        // Correction Factors (Ka) for Ambient Air Temp (Based on 30â„ƒ reference)
        const tempCorrectionFactors = {
            pvc: { // 70C/75C insulation (using 70C as a conservative base)
                '20': 1.08, '25': 1.04, '30': 1.00, '35': 0.96, '40': 0.91,
                '45': 0.87, '50': 0.82, '55': 0.76, '60': 0.71, '65': 0.65, '70': 0.58
            },
            xlpe: { // 90C insulation
                '20': 1.08, '25': 1.04, '30': 1.00, '35': 0.96, '40': 0.91,
                '45': 0.87, '50': 0.82, '55': 0.76, '60': 0.71, '65': 0.65, '70': 0.58,
                '75': 0.50, '80': 0.41, '85': 0.32, '90': 0.22
            }
        };

        // Grouping Correction Factors (Kg)
        const groupingCorrectionFactors = {
            '1': 1.00, '2': 0.80, '3': 0.70, '4': 0.65, '5': 0.60,
            '6': 0.57, '7': 0.54, '8': 0.52, '9': 0.50, '10': 0.48,
            '11': 0.47, '12': 0.46, '13': 0.45, '14': 0.44, '15': 0.43,
            '16': 0.42, '17': 0.41, '18': 0.40, '19': 0.39, '20': 0.38,
            '21': 0.37, '22': 0.36, '23': 0.35, '24': 0.34, '25': 0.33,
            '26': 0.32, '27': 0.31, '28': 0.30, '29': 0.29, '30': 0.28,
            '31': 0.27, '32': 0.26, '33': 0.25, '34': 0.24, '35': 0.23,
            '36': 0.22, '37': 0.21, '38': 0.20, '39': 0.19, '40': 0.18,
            '41': 0.17, '42': 0.16
        };

        // Soil Thermal Resistivity Correction Factors (Kp) (Ref: IEC, 20â„ƒ ground temp, 2.5 KÂ·m/W reference)
        const soilResistivityCorrectionFactors = {
            '0.5': 1.25, '1.0': 1.18, '1.5': 1.10, '2.0': 1.05, '2.5': 1.00,
            '3.0': 0.96, '3.5': 0.92, '4.0': 0.88, '4.5': 0.84, '5.0': 0.80
        };

        // Depth of Burial Correction Factors (Kd) (Ref: IEC, for direct buried cables, 0.7m ref)
        const depthCorrectionFactors = {
            '0.3': 1.10, '0.4': 1.07, '0.5': 1.05, '0.6': 1.02, '0.7': 1.00,
            '0.8': 0.98, '0.9': 0.96, '1.0': 0.95, '1.1': 0.93, '1.2': 0.92,
            '1.3': 0.90, '1.4': 0.89, '1.5': 0.88, '1.6': 0.87, '1.7': 0.86,
            '1.8': 0.85, '1.9': 0.84, '2.0': 0.83
        };

        // Conductor Resistance and Reactance (Ohms/km at 90â„ƒ for XLPE, 75C for NEC PVC)
        const conductorImpedance = {
            copper: {
                iec: { // mm2
                    '1.5': { R: 12.1, X: 0.09 }, '2.5': { R: 7.41, X: 0.09 }, '4': { R: 4.61, X: 0.09 },
                    '6': { R: 3.08, X: 0.09 }, '10': { R: 1.83, X: 0.09 }, '16': { R: 1.15, X: 0.09 },
                    '25': { R: 0.734, X: 0.08 }, '35': { R: 0.524, X: 0.08 }, '50': { R: 0.387, X: 0.08 },
                    '70': { R: 0.272, X: 0.08 }, '95': { R: 0.206, X: 0.08 }, '120': { R: 0.161, X: 0.08 },
                    '150': { R: 0.129, X: 0.08 }, '185': { R: 0.106, X: 0.07 }, '240': { R: 0.0801, X: 0.07 },
                    '300': { R: 0.0641, X: 0.07 }, '400': { R: 0.0480, X: 0.07 }, '500': { R: 0.0384, X: 0.06 },
                    '630': { R: 0.0304, X: 0.06 }
                },
                nec: { // AWG/kcmil
                    '14': { R: 8.28, X: 0.08 }, '12': { R: 5.21, X: 0.08 }, '10': { R: 3.28, X: 0.08 },
                    '8': { R: 2.07, X: 0.08 }, '6': { R: 1.30, X: 0.08 }, '4': { R: 0.82, X: 0.08 },
                    '3': { R: 0.65, X: 0.08 }, '2': { R: 0.51, X: 0.08 }, '1': { R: 0.41, X: 0.08 },
                    '1/0': { R: 0.32, X: 0.08 }, '2/0': { R: 0.26, X: 0.08 }, '3/0': { R: 0.20, X: 0.08 },
                    '4/0': { R: 0.16, X: 0.08 }, '250': { R: 0.13, X: 0.08 }, '300': { R: 0.11, X: 0.08 },
                    '350': { R: 0.09, X: 0.08 }, '400': { R: 0.08, X: 0.08 }, '500': { R: 0.06, X: 0.08 },
                    '600': { R: 0.05, X: 0.08 }, '700': { R: 0.04, X: 0.08 }, '750': { R: 0.04, X: 0.08 },
                    '800': { R: 0.03, X: 0.08 }, '1000': { R: 0.03, X: 0.08 }
                }
            },
            aluminum: {
                iec: { // mm2
                    '2.5': { R: 12.1, X: 0.09 }, '4': { R: 7.41, X: 0.09 }, '6': { R: 4.61, X: 0.09 },
                    '10': { R: 3.08, X: 0.09 }, '16': { R: 1.83, X: 0.09 }, '25': { R: 1.15, X: 0.09 },
                    '35': { R: 0.734, X: 0.08 }, '50': { R: 0.524, X: 0.08 }, '70': { R: 0.387, X: 0.08 },
                    '95': { R: 0.272, X: 0.08 }, '120': { R: 0.206, X: 0.08 }, '150': { R: 0.161, X: 0.08 },
                    '185': { R: 0.129, X: 0.08 }, '240': { R: 0.106, X: 0.07 }, '300': { R: 0.0801, X: 0.07 },
                    '400': { R: 0.0641, X: 0.07 }, '500': { R: 0.0480, X: 0.07 }, '630': { R: 0.0384, X: 0.06 }
                },
                nec: { // AWG/kcmil
                    '12': { R: 8.28, X: 0.08 }, '10': { R: 5.21, X: 0.08 }, '8': { R: 3.28, X: 0.08 },
                    '6': { R: 2.07, X: 0.08 }, '4': { R: 1.30, X: 0.08 }, '3': { R: 0.98, X: 0.08 },
                    '2': { R: 0.78, X: 0.08 }, '1': { R: 0.62, X: 0.08 }, '1/0': { R: 0.49, X: 0.08 },
                    '2/0': { R: 0.39, X: 0.08 }, '3/0': { R: 0.31, X: 0.08 }, '4/0': { R: 0.25, X: 0.08 },
                    '250': { R: 0.20, X: 0.08 }, '300': { R: 0.17, X: 0.08 }, '350': { R: 0.14, X: 0.08 },
                    '400': { R: 0.12, X: 0.08 }, '500': { R: 0.10, X: 0.08 }, '600': { R: 0.08, X: 0.08 },
                    '700': { R: 0.07, X: 0.08 }, '750': { R: 0.06, X: 0.08 }, '800': { R: 0.06, X: 0.08 },
                    '1000': { R: 0.05, X: 0.08 }
                }
            }
        };

        // K-factors for Short-Circuit Withstand (Adiabatic Equation)
        // From IEC standards, (k)
        const kFactorsShortCircuit = {
            copper: {
                pvc: 115, // 70C -> 160C
                xlpe: 143 // 90C -> 250C
            },
            aluminum: {
                pvc: 76, // 70C -> 160C
                xlpe: 94 // 90C -> 250C
            }
        };

        // --- UI ELEMENT REFERENCES ---
        const standardSelect = document.getElementById('standard');
        const conductorMaterialSelect = document.getElementById('conductor-material');
        const conductorSizeSelect = document.getElementById('conductor-size');
        const insulationTypeSelect = document.getElementById('insulation-type');
        const installationMethodSelect = document.getElementById('installation-method');
        const ambientTempInput = document.getElementById('ambient-temp');
        const numCircuitsInput = document.getElementById('num-circuits');
        const soilResistivityInput = document.getElementById('soil-resistivity');
        const soilResistivityGroup = document.getElementById('soil-resistivity-group');
        const depthOfBurialInput = document.getElementById('depth-of-burial'); 
        const depthOfBurialGroup = document.getElementById('depth-of-burial-group'); 
        const loadCurrentInput = document.getElementById('load-current');
        const systemVoltageVdInput = document.getElementById('system-voltage-vd');
        const cableLengthInput = document.getElementById('cable-length');
        const phaseTypeSelect = document.getElementById('phase-type');
        const faultDurationInput = document.getElementById('fault-duration');
        const calculateBtn = document.getElementById('calculate-btn');
        const resultContainer = document.getElementById('result-container');
        const resultTableBody = document.getElementById('result-table-body');
        const calculationDetailsDiv = document.getElementById('calculation-details');
        const standardReferenceDiv = document.getElementById('standard-reference');
        const emailShareBtn = document.getElementById('email-share-btn'); 

        // --- DYNAMIC FORM LOGIC ---
        const iecSizes = ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120', '150', '185', '240', '300', '400', '500', '630'];
        const necSizes = ['14', '12', '10', '8', '6', '4', '3', '2', '1', '1/0', '2/0', '3/0', '4/0', '250', '300', '350', '400', '500', '600', '700', '750', '800', '1000'];
        
        // Simplified IEC/NEC methods.
        // NOTE: This is a key simplification. Real standards have dozens of methods
        // linked to different base ampacity tables. This tool uses ONE base table
        // per standard and assumes other methods are similar or applies a simple factor.
        const iecInstallMethods = {
            'B1': 'Insulated conductors in conduit on a wooden wall',
            'C': 'Single-core or multi-core cable on a wooden wall (Ref)',
            'E': 'Multi-core cable in free air (on perforated tray/ladder)',
            'F': 'Single-core cables, touching, in free air (on tray/ladder)',
            'D1': 'Multi-core cable in conduit in the ground',
            'D2': 'Multi-core cable directly buried'
        };
        const necInstallMethods = {
            'in_raceway': 'In raceway or cable, in free air (Ref)',
            'in_tray_ventilated': 'In ventilated cable tray (metallic or FRP), free air',
            'direct_burial': 'Direct burial'
        };

        function updateFormOptions() {
            const standard = standardSelect.value;
            
            // Update Conductor Sizes
            conductorSizeSelect.innerHTML = '';
            const sizes = standard === 'iec' ? iecSizes : necSizes;
            const unit = standard === 'iec' ? 'mmÂ²' : 'AWG/kcmil';
            document.querySelector('label[for="conductor-size"]').innerHTML = `Conductor Size (${unit}) <span class="tooltip"><i class="fas fa-info-circle info-icon"></i><span class="tooltiptext">Cross-sectional area of the conductor. Select the appropriate unit based on the chosen standard.</span></span>`;
            sizes.forEach(size => {
                const option = document.createElement('option');
                option.value = size;
                option.textContent = size;
                conductorSizeSelect.appendChild(option);
            });
            // Ensure value is physically set to prevent blank defaults
            if (sizes.length > 0) {
                conductorSizeSelect.value = sizes[0];
            }

            // Update Insulation Type options (NEC 75C for PVC)
            const pvcOption = document.querySelector('option[value="pvc"]');
            if (standard === 'nec') {
                pvcOption.textContent = 'PVC (75â„ƒ)';
                // In NEC, 75C (pvc) is more common for terminations, 90C (xlpe) is used for derating.
                // We will use the 75C table for PVC and 90C table for XLPE.
                insulationTypeSelect.value = 'pvc'; // Default to 75C for NEC
            } else {
                pvcOption.textContent = 'PVC (70â„ƒ)';
                insulationTypeSelect.value = 'xlpe'; // Default to 90C for IEC
            }

            // Update Installation Methods
            installationMethodSelect.innerHTML = '';
            const methods = standard === 'iec' ? iecInstallMethods : necInstallMethods;
            for (const key in methods) {
                const option = document.createElement('option');
                option.value = key;
                option.textContent = methods[key];
                installationMethodSelect.appendChild(option);
            }
            
            // Set default installation method
            if (standard === 'iec') {
                installationMethodSelect.value = 'C'; // IEC Reference in air
            } else {
                installationMethodSelect.value = 'in_raceway'; // NEC Reference
            }

            // Show/hide soil resistivity and depth of burial
            updateBurialVisibility();
        }

        function updateBurialVisibility() {
            const method = installationMethodSelect.value;
            const isBuried = method.includes('D') || method.includes('burial');

            if (isBuried) {
                soilResistivityGroup.style.display = 'block';
                soilResistivityInput.setAttribute('required', 'true');
                depthOfBurialGroup.style.display = 'block';
                depthOfBurialInput.setAttribute('required', 'true');
                // Set default ambient temp for ground
                ambientTempInput.value = '20';
                document.querySelector('label[for="ambient-temp"]').innerHTML = `Ambient Ground Temp (â„ƒ) <span class="tooltip"><i class="fas fa-info-circle info-icon"></i><span class="tooltiptext">IEC default ground temp is 20Â°C. NEC default is 30Â°C. Adjust as needed.</span></span>`;
            } else {
                soilResistivityGroup.style.display = 'none';
                soilResistivityInput.removeAttribute('required');
                depthOfBurialGroup.style.display = 'none';
                depthOfBurialInput.removeAttribute('required');
                // Set default ambient temp for air
                ambientTempInput.value = '30';
                document.querySelector('label[for="ambient-temp"]').innerHTML = `Ambient Air Temp (â„ƒ) <span class="tooltip"><i class="fas fa-info-circle info-icon"></i><span class="tooltiptext">The temperature of the surrounding air. Default reference is 30Â°C.</span></span>`;
            }
        }

        // --- EVENT LISTENERS ---
        standardSelect.addEventListener('change', updateFormOptions);
        installationMethodSelect.addEventListener('change', updateBurialVisibility);
        calculateBtn.addEventListener('click', calculateAmpacity);
        emailShareBtn.addEventListener('click', (e) => {
            if (emailShareBtn.href === '#') {
                e.preventDefault();
                displayMessage("Please calculate results first to generate a shareable email.", "warning");
            }
        });

        // --- HELPER FUNCTIONS FOR INTERPOLATION ---
        function interpolateFactor(table, value) {
            const keys = Object.keys(table).map(parseFloat).sort((a, b) => a - b);
            if (value <= keys[0]) return table[keys[0]];
            if (value >= keys[keys.length - 1]) return table[keys[keys.length - 1]];

            let lowerKey = keys[0];
            let upperKey = keys[keys.length - 1];
            for (let i = 0; i < keys.length - 1; i++) {
                if (value >= keys[i] && value <= keys[i+1]) {
                    lowerKey = keys[i];
                    upperKey = keys[i+1];
                    break;
                }
            }
            const lowerValue = table[lowerKey];
            const upperValue = table[upperKey];
            if (upperKey === lowerKey) return lowerValue;
            return lowerValue + (upperValue - lowerValue) * ((value - lowerKey) / (upperKey - lowerKey));
        }

        // --- CALCULATION LOGIC ---
        function calculateAmpacity() {
            try {
                // 1. Get all inputs
                const standard = standardSelect.value;
                const material = conductorMaterialSelect.value;
                const size = conductorSizeSelect.value;
                const insulation = insulationTypeSelect.value;
                const installMethod = installationMethodSelect.value;
                const ambientTemp = parseFloat(ambientTempInput.value);
                const numCircuits = parseInt(numCircuitsInput.value);
                const soilResistivity = parseFloat(soilResistivityInput.value);
                const depthOfBurial = parseFloat(depthOfBurialInput.value);
                const loadCurrent = parseFloat(loadCurrentInput.value);
                const systemVoltageVd = parseFloat(systemVoltageVdInput.value);
                const cableLength = parseFloat(cableLengthInput.value);
                const phaseType = phaseTypeSelect.value;
                const faultDuration = parseFloat(faultDurationInput.value);

                // 2. Input Validation
                if (isNaN(ambientTemp) || isNaN(numCircuits) || isNaN(loadCurrent) || isNaN(systemVoltageVd) || isNaN(cableLength) || isNaN(faultDuration)) {
                    throw new Error("Please fill all required fields with valid numbers.");
                }
                if (numCircuits < 1 || numCircuits > 42) {
                    displayMessage("Number of circuits must be between 1 and 42 for this tool. For more, consult specific tables.", "warning");
                }
                const tempKeys = Object.keys(tempCorrectionFactors[insulation]).map(parseFloat);
                const minTemp = Math.min(...tempKeys);
                const maxTemp = Math.max(...tempKeys);
                if (ambientTemp < minTemp || ambientTemp > maxTemp) {
                    displayMessage(`Ambient temp (${ambientTemp}â„ƒ) is outside the tool's range (${minTemp}â„ƒ to ${maxTemp}â„ƒ). Results may be inaccurate.`, "warning");
                }

                const isBuried = installMethod.includes('D') || installMethod.includes('burial');
                if (isBuried && (isNaN(soilResistivity) || isNaN(depthOfBurial))) {
                    throw new Error("For buried installations, please provide valid Soil Resistivity and Depth of Burial.");
                }

                // 3. Look up Base Ampacity (Ib)
                const baseAmpacityTable = standard === 'iec' ? iecBaseAmpacity : necBaseAmpacity;
                let Ib_raw = 0;
                
                // Fallback size safety catch
                let safeSize = size;
                if (!safeSize || safeSize.trim() === "") {
                    safeSize = standard === 'iec' ? '1.5' : '14';
                    conductorSizeSelect.value = safeSize;
                }
                
                try {
                    Ib_raw = baseAmpacityTable[material][insulation][safeSize];
                    if (!Ib_raw) throw new Error();
                } catch (e) {
                    throw new Error(`Base ampacity data not found for: ${material}, ${insulation}, ${safeSize}.`);
                }

                let calculationHtml = '<h4><i class="fas fa-tasks"></i> Detailed Calculation Steps:</h4>';
                
                // --- Ampacity Calculation ---
                calculationHtml += `<h4>1. Corrected Ampacity ($$I_z$$)</h4>`;
                calculationHtml += `<p class="formula">$$ I_{z} = I_{b,raw} \\times k_{temp} \\times k_{group} \\times k_{soil} \\times k_{depth} $$</p>`;
                calculationHtml += `<ul><li>Raw Base Ampacity (I<sub>b,raw</sub>) for size ${size} ${standard === 'iec' ? 'mmÂ²' : 'AWG/kcmil'} ${material} cable with ${insulation.toUpperCase()} insulation (Ref: ${standard.toUpperCase()} tables): <strong>${Ib_raw} A</strong>.</li></ul>`;

                // 4. Determine Correction Factors
                // Temperature Correction (k_temp)
                let tempRef = 30; // Default for NEC and IEC Air
                if (isBuried && standard === 'iec') {
                    tempRef = 20; // IEC default ground temp
                }
                // NEC uses 30C for both air and ground. IEC uses 30C for air, 20C for ground.
                // Our simple table is based on 30C. We must adjust.
                // This is a simplification; real tables are different.
                // Let's stick to the 30C reference table for simplicity as coded.
                let k_temp = interpolateFactor(tempCorrectionFactors[insulation], ambientTemp);
                calculationHtml += `<ul><li>Ambient Temperature Correction (k<sub>temp</sub>) for ${ambientTemp}â„ƒ (Ref 30Â°C): <strong>${k_temp.toFixed(3)}</strong>.</li></ul>`;

                // Grouping Correction (k_group)
                let k_group = 1.0;
                const effectiveNumCircuits = Math.min(numCircuits, 42);
                k_group = interpolateFactor(groupingCorrectionFactors, effectiveNumCircuits);
                if (numCircuits > 1) {
                    calculationHtml += `<ul><li>Grouping Correction (k<sub>group</sub>) for ${numCircuits} circuits: <strong>${k_group.toFixed(3)}</strong>.</li></ul>`;
                }

                // Soil Resistivity (k_soil) and Depth (k_depth)
                let k_soil = 1.0;
                let k_depth = 1.0;
                if (isBuried) {
                    k_soil = interpolateFactor(soilResistivityCorrectionFactors, soilResistivity);
                    calculationHtml += `<ul><li>Soil Resistivity Correction (k<sub>soil</sub>) for ${soilResistivity} KÂ·m/W (Ref 2.5): <strong>${k_soil.toFixed(3)}</strong>.</li></ul>`;
                    k_depth = interpolateFactor(depthCorrectionFactors, depthOfBurial);
                    calculationHtml += `<ul><li>Depth of Burial Correction (k<sub>depth</sub>) for ${depthOfBurial} m (Ref 0.7m): <strong>${k_depth.toFixed(3)}</strong>.</li></ul>`;
                }

                // 5. Calculate Final Ampacity (Iz)
                const Iz = Ib_raw * k_temp * k_group * k_soil * k_depth;
                calculationHtml += `<p class="calculation-step">$$ I_z = ${Ib_raw} \\times ${k_temp.toFixed(3)} \\times ${k_group.toFixed(3)} \\times ${k_soil.toFixed(3)} \\times ${k_depth.toFixed(3)} = \\mathbf{${Iz.toFixed(2)} \\text{ A}} $$</p>`;

                // --- Voltage Drop Calculation ---
                let voltageDropV = 0;
                let voltageDropPercent = 0;
                let R_per_km, X_per_km;

                try {
                    const impedanceData = conductorImpedance[material][standard][size];
                    if (!impedanceData) throw new Error("Impedance data not found.");
                    R_per_km = impedanceData.R;
                    X_per_km = impedanceData.X;
                } catch (e) {
                    throw new Error(`Impedance data not found for voltage drop calculation.`);
                }
                
                const R_total = R_per_km * (cableLength / 1000);
                const X_total = X_per_km * (cableLength / 1000);
                const powerFactor = 0.8; // Assume 0.8 lagging PF for motor/industrial loads
                const cosPhi = powerFactor;
                const sinPhi = Math.sqrt(1 - (cosPhi * cosPhi)); 

                if (phaseType === 'single-phase') {
                    voltageDropV = 2 * loadCurrent * (R_total * cosPhi + X_total * sinPhi);
                } else { // Three-phase
                    voltageDropV = Math.sqrt(3) * loadCurrent * (R_total * cosPhi + X_total * sinPhi);
                }
                voltageDropPercent = (voltageDropV / systemVoltageVd) * 100;

                calculationHtml += `<h4>2. Voltage Drop ($$\\Delta V$$)</h4>`;
                calculationHtml += `<ul>                                    <li>Conductor Impedance (Ref): ${R_per_km.toFixed(3)} &Omega;/km (R), ${X_per_km.toFixed(3)} &Omega;/km (X)</li>                                    <li>Total Impedance for ${cableLength} m: ${R_total.toFixed(3)} &Omega; (R), ${X_total.toFixed(3)} &Omega; (X)</li>                                    <li>Assumed Power Factor (cos Ï†): ${powerFactor.toFixed(2)} (lagging)</li>                                </ul>`;
                if (phaseType === 'single-phase') {
                    calculationHtml += `<p class="formula">$$ \\Delta V = 2 \\times I_{load} \\times (R_{total} \\cos\\phi + X_{total} \\sin\\phi) $$</p>`;
                    calculationHtml += `<p class="calculation-step">$$ \\Delta V = 2 \\times ${loadCurrent} \\times (${R_total.toFixed(3)} \\times ${cosPhi.toFixed(2)} + ${X_total.toFixed(3)} \\times ${sinPhi.toFixed(2)}) = \\mathbf{${voltageDropV.toFixed(2)} \\text{ V}} $$</p>`;
                } else {
                    calculationHtml += `<p class="formula">$$ \\Delta V = \\sqrt{3} \\times I_{load} \\times (R_{total} \\cos\\phi + X_{total} \\sin\\phi) $$</p>`;
                    calculationHtml += `<p class="calculation-step">$$ \\Delta V = \\sqrt{3} \\times ${loadCurrent} \\times (${R_total.toFixed(3)} \\times ${cosPhi.toFixed(2)} + ${X_total.toFixed(3)} \\times ${sinPhi.toFixed(2)}) = \\mathbf{${voltageDropV.toFixed(2)} \\text{ V}} $$</p>`;
                }
                calculationHtml += `<p class="calculation-step">$$ \\text{%VD} = (${voltageDropV.toFixed(2)} \\text{ V} / ${systemVoltageVd} \\text{ V}) \\times 100 = \\mathbf{${voltageDropPercent.toFixed(2)} \\%} $$</p>`;

                if (voltageDropPercent > 5) {
                    calculationHtml += `<p style="color:var(--danger); font-weight:bold;">Warning: Voltage drop (${voltageDropPercent.toFixed(2)}%) exceeds the typical recommended maximum (e.g., 3-5%). Consider increasing conductor size.</p>`;
                }

                // --- Short-Circuit Current Withstand Calculation ---
                let shortCircuitWithstandkA = 0;
                let kFactor = 0;

                try {
                    kFactor = kFactorsShortCircuit[material][insulation];
                    if (!kFactor) throw new Error("K-factor data not found.");
                } catch (e) {
                    throw new Error(`K-factor data not found for short-circuit calculation.`);
                }
                
                let conductorSizeSqMm = 0;
                if (standard === 'nec') {
                    const necToIecConversion = {
                        '14': 2.08, '12': 3.31, '10': 5.26, '8': 8.37, '6': 13.3, '4': 21.2, '3': 26.7, '2': 33.6,
                        '1': 42.4, '1/0': 53.5, '2/0': 67.4, '3/0': 85.0, '4/0': 107.2,
                        '250': 126.7, '300': 152.0, '350': 177.3, '400': 202.7, '500': 253.3,
                        '600': 304.0, '700': 354.7, '750': 380.0, '800': 405.3, '1000': 506.7
                    };
                    conductorSizeSqMm = necToIecConversion[size];
                    if (!conductorSizeSqMm) throw new Error(`Conductor size conversion failed for ${size} AWG.`);
                } else {
                    conductorSizeSqMm = parseFloat(size);
                }

                if (faultDuration > 0 && conductorSizeSqMm > 0) {
                    shortCircuitWithstandkA = (conductorSizeSqMm * kFactor) / (Math.sqrt(faultDuration) * 1000); // kA
                } else {
                    throw new Error("Fault duration or conductor size is invalid.");
                }

                calculationHtml += `<h4>3. Short-Circuit Withstand ($$I_{sc,withstand}$$)</h4>`;
                calculationHtml += `<p>This is the adiabatic withstand current of the cable (Ref: IEC 60364-5-54).</p>`;
                calculationHtml += `<ul>                                    <li>Conductor Area (A): ${conductorSizeSqMm.toFixed(2)} mmÂ²</li>                                    <li>K-factor (k) for ${material} ${insulation.toUpperCase()}: ${kFactor}</li>                                    <li>Fault Duration (t): ${faultDuration.toFixed(2)} s</li>                                </ul>`;
                calculationHtml += `<p class="formula">$$ I_{sc,withstand} (kA) = \\frac{A \\times k}{1000 \\times \\sqrt{t}} $$</p>`;
                calculationHtml += `<p class="calculation-step">$$ I_{sc,withstand} = \\frac{${conductorSizeSqMm.toFixed(2)} \\times ${kFactor}}{1000 \\times \\sqrt{${faultDuration.toFixed(2)}}} = \\mathbf{${shortCircuitWithstandkA.toFixed(2)} \\text{ kA}} $$</p>`;

                // 6. Display Results
                calculationDetailsDiv.innerHTML = calculationHtml;
                if (window.MathJax) {
                    window.MathJax.typesetPromise([calculationDetailsDiv]);
                }

                resultTableBody.innerHTML = '';
                addResultRow("<strong>Final Corrected Ampacity (I<sub>z</sub>)</strong>", `<strong>${Iz.toFixed(2)} A</strong>`);
                addResultRow("<strong>Voltage Drop</strong>", `<strong>${voltageDropV.toFixed(2)} V (${voltageDropPercent.toFixed(2)} %)</strong>`);
                addResultRow("<strong>Short-Circuit Withstand (t=${faultDuration}s)</strong>", `<strong>${shortCircuitWithstandkA.toFixed(2)} kA</strong>`);
                
                addResultRow("--- Ampacity Inputs ---", "---");
                addResultRow("Selected Standard", standard.toUpperCase() === 'IEC' ? 'IEC 60364-5-52' : 'NEC (NFPA 70)');
                addResultRow("Base Ampacity (I<sub>b,raw</sub>)", `${Ib_raw} A`);
                addResultRow("Ambient Temperature", `${ambientTemp}â„ƒ`);
                addResultRow("Number of Grouped Circuits", numCircuits);
                addResultRow("Temp. Correction (k<sub>temp</sub>)", k_temp.toFixed(3));
                addResultRow("Grouping Correction (k<sub>group</sub>)", k_group.toFixed(3));
                if (isBuried) {
                    addResultRow("Soil Resistivity", `${soilResistivity} KÂ·m/W`);
                    addResultRow("Depth of Burial", `${depthOfBurial} m`);
                    addResultRow("Soil Correction (k<sub>soil</sub>)", k_soil.toFixed(3));
                    addResultRow("Depth Correction (k<sub>depth</sub>)", k_depth.toFixed(3));
                }

                addResultRow("--- Voltage Drop Inputs ---", "---");
                addResultRow("Load Current", `${loadCurrent} A`);
                addResultRow("System Voltage", `${systemVoltageVd} V`);
                addResultRow("Cable Length", `${cableLength} m`);
                addResultRow("Phase Type", phaseType.replace('-', ' ').charAt(0).toUpperCase() + phaseType.replace('-', ' ').slice(1));
                
                addResultRow("--- Short-Circuit Inputs ---", "---");
                addResultRow("Conductor Area (A)", `${conductorSizeSqMm.toFixed(2)} mmÂ²`);
                addResultRow("K-factor (k)", kFactor);

                standardReferenceDiv.innerHTML = `Calculation is based on methodologies and simplified data derived from:
                    <ul>
                        <li><strong>IEC 60364-5-52:2009</strong> (Low-voltage electrical installations - Part 5-52).</li>
                        <li><strong>NEC (NFPA 70)</strong>, specifically referencing Table 310.16.</li>
                        <li><strong>IEC 60909</strong> & <strong>IEEE Std 242 (Buff Book)</strong> principles for short-circuit current withstand.</li>
                    </ul>
                    <p><strong>Disclaimer:</strong> This tool provides an estimate; always refer to the complete official standards, manufacturer data, and local codes for accurate design, safety verification, and compliance.</p>`;

                resultContainer.style.display = 'block';
                setTimeout(() => {
                    resultContainer.classList.add('show');
                    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 50);

                // Update email share link
                const emailSubject = encodeURIComponent("Cable Ampacity & Sizing Calculation Results");
                const emailBody = encodeURIComponent(
                    `Here are the cable calculation results from Design Calculators (https://designcalculators.co.in):\n\n` +
                    `--- KEY RESULTS ---\n` +
                    `Final Corrected Ampacity (Iz): ${Iz.toFixed(2)} A\n` +
                    `Voltage Drop: ${voltageDropV.toFixed(2)} V (${voltageDropPercent.toFixed(2)} %)\n` +
                    `Short-Circuit Withstand (${faultDuration}s): ${shortCircuitWithstandkA.toFixed(2)} kA\n\n` +
                    `--- INPUTS ---\n` +
                    `Standard: ${standard.toUpperCase()}\n` +
                    `Conductor: ${size} ${standard === 'iec' ? 'mmÂ²' : 'AWG/kcmil'} ${material}\n` +
                    `Insulation: ${insulation.toUpperCase()}\n` +
                    `Installation: ${installationMethodSelect.options[installationMethodSelect.selectedIndex].text}\n` +
                    `Ambient Temp: ${ambientTemp}â„ƒ\n` +
                    `Grouping: ${numCircuits} circuits\n` +
                    (isBuried ? `Soil Resistivity: ${soilResistivity} KÂ·m/W\n` : '') +
                    (isBuried ? `Depth of Burial: ${depthOfBurial} m\n` : '') +
                    `Load Current: ${loadCurrent} A\n` +
                    `Cable Length: ${cableLength} m\n`
                );
                emailShareBtn.href = `mailto:?subject=${emailSubject}&body=${emailBody}`;

            } catch (e) {
                displayMessage(e.message, "error");
                // Hide results on error
                resultContainer.classList.remove('show');
                setTimeout(() => { resultContainer.style.display = 'none'; }, 500);
            }
        }

        function addResultRow(parameter, value) {
            const row = resultTableBody.insertRow();
            const paramCell = row.insertCell();
            const valueCell = row.insertCell();
            paramCell.innerHTML = parameter;
            valueCell.innerHTML = value;
        }

        function displayMessage(message, type = "info") {
            const messageBox = document.getElementById('custom-message-box');
            messageBox.textContent = message;
            messageBox.style.display = 'block';

            if (type === "error") {
                messageBox.style.backgroundColor = 'var(--danger)';
            } else if (type === "warning") {
                messageBox.style.backgroundColor = 'var(--warning)';
                messageBox.style.color = 'var(--heading)'; // Use dark text on yellow
            } else {
                messageBox.style.backgroundColor = 'var(--success)';
                messageBox.style.color = 'white';
            }
            messageBox.style.opacity = 1;

            if (messageBox.timeoutId) {
                clearTimeout(messageBox.timeoutId);
            }
            messageBox.timeoutId = setTimeout(() => {
                messageBox.style.opacity = 0;
                setTimeout(() => { messageBox.style.display = 'none';}, 500);
            }, 5000);
        }

        // --- THEME SWITCH LOGIC ---
        const themeSwitch = document.getElementById('theme-switch');
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeSwitch.checked = true;
        }
        themeSwitch.addEventListener('change', function() {
            if (this.checked) {
                document.body.classList.add('dark-mode');
                localStorage.setItem('theme', 'dark');
            } else {
                document.body.classList.remove('dark-mode');
                localStorage.setItem('theme', 'light');
            }
        });

        // --- INITIALIZE FORM ---
        
        // Chart Instances
        let ampacityChartInstance = null;
        let groupingChartInstance = null;
        let tempChartInstance = null;
        let vdChartInstance = null;
        let scChartInstance = null;

        function updateCharts() {
            try {
                const primary = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#1E3A8A';
                const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#F59E0B';
                const danger = getComputedStyle(document.documentElement).getPropertyValue('--danger').trim() || '#DC2626';
                const secondary = getComputedStyle(document.documentElement).getPropertyValue('--secondary').trim() || '#2563EB';

                // 1. Base Ampacity Chart (IEC Copper XLPE)
                const ampCtx = document.getElementById('ampacityChart');
                if(ampCtx) {
                    if(ampacityChartInstance) ampacityChartInstance.destroy();
                    const sizes = ['1.5', '2.5', '4', '6', '10', '16', '25', '35', '50', '70', '95', '120'];
                    const amps = sizes.map(s => iecBaseAmpacity['copper']['xlpe'][s]);
                    
                    ampacityChartInstance = new Chart(ampCtx.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: sizes.map(s => s + ' mm²'),
                            datasets: [{
                                label: 'Ampacity (A)',
                                data: amps,
                                borderColor: primary,
                                backgroundColor: primary + '33',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.3
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                    });
                }

                // 2. Grouping Derating Chart
                const grpCtx = document.getElementById('groupingChart');
                if(grpCtx) {
                    if(groupingChartInstance) groupingChartInstance.destroy();
                    let grpData = [];
                    let grpLabels = [];
                    for(let i=1; i<=20; i++) {
                        grpLabels.push(i);
                        grpData.push(groupingCorrectionFactors[i.toString()]);
                    }
                    groupingChartInstance = new Chart(grpCtx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: grpLabels,
                            datasets: [{
                                data: grpData,
                                backgroundColor: accent + 'AA',
                                borderRadius: 4
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { title: {display: true, text: 'No. of Cables'} } } }
                    });
                }

                // 3. Ambient Temp Derating Chart
                const tmCtx = document.getElementById('tempChart');
                if(tmCtx) {
                    if(tempChartInstance) tempChartInstance.destroy();
                    let tmData = [];
                    let tmLabels = Object.keys(tempCorrectionFactors['xlpe']).map(Number).sort((a,b)=>a-b);
                    for(let t of tmLabels) {
                        tmData.push(tempCorrectionFactors['xlpe'][t.toString()]);
                    }
                    tempChartInstance = new Chart(tmCtx.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: tmLabels.map(t=>t+'°C'),
                            datasets: [{
                                data: tmData,
                                borderColor: '#EAB308',
                                tension: 0.2,
                                borderWidth: 3
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: {y: {title: {display:true, text: 'Multiplier'} }} }
                    });
                }

                // 4. Voltage Drop Chart (Linear scaling across 10 - 200m)
                const vdCtx = document.getElementById('vdChart');
                if(vdCtx) {
                    if(vdChartInstance) vdChartInstance.destroy();
                    let vdData = [];
                    let xLabels = [20, 40, 60, 80, 100, 150, 200];
                    
                    // Get selected inputs safely, default to logical baseline if failed
                    let selSize = document.getElementById('conductor-size').value || '16';
                    let selStandard = document.getElementById('standard').value || 'iec';
                    let selMaterial = document.getElementById('conductor-material').value || 'copper';
                    let load = parseFloat(document.getElementById('load-current').value) || 100;
                    let vSys = parseFloat(document.getElementById('system-voltage-vd').value) || 400;
                    
                    let impedance = conductorImpedance[selMaterial]?.[selStandard]?.[selSize];
                    if (!impedance) impedance = conductorImpedance['copper']['iec']['16']; // Safe fallback
                    
                    for(let len of xLabels) {
                        let rtot = impedance.R * (len/1000);
                        let xtot = impedance.X * (len/1000);
                        let vd = Math.sqrt(3) * load * ((rtot * 0.8) + (xtot * 0.6));
                        let pct = (vd / vSys) * 100;
                        vdData.push(parseFloat(pct.toFixed(2)));
                    }

                    vdChartInstance = new Chart(vdCtx.getContext('2d'), {
                        type: 'line',
                        data: {
                            labels: xLabels.map(x=>x+'m'),
                            datasets: [{
                                label: '% Voltage Drop',
                                data: vdData,
                                borderColor: secondary,
                                backgroundColor: secondary + '33',
                                borderWidth: 3,
                                fill: true
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
                    });
                }

                // 5. Short Circuit Withstand Chart (Inverse sqrt)
                const scCtx = document.getElementById('scChart');
                if(scCtx) {
                    if(scChartInstance) scChartInstance.destroy();
                    
                    let faultTimes = [0.05, 0.1, 0.2, 0.5, 1.0, 3.0];
                    let scData = [];
                    let selInsul = document.getElementById('insulation-type').value || 'xlpe';
                    let selMaterial = document.getElementById('conductor-material').value || 'copper';
                    let selStandard = document.getElementById('standard').value || 'iec';
                    let selSize = document.getElementById('conductor-size').value || '16';

                    let kFct = kFactorsShortCircuit[selMaterial]?.[selInsul] || 143;
                    let areaSqMm = 16;
                    if(selStandard === 'iec') areaSqMm = parseFloat(selSize) || 16;
                    else areaSqMm = 16; // default fallback for NEC mapping
                    
                    for(let t of faultTimes) {
                        let isc = (areaSqMm * kFct) / (Math.sqrt(t) * 1000);
                        scData.push(parseFloat(isc.toFixed(1)));
                    }

                    scChartInstance = new Chart(scCtx.getContext('2d'), {
                        type: 'bar',
                        data: {
                            labels: faultTimes.map(t=>t+'s'),
                            datasets: [{
                                data: scData,
                                backgroundColor: danger + 'AA',
                                borderRadius: 6
                            }]
                        },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x:{title:{display:true,text:'Breaker Clearing Time'}} } }
                    });
                }
            } catch(e) { console.error(e); }
        }

        updateFormOptions();
        
        // Add chart update to calculation flow to sync dynamically
        calculateBtn.addEventListener('click', function() {
            try { updateCharts(); } catch(e) {}
        });
        
        setTimeout(function() {
            try { 
                updateFormOptions(); // Final population sync
                calculateAmpacity(); 
                updateCharts(); 
            } catch (e) {
                console.log("Initial silent run handled:", e);
                updateCharts();
            }
        }, 500);
        
    });
    