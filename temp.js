const fs = require('fs'); 
const file = 'e:/GITHUB CODING ALKA/design-calculators/adc-resolution.html'; 
let content = fs.readFileSync(file, 'utf8'); 

const startMatch = '            <!-- NEW: Educational Section -->'; 
const endMatch = '    <!-- NEW: Footer from provided file -->'; 

const startIdx = content.indexOf(startMatch); 
const endIdx = content.indexOf(endMatch); 

if (startIdx === -1 || endIdx === -1) {
    console.error("Tags not found");
    process.exit(1);
}

const preChunk = content.substring(0, startIdx); 
const postChunk = content.substring(endIdx); 

const injection = `            <!-- EDUCATIONAL FRAMEWORK: VISUAL-FIRST DEEP DIVE -->
            <div id="education-section" class="education-section" style="margin-top: 40px; animation: fadeInUp 0.8s ease;">
                <h2><i class="fas fa-microchip"></i> Technical Deep Dive: ADC Architecture &amp; Resolution Analysis</h2>
                
                <div class="edu-grid">
                    
                    <!-- Sticky Navigation -->
                    <div class="toc-wrapper">
                        <h4>In This Section</h4>
                        <ul class="toc-list">
                            <li class="toc-item"><a href="#adc-part1"><i class="fas fa-chevron-right"></i> 1. The Architecture of Quantization</a></li>
                            <li class="toc-item"><a href="#adc-part2"><i class="fas fa-chevron-right"></i> 2. The Power of Bits (Resolution)</a></li>
                            <li class="toc-item"><a href="#adc-part3"><i class="fas fa-chevron-right"></i> 3. Accuracy vs. Resolution</a></li>
                            <li class="toc-item"><a href="#adc-part4"><i class="fas fa-chevron-right"></i> 4. The Real Enemy: Noise &amp; ENOB</a></li>
                            <li class="toc-item"><a href="#adc-part5"><i class="fas fa-chevron-right"></i> 5. ADC Topologies</a></li>
                            <li class="toc-item"><a href="#adc-part6"><i class="fas fa-chevron-right"></i> 6. Industrial Design Heuristics</a></li>
                        </ul>
                    </div>

                    <!-- Main Content Panel -->
                    <div class="edu-content">
                        
                        <!-- PART 1 -->
                        <section id="adc-part1">
                            <h3>1. The Architecture of Quantization</h3>
                            <p>An <strong>Analog-to-Digital Converter (ADC)</strong> translates continuously variable physical signals (like a smooth temperature curve) into discrete, digital "stair-steps" that a processor can understand. The physical world is <strong>continuous</strong>, but the digital realm is strictly <strong>discrete</strong>.</p>
                            
                            <div class="glass-chart-container">
                                <h5 style="text-align:center; color: var(--text); margin-top:0;">Analog Sine Wave vs Digital Quantization Approximation</h5>
                                <div style="position: relative; height: 300px; width: 100%;">
                                    <canvas id="quantizationChart"></canvas>
                                </div>
                            </div>
                            
                            <p>The <strong>Resolution</strong> dictates the height of those stairs. A 12-bit ADC must chop a 10V signal into 4,096 discrete steps. In the chart above, notice how the digital signal (red) is forced to "snap" to the nearest available step, creating a jagged approximation of the beautiful, smooth analog sine wave (blue). That difference between the blue line and red stair-step is called <strong>Quantization Error</strong>.</p>
                        </section>

                        <hr>

                        <!-- PART 2 -->
                        <section id="adc-part2">
                            <h3>2. The Power of Bits (Resolution Limits)</h3>
                            <p>The "power" of an ADC is defined by its bit depth ($N$). The exact number of discrete steps the ADC can utilize is calculated as $2^N$.</p>
                            <ul>
                                <li><strong>8-bit ADC:</strong> $2^8 = 256$ steps</li>
                                <li><strong>12-bit ADC:</strong> $2^{12} = 4,096$ steps (Standard PLC threshold)</li>
                                <li><strong>16-bit ADC:</strong> $2^{16} = 65,536$ steps (High-Resolution Control)</li>
                                <li><strong>24-bit ADC:</strong> $2^{24} = >16.7$ million steps (Precision weight/temperature systems)</li>
                            </ul>
                            
                            <p><strong>Resolution ($V_{res}$)</strong>, or the <strong>Least Significant Bit (LSB)</strong>, is the size of one of these singular steps. It is the absolute theoretical minimum change the system can recognize:</p>
                            
                            <div class="formula-block math-content" style="text-align:center; font-weight:bold; font-size: 1.2rem; padding:15px; margin:20px 0;">
                                $$V_{res} = \\frac{V_{range}}{2^N}$$
                            </div>

                            <div class="glass-chart-container">
                                <h5 style="text-align:center; color: var(--text); margin-top:0;">Exponential Decrease in Voltage Step Size by Bit Depth (Log Scale)</h5>
                                <div style="position: relative; height: 300px; width: 100%;">
                                    <canvas id="bitsChart"></canvas>
                                </div>
                            </div>
                        </section>

                        <hr>

                        <!-- PART 3 -->
                        <section id="adc-part3">
                            <h3>3. Accuracy vs. Resolution (The Grand Illusion)</h3>
                            <div class="danger-box">
                                <h4><i class="fas fa-exclamation-triangle"></i> High Resolution $\\neq$ High Accuracy</h4>
                                <p>A critical trap for junior instrumentation engineers is purchasing an extremely high-bit ADC assuming it guarantees a perfect reading.</p>
                                <ul>
                                    <li><strong>Resolution (Precision):</strong> Dictates how *small* of a change you can measure (decimal places).</li>
                                    <li><strong>Accuracy:</strong> Dictates how *true* that measurement is relative to absolute physical reality.</li>
                                </ul>
                                <p><strong>The Ruler Analogy:</strong> A cheap plastic ruler might have micro-millimeter markings printed on it (ultra-high resolution). But if the plastic warped in the sun, every single reading you take is fundamentally incorrect (terrible accuracy). ADC accuracy is physically warped by <strong>Integral Non-Linearity (INL)</strong>, <strong>Differential Non-Linearity (DNL)</strong>, and <strong>Thermal Drift</strong>.</p>
                            </div>
                        </section>

                        <hr>

                        <!-- PART 4 -->
                        <section id="adc-part4">
                            <h3>4. The Real Enemy: Noise &amp; ENOB</h3>
                            <p>In industrial environments, thermal noise, VFD harmonics, EMF interference, and PCB layout ruin perfect signals. This noise creates a chaotic "haze" over your analog input.</p>
                            <p>Because of this, theoretical resolving power is irrelevant if the LSB is smaller than the ambient noise. <strong>Effective Number of Bits (ENOB)</strong> calculates how many bits actually contain useful data rather than random chaos.</p>

                            <div class="insight-card">
                                <div style="display: flex; flex-wrap: wrap; gap: 20px; align-items: center;">
                                    <div style="flex: 1; min-width: 250px;">
                                        <h4><i class="fas fa-wave-square"></i> The Noise Floor Limit</h4>
                                        <div class="formula-block math-content" style="text-align:center; font-weight:bold;">
                                            $$ENOB = \\frac{SNR_{dB} - 1.76}{6.02}$$
                                        </div>
                                        <p style="font-size: 0.95rem;">If you buy a 16-bit ADC, but your signal is drowning in noise, your ENOB might only be 12. You paid for 16 bits, but those bottom 4 bits are just aggressively rapid-firing garbage data.</p>
                                    </div>
                                    <div style="flex: 1; min-width: 250px; text-align: center;">
                                        <svg viewBox="0 0 300 200" style="max-width: 250px; filter: drop-shadow(0px 8px 12px rgba(0,0,0,0.15));">
                                            <!-- Axis -->
                                            <line x1="20" y1="180" x2="280" y2="180" stroke="#94a3b8" stroke-width="2"/>
                                            <line x1="20" y1="20" x2="20" y2="180" stroke="#94a3b8" stroke-width="2"/>
                                            <!-- Pure Signal Box -->
                                            <rect x="50" y="40" width="80" height="140" fill="url(#blueGradEnob)" stroke="var(--secondary)" stroke-width="2" rx="4"/>
                                            <text x="90" y="100" fill="white" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Pure Signal (N bits)</text>
                                            <!-- Reality Box (Signal + Noise Floor) -->
                                            <rect x="170" y="40" width="80" height="100" fill="url(#blueGradEnob)" stroke="var(--secondary)" stroke-width="2" rx="4"/>
                                            <rect x="170" y="140" width="80" height="40" fill="url(#noisePattern)" stroke="#EF4444" stroke-width="2" rx="2"/>
                                            <text x="210" y="100" fill="white" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Usable (ENOB)</text>
                                            <text x="210" y="165" fill="#EF4444" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">Noise Floor</text>
                                            <defs>
                                                <linearGradient id="blueGradEnob" x1="0%" y1="0%" x2="0%" y2="100%">
                                                    <stop offset="0%" stop-color="var(--secondary)" />
                                                    <stop offset="100%" stop-color="var(--primary)" />
                                                </linearGradient>
                                                <pattern id="noisePattern" width="4" height="4" patternUnits="userSpaceOnUse">
                                                    <path d="M 0 0 L 4 4 M 4 0 L 0 4" stroke="#EF4444" stroke-width="1" opacity="0.6"/>
                                                </pattern>
                                            </defs>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </section>

                        <hr>

                        <!-- PART 5 -->
                        <section id="adc-part5">
                            <h3>5. ADC Topologies: Architectures</h3>
                            <p>Not all ADC silicon is fabricated equally. The industrial sphere generally relies heavily on two dominant architectures, balancing the speed vs. precision trade-off.</p>
                            
                            <div style="display: flex; flex-wrap: wrap; gap: 30px; margin-top: 30px;">
                                <div class="insight-card bg-grid" style="flex:1; min-width: 280px; margin:0;">
                                    <h4 style="justify-content:center;">SAR (Successive Approximation)</h4>
                                    <div style="text-align: center;">
                                        <svg viewBox="0 0 200 120" class="svg-schematic" style="max-width: 180px;">
                                            <rect x="75" y="10" width="50" height="20" rx="5" fill="var(--bg)" stroke="var(--secondary)" stroke-width="2"/>
                                            <text x="100" y="24" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">Is it &gt; 5V?</text>
                                            <path d="M 75 30 L 40 50" stroke="#94a3b8" stroke-width="2" fill="none"/>
                                            <path d="M 125 30 L 160 50" stroke="#94a3b8" stroke-width="2" fill="none"/>
                                            <rect x="15" y="50" width="50" height="20" rx="5" fill="var(--bg)" stroke="var(--secondary)" stroke-width="2"/>
                                            <text x="40" y="64" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">&gt; 2.5V?</text>
                                            <rect x="135" y="50" width="50" height="20" rx="5" fill="var(--bg)" stroke="var(--secondary)" stroke-width="2"/>
                                            <text x="160" y="64" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8">&gt; 7.5V?</text>
                                            <path d="M 160 70 L 160 90" stroke="#10B981" stroke-width="3" stroke-dasharray="4" fill="none"/>
                                            <circle cx="160" cy="100" r="10" fill="#10B981" />
                                            <text x="160" y="104" text-anchor="middle" font-family="sans-serif" font-size="10" fill="white" font-weight="bold">1 1 0 1</text>
                                        </svg>
                                    </div>
                                    <p style="text-align:center; font-size:0.9rem; margin-top:20px;"><strong>The "All-Rounder".</strong> Operates via binary search algorithm, predicting bit weights. Extremely fast with decent precision (12-18 bits). Foundation of almost all PLC Analog Input modules.</p>
                                </div>

                                <div class="insight-card bg-grid" style="flex:1; min-width: 280px; margin:0;">
                                    <h4 style="justify-content:center;">Delta-Sigma ($\\Delta\\Sigma$)</h4>
                                    <div style="text-align: center;">
                                        <svg viewBox="0 0 200 120" class="svg-schematic" style="max-width: 180px;">
                                            <path d="M 10 60 Q 30 10 50 60 T 90 60 T 130 60" fill="none" stroke="var(--secondary)" stroke-width="3"/>
                                            <line x1="20" y1="40" x2="20" y2="80" stroke="#F59E0B" stroke-width="2"/>
                                            <line x1="30" y1="20" x2="30" y2="80" stroke="#F59E0B" stroke-width="2"/>
                                            <line x1="40" y1="15" x2="40" y2="80" stroke="#F59E0B" stroke-width="2"/>
                                            <line x1="50" y1="25" x2="50" y2="80" stroke="#F59E0B" stroke-width="2"/>
                                            <line x1="60" y1="45" x2="60" y2="80" stroke="#F59E0B" stroke-width="2"/>
                                            <polygon points="120,20 160,50 160,70 120,100" fill="url(#funnelGrad)" stroke="var(--primary)" stroke-width="2"/>
                                            <text x="135" y="64" text-anchor="middle" font-family="sans-serif" font-size="10" fill="#94a3b8" font-weight="bold">Avg</text>
                                            <line x1="160" y1="60" x2="190" y2="60" stroke="#10B981" stroke-width="4"/>
                                            <defs>
                                                <linearGradient id="funnelGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                                    <stop offset="0%" stop-color="var(--bg)" />
                                                    <stop offset="100%" stop-color="rgba(37,99,235,0.2)" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                    </div>
                                    <p style="text-align:center; font-size:0.9rem; margin-top:20px;"><strong>The "Precision Specialist".</strong> Heavily oversamples noise at 1-bit, then uses digital decimation filters to average out exactly what the true continuous value is. Very slow but extreme resolution (24+ bits). Crucial for Load Cells &amp; RTDs.</p>
                                </div>
                            </div>
                        </section>

                        <hr>

                        <!-- PART 6 -->
                        <section id="adc-part6">
                            <h3>6. Industrial Design Heuristics</h3>
                            
                            <div class="success-box">
                                <h4><i class="fas fa-check-circle"></i> Rule 1: Always Buffer Prior to SAR</h4>
                                <p>SAR ADCs contain a sample-and-hold (S&amp;H) internal capacitor that requires rapid charging. If your sensor has a high output impedance, it won't be able to provide enough current to charge the S&amp;H capacitor in the minuscule time window given, resulting in extreme errors. Always insert an Op-Amp buffer (voltage follower) between high-impedance sensors and the ADC input.</p>
                            </div>
                            
                            <div class="success-box">
                                <h4><i class="fas fa-check-circle"></i> Rule 2: Anti-Aliasing is Non-Negotiable</h4>
                                <p>Per the Nyquist theorem, your ADC sampling rate must be at least twice the highest frequency in your signal. However, high-frequency noise beyond Nyquist will "alias" (fold back) into your baseband measurements posing as false signals. Always place an analog low-pass Anti-Aliasing Filter (AAF) <strong>before</strong> the ADC pin to physically terminate those frequencies.</p>
                            </div>

                            <div class="danger-box">
                                <h4><i class="fas fa-times-circle"></i> Rule 3: Do Not Ignore Shunt Tolerances</h4>
                                <p>When converting 4-20mA to 1-5V utilizing a 250$\\Omega$ resistor, ensure its precision perfectly complements the ADC bits. Utilizing a standard 1% tolerance resistor directly inherently destroys the accuracy of a premium 16-bit ADC module (which demands part-per-million accuracy). Use 0.1% or better instrumentation-grade resistors.</p>
                            </div>

                        </section>

                    </div>
                </div>
            </div>

    </main>

`;

fs.writeFileSync(file, preChunk + injection + postChunk); 
console.log("File updated successfully.");
