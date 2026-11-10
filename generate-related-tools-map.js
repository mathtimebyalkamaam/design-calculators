const fs = require('fs');
const path = require('path');

// Hand-tuned clusters covering specific engineering disciplines
const clusters = {
  // Steam & Thermodynamics
  'steamflow.html': ['valve-cv.html', 'pipe-flow.html', 'steam-table.html'],
  'steam-table.html': ['steamflow.html', 'boiler-efficiency.html', 'specific-heat-enthalpy.html'],
  'boiler-efficiency.html': ['fuel-combustion.html', 'steam-table.html', 'steamflow.html'],
  'fuel-combustion.html': ['boiler-efficiency.html', 'furnace-heat-duty.html', 'specific-heat-enthalpy.html'],
  'furnace-heat-duty.html': ['fuel-combustion.html', 'heat-exchanger.html', 'conduction-convection-radiation.html'],
  'specific-heat-enthalpy.html': ['steam-table.html', 'fuel-combustion.html', 'conduction-convection-radiation.html'],

  // Valves & Control
  'valve-cv.html': ['controlvalvenoise.html', 'valvecavitationcalculator.html', 'controlvalveauthority.html'],
  'controlvalveauthority.html': ['valve-cv.html', 'controlvalveactuator.html', 'controlvalveleakage.html'],
  'controlvalveleakage.html': ['valve-cv.html', 'controlvalvenoise.html', 'controlvalveactuator.html'],
  'controlvalvenoise.html': ['valve-cv.html', 'valvecavitationcalculator.html', 'controlvalveleakage.html'],
  'valvecavitationcalculator.html': ['valve-cv.html', 'controlvalvenoise.html', 'controlvalveauthority.html'],
  'controlvalveactuator.html': ['valve-cv.html', 'controlvalveauthority.html', 'controlvalveleakage.html'],
  'pressurereliefvalve.html': ['valve-cv.html', 'asme-vessel.html', 'pipe-flow.html'],
  'control-valve-cavitation-vs-flashing-prevention-guide.html': ['valve-cv.html', 'valvecavitationcalculator.html', 'controlvalvenoise.html'],

  // Piping & Hydraulics
  'pipe-flow.html': ['darcy-weisbach.html', 'reynolds-number.html', 'pipescheduletool.html'],
  'darcy-weisbach.html': ['pipe-flow.html', 'frictionfactortool.html', 'reynolds-number.html'],
  'frictionfactortool.html': ['darcy-weisbach.html', 'pipe-flow.html', 'reynolds-number.html'],
  'reynolds-number.html': ['pipe-flow.html', 'darcy-weisbach.html', 'bernoulli-equation.html'],
  'bernoulli-equation.html': ['pipe-flow.html', 'dp-flow-conversion.html', 'reynolds-number.html'],
  'pipescheduletool.html': ['pipe-flow.html', 'pipe-stress-flexibility.html', 'asme-vessel.html'],
  'pipe-stress-flexibility.html': ['pipescheduletool.html', 'thermal-expansion.html', 'beam-deflection.html'],
  'water-hammer-joukowsky-equation-pipe-surge-analysis.html': ['pipe-flow.html', 'darcy-weisbach.html', 'pressuretransmitteroverrange.html'],
  'openchannelflow.html': ['pipe-flow.html', 'darcy-weisbach.html', 'reynolds-number.html'],

  // DP & Flow Measurement
  'dp-flow-conversion.html': ['orifice-flow.html', 'orifice-plate.html', 'turndown.html'],
  'orifice-flow.html': ['dp-flow-conversion.html', 'orifice-plate.html', 'flowprofiledistortioncalculator.html'],
  'orifice-plate.html': ['orifice-flow.html', 'dp-flow-conversion.html', 'flowprofiledistortioncalculator.html'],
  'flowprofiledistortioncalculator.html': ['orifice-flow.html', 'dp-flow-conversion.html', 'orifice-plate.html'],
  'turndown.html': ['dp-flow-conversion.html', 'orifice-flow.html', 'signal-scaling.html'],

  // Heat Transfer & HVAC
  'heat-exchanger.html': ['heat-loss-pipes.html', 'overall-heat-transfer.html', 'finned-tube-heat-transfer.html'],
  'heat-loss-pipes.html': ['heat-exchanger.html', 'thermal-expansion.html', 'pipe-flow.html'],
  'overall-heat-transfer.html': ['heat-exchanger.html', 'finned-tube-heat-transfer.html', 'jacketed-vessel-heat-transfer.html'],
  'finned-tube-heat-transfer.html': ['heat-exchanger.html', 'overall-heat-transfer.html', 'conduction-convection-radiation.html'],
  'jacketed-vessel-heat-transfer.html': ['heat-exchanger.html', 'storage-tank-volume.html', 'overall-heat-transfer.html'],
  'conduction-convection-radiation.html': ['heat-exchanger.html', 'heat-loss-pipes.html', 'specific-heat-enthalpy.html'],
  'cooling-tower-sizing.html': ['psychrometric.html', 'heat-exchanger.html', 'chiller-capacity.html'],
  'chiller-capacity.html': ['cooling-tower-sizing.html', 'psychrometric.html', 'hvac-sizing.html'],
  'hvac-sizing.html': ['air-flow-duct.html', 'chiller-capacity.html', 'fan-laws.html'],
  'air-flow-duct.html': ['fan-laws.html', 'hvac-sizing.html', 'darcy-weisbach.html'],
  'fan-laws.html': ['air-flow-duct.html', 'hvac-sizing.html', 'pump-head.html'],
  'psychrometric.html': ['cooling-tower-sizing.html', 'chiller-capacity.html', 'hvac-sizing.html'],

  // Electrical Power & Cables
  'voltage-drop.html': ['cable-sizing.html', 'breaker-sizing.html', 'short-circuit.html'],
  'cable-sizing.html': ['voltage-drop.html', 'cable-thermal-rating.html', 'breaker-sizing.html'],
  'cable-thermal-rating.html': ['cable-sizing.html', 'voltage-drop.html', 'earth-conductor-size.html'],
  'cablepulling.html': ['conduit-fill.html', 'cable-sizing.html', 'voltage-drop.html'],
  'conduit-fill.html': ['cablepulling.html', 'cable-sizing.html', 'voltage-drop.html'],
  'solarcable.html': ['solarpvarray.html', 'cable-sizing.html', 'voltage-drop.html'],
  'solarpvarray.html': ['solarcable.html', 'battery-sizing.html', 'voltage-drop.html'],
  'breaker-sizing.html': ['short-circuit.html', 'protection-device.html', 'relay-coordination.html'],
  'short-circuit.html': ['breaker-sizing.html', 'busbarshortcircuit.html', 'arcflash.html'],
  'arcflash.html': ['short-circuit.html', 'breaker-sizing.html', 'relay-coordination.html'],
  'protection-device.html': ['breaker-sizing.html', 'relay-coordination.html', 'equipment-relay.html'],
  'relay-coordination.html': ['equipment-relay.html', 'breaker-sizing.html', 'short-circuit.html'],
  'equipment-relay.html': ['relay-coordination.html', 'ctsaturation.html', 'protection-device.html'],
  'ctsaturation.html': ['equipment-relay.html', 'relay-coordination.html', 'short-circuit.html'],
  'busbarampacity.html': ['busbarshortcircuit.html', 'skindepth.html', 'cable-sizing.html'],
  'busbarshortcircuit.html': ['busbarampacity.html', 'short-circuit.html', 'arcflash.html'],
  'transformer-calculator.html': ['transformerinrush.html', 'generatorsizing.html', 'short-circuit.html'],
  'transformerinrush.html': ['transformer-calculator.html', 'breaker-sizing.html', 'relay-coordination.html'],
  'generatorsizing.html': ['motor-starting.html', 'power-factor.html', 'transformer-calculator.html'],
  'power-factor.html': ['powertriangletool.html', 'harmonic-distortion.html', 'harmonicsanalyser.html'],
  'powertriangletool.html': ['power-factor.html', 'harmonic-distortion.html', 'generatorsizing.html'],
  'harmonic-distortion.html': ['harmonicsanalyser.html', 'power-factor.html', 'vfd-selection.html'],
  'harmonicsanalyser.html': ['harmonic-distortion.html', 'power-factor.html', 'skindepth.html'],
  'symmetricalcomponents.html': ['short-circuit.html', 'neutral-earth-fault-current.html', 'systemxrcalculator.html'],
  'systemxrcalculator.html': ['short-circuit.html', 'symmetricalcomponents.html', 'breaker-sizing.html'],
  'neutral-earth-fault-current.html': ['earthingfaultsimulator.html', 'earth-conductor-size.html', 'symmetricalcomponents.html'],
  'transmissionline.html': ['voltage-drop.html', 'skindepth.html', 'power-factor.html'],
  'skindepth.html': ['busbarampacity.html', 'transmissionline.html', 'lcresonancecalculator.html'],
  'electricalresidentialload.html': ['breaker-sizing.html', 'cable-sizing.html', 'voltage-drop.html'],
  'industriallighting.html': ['lighting-calulator.html', 'cable-sizing.html', 'voltage-drop.html'],
  'lighting-calulator.html': ['industriallighting.html', 'cable-sizing.html', 'voltage-drop.html'],
  'insulationresistance.html': ['earth-conductor-size.html', 'cable-sizing.html', 'grounding.html'],

  // Grounding & Earthing
  'grounding.html': ['earth-conductor-size.html', 'earthingfaultsimulator.html', 'ieee-80-substation-grounding-design-step-touch-potential.html'],
  'earth-conductor-size.html': ['grounding.html', 'earthingfaultsimulator.html', 'cable-thermal-rating.html'],
  'earthingfaultsimulator.html': ['grounding.html', 'earth-conductor-size.html', 'neutral-earth-fault-current.html'],
  'ieee-80-substation-grounding-design-step-touch-potential.html': ['grounding.html', 'earth-conductor-size.html', 'earthingfaultsimulator.html'],

  // Battery & UPS
  'battery-sizing.html': ['batterychargersizing.html', 'batterycharging.html', 'ups-sizing.html'],
  'batterychargersizing.html': ['battery-sizing.html', 'batterycharging.html', 'ups-sizing.html'],
  'batterycharging.html': ['battery-sizing.html', 'batterychargersizing.html', 'batterylife.html'],
  'batterylife.html': ['battery-sizing.html', 'batterycharging.html', 'ups-sizing.html'],
  'ups-sizing.html': ['battery-sizing.html', 'batterychargersizing.html', 'generatorsizing.html'],

  // Rotating Equipment & Drives
  'motor-starting.html': ['vfd-selection.html', 'motor-efficiency.html', 'generatorsizing.html'],
  'motor-efficiency.html': ['motor-starting.html', 'vfd-selection.html', 'shaft-power-torque.html'],
  'vfd-selection.html': ['motor-starting.html', 'harmonic-distortion.html', 'pump-power.html'],
  'pump-power.html': ['pump-head.html', 'motor-efficiency.html', 'vfd-selection.html'],
  'pump-head.html': ['pump-power.html', 'darcy-weisbach.html', 'pipe-flow.html'],
  'shaft-power-torque.html': ['motor-efficiency.html', 'belt-pulley.html', 'gear-design.html'],
  'belt-pulley.html': ['gear-design.html', 'shaft-power-torque.html', 'bearinglife.html'],
  'gear-design.html': ['belt-pulley.html', 'shaft-power-torque.html', 'bearinglife.html'],
  'bearinglife.html': ['vibrationanalysis.html', 'shaft-power-torque.html', 'gear-design.html'],
  'vibrationanalysis.html': ['vibrationtransmitter.html', 'bearinglife.html', 'shaft-power-torque.html'],
  'vibrationtransmitter.html': ['vibrationanalysis.html', 'signal-scaling.html', 'bearinglife.html'],
  'aircompressorfad.html': ['compressor-power.html', 'air-flow-duct.html', 'pipe-flow.html'],
  'compressor-power.html': ['aircompressorfad.html', 'gascompressibility.html', 'pump-power.html'],

  // Level Measurement
  'dp-level.html': ['hydrostatic-level.html', 'sealfluidzeroshift.html', 'wetlegdensitycompensation.html'],
  'hydrostatic-level.html': ['dp-level.html', 'staticheadcal.html', 'storage-tank-volume.html'],
  'capacitance-level.html': ['ultrasoniclevel.html', 'dp-level.html', 'signal-scaling.html'],
  'ultrasoniclevel.html': ['capacitance-level.html', 'hydrostatic-level.html', 'storage-tank-volume.html'],
  'staticheadcal.html': ['dp-level.html', 'hydrostatic-level.html', 'sealfluidzeroshift.html'],
  'sealfluidzeroshift.html': ['dp-level.html', 'wetlegdensitycompensation.html', 'capillarylengthtemperatureerror.html'],
  'wetlegdensitycompensation.html': ['dp-level.html', 'sealfluidzeroshift.html', 'staticheadcal.html'],
  'storage-tank-volume.html': ['hydrostatic-level.html', 'asme-vessel.html', 'dp-level.html'],

  // Temperature Measurement
  'rtd-tc-conversion.html': ['rtdexcitationcurrentselection.html', 'thermocouplecjccalculator.html', 'thermocouplecolor.html'],
  'rtdexcitationcurrentselection.html': ['rtdselfheating.html', 'rtd-lead-comp.html', 'rtd-tc-conversion.html'],
  'rtdselfheating.html': ['rtdexcitationcurrentselection.html', 'rtd-lead-comp.html', 'temperaturesensorlag.html'],
  'rtd-lead-comp.html': ['rtdexcitationcurrentselection.html', 'rtd-tc-conversion.html', 'signal-scaling.html'],
  'thermocouplecjccalculator.html': ['thermocouplecolor.html', 'thermocoupleextensioncable.html', 'rtd-tc-conversion.html'],
  'thermocouplecolor.html': ['thermocoupleextensioncable.html', 'thermocouplecjccalculator.html', 'rtd-tc-conversion.html'],
  'thermocoupleextensioncable.html': ['thermocouplecolor.html', 'thermocouplecjccalculator.html', 'rtd-lead-comp.html'],
  'thermowell-wake.html': ['thermowellwakefreq.html', 'temperaturesensorlag.html', 'tempsensorresponse.html'],
  'thermowellwakefreq.html': ['thermowell-wake.html', 'temperaturesensorlag.html', 'darcy-weisbach.html'],
  'temperaturesensorlag.html': ['tempsensorresponse.html', 'thermowell-wake.html', 'thermowellwakefreq.html'],
  'tempsensorresponse.html': ['temperaturesensorlag.html', 'thermowell-wake.html', 'rtdselfheating.html'],
  'capillarylengthtemperatureerror.html': ['sealfluidzeroshift.html', 'dp-level.html', 'pressuretransmitteroverrange.html'],

  // Instrumentation, Signals & Networks
  'signal-scaling.html': ['instrument-range.html', 'measurement.html', 'adc-resolution.html'],
  'instrument-range.html': ['signal-scaling.html', 'measurement.html', 'turndown.html'],
  'measurement.html': ['signal-scaling.html', 'instrument-range.html', 'snr-calculator.html'],
  'adc-resolution.html': ['snr-calculator.html', 'signal-scaling.html', 'baud-rate.html'],
  'snr-calculator.html': ['adc-resolution.html', 'dbcalculator.html', 'signal-scaling.html'],
  'dbcalculator.html': ['folink.html', 'snr-calculator.html', 'comm-cable-loss.html'],
  'folink.html': ['dbcalculator.html', 'comm-cable-loss.html', 'baud-rate.html'],
  'comm-cable-loss.html': ['folink.html', 'dbcalculator.html', 'transmissionline.html'],
  'baud-rate.html': ['plcscantime.html', 'plc-pid-jitter-impact.html', 'profibus.html'],
  'plcscantime.html': ['plc-pid-jitter-impact.html', 'baud-rate.html', 'pid-tuning.html'],
  'plc-pid-jitter-impact.html': ['plcscantime.html', 'pid-tuning.html', 'baud-rate.html'],
  'pid-tuning.html': ['plc-pid-jitter-impact.html', 'pid-symbol-library.html', 'controlvalveauthority.html'],
  'pid-symbol-library.html': ['pid-tuning.html', 'valve-cv.html', 'instrument-range.html'],
  'hartdevices.html': ['loop-impedance.html', 'power-supply-load.html', 'wirelesshart.html'],
  'loop-impedance.html': ['hartdevices.html', 'power-supply-load.html', 'intrinsic-safety.html'],
  'power-supply-load.html': ['loop-impedance.html', 'hartdevices.html', 'junctionbox.html'],
  'intrinsic-safety.html': ['zoneclassificationhelper.html', 'loop-impedance.html', 'hartdevices.html'],
  'zoneclassificationhelper.html': ['intrinsic-safety.html', 'nemaipconvertor.html', 'junctionbox.html'],
  'junctionbox.html': ['power-supply-load.html', 'zoneclassificationhelper.html', 'nemaipconvertor.html'],
  'nemaipconvertor.html': ['zoneclassificationhelper.html', 'junctionbox.html', 'instrument-range.html'],
  'profibus.html': ['foundation.html', 'baud-rate.html', 'hartdevices.html'],
  'foundation.html': ['profibus.html', 'hartdevices.html', 'loop-impedance.html'],
  'wirelesshart.html': ['hartdevices.html', 'folink.html', 'dbcalculator.html'],
  'pressuretransmitteroverrange.html': ['impulse-pressure-drop.html', 'capillarylengthtemperatureerror.html', 'water-hammer-joukowsky-equation-pipe-surge-analysis.html'],
  'impulse-pressure-drop.html': ['pressuretransmitteroverrange.html', 'impulselinefreezing.html', 'darcy-weisbach.html'],
  'impulselinefreezing.html': ['impulse-pressure-drop.html', 'heat-loss-pipes.html', 'sealfluidzeroshift.html'],
  'sil.html': ['protection-device.html', 'relay-coordination.html', 'valve-cv.html'],
  'ph-temp-comp.html': ['signal-scaling.html', 'instrument-range.html', 'rtd-tc-conversion.html'],

  // Mechanical Structures & Materials
  'asme-vessel.html': ['nozzle-reinforcement.html', 'storage-tank-volume.html', 'allowable-stress-safety-factor.html'],
  'nozzle-reinforcement.html': ['asme-vessel.html', 'weldingstress.html', 'storage-tank-volume.html'],
  'allowable-stress-safety-factor.html': ['asme-vessel.html', 'beam-deflection.html', 'bolt-torque.html'],
  'beam-deflection.html': ['momentofinertia.html', 'allowable-stress-safety-factor.html', 'fatigue.html'],
  'momentofinertia.html': ['beam-deflection.html', 'metalweight.html', 'shaft-power-torque.html'],
  'bolt-torque.html': ['weldingstress.html', 'allowable-stress-safety-factor.html', 'oring.html'],
  'weldingstress.html': ['bolt-torque.html', 'nozzle-reinforcement.html', 'asme-vessel.html'],
  'oring.html': ['nptbspthreadcalculator.html', 'bolt-torque.html', 'pressurereliefvalve.html'],
  'nptbspthreadcalculator.html': ['oring.html', 'pipescheduletool.html', 'pressuretransmitteroverrange.html'],
  'spring.html': ['fatigue.html', 'allowable-stress-safety-factor.html', 'hardness.html'],
  'fatigue.html': ['spring.html', 'beam-deflection.html', 'allowable-stress-safety-factor.html'],
  'hardness.html': ['metalweight.html', 'corrosion-rate.html', 'material-compatibility.html'],
  'corrosion-rate.html': ['material-compatibility.html', 'asme-vessel.html', 'hardness.html'],
  'material-compatibility.html': ['corrosion-rate.html', 'hardness.html', 'valve-cv.html'],
  'metalweight.html': ['momentofinertia.html', 'hardness.html', 'pipescheduletool.html'],
  'machining.html': ['metalweight.html', 'hardness.html', 'shaft-power-torque.html'],
  'thermal-expansion.html': ['pipe-stress-flexibility.html', 'heat-loss-pipes.html', 'asme-vessel.html'],
  'gascompressibility.html': ['gas-laws.html', 'steamflow.html', 'compressor-power.html'],
  'gas-laws.html': ['gascompressibility.html', 'compressor-power.html', 'bernoulli-equation.html'],
  'hydroliccylinder.html': ['pump-power.html', 'shaft-power-torque.html', 'pipe-flow.html'],
  'gas.html': ['gascompressibility.html', 'gas-laws.html', 'compressor-power.html'],

  // Electronics & Conversion
  'unit-converter.html': ['unit-converter-instrumentation.html', 'unit-converter-mechanical.html', 'ohms-law.html'],
  'unit-converter-instrumentation.html': ['unit-converter.html', 'unit-converter-mechanical.html', 'signal-scaling.html'],
  'unit-converter-mechanical.html': ['unit-converter.html', 'unit-converter-instrumentation.html', 'pipe-flow.html'],
  'ohms-law.html': ['resistor.html', 'voltage-drop.html', 'short-circuit.html'],
  'resistor.html': ['ohms-law.html', 'pcbtrace.html', 'lcresonancecalculator.html'],
  'pcbtrace.html': ['resistor.html', 'cable-thermal-rating.html', 'skindepth.html'],
  'lcresonancecalculator.html': ['resistor.html', 'harmonicsanalyser.html', 'power-factor.html'],
  'logicgate.html': ['plcscantime.html', 'baud-rate.html', 'adc-resolution.html'],

  // Guides, Hubs, and Templates
  'engineering-excel-calculation-templates.html': ['pipe-flow.html', 'cable-sizing.html', 'valve-cv.html'],
  'engineering-glossary.html': ['unit-converter.html', 'pid-symbol-library.html', 'instrument-range.html'],
  'maintenance-guide.html': ['bearinglife.html', 'vibrationanalysis.html', 'allowable-stress-safety-factor.html'],
  'electrical-calculators.html': ['cable-sizing.html', 'voltage-drop.html', 'short-circuit.html'],
  'mechanical-calculators.html': ['pipe-flow.html', 'asme-vessel.html', 'pump-head.html'],
  'instrumentation-calculators.html': ['signal-scaling.html', 'rtd-tc-conversion.html', 'valve-cv.html'],
  'indexele.html': ['cable-sizing.html', 'voltage-drop.html', 'short-circuit.html'],
  'indexmech.html': ['pipe-flow.html', 'asme-vessel.html', 'pump-head.html'],
  'indexinst.html': ['signal-scaling.html', 'rtd-tc-conversion.html', 'valve-cv.html'],
  'index.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'faq.html': ['engineering-glossary.html', 'unit-converter.html', 'engineering-excel-calculation-templates.html'],

  // Legal and Info pages
  'about.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'contact.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'license.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'privacy-policy.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'sitemap2.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],
  'terms-of-service.html': ['cable-sizing.html', 'pipe-flow.html', 'valve-cv.html'],

  // Articles
  'article-arcflash.html': ['arcflash.html', 'short-circuit.html', 'breaker-sizing.html'],
  'article-asmepressure.html': ['asme-vessel.html', 'nozzle-reinforcement.html', 'allowable-stress-safety-factor.html'],
  'articlecontrolvalve.html': ['valve-cv.html', 'controlvalveauthority.html', 'controlvalvenoise.html'],
  'articlecontrolvalvesizing.html': ['valve-cv.html', 'controlvalveactuator.html', 'valvecavitationcalculator.html'],
  'articlegroundingdesign.html': ['grounding.html', 'earth-conductor-size.html', 'earthingfaultsimulator.html'],
  'articleharmonic.html': ['harmonic-distortion.html', 'harmonicsanalyser.html', 'power-factor.html'],
  'articleheatexchanger.html': ['heat-exchanger.html', 'overall-heat-transfer.html', 'heat-loss-pipes.html'],
  'articlehvacduct.html': ['air-flow-duct.html', 'fan-laws.html', 'hvac-sizing.html'],
  'articleiec60364.html': ['cable-sizing.html', 'earth-conductor-size.html', 'voltage-drop.html'],
  'articlemotorstarting.html': ['motor-starting.html', 'generatorsizing.html', 'vfd-selection.html'],
  'articleorificeplate.html': ['orifice-plate.html', 'orifice-flow.html', 'dp-flow-conversion.html'],
  'articlepidtuning.html': ['pid-tuning.html', 'plc-pid-jitter-impact.html', 'controlvalveauthority.html'],
  'articlepipingheadloss.html': ['darcy-weisbach.html', 'pipe-flow.html', 'pump-head.html'],
  'articlepumpselection.html': ['pump-head.html', 'pump-power.html', 'motor-efficiency.html'],
  'articlepumpsizing.html': ['pump-head.html', 'pump-power.html', 'pipe-flow.html'],
  'articles.html': ['valve-cv.html', 'cable-sizing.html', 'pipe-flow.html'],
  'articlesil.html': ['sil.html', 'protection-device.html', 'relay-coordination.html'],
  'articlesvoltagedrop.html': ['voltage-drop.html', 'cable-sizing.html', 'short-circuit.html'],
  'articlethermowell.html': ['thermowell-wake.html', 'thermowellwakefreq.html', 'temperaturesensorlag.html']
};

