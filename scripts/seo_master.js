const fs = require('fs');
const path = require('path');
const rootDir = __dirname;
const baseUrl = 'https://designcalculators.co.in';

const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.xml', 'about.html', 'contact.html', 'faq.html', 'engineering-glossary.html', 'license.html', '404.html', 'unit-converter (2).html', 'unit-converter (3).html'];

const electricalFiles = ['arcflash.html','battery-sizing.html','batterychargersizing.html','batterycharging.html','batterylife.html','breaker-sizing.html','busbarampacity.html','busbarshortcircuit.html','cable-sizing.html','cable-thermal-rating.html','cablepulling.html','comm-cable-loss.html','conduit-fill.html','ctsaturation.html','earth-conductor-size.html','earthingfaultsimulator.html','electricalresidentialload.html','equipment-relay.html','generatorsizing.html','grounding.html','harmonic-distortion.html','harmonicsanalyser.html','hvac-sizing.html','industriallighting.html','insulationresistance.html','lcresonancecalculator.html','lighting-calulator.html','logicgate.html','maintenance-guide.html','motor-efficiency.html','motor-starting.html','nemaipconvertor.html','neutral-earth-fault-current.html','ohms-law.html','pcbtrace.html','power-factor.html','powertriangletool.html','protection-device.html','relay-coordination.html','resistor.html','short-circuit.html','skindepth.html','solarcable.html','solarpvarray.html','symmetricalcomponents.html','systemxrcalculator.html','transformer-calculator.html','transformerinrush.html','transmissionline.html','unit-converter.html','ups-sizing.html','vfd-selection.html','voltage-drop.html'];

const instrumentationFiles = ['adc-resolution.html','baud-rate.html','capacitance-level.html','capillarylengthtemperatureerror.html','controlvalveauthority.html','controlvalveleakage.html','controlvalvenoise.html','cv-kv-valve.html','dbcalculator.html','dp-flow-conversion.html','dp-level.html','flowprofiledistortioncalculator.html','gascompressibility.html','hartdevices.html','hydrostatic-level.html','impulse-pressure-drop.html','impulselinefreezing.html','instrument-range.html','intrinsic-safety.html','junctionbox.html','loop-impedance.html','measurement.html','orifice-flow.html','orifice-plate.html','ph-temp-comp.html','pid-symbol-library.html','pid-tuning.html','plcscantime.html','power-supply-load.html','pressuretransmitteroverrange.html','pressurereliefvalve.html','profibus.html','prvsizing.html','reynoldsnumbercal.html','rtd-lead-comp.html','rtd-tc-conversion.html','rtdexcitationcurrentselection.html','rtdselfheating.html','sealfluidzeroshift.html','signal-scaling.html','sil.html','snr-calculator.html','staticheadcal.html','steamflow.html','temperaturesensorlag.html','tempsensorresponse.html','thermocouplecjccalculator.html','thermocoupleextensioncable.html','thermowell-wake.html','thermowellwakefreq.html','turndown.html','ultrasoniclevel.html','valvecavitationcalculator.html','valve-cv.html','vibrationtransmitter.html','wetlegdensitycompensation.html','wirelesshart.html','zoneclassificationhelper.html'];

const mechanicalFiles = ['air-flow-duct.html','aircompressorfad.html','allowable-stress-safety-factor.html','asme-vessel.html','beam-deflection.html','bearinglife.html','belt-pulley.html','bernoulli-equation.html','boiler-efficiency.html','bolt-torque.html','chiller-capacity.html','compressor-power.html','conduction-convection-radiation.html','controlvalveactuator.html','cooling-tower-sizing.html','corrosion-rate.html','darcy-weisbach.html','fan-laws.html','fatigue.html','finned-tube-heat-transfer.html','foundation.html','frictionfactortool.html','fuel-combustion.html','furnace-heat-duty.html','gas-laws.html','gas.html','gear-design.html','hardness.html','heat-exchanger.html','heat-loss-pipes.html','hydroliccylinder.html','jacketed-vessel-heat-transfer.html','machining.html','material-compatibility.html','metalweight.html','momentofinertia.html','nozzle-reinforcement.html','nptbspthreadcalculator.html','openchannelflow.html','oring.html','overall-heat-transfer.html','pipe-flow.html','pipe-stress-flexibility.html','pipescheduletool.html','psychrometric.html','pump-head.html','pump-power.html','reynolds-number.html','shaft-power-torque.html','specific-heat-enthalpy.html','spring.html','steam-table.html','storage-tank-volume.html','thermal-expansion.html','vibrationanalysis.html','weldingstress.html'];

