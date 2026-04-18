const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.xml', 'about.html', 'contact.html', 'faq.html', 'engineering-glossary.html'];

// Category Mappings (Case-insensitive matching will be used)
const electricalFiles = ['arcflash.html', 'breaker-sizing.html', 'cable-thermal-rating.html', 'comm-cable-loss.html', 'earth-conductor-size.html', 'generatorsizing.html', 'harmonicsanalyser.html', 'insulationresistance.html', 'logicgate.html', 'motor-starting.html', 'pcbtrace.html', 'protection-device.html', 'resistor.html', 'solarcable.html', 'systemxrcalculator.html', 'transmissionline.html', 'vfd-selection.html', 'batterylife.html', 'busbarampacity.html', 'cablepulling.html', 'conduit-fill.html', 'earthingfaultsimulator.html', 'grounding.html', 'hvac-sizing.html', 'lcresonancecalculator.html', 'maintenance-guide.html', 'nemaipconvertor.html', 'power-factor.html', 'relay-coordination.html', 'short-circuit.html', 'solarpvarray.html', 'transformer-calculator.html', 'unit-converter.html', 'voltage-drop.html', 'battery-sizing.html', 'busbarshortcircuit.html', 'cable-sizing.html', 'ctsaturation.html', 'equipment-relay.html', 'harmonic-distortion.html', 'industriallighting.html', 'lighting-calulator.html', 'motor-efficiency.html', 'neutral-earth-fault-current.html', 'powertriangletool.html', 'electricalresidentialload.html', 'skindepth.html', 'symmetricalcomponents.html', 'transformerinrush.html', 'ups-sizing.html', 'batterycharging.html'].map(f => f.toLowerCase());
const instrumentationFiles = ['adc-resolution.html', 'capillarylengthtemperatureerror.html', 'cv-kv-valve.html', 'dp-level.html', 'hydrostatic-level.html', 'instrument-range.html', 'loop-impedance.html', 'orifice-plate.html', 'pid-tuning.html', 'profibus.html', 'tempsensorresponse.html', 'rtd-lead-comp.html', 'sealfluidzeroshift.html', 'snr-calculator.html', 'thermocoupleextensioncable.html', 'thermowellwakefreq.html', 'pressuretransmitteroverrange.html', 'valvecavitationcalculator.html', 'vibrationtransmitter.html', 'zoneclassificationhelper.html', 'baud-rate.html', 'gascompressibility.html', 'dbcalculator.html', 'flowprofiledistortioncalculator.html', 'impulselinefreezing.html', 'intrinsic-safety.html', 'measurement.html', 'ph-temp-comp.html', 'plcscantime.html', 'pressurereliefvalve.html', 'reynoldsnumbercal.html', 'rtdselfheating.html', 'signal-scaling.html', 'staticheadcal.html', 'temperaturesensorlag.html', 'thermowell-wake.html', 'ultrasoniclevel.html', 'valve-cv.html', 'wetlegdensitycompensation.html', 'capacitance-level.html', 'controlvalvenoise.html', 'dp-flow-conversion.html', 'hartdevices.html', 'impulse-pressure-drop.html', 'junctionbox.html', 'orifice-flow.html', 'pid-symbol-library.html', 'power-supply-load.html', 'prvsizing.html', 'rtdexcitationcurrentselection.html', 'rtd-tc-conversion.html', 'sil.html', 'steamflow.html', 'thermocouplecjccalculator.html', 'turndown.html', 'controlvalveauthority.html', 'controlvalveleakage.html', 'wirelesshart.html'].map(f => f.toLowerCase());
const mechanicalFiles = ['aircompressorfad.html', 'asme-vessel.html', 'belt-pulley.html', 'bolt-torque.html', 'controlvalveactuator.html', 'frictionfactortool.html', 'fatigue.html', 'fuel-combustion.html', 'gas.html', 'heat-exchanger.html', 'hydroliccylinder.html', 'material-compatibility.html', 'nozzle-reinforcement.html', 'openchannelflow.html', 'pipescheduletool.html', 'pump-head.html', 'shaft-power-torque.html', 'steam-table.html', 'vibrationanalysis.html', 'air-flow-duct.html', 'beam-deflection.html', 'bernoulli-equation.html', 'chiller-capacity.html', 'cooling-tower-sizing.html', 'darcy-weisbach.html', 'finned-tube-heat-transfer.html', 'furnace-heat-duty.html', 'gear-design.html', 'heat-loss-pipes.html', 'jacketed-vessel-heat-transfer.html', 'metalweight.html', 'nptbspthreadcalculator.html', 'overall-heat-transfer.html', 'pipe-stress-flexibility.html', 'pump-power.html', 'specific-heat-enthalpy.html', 'storage-tank-volume.html', 'weldingstress.html', 'allowable-stress-safety-factor.html', 'bearinglife.html', 'boiler-efficiency.html', 'compressor-power.html', 'corrosion-rate.html', 'fan-laws.html', 'foundation.html', 'gas-laws.html', 'hardness.html', 'conduction-convection-radiation.html', 'machining.html', 'momentofinertia.html', 'oring.html', 'pipe-flow.html', 'psychrometric.html', 'reynolds-number.html', 'spring.html', 'thermal-expansion.html'].map(f => f.toLowerCase());

