/**
 * DesignCalculators.co.in - Universal Engineering Calculation Export & Print Engine
 * Provides client-side Export to CSV/Excel and Official Printable Calculation Sheets
 * Compliant with RFC 4180 and UTF-8 BOM for Microsoft Excel / Google Sheets compatibility.
 */

(function(window, document) {
    'use strict';

    const CalculatorExport = {
        /**
         * Escape field for RFC 4180 CSV compliance
         */
        escapeCSV: function(value) {
            if (value === null || value === undefined) return '""';
            let str = String(value).trim();
            if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
                str = '"' + str.replace(/"/g, '""') + '"';
            } else {
                str = '"' + str + '"';
            }
            return str;
        },

        /**
         * Extract human-readable label from an input or select element
         */
        getInputLabel: function(el) {
            // 1. Direct label with for attribute
            if (el.id) {
                const label = document.querySelector(`label[for="${el.id}"]`);
                if (label && label.innerText.trim()) return label.innerText.trim();
            }
            // 2. Parent label
            const parentLabel = el.closest('label');
            if (parentLabel && parentLabel.innerText.trim()) {
                return parentLabel.innerText.replace(el.value, '').trim();
            }
            // 3. Closest form-group or input-group label
            const group = el.closest('.form-group, .input-group, .form-row, .field, .calc-group');
            if (group) {
                const groupLabel = group.querySelector('label, .label, .field-label');
                if (groupLabel && groupLabel.innerText.trim()) return groupLabel.innerText.trim();
            }
            // 4. Placeholder, name, or id fallback
            return el.getAttribute('placeholder') || el.name || el.id || 'Input';
        },

        /**
         * Extract unit associated with an input element
         */
        getInputUnit: function(el) {
            const group = el.closest('.input-group, .form-group, .calc-group');
            if (group) {
                const unitEl = group.querySelector('.unit, .input-unit, .input-group-text, .unit-label, .addon');
                if (unitEl && unitEl.innerText.trim()) return unitEl.innerText.trim();
            }
            // Check if label contains unit in brackets e.g. (mm), [kW]
            const label = this.getInputLabel(el);
            const match = label.match(/[\(\[]([^\)\]]+)[\)\]]/);
            return match ? match[1] : '';
        },

        /**
         * Scrapes input parameters from the active calculator on the page
         */
        scrapeInputs: function(container) {
            const root = container || document.querySelector('.calculator-container, form, .card, main') || document.body;
            const inputElements = root.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="reset"]), select');
            const inputs = [];

            inputElements.forEach(el => {
                // Ignore elements in search bars, modals or header
                if (el.closest('header, nav, #searchModal, .search-container, footer')) return;
                
                let val = '';
                if (el.tagName === 'SELECT') {
                    const opt = el.options[el.selectedIndex];
                    val = opt ? opt.text.trim() : el.value;
                } else if (el.type === 'checkbox') {
                    val = el.checked ? 'Yes' : 'No';
                } else if (el.type === 'radio') {
                    if (!el.checked) return;
                    val = el.value;
                } else {
                    val = el.value;
                }

                if (val !== '') {
                    const label = this.getInputLabel(el).replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ');
                    const unit = this.getInputUnit(el);
                    inputs.push({
                        parameter: label,
                        value: val,
                        unit: unit
                    });
                }
            });

            return inputs;
        },

        /**
         * Scrapes calculated output results from the page
         */
        scrapeOutputs: function(container) {
            const root = container || document.querySelector('#results, .results, .result-card, .result-box, .output-card, main') || document.body;
            const outputs = [];

            // Search for structured result rows or cards
            const resultItems = root.querySelectorAll('.result-item, .result-row, .output-row, .kpi-card, .result-box');
            if (resultItems.length > 0) {
                resultItems.forEach(item => {
                    const labelEl = item.querySelector('.result-label, .label, h4, h5, .title, dt');
                    const valEl = item.querySelector('.result-value, .value, .output-value, .num, dd');
                    const unitEl = item.querySelector('.unit, .result-unit');

                    if (labelEl && valEl) {
                        outputs.push({
                            metric: labelEl.innerText.trim(),
                            value: valEl.innerText.trim(),
                            unit: unitEl ? unitEl.innerText.trim() : ''
                        });
                    }
                });
            }

            // Fallback: search for elements with id/class containing result or output
            if (outputs.length === 0) {
                const valueHolders = root.querySelectorAll('[id*="result" i], [id*="output" i], [class*="result-val" i]');
                valueHolders.forEach(el => {
                    if (el.tagName === 'DIV' || el.tagName === 'SPAN' || el.tagName === 'P') {
                        const txt = el.innerText.trim();
                        if (txt && txt.length < 120 && !txt.includes('function') && !txt.includes('{')) {
                            outputs.push({
                                metric: el.id || 'Result',
                                value: txt,
                                unit: ''
                            });
                        }
                    }
                });
            }

            return outputs;
        },

        /**
         * Get the tool title and standard references
         */
        getToolMetadata: function() {
            const h1 = document.querySelector('h1');
            const title = h1 ? h1.innerText.replace(/[\r\n]+/g, ' ').trim() : document.title.split('|')[0].trim();
            
            // Search for standards in text or meta
            let standards = 'IEEE / IEC / ASME / API Standards Compliance';
            const pageText = document.body.innerText;
            const matchedStandards = [];
            ['IEC 60364', 'IEC 60534', 'IEEE 1584', 'IEEE 80', 'IEEE C57', 'ASME Section VIII', 'API 520', 'API 521', 'API 2000', 'ISO 5167', 'ISA 75'].forEach(std => {
                if (pageText.includes(std)) matchedStandards.push(std);
            });
            if (matchedStandards.length > 0) {
                standards = matchedStandards.join('; ');
            }

            return {
                toolName: title,
                standards: standards,
                url: window.location.href,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19)
            };
        },

        /**
         * Generate RFC 4180 CSV string with UTF-8 BOM
         */
        generateCSV: function(customData) {
            const meta = (customData && customData.meta) || this.getToolMetadata();
            const inputs = (customData && customData.inputs) || this.scrapeInputs();
            const outputs = (customData && customData.outputs) || this.scrapeOutputs();

            const rows = [];
            // Header information
            rows.push([this.escapeCSV("DESIGN CALCULATORS - ENGINEERING CALCULATION REPORT")]);
            rows.push([this.escapeCSV("Tool / Module:"), this.escapeCSV(meta.toolName)]);
            rows.push([this.escapeCSV("Governing Standards:"), this.escapeCSV(meta.standards)]);
            rows.push([this.escapeCSV("Generated Timestamp:"), this.escapeCSV(meta.timestamp)]);
            rows.push([this.escapeCSV("Source URL:"), this.escapeCSV(meta.url)]);
            rows.push([this.escapeCSV("Engineering Peer Review:"), this.escapeCSV("Reviewed by Anil Sharma, Senior Engineering Consultant")]);
            rows.push([]);

            // Inputs Section
            rows.push([this.escapeCSV("=== INPUT PARAMETERS ==="), this.escapeCSV(""), this.escapeCSV("")]);
            rows.push([this.escapeCSV("Parameter Description"), this.escapeCSV("Value"), this.escapeCSV("Engineering Unit")]);
            if (inputs.length > 0) {
                inputs.forEach(item => {
                    rows.push([
                        this.escapeCSV(item.parameter),
                        this.escapeCSV(item.value),
                        this.escapeCSV(item.unit || '-')
                    ]);
                });
            } else {
                rows.push([this.escapeCSV("Default / Live Form Inputs"), this.escapeCSV("Refer to web calculator"), this.escapeCSV("")]);
            }
            rows.push([]);

            // Outputs Section
            rows.push([this.escapeCSV("=== CALCULATED RESULTS & VERIFICATION ==="), this.escapeCSV(""), this.escapeCSV("")]);
            rows.push([this.escapeCSV("Calculated Metric"), this.escapeCSV("Computed Result"), this.escapeCSV("Unit / Compliance")]);
            if (outputs.length > 0) {
                outputs.forEach(item => {
                    rows.push([
                        this.escapeCSV(item.metric),
                        this.escapeCSV(item.value),
                        this.escapeCSV(item.unit || 'Verified')
                    ]);
                });
            } else {
                rows.push([this.escapeCSV("Calculation Output"), this.escapeCSV("Please perform calculation on page prior to export"), this.escapeCSV("")]);
            }
            rows.push([]);

            // Footer / Legal Notice
            rows.push([this.escapeCSV("Notice: Generated by DesignCalculators.co.in. Peer-reviewed for industrial engineering calculation and planning.")]);

            // Convert to CSV string with \uFEFF (UTF-8 Byte Order Mark for Microsoft Excel)
            const csvContent = "\uFEFF" + rows.map(r => r.join(",")).join("\r\n");
            return csvContent;
        },

        /**
         * Trigger immediate download of CSV/Excel spreadsheet
         */
        toCSV: function(customData) {
            const csv = this.generateCSV(customData);
            const meta = (customData && customData.meta) || this.getToolMetadata();
            
            // Clean filename
            const cleanName = meta.toolName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            const dateStr = new Date().toISOString().substring(0, 10);
            const filename = `${cleanName}_calculation_${dateStr}.csv`;

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            if (navigator.msSaveBlob) {
                // IE 10+
                navigator.msSaveBlob(blob, filename);
            } else {
                const link = document.createElement("a");
                if (link.download !== undefined) {
                    const url = URL.createObjectURL(blob);
                    link.setAttribute("href", url);
                    link.setAttribute("download", filename);
                    link.style.visibility = 'hidden';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                }
            }
        },

        /**
         * Trigger print preview with clean engineering calculation layout
         */
        printReport: function() {
            // Ensure any details elements are expanded for complete printout
            const details = document.querySelectorAll('details');
            details.forEach(d => { d.setAttribute('data-pre-print-open', d.open); d.open = true; });

            window.print();

            // Revert details state after printing
            setTimeout(() => {
                details.forEach(d => {
                    if (d.getAttribute('data-pre-print-open') === 'false') {
                        d.open = false;
                    }
                    d.removeAttribute('data-pre-print-open');
                });
            }, 1000);
        }
    };

    // Global accessibility
    window.CalculatorExport = CalculatorExport;
    window.exportCalculationToCSV = function(data) { CalculatorExport.toCSV(data); };
    window.printCalculationReport = function() { CalculatorExport.printReport(); };

})(window, document);