// Related tools mapping (top 15 tools get curated links, rest get auto-category)
const relatedMap = {
    'cable-sizing.html': ['voltage-drop.html','cable-thermal-rating.html','conduit-fill.html'],
    'voltage-drop.html': ['cable-sizing.html','cable-thermal-rating.html','breaker-sizing.html'],
    'breaker-sizing.html': ['short-circuit.html','cable-sizing.html','relay-coordination.html'],
    'battery-sizing.html': ['batterychargersizing.html','ups-sizing.html','batterylife.html'],
    'batterychargersizing.html': ['battery-sizing.html','ups-sizing.html','batterylife.html'],
    'ups-sizing.html': ['battery-sizing.html','batterychargersizing.html','generatorsizing.html'],
    'grounding.html': ['earth-conductor-size.html','earthingfaultsimulator.html','short-circuit.html'],
    'transformer-calculator.html': ['transformerinrush.html','short-circuit.html','cable-sizing.html'],
    'motor-starting.html': ['motor-efficiency.html','vfd-selection.html','cable-sizing.html'],
    'orifice-plate.html': ['orifice-flow.html','dp-flow-conversion.html','reynoldsnumbercal.html'],
    'pid-tuning.html': ['pid-symbol-library.html','signal-scaling.html','plcscantime.html'],
    'cv-kv-valve.html': ['valve-cv.html','controlvalvenoise.html','controlvalveauthority.html'],
    'heat-exchanger.html': ['overall-heat-transfer.html','finned-tube-heat-transfer.html','cooling-tower-sizing.html'],
    'pump-head.html': ['pump-power.html','pipe-flow.html','darcy-weisbach.html'],
    'asme-vessel.html': ['nozzle-reinforcement.html','allowable-stress-safety-factor.html','bolt-torque.html'],
};

function getCat(f) {
    const lf = f.toLowerCase();
    if (electricalFiles.includes(lf)) return { name: 'Electrical Tools', url: baseUrl + '/indexele' };
    if (instrumentationFiles.includes(lf)) return { name: 'Instrumentation Tools', url: baseUrl + '/indexinst' };
    if (mechanicalFiles.includes(lf)) return { name: 'Mechanical Tools', url: baseUrl + '/indexmech' };
    if (lf.startsWith('article')) return { name: 'Articles', url: baseUrl + '/#articles' };
    return null;
}

function getRelated(file) {
    const lf = file.toLowerCase();
    if (relatedMap[lf]) return relatedMap[lf];
    // Auto-pick 3 from same category
    let pool = [];
    if (electricalFiles.includes(lf)) pool = electricalFiles;
    else if (instrumentationFiles.includes(lf)) pool = instrumentationFiles;
    else if (mechanicalFiles.includes(lf)) pool = mechanicalFiles;
    const filtered = pool.filter(f => f !== lf);
    // Pick 3 pseudo-random based on file index
    const idx = filtered.indexOf(lf.replace('.html','') + '.html') || 0;
    const picks = [];
    for (let i = 0; i < 3 && i < filtered.length; i++) {
        picks.push(filtered[(idx + i * 7 + 3) % filtered.length]);
    }
    return picks;
}

function getTitle(content) {
    const m = content.match(/<title>([\s\S]*?)<\/title>/i);
    return m ? m[1].trim() : '';
}

