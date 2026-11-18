'use strict';
/* ভাইভা প্র্যাকটিসের নমুনা সেট (প্রথম চালুর সময় একবার বসে)।
   এগুলো সাধারণ পাঠ্যবই-মানের নমুনা। আসল ভাইভায় শিক্ষক যেভাবে ধাপে ধাপে প্রশ্ন করেন, অ্যাডমিন → ভাইভা প্রশ্ন ট্যাবে
   সেই ক্রমে নিজেদের প্রশ্ন ও উত্তর বসান, তাহলে এই নমুনা বদলে যাবে। */
let id = 900000;
const set = (c, title, steps) => ({ id: ++id, c, title, qs: steps.map(s => ({ stage: s[0], q: s[1], a: s[2], t: s[3] || 60, m: s[4] == null ? 5 : s[4], f: !!s[5] })) });
const intro = ['পরিচয়', 'আপনার নাম, রোল ও ব্যাচ বলুন।', 'Assalamu alaikum sir. My name is ___, roll ___, batch ___, Department of Genetic Engineering and Biotechnology, SUST. (শান্তভাবে, স্পষ্ট করে, এক বাক্যে বলুন।)', 20, 0];
module.exports = [
  set('GEB121', 'GEB 121: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'Biotechnology কী?', 'Biotechnology is the use of living organisms, cells or their components to make products or processes useful to humans, for example vaccines, enzymes, fermented foods and GM crops.', 45, 5],
    ['মূল প্রশ্ন', 'Restriction enzyme কী? একটি উদাহরণ দিন।', 'Restriction enzymes are bacterial enzymes that cut DNA at specific recognition sequences. EcoRI is an example; it recognises GAATTC and cuts between G and A, leaving sticky ends.', 60, 5],
    ['ফলো-আপ', 'Sticky end আর blunt end-এর পার্থক্য কী?', 'Sticky ends have single-stranded overhangs that can base-pair with a complementary overhang, so ligation is easier. Blunt ends have no overhang, so ligation is less efficient.', 45, 5, true],
    ['মূল প্রশ্ন', 'Vector কাকে বলে? ভালো cloning vector-এর বৈশিষ্ট্য বলুন।', 'A vector is a DNA molecule that carries a foreign gene into a host cell. A good cloning vector has an origin of replication, a selectable marker such as an antibiotic resistance gene, a multiple cloning site, and is small in size.', 60, 5],
    ['ফলো-আপ', 'Plasmid ছাড়া আর কী কী vector আছে?', 'Bacteriophage lambda, cosmid, BAC, YAC, and viral vectors for animal cells.', 30, 3, true],
    ['শেষ প্রশ্ন', 'Biosafety কেন গুরুত্বপূর্ণ?', 'Biosafety prevents accidental harm to people and the environment from genetically modified or pathogenic organisms, through risk assessment, containment and proper waste handling.', 45, 5]
  ]),
  set('MCB127', 'MCB 127: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'Prokaryote আর eukaryote-এর মূল পার্থক্য কী?', 'Prokaryotes have no true nucleus or membrane-bound organelles, and DNA lies in the nucleoid. Eukaryotes have a nucleus and organelles like mitochondria.', 45, 5],
    ['মূল প্রশ্ন', 'Gram staining-এর নীতি কী?', 'Gram staining separates bacteria by cell wall. Gram-positive cells have thick peptidoglycan and retain crystal violet, so they look purple. Gram-negative cells lose it with the decolourizer and take the safranin counterstain, so they look pink.', 60, 5],
    ['ফলো-আপ', 'Decolourizer বেশি সময় দিলে কী হবে?', 'Gram-positive cells may be over-decolourized and appear pink, which is a false Gram-negative result.', 30, 3, true],
    ['মূল প্রশ্ন', 'Streak plate method কেন করা হয়?', 'To get isolated single colonies, each from one cell, so a pure culture can be obtained.', 45, 5],
    ['মূল প্রশ্ন', 'Bacterial growth curve-এর ধাপগুলো বলুন।', 'Lag phase, log or exponential phase, stationary phase and death or decline phase.', 45, 5],
    ['শেষ প্রশ্ন', 'Sterilization আর disinfection-এর পার্থক্য কী?', 'Sterilization destroys all microorganisms including spores. Disinfection reduces or removes pathogens on non-living surfaces but may not kill spores.', 45, 5]
  ]),
  set('PLS125', 'PLS 125: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'Photosynthesis কী?', 'Photosynthesis is the process by which plants use light energy, carbon dioxide and water to make glucose and release oxygen. It occurs in chloroplasts.', 45, 5],
    ['মূল প্রশ্ন', 'Light reaction আর dark reaction কোথায় ঘটে?', 'Light reactions occur in the thylakoid membranes, and the dark reaction or Calvin cycle occurs in the stroma of the chloroplast.', 45, 5],
    ['ফলো-আপ', 'Calvin cycle-এর প্রথম স্থায়ী পণ্য কী?', 'The first stable product is 3-phosphoglycerate (3-PGA), made when RuBisCO fixes CO2 onto RuBP.', 30, 3, true],
    ['মূল প্রশ্ন', 'Stomata-র কাজ কী?', 'Stomata allow gas exchange and transpiration. Guard cells control their opening and closing.', 40, 5],
    ['শেষ প্রশ্ন', 'Plant hormone-এর নাম বলুন ও একটির কাজ বলুন।', 'Auxin, gibberellin, cytokinin, abscisic acid, ethylene. For example auxin promotes cell elongation and apical dominance.', 45, 5]
  ]),
  set('ANS123', 'ANS 123: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'Ruminant কাদের বলে? উদাহরণ দিন।', 'Ruminants are herbivorous mammals with a four-chambered stomach that ferment plant food and chew cud, for example cattle, goat and sheep.', 45, 5],
    ['মূল প্রশ্ন', 'Ruminant-এর পাকস্থলীর চারটি অংশের নাম বলুন।', 'Rumen, reticulum, omasum and abomasum. The abomasum is the true stomach.', 40, 5],
    ['ফলো-আপ', 'Rumen-এ কোন জীবাণু কাজ করে?', 'Bacteria, protozoa and fungi digest cellulose and produce volatile fatty acids.', 30, 3, true],
    ['মূল প্রশ্ন', 'Artificial insemination কী?', 'It is the deliberate placement of collected semen into the female reproductive tract by a technician instead of natural mating. It helps spread superior genetics.', 45, 5],
    ['শেষ প্রশ্ন', 'Livestock-এ vaccination কেন দেওয়া হয়?', 'To build immunity against infectious diseases, reduce losses and prevent outbreaks and spread to humans.', 40, 5]
  ]),
  set('CHE101', 'CHE 101: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'pH কী?', 'pH is the negative logarithm of the hydrogen ion concentration: pH = -log[H+]. It measures acidity or basicity.', 40, 5],
    ['মূল প্রশ্ন', 'Buffer solution কী? একটি উদাহরণ দিন।', 'A buffer resists a change in pH when small amounts of acid or base are added. Example: acetic acid and sodium acetate.', 50, 5],
    ['ফলো-আপ', 'Henderson-Hasselbalch সমীকরণটি বলুন।', 'pH = pKa + log([A-]/[HA]).', 30, 3, true],
    ['মূল প্রশ্ন', 'Le Chatelier\'s principle কী?', 'If a system at equilibrium is disturbed, it shifts in the direction that opposes the change.', 45, 5],
    ['শেষ প্রশ্ন', 'Molarity আর molality-র পার্থক্য কী?', 'Molarity is moles of solute per litre of solution. Molality is moles of solute per kilogram of solvent, and it does not change with temperature.', 45, 5]
  ]),
  set('SSS100', 'SSS 100: নমুনা ভাইভা ১', [
    intro,
    ['ওয়ার্ম-আপ', 'বাংলাদেশের স্বাধীনতা দিবস কবে ও কেন?', '২৬ মার্চ ১৯৭১ সালে স্বাধীনতার ঘোষণার দিনটি স্বাধীনতা দিবস হিসেবে পালিত হয়।', 40, 5],
    ['মূল প্রশ্ন', 'ভাষা আন্দোলন কবে হয়েছিল এবং এর তাৎপর্য কী?', '১৯৫২ সালের ২১ ফেব্রুয়ারি। বাংলাকে রাষ্ট্রভাষা করার দাবিতে আন্দোলন, যা বাঙালি জাতীয়তাবাদের ভিত্তি গড়ে দেয়। ২১ ফেব্রুয়ারি আন্তর্জাতিক মাতৃভাষা দিবস।', 60, 5],
    ['ফলো-আপ', 'আন্তর্জাতিক মাতৃভাষা দিবস কবে স্বীকৃতি পায়?', 'ইউনেসকো ১৯৯৯ সালে স্বীকৃতি দেয়, ২০০০ সাল থেকে পালিত হয়।', 30, 3, true],
    ['শেষ প্রশ্ন', 'বিজয় দিবস কবে?', '১৬ ডিসেম্বর ১৯৭১।', 25, 3]
  ])
];