// Validate all keys and targets
const allHtmlFiles = new Set(fs.readdirSync('.').filter(f => f.endsWith('.html')));
let validationErrors = 0;

for (const [source, targets] of Object.entries(clusters)) {
  if (!allHtmlFiles.has(source)) {
    console.error(`[ERROR] Source file "${source}" does not exist in directory.`);
    validationErrors++;
  }
  if (!Array.isArray(targets) || targets.length !== 3) {
    console.error(`[ERROR] Source "${source}" must have exactly 3 targets, got ${targets ? targets.length : 0}`);
    validationErrors++;
  }
  const uniqueTargets = new Set(targets);
  if (uniqueTargets.size !== 3) {
    console.error(`[ERROR] Source "${source}" has duplicate targets:`, targets);
    validationErrors++;
  }
  if (targets.includes(source)) {
    console.error(`[ERROR] Source "${source}" targets itself!`);
    validationErrors++;
  }
  for (const t of targets) {
    if (!allHtmlFiles.has(t)) {
      console.error(`[ERROR] Source "${source}" targets non-existent file "${t}"`);
      validationErrors++;
    }
  }
}

console.log(`Scanned ${allHtmlFiles.size} HTML files in root.`);
console.log(`Clustered ${Object.keys(clusters).length} files.`);
console.log(`Validation errors: ${validationErrors}`);

if (validationErrors === 0) {
  // Sort keys alphabetically for clean, deterministic JSON output
  const sortedMap = {};
  Object.keys(clusters).sort().forEach(k => {
    sortedMap[k] = clusters[k];
  });

  fs.writeFileSync('related-tools-map.json', JSON.stringify(sortedMap, null, 2), 'utf8');
  console.log(`Successfully generated related-tools-map.json with ${Object.keys(sortedMap).length} entries!`);
} else {
  process.exit(1);
}