function getDesc(content) {
    const m = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
    return m ? m[1].trim() : '';
}

function getLinkText(file) {
    // Convert filename to readable title
    return file.replace('.html','').replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

let processed = 0, skipped = 0, errors = 0;

function processFile(file) {
    const filePath = path.join(rootDir, file);
    let content;
    try { content = fs.readFileSync(filePath, 'utf8'); } catch(e) { errors++; return; }
    
    const cat = getCat(file);
    if (!cat) { skipped++; return; }
    
    const title = getTitle(content);
    const desc = getDesc(content);
    const cleanName = file.replace('.html', '');
    const fullUrl = baseUrl + '/' + cleanName;
    let changed = false;

    // === TASK 1: Schema Injection (SoftwareApplication) ===
    // Remove old auto-generated schema
    const oldSchemaRegex = /\s*<!-- Standardised SEO Schema \(Auto-generated\) -->[\s\S]*?<\/script>/gi;
    if (oldSchemaRegex.test(content)) {
        content = content.replace(oldSchemaRegex, '');
        changed = true;
    }
    
    const schema = {
        "@context": "https://schema.org",
        "@graph": [
            {
                "@type": "SoftwareApplication",
                "name": title,
                "url": fullUrl,
                "description": desc,
                "applicationCategory": "UtilityApplication",
                "operatingSystem": "Web",
                "author": {
                    "@type": "Person",
                    "@id": baseUrl + "/#person",
                    "name": "Anil Sharma",
                    "url": baseUrl + "/about.html"
                },
                "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
            },
            {
                "@type": "BreadcrumbList",
                "itemListElement": [
                    { "@type": "ListItem", "position": 1, "name": "Home", "item": baseUrl },
                    { "@type": "ListItem", "position": 2, "name": cat.name, "item": cat.url },
                    { "@type": "ListItem", "position": 3, "name": title.split('-')[0].split('|')[0].trim(), "item": fullUrl }
                ]
            }
        ]
    };
    
    const schemaTag = `\n    <!-- Standardised SEO Schema (Auto-generated) -->\n    <script type="application/ld+json">\n    ${JSON.stringify(schema, null, 4)}\n    </script>`;
    
    if (!content.includes('"SoftwareApplication"')) {
        content = content.replace('</head>', schemaTag + '\n</head>');
        changed = true;
    }

    // === TASK 2: Related Tools Injection ===
    const relatedMarker = '<!-- Related Tools Section (Auto-generated) -->';
    if (!content.includes(relatedMarker) && !file.startsWith('article') && !file.startsWith('index')) {
        const related = getRelated(file);
        if (related.length > 0) {
            const cards = related.map(r => {
                const rTitle = getLinkText(r);
                return `                    <a href="/${r}" class="silo-card" style="text-decoration:none;">\n                        <span>${rTitle}</span>\n                    </a>`;
            }).join('\n');
            
            const relatedHtml = `\n    ${relatedMarker}\n    <section style="padding: 40px 0; background: var(--bg-color, #f8fafc);">\n        <div class="container">\n            <h2 style="text-align:center; font-size:1.4rem; margin-bottom:20px; color:var(--heading-color, #1e293b);">Related Engineering Calculators</h2>\n            <div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(250px,1fr)); gap:15px; max-width:900px; margin:0 auto;">\n${cards}\n            </div>\n        </div>\n    </section>\n`;
            
            // Insert before footer
            if (content.includes('<footer')) {
                content = content.replace(/<footer/i, relatedHtml + '    <footer');
                changed = true;
            }
        }
    }

    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        processed++;
    } else {
        skipped++;
    }
}

// Main
const files = fs.readdirSync(rootDir).filter(f => f.endsWith('.html') && !excludeFiles.includes(f));
console.log(`Processing ${files.length} HTML files...`);
files.forEach(processFile);
console.log(`Done! Processed: ${processed}, Skipped: ${skipped}, Errors: ${errors}`);
