const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const excludeFiles = ['index.html', 'privacy-policy.html', 'terms-of-service.html', 'sitemap2.html', 'sitemap.xml', 'about.html', 'contact.html', 'faq.html', 'engineering-glossary.html'];

// Category Mappings (Case-insensitive matching will be used)
const electricalFiles = ['arcflash.html','battery-sizing.html','batterychargersizing.html','batterycharging.html','batterylife.html','breaker-sizing.html','busbarampacity.html','busbarshortcircuit.html','cable-sizing.html','cable-thermal-rating.html','cablepulling.html','comm-cable-loss.html','conduit-fill.html','ctsaturation.html','earth-conductor-size.html','earthingfaultsimulator.html','electricalresidentialload.html','equipment-relay.html','generatorsizing.html','grounding.html','harmonic-distortion.html','harmonicsanalyser.html','hvac-sizing.html','industriallighting.html','insulationresistance.html','lcresonancecalculator.html','lighting-calulator.html','logicgate.html','maintenance-guide.html','motor-efficiency.html','motor-starting.html','nemaipconvertor.html','neutral-earth-fault-current.html','ohms-law.html','pcbtrace.html','power-factor.html','powertriangletool.html','protection-device.html','relay-coordination.html','resistor.html','short-circuit.html','skindepth.html','solarcable.html','solarpvarray.html','symmetricalcomponents.html','systemxrcalculator.html','transformer-calculator.html','transformerinrush.html','transmissionline.html','unit-converter.html','ups-sizing.html','vfd-selection.html','voltage-drop.html'].map(f => f.toLowerCase());
const instrumentationFiles = ['adc-resolution.html','baud-rate.html','capacitance-level.html','capillarylengthtemperatureerror.html','controlvalveauthority.html','controlvalveleakage.html','controlvalvenoise.html','cv-kv-valve.html','dbcalculator.html','dp-flow-conversion.html','dp-level.html','flowprofiledistortioncalculator.html','gascompressibility.html','hartdevices.html','hydrostatic-level.html','impulse-pressure-drop.html','impulselinefreezing.html','instrument-range.html','intrinsic-safety.html','junctionbox.html','loop-impedance.html','measurement.html','orifice-flow.html','orifice-plate.html','ph-temp-comp.html','pid-symbol-library.html','pid-tuning.html','plcscantime.html','power-supply-load.html','pressuretransmitteroverrange.html','pressurereliefvalve.html','profibus.html','prvsizing.html','reynoldsnumbercal.html','rtd-lead-comp.html','rtd-tc-conversion.html','rtdexcitationcurrentselection.html','rtdselfheating.html','sealfluidzeroshift.html','signal-scaling.html','sil.html','snr-calculator.html','staticheadcal.html','steamflow.html','temperaturesensorlag.html','tempsensorresponse.html','thermocouplecjccalculator.html','thermocoupleextensioncable.html','thermowell-wake.html','thermowellwakefreq.html','turndown.html','ultrasoniclevel.html','valvecavitationcalculator.html','valve-cv.html','vibrationtransmitter.html','wetlegdensitycompensation.html','wirelesshart.html','zoneclassificationhelper.html','folink.html','thermocouplecolor.html','unit-converter-instrumentation.html'].map(f => f.toLowerCase());
const mechanicalFiles = ['air-flow-duct.html','aircompressorfad.html','allowable-stress-safety-factor.html','asme-vessel.html','beam-deflection.html','bearinglife.html','belt-pulley.html','bernoulli-equation.html','boiler-efficiency.html','bolt-torque.html','chiller-capacity.html','compressor-power.html','conduction-convection-radiation.html','controlvalveactuator.html','cooling-tower-sizing.html','corrosion-rate.html','darcy-weisbach.html','fan-laws.html','fatigue.html','finned-tube-heat-transfer.html','foundation.html','frictionfactortool.html','fuel-combustion.html','furnace-heat-duty.html','gas-laws.html','gas.html','gear-design.html','hardness.html','heat-exchanger.html','heat-loss-pipes.html','hydroliccylinder.html','jacketed-vessel-heat-transfer.html','machining.html','material-compatibility.html','metalweight.html','momentofinertia.html','nozzle-reinforcement.html','nptbspthreadcalculator.html','openchannelflow.html','oring.html','overall-heat-transfer.html','pipe-flow.html','pipe-stress-flexibility.html','pipescheduletool.html','psychrometric.html','pump-head.html','pump-power.html','reynolds-number.html','shaft-power-torque.html','specific-heat-enthalpy.html','spring.html','steam-table.html','storage-tank-volume.html','thermal-expansion.html','vibrationanalysis.html','weldingstress.html','unit-converter-mechanical.html'].map(f => f.toLowerCase());

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
        return { name: "Electrical Tools", url: "https://designcalculators.co.in/indexele" };
    } else if (instrumentationFiles.includes(lowerFile)) {
        return { name: "Instrumentation Tools", url: "https://designcalculators.co.in/indexinst" };
    } else if (mechanicalFiles.includes(lowerFile)) {
        return { name: "Mechanical Tools", url: "https://designcalculators.co.in/indexmech" };
    } else if (lowerFile.startsWith('article')) {
        return { name: "Engineering Articles", url: "https://designcalculators.co.in/#articles" };
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

        const cleanName = file.replace('.html', '');
        const fullUrl = `https://designcalculators.co.in/${cleanName}`;

        // 2. Construct JSON-LD
        const jsonLd = {
            "@context": "https://schema.org",
            "@graph": [
                {
                    "@type": "SoftwareApplication",
                    "name": title,
                    "url": fullUrl,
                    "description": description,
                    "applicationCategory": "UtilityApplication",
                    "operatingSystem": "Web",
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