const authorJson = {
    "@type": "Person",
    "@id": "https://designcalculators.co.in/#person",
    "name": "Anil Sharma",
    "url": "https://designcalculators.co.in/about.html",
    "image": "https://designcalculators.co.in/logo.png",
    "description": "Expert engineering consultant with over 15 years of experience in Electrical, Mechanical, and Instrumentation design. Specialist in IEC and IEEE standards.",
    "sameAs": [
        "https://www.linkedin.com/in/anil-sharma-engineering", 
        "https://www.youtube.com/@designcalculators"
    ]
};

function getCategoryData(fileName) {
    const lowerFile = fileName.toLowerCase();
    if (electricalFiles.includes(lowerFile)) {
        return { name: "Electrical Tools", url: "https://designcalculators.co.in/indexele.html" };
    } else if (instrumentationFiles.includes(lowerFile)) {
        return { name: "Instrumentation Tools", url: "https://designcalculators.co.in/indexinst.html" };
    } else if (mechanicalFiles.includes(lowerFile)) {
        return { name: "Mechanical Tools", url: "https://designcalculators.co.in/indexmech.html" };
    } else if (lowerFile.startsWith('article')) {
        return { name: "Engineering Articles", url: "https://designcalculators.co.in/index.html#articles" };
    }
    return null;
}

async function processFiles() {
    const files = fs.readdirSync(rootDir);
    const htmlFiles = files.filter(f => f.endsWith('.html') && !excludeFiles.includes(f));

    console.log(`Starting SEO Standardisation for ${htmlFiles.length} files...`);

    for (const file of htmlFiles) {
        const filePath = path.join(rootDir, file);
        let content = fs.readFileSync(filePath, 'utf8');
        
        const cat = getCategoryData(file);
        if (!cat) {
            console.warn(`Skipping ${file}: No category mapping found.`);
            continue;
        }

        // 1. Extract Metadata
        const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? titleMatch[1].trim() : "Engineering Calculator";
        
        const descMatch = content.match(/<meta\s+name=["']description["']\s+content=["']([\s\S]*?)["']\s*\/?>/i);
        const description = descMatch ? descMatch[1].trim() : "";

        const fullUrl = `https://designcalculators.co.in/${file}`;

        // 2. Construct JSON-LD
        const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "WebApplication",
                    "name": title,
                    "url": fullUrl,
                    "description": description,
                    "applicationCategory": "EngineeringTool",
                    "operatingSystem": "Any",
                    "author": authorJson,
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "USD"
                    }
                },
                {
                    "@type": "BreadcrumbList",
                    "itemListElement": [
                        {
                            "@type": "ListItem",
                            "position": 1,
                            "name": "Home",
                            "item": "https://designcalculators.co.in"
                        },
                        {
                            "@type": "ListItem",
                            "position": 2,
                            "name": cat.name,
                            "item": cat.url
                        },
                        {
                            "@type": "ListItem",
                            "position": 3,
                            "name": title.split('-')[0].trim().replace('|', '').trim(),
                            "item": fullUrl
                        }
                    ]
                }
            ]
        };

        const jsonLdString = `\n    <!-- Standardised SEO Schema (Auto-generated) -->\n    <script type="application/ld+json">\n    ${JSON.stringify(jsonLd, null, 4)}\n    </script>`;

        // 3. Inject/Replace Schema
        const canonicalTag = `<link rel="canonical" href="${fullUrl}" />`;
        const canonicalRegex = /<link\s+rel=["']canonical["']\s+href=["'][\s\S]*?["']\s*\/?>/i;

        if (content.match(canonicalRegex)) {
            content = content.replace(canonicalRegex, canonicalTag);
        } else {
            // If no canonical, try to put it after description or title
            if (content.includes('</title>')) {
                content = content.replace('</title>', `</title>\n    ${canonicalTag}`);
            } else {
                content = content.replace('</head>', `    ${canonicalTag}\n</head>`);
            }
        }

        // Remove our previous auto-generated schema if present (for re-runnability)
        content = content.replace(/<!-- Standardised SEO Schema \(Auto-generated\) -->[\s\S]*?<\/script>/i, '');

        // Inject new schema before </head>
        content = content.replace('</head>', `${jsonLdString}\n</head>`);

        fs.writeFileSync(filePath, content, 'utf8');
    }

    console.log('SEO Standardisation Complete.');
}

processFiles().catch(console.error);
