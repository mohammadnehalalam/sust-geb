/* GEB Hub: গেম জোনের ডেটা (v3.4)
   PAIRS: জিন-ম্যাচের জোড়া [টার্ম, বর্ণনা]; QUIZ: কুইজ শো ও ব্যাচ ওয়ারের MCQ [প্রশ্ন, সঠিক, ভুল১, ভুল২, ভুল৩, ব্যাখ্যা, লেভেল ১-৩];
   MUT: মিউটেশন চ্যালেঞ্জের কেস (wt = স্বাভাবিক, mut = রোগীর DNA); BADGES: [id, আইকন, নাম, শর্ত, হিসাবের কী, লক্ষ্য]; LEVELS: [XP, নাম]।
   নতুন প্রশ্ন যোগ করতে QUIZ-এর শেষে এক লাইন বসান। অপশন নিজে নিজে এলোমেলো হয়, তাই সঠিক উত্তর সবসময় ২য় ঘরে লিখুন।
   মিউটেশন কেসের DNA ক্রম শেখার জন্য সরলীকৃত; আসল জিনের সঠিক ক্রম NCBI Gene / ClinVar থেকে মিলিয়ে নিন। */
(function (w) {
  var D = w.GEBGameData = w.GEBGameData || {};
  D.PAIRS = {
 "enz": {
  "name": "এনজাইম ও কাজ",
  "items": [
   [
    "DNA polymerase",
    "Synthesises a new DNA strand in the 5′→3′ direction"
   ],
   [
    "DNA ligase",
    "Seals nicks by forming phosphodiester bonds"
   ],
   [
    "Helicase",
    "Unwinds the DNA double helix at the replication fork"
   ],
   [
    "Primase",
    "Synthesises short RNA primers"
   ],
   [
    "Topoisomerase",
    "Relieves supercoiling ahead of the replication fork"
   ],
   [
    "RNA polymerase",
    "Synthesises RNA from a DNA template"
   ],
   [
    "Reverse transcriptase",
    "Makes cDNA from an RNA template"
   ],
   [
    "Taq polymerase",
    "Heat-stable DNA polymerase used in PCR"
   ],
   [
    "Restriction endonuclease",
    "Cuts DNA at specific recognition sequences"
   ],
   [
    "Alkaline phosphatase",
    "Removes 5′ phosphates to stop vector self-ligation"
   ],
   [
    "T4 polynucleotide kinase",
    "Adds a phosphate group to 5′-OH ends"
   ],
   [
    "Terminal transferase",
    "Adds nucleotides to the 3′ end without a template"
   ],
   [
    "DNase I",
    "Degrades DNA non-specifically"
   ],
   [
    "RNase A",
    "Degrades single-stranded RNA"
   ],
   [
    "Proteinase K",
    "Digests proteins during DNA extraction"
   ],
   [
    "Lysozyme",
    "Breaks the peptidoglycan of bacterial cell walls"
   ],
   [
    "Cas9",
    "RNA-guided nuclease used for genome editing"
   ],
   [
    "Telomerase",
    "Extends chromosome ends using an RNA template"
   ],
   [
    "Catalase",
    "Breaks down hydrogen peroxide into water and oxygen"
   ],
   [
    "Amylase",
    "Hydrolyses starch into maltose"
   ],
   [
    "Trypsin",
    "Protease that cleaves after lysine and arginine"
   ],
   [
    "β-galactosidase",
    "Cleaves lactose; turns X-gal blue"
   ],
   [
    "Klenow fragment",
    "DNA polymerase I lacking 5′→3′ exonuclease activity"
   ],
   [
    "Luciferase",
    "Catalyses light emission; used as a reporter enzyme"
   ]
  ]
 },
 "prot": {
  "name": "প্রোটিন ও ভূমিকা",
  "items": [
   [
    "Hemoglobin",
    "Carries oxygen in red blood cells"
   ],
   [
    "Myoglobin",
    "Stores oxygen in muscle"
   ],
   [
    "Insulin",
    "Hormone that lowers blood glucose"
   ],
   [
    "Collagen",
    "Main structural protein of connective tissue"
   ],
   [
    "Keratin",
    "Structural protein of hair and nails"
   ],
   [
    "Actin",
    "Microfilament protein of the cytoskeleton and muscle"
   ],
   [
    "Myosin",
    "Motor protein that slides along actin filaments"
   ],
   [
    "Tubulin",
    "Subunit of microtubules"
   ],
   [
    "Immunoglobulin G (IgG)",
    "Most abundant antibody in serum"
   ],
   [
    "p53",
    "Tumour suppressor called the guardian of the genome"
   ],
   [
    "Histone",
    "Protein core around which DNA is wrapped in nucleosomes"
   ],
   [
    "Ferritin",
    "Intracellular iron-storage protein"
   ],
   [
    "Transferrin",
    "Transports iron in blood plasma"
   ],
   [
    "GFP",
    "Green fluorescent reporter from jellyfish"
   ],
   [
    "Hsp70",
    "Chaperone that helps proteins fold"
   ],
   [
    "Ubiquitin",
    "Tag that marks proteins for proteasome degradation"
   ],
   [
    "Cytochrome c",
    "Electron carrier in the respiratory chain"
   ],
   [
    "Albumin",
    "Major plasma protein maintaining osmotic pressure"
   ],
   [
    "Lac repressor",
    "Blocks lac operon transcription when lactose is absent"
   ],
   [
    "Calmodulin",
    "Calcium-binding signalling protein"
   ],
   [
    "RuBisCO",
    "Fixes CO₂ in the Calvin cycle"
   ],
   [
    "Fibrinogen",
    "Plasma protein converted to fibrin during clotting"
   ]
  ]
 },
 "dis": {
  "name": "জেনেটিক রোগ ও কারণ",
  "items": [
   [
    "Sickle cell anemia",
    "Point mutation in HBB (Glu6Val)"
   ],
   [
    "Cystic fibrosis",
    "CFTR mutation, commonly ΔF508"
   ],
   [
    "Huntington's disease",
    "CAG repeat expansion in HTT"
   ],
   [
    "Fragile X syndrome",
    "CGG repeat expansion in FMR1"
   ],
   [
    "Phenylketonuria",
    "Deficiency of phenylalanine hydroxylase"
   ],
   [
    "Down syndrome",
    "Trisomy 21"
   ],
   [
    "Edwards syndrome",
    "Trisomy 18"
   ],
   [
    "Patau syndrome",
    "Trisomy 13"
   ],
   [
    "Turner syndrome",
    "Monosomy X (45,X)"
   ],
   [
    "Klinefelter syndrome",
    "47,XXY karyotype"
   ],
   [
    "Haemophilia A",
    "Factor VIII deficiency, X-linked recessive"
   ],
   [
    "Haemophilia B",
    "Factor IX deficiency, X-linked recessive"
   ],
   [
    "Duchenne muscular dystrophy",
    "Dystrophin gene mutation, X-linked"
   ],
   [
    "Tay-Sachs disease",
    "HEXA deficiency; GM2 ganglioside builds up"
   ],
   [
    "β-thalassemia",
    "Reduced or absent β-globin chain synthesis"
   ],
   [
    "Albinism",
    "Defective melanin synthesis, e.g. tyrosinase"
   ],
   [
    "Marfan syndrome",
    "Fibrillin-1 (FBN1) mutation"
   ],
   [
    "Achondroplasia",
    "Gain-of-function mutation in FGFR3"
   ],
   [
    "Chronic myeloid leukaemia",
    "BCR-ABL fusion (Philadelphia chromosome)"
   ],
   [
    "Familial hypercholesterolaemia",
    "Defective LDL receptor"
   ],
   [
    "Cri-du-chat syndrome",
    "Deletion of the short arm of chromosome 5"
   ],
   [
    "Red-green colour blindness",
    "X-linked recessive trait"
   ],
   [
    "Galactosemia",
    "GALT enzyme deficiency"
   ]
  ]
 },
 "inf": {
  "name": "সংক্রামক রোগ ও জীবাণু",
  "items": [
   [
    "Cholera",
    "Vibrio cholerae toxin causing watery diarrhoea"
   ],
   [
    "Tuberculosis",
    "Mycobacterium tuberculosis"
   ],
   [
    "Typhoid fever",
    "Salmonella Typhi"
   ],
   [
    "Malaria",
    "Plasmodium transmitted by Anopheles"
   ],
   [
    "Dengue",
    "Dengue virus transmitted by Aedes"
   ],
   [
    "COVID-19",
    "SARS-CoV-2"
   ],
   [
    "Influenza",
    "Virus with HA and NA surface proteins"
   ],
   [
    "Hepatitis B",
    "Hepatitis B virus (HBV)"
   ],
   [
    "Tetanus",
    "Clostridium tetani toxin"
   ],
   [
    "Anthrax",
    "Bacillus anthracis"
   ],
   [
    "Leprosy",
    "Mycobacterium leprae"
   ],
   [
    "Rabies",
    "Rabies lyssavirus transmitted by animal bites"
   ],
   [
    "AIDS",
    "HIV, a retrovirus attacking CD4⁺ T cells"
   ],
   [
    "Diphtheria",
    "Corynebacterium diphtheriae toxin"
   ]
  ]
 },
 "site": {
  "name": "কাঁচির ঠিকানা (এনজাইম ও সাইট)",
  "items": [
   [
    "EcoRI",
    "G^AATTC"
   ],
   [
    "BamHI",
    "G^GATCC"
   ],
   [
    "HindIII",
    "A^AGCTT"
   ],
   [
    "PstI",
    "CTGCA^G"
   ],
   [
    "SalI",
    "G^TCGAC"
   ],
   [
    "XhoI",
    "C^TCGAG"
   ],
   [
    "KpnI",
    "GGTAC^C"
   ],
   [
    "SacI",
    "GAGCT^C"
   ],
   [
    "SmaI",
    "CCC^GGG (blunt)"
   ],
   [
    "EcoRV",
    "GAT^ATC (blunt)"
   ],
   [
    "NcoI",
    "C^CATGG"
   ],
   [
    "NdeI",
    "CA^TATG"
   ],
   [
    "XbaI",
    "T^CTAGA"
   ],
   [
    "SpeI",
    "A^CTAGT"
   ],
   [
    "NotI",
    "GC^GGCCGC"
   ]
  ]
 }
};
  D.QUIZ = [
[
"Which molecule carries genetic information in most organisms?",
"DNA",
"Protein",
"Lipid",
"Starch",
"বেশির ভাগ জীবে বংশগত তথ্য DNA-তে থাকে (কিছু ভাইরাসে RNA)।",
1
],
[
"Which base pairs with adenine in DNA?",
"Thymine",
"Cytosine",
"Guanine",
"Uracil",
"DNA-তে A–T (২টি হাইড্রোজেন বন্ধন), G–C (৩টি)। Uracil থাকে RNA-তে।",
1
],
[
"Which organelle is called the powerhouse of the cell?",
"Mitochondrion",
"Ribosome",
"Golgi apparatus",
"Lysosome",
"ATP তৈরি হয় মাইটোকন্ড্রিয়নে।",
1
],
[
"Which enzyme joins DNA fragments by forming phosphodiester bonds?",
"DNA ligase",
"Helicase",
"Primase",
"Amylase",
"DNA ligase কাটা টুকরো জোড়া লাগায়, তাই ক্লোনিংয়ে “আঠা”।",
1
],
[
"PCR stands for:",
"Polymerase chain reaction",
"Protein chain reaction",
"Polymer cloning reaction",
"Primer chain replication",
"PCR-এ DNA-র নির্দিষ্ট অংশ বহুগুণ করা হয়।",
1
],
[
"Restriction enzymes are often called:",
"Molecular scissors",
"Molecular glue",
"Molecular pumps",
"Molecular motors",
"নির্দিষ্ট সিকোয়েন্সে DNA কাটে, তাই “মলিকুলার কাঁচি”।",
1
],
[
"How many chromosomes are in a normal human somatic cell?",
"46",
"23",
"44",
"48",
"মানুষের দেহকোষে ২৩ জোড়া, মোট ৪৬টি।",
1
],
[
"Which organelle is the site of protein synthesis?",
"Ribosome",
"Lysosome",
"Peroxisome",
"Centrosome",
"রাইবোসোমে mRNA পড়ে প্রোটিন তৈরি হয়।",
1
],
[
"The genetic code is read in groups of how many nucleotides?",
"Three",
"Two",
"Four",
"Five",
"তিনটি নিউক্লিওটাইডের একেকটি কোডন একটি অ্যামিনো অ্যাসিড নির্ধারণ করে।",
1
],
[
"Which of these is a stop codon?",
"UAA",
"AUG",
"UUU",
"GCC",
"UAA, UAG, UGA হলো stop কোডন।",
1
],
[
"Which codon is the usual start codon?",
"AUG",
"UGA",
"UAG",
"CAU",
"AUG মেথিওনিন কোড করে এবং অনুবাদ শুরু করে।",
1
],
[
"Which sugar is present in DNA?",
"Deoxyribose",
"Ribose",
"Glucose",
"Fructose",
"RNA-তে থাকে ribose।",
1
],
[
"Antibodies are secreted mainly by:",
"Plasma cells (activated B cells)",
"Red blood cells",
"Platelets",
"Neutrophils",
"B লিম্ফোসাইট সক্রিয় হয়ে প্লাজমা কোষে পরিণত হয়ে অ্যান্টিবডি ছাড়ে।",
1
],
[
"Which technique separates DNA fragments by size?",
"Agarose gel electrophoresis",
"Gram staining",
"Autoclaving",
"Spectroscopy only",
"ছোট টুকরো জেলে দ্রুত এগোয়।",
1
],
[
"Which bacterium is the most common host for cloning?",
"Escherichia coli",
"Vibrio cholerae",
"Mycobacterium tuberculosis",
"Salmonella Typhi",
"E. coli দ্রুত বাড়ে এবং সহজে ট্রান্সফর্ম করা যায়।",
1
],
[
"Insulin is produced by which pancreatic cells?",
"Beta cells",
"Alpha cells",
"Acinar cells",
"Delta cells",
"Alpha কোষ glucagon, delta কোষ somatostatin বানায়।",
1
],
[
"Which was the first recombinant human protein approved as a drug (1982)?",
"Human insulin",
"Erythropoietin",
"Interferon",
"Factor VIII",
"E. coli দিয়ে বানানো মানব ইনসুলিন (Humulin)।",
1
],
[
"Plasmids are:",
"Small circular extrachromosomal DNA molecules",
"Linear chromosomes",
"Viral capsid proteins",
"Ribosomal RNA",
"প্লাজমিড নিজে নিজে কপি হয়, তাই ভেক্টর হিসেবে ব্যবহার হয়।",
1
],
[
"Which of these is a Gram-negative bacterium?",
"Escherichia coli",
"Staphylococcus aureus",
"Bacillus subtilis",
"Streptococcus pyogenes",
"E. coli Gram-negative, বাকি তিনটি Gram-positive।",
1
],
[
"Making mRNA from a DNA template is called:",
"Transcription",
"Translation",
"Replication",
"Transformation",
"Translation হলো mRNA থেকে প্রোটিন।",
1
],
[
"Making protein from an mRNA template is called:",
"Translation",
"Transcription",
"Replication",
"Splicing",
"রাইবোসোমে tRNA অ্যামিনো অ্যাসিড এনে দেয়।",
1
],
[
"Golden Rice was developed mainly to address deficiency of:",
"Vitamin A",
"Vitamin C",
"Vitamin D",
"Vitamin K",
"β-ক্যারোটিন জমে ভিটামিন A-র ঘাটতি কমায়।",
1
],
[
"Bt toxin genes used in crops come from:",
"Bacillus thuringiensis",
"Bacillus anthracis",
"Bacillus subtilis",
"Escherichia coli",
"Bt বিষ নির্দিষ্ট পোকার অন্ত্রে কাজ করে।",
1
],
[
"Which of these is NOT a base found in DNA?",
"Uracil",
"Thymine",
"Guanine",
"Cytosine",
"Uracil থাকে RNA-তে।",
1
],
[
"Dolly the sheep was created by:",
"Somatic cell nuclear transfer",
"PCR",
"Gene gun",
"Southern blotting",
"দেহকোষের নিউক্লিয়াস ডিম্বাণুতে বসিয়ে ক্লোন করা হয়।",
1
],
[
"The basic unit of heredity is the:",
"Gene",
"Ribosome",
"Lipid",
"Enzyme",
"জিন প্রোটিন বা RNA কোড করে।",
1
],
[
"The double-helix model of DNA (1953) was proposed by:",
"Watson and Crick",
"Mendel",
"Darwin",
"Pasteur",
"Franklin ও Wilkins-এর X-ray ডেটা কাজে লেগেছিল।",
1
],
[
"Which enzyme unwinds DNA at the replication fork?",
"Helicase",
"Ligase",
"Telomerase",
"Amylase",
"Helicase হাইড্রোজেন বন্ধন ভেঙে দুই স্ট্র্যান্ড আলাদা করে।",
1
],
[
"ABO blood group is determined by antigens on:",
"Red blood cells",
"Platelets",
"Plasma proteins",
"White blood cells",
"A ও B অ্যান্টিজেন লোহিত কণিকার গায়ে থাকে।",
1
],
[
"Dengue virus is transmitted by:",
"Aedes mosquito",
"Anopheles mosquito",
"Culex mosquito",
"Tsetse fly",
"Aedes aegypti ও Ae. albopictus ডেঙ্গু ছড়ায়।",
1
],
[
"Cholera is caused by:",
"Vibrio cholerae",
"Salmonella Typhi",
"Shigella dysenteriae",
"Entamoeba histolytica",
"কলেরা টক্সিনের কারণে পানির মতো পাতলা পায়খানা হয়।",
1
],
[
"Which DNA polymerase is used in PCR because it is heat-stable?",
"Taq polymerase",
"E. coli DNA polymerase I",
"T4 DNA ligase",
"Reverse transcriptase",
"Thermus aquaticus থেকে পাওয়া, ৯৪–৯৫°C সহ্য করে।",
2
],
[
"EcoRI recognises which sequence?",
"GAATTC",
"GGATCC",
"AAGCTT",
"CTGCAG",
"EcoRI G^AATTC কাটে এবং sticky end (5′ overhang) দেয়।",
2
],
[
"BamHI recognises which sequence?",
"GGATCC",
"GAATTC",
"AAGCTT",
"GTCGAC",
"BamHI G^GATCC।",
2
],
[
"HindIII recognises which sequence?",
"AAGCTT",
"GAATTC",
"GGATCC",
"CCCGGG",
"HindIII A^AGCTT।",
2
],
[
"Which restriction enzyme produces blunt ends?",
"SmaI",
"EcoRI",
"BamHI",
"HindIII",
"SmaI CCC^GGG মাঝ বরাবর কাটে।",
2
],
[
"Blue-white screening is based on which gene?",
"lacZ (β-galactosidase)",
"bla (β-lactamase)",
"GFP",
"neo",
"X-gal ভাঙলে নীল, ইনসার্ট ঢুকলে lacZ নষ্ট হয়ে সাদা কলোনি।",
2
],
[
"The common ampicillin-resistance gene is called:",
"bla (β-lactamase)",
"neo",
"tetA",
"cat",
"β-lactamase অ্যাম্পিসিলিনের β-lactam রিং ভেঙে দেয়।",
2
],
[
"The Shine-Dalgarno sequence is found in:",
"Prokaryotic mRNA",
"Eukaryotic mRNA 3′ UTR",
"tRNA",
"rRNA gene promoters",
"এটি প্রোক্যারিওটিক রাইবোসোম-বাইন্ডিং সাইট।",
2
],
[
"Which RNA carries amino acids to the ribosome?",
"tRNA",
"mRNA",
"rRNA",
"siRNA",
"প্রতিটি tRNA-তে anticodon থাকে।",
2
],
[
"Okazaki fragments are formed on the:",
"Lagging strand",
"Leading strand",
"mRNA",
"tRNA",
"লেগিং স্ট্র্যান্ড টুকরো টুকরো হয়ে তৈরি হয়।",
2
],
[
"Reverse transcriptase synthesises:",
"DNA from an RNA template (cDNA)",
"RNA from a DNA template",
"Protein from RNA",
"DNA from protein",
"রেট্রোভাইরাস ও cDNA ক্লোনিংয়ে ব্যবহৃত।",
2
],
[
"Which technique detects a specific protein using antibodies after gel separation?",
"Western blot",
"Southern blot",
"Northern blot",
"Gram stain",
"Western → protein, Southern → DNA, Northern → RNA।",
2
],
[
"Southern blotting is used to detect:",
"DNA",
"RNA",
"Protein",
"Lipid",
"E. M. Southern-এর নামে।",
2
],
[
"Northern blotting is used to detect:",
"RNA",
"DNA",
"Protein",
"Carbohydrate",
"জিনের প্রকাশ (mRNA) মাপতে।",
2
],
[
"CRISPR-Cas9 finds its target DNA using:",
"A guide RNA",
"An antibody",
"A primer pair only",
"tRNA",
"gRNA টার্গেটের পরিপূরক এবং Cas9-কে পথ দেখায়।",
2
],
[
"G418 selection in eukaryotic cells uses which resistance gene?",
"neo (neomycin phosphotransferase)",
"bla",
"lacZ",
"tetA",
"neo জিন G418-এর বিরুদ্ধে সুরক্ষা দেয়।",
2
],
[
"Agrobacterium tumefaciens transfers which DNA into plant cells?",
"T-DNA from the Ti plasmid",
"The whole bacterial chromosome",
"Mitochondrial DNA",
"rRNA genes",
"উদ্ভিদ ট্রান্সজেনিক বানানোর প্রচলিত পদ্ধতি।",
2
],
[
"The gene gun method is also called:",
"Biolistics",
"Electroporation",
"Microinjection",
"Lipofection",
"সোনা বা টাংস্টেনের কণায় DNA মাখিয়ে ছোড়া হয়।",
2
],
[
"Taq polymerase was isolated from:",
"Thermus aquaticus",
"Escherichia coli",
"Bacillus subtilis",
"Saccharomyces cerevisiae",
"ইয়েলোস্টোনের উষ্ণ প্রস্রবণের ব্যাকটেরিয়া।",
2
],
[
"Transfer of DNA between bacteria through a pilus is called:",
"Conjugation",
"Transformation",
"Transduction",
"Binary fission",
"F-প্লাজমিড pilus দিয়ে সংযোগ তৈরি করে।",
2
],
[
"Transduction transfers bacterial DNA using:",
"A bacteriophage",
"A pilus",
"Heat shock",
"An electric pulse",
"ফাজ ভুলে ব্যাকটেরিয়ার DNA-র টুকরো বহন করে।",
2
],
[
"ELISA stands for:",
"Enzyme-linked immunosorbent assay",
"Enzyme-linked immunoglobulin standard assay",
"Electro-linked immunosorbent analysis",
"Enzyme-labelled isotope serum assay",
"অ্যান্টিজেন বা অ্যান্টিবডি মাপার ইমিউনোঅ্যাসে।",
2
],
[
"Monoclonal antibodies are produced by:",
"Hybridoma cells",
"Bacterial transformation",
"PCR",
"Plasmid replication",
"B কোষ ও মায়েলোমা কোষ জুড়ে তৈরি হাইব্রিডোমা।",
2
],
[
"In enzyme kinetics, Km is the substrate concentration at which the velocity is:",
"Half of Vmax",
"Equal to Vmax",
"Zero",
"Twice Vmax",
"Km ছোট মানে সাবস্ট্রেটের প্রতি আসক্তি বেশি।",
2
],
[
"Which amino acid is coded by AUG?",
"Methionine",
"Tryptophan",
"Cysteine",
"Serine",
"AUG start কোডনও।",
2
],
[
"Which codon codes for tryptophan in the standard code?",
"UGG",
"UGA",
"UAG",
"AUG",
"Trp ও Met-এর একটিমাত্র কোডন।",
2
],
[
"Which small protein tags other proteins for proteasomal degradation?",
"Ubiquitin",
"Ferritin",
"Collagen",
"Albumin",
"পলিউবিকুইটিন শৃঙ্খল প্রোটিনকে প্রোটিয়াসোমে পাঠায়।",
2
],
[
"Gram-positive bacteria have a thick layer of:",
"Peptidoglycan",
"Lipopolysaccharide outer membrane",
"Chitin",
"Cellulose",
"Gram-negative-এর পাতলা peptidoglycan ও বাইরে LPS-সহ বাইরের পর্দা থাকে।",
2
],
[
"Which technique amplifies DNA exponentially?",
"PCR",
"SDS-PAGE",
"ELISA",
"Paper chromatography",
"প্রতি চক্রে DNA প্রায় দ্বিগুণ হয়।",
2
],
[
"Bangladesh approved which GM crop in 2013 as its first for cultivation?",
"Bt brinjal",
"Golden Rice",
"Bt maize",
"GM jute",
"ফল ও কাণ্ড ছিদ্রকারী পোকা রোধে Bt বেগুন।",
2
],
[
"Who led the 2010 jute genome sequencing project?",
"Maqsudul Alam",
"Jagadish Chandra Bose",
"Satyendra Nath Bose",
"Fazlur Rahman Khan",
"বাংলাদেশি বিজ্ঞানী মাকসুদুল আলম, পাটের জিনোম।",
2
],
[
"Which tag is used for affinity purification of recombinant proteins on Ni-NTA?",
"His-tag (6×His)",
"FLAG-tag",
"GFP",
"lacZ",
"হিস্টিডিনের ইমিডাজল রিং নিকেলের সাথে বাঁধে।",
2
],
[
"The enzyme DNA polymerase I in E. coli removes RNA primers using its:",
"5′→3′ exonuclease activity",
"3′→5′ helicase activity",
"Ligase activity",
"Topoisomerase activity",
"তারপর নিজেই ফাঁক পূরণ করে।",
2
],
[
"In SDS-PAGE, proteins are separated mainly by:",
"Molecular weight",
"Net charge",
"Hydrophobicity",
"Isoelectric point",
"SDS সব প্রোটিনকে সমান ঋণাত্মক চার্জ দেয়।",
3
],
[
"Isoelectric focusing separates proteins by their:",
"Isoelectric point (pI)",
"Molecular size",
"Shape",
"Solubility",
"pH গ্রেডিয়েন্টে প্রোটিন নিজের pI-তে থামে।",
3
],
[
"An A260/A280 ratio of about 1.8 indicates relatively pure:",
"DNA",
"RNA",
"Protein",
"Phenol",
"বিশুদ্ধ RNA-তে মান প্রায় ২.০।",
3
],
[
"Which operon is induced by allolactose?",
"lac operon",
"trp operon",
"ara operon",
"his operon",
"allolactose লাক রিপ্রেসরকে অকার্যকর করে।",
3
],
[
"The trp operon is an example of a:",
"Repressible operon",
"Inducible operon",
"Constitutive gene",
"Positive-control-only system",
"ট্রিপটোফান বেশি থাকলে রিপ্রেসর সক্রিয় হয়ে বন্ধ করে দেয়।",
3
],
[
"Which histone modification is generally associated with active transcription?",
"Histone acetylation",
"H3K9 trimethylation",
"H3K27 trimethylation",
"CpG island methylation",
"অ্যাসিটাইলেশন ক্রোমাটিন শিথিল করে।",
3
],
[
"RNA interference is mediated mainly by:",
"siRNA/miRNA with the RISC complex",
"rRNA",
"tRNA",
"mRNA cap-binding proteins",
"RISC লক্ষ্য mRNA কাটে বা অনুবাদ আটকায়।",
3
],
[
"Sanger sequencing is based on:",
"Chain termination with ddNTPs",
"Chemical cleavage of bases",
"Hybridisation to arrays",
"Mass spectrometry",
"ddNTP-তে 3′-OH নেই, তাই শৃঙ্খল থেমে যায়।",
3
],
[
"In qPCR, a lower Ct value means:",
"More starting template",
"Less starting template",
"A failed reaction",
"No relation to template",
"কম চক্রেই থ্রেশহোল্ড পার করেছে।",
3
],
[
"Which plasmid element allows replication in E. coli?",
"Origin of replication (ori)",
"Multiple cloning site",
"Promoter",
"Terminator",
"ori কপি সংখ্যাও নির্ধারণ করে।",
3
],
[
"The Philadelphia chromosome results from:",
"t(9;22) producing BCR-ABL",
"t(8;14)",
"Trisomy 21",
"Deletion of 5p",
"CML-এ দেখা যায়।",
3
],
[
"Which karyotype is typical of Down syndrome?",
"47,XX,+21",
"45,X",
"47,XXY",
"47,XX,+18",
"২১ নম্বর ক্রোমোজোম তিনটি।",
3
],
[
"Which of these is a tumour suppressor gene?",
"TP53",
"RAS",
"MYC",
"SRC",
"বাকি তিনটি অনকোজিন।",
3
],
[
"UV-induced thymine dimers are mainly repaired by:",
"Nucleotide excision repair",
"Mismatch repair",
"Non-homologous end joining",
"Homologous recombination",
"NER-এ ত্রুটি হলে xeroderma pigmentosum হয়।",
3
],
[
"Defective DNA mismatch repair is associated with:",
"Lynch syndrome",
"Xeroderma pigmentosum",
"Down syndrome",
"Cystic fibrosis",
"MLH1, MSH2 ইত্যাদি জিনের ত্রুটি।",
3
],
[
"Which technique uses fluorescent probes to locate sequences on chromosomes?",
"FISH",
"ELISA",
"SDS-PAGE",
"Southern blotting",
"FISH = fluorescence in situ hybridisation।",
3
],
[
"If q = 0.1 in Hardy-Weinberg equilibrium, the frequency of heterozygotes (2pq) is:",
"0.18",
"0.09",
"0.01",
"0.81",
"p = 0.9, তাই 2 × 0.9 × 0.1 = 0.18।",
3
],
[
"A dihybrid cross AaBb × AaBb gives the phenotypic ratio:",
"9:3:3:1",
"3:1",
"1:2:1",
"1:1:1:1",
"স্বাধীন সঞ্চরণের ফল।",
3
],
[
"Which cloning vector can carry the largest insert?",
"YAC",
"Plasmid",
"Cosmid",
"Lambda phage",
"YAC প্রায় ১ Mb বা তারও বেশি বহন করে।",
3
],
[
"The approximate insert capacity of a cosmid is:",
"35–45 kb",
"1–10 kb",
"100–300 kb",
"1–2 Mb",
"λ cos সাইটসহ প্লাজমিডের সংকর।",
3
],
[
"Telomerase is mainly active in:",
"Germ cells, stem cells and most cancer cells",
"Most differentiated somatic cells",
"Red blood cells",
"Mature neurons",
"এ কারণেই ক্যানসার কোষ অমর হয়ে ওঠে।",
3
],
[
"Primer melting temperature (Tm) generally increases with:",
"Higher GC content",
"Lower GC content",
"Higher AT content",
"Shorter length only",
"GC-তে ৩টি হাইড্রোজেন বন্ধন।",
3
],
[
"Hydrogen bonding between backbone atoms forms which level of protein structure?",
"Secondary structure",
"Primary structure",
"Tertiary structure",
"Quaternary structure",
"α-হেলিক্স ও β-শিট।",
3
],
[
"Which amino acid has no chiral centre?",
"Glycine",
"Alanine",
"Serine",
"Valine",
"Gly-র R গ্রুপ শুধু H।",
3
],
[
"A competitive inhibitor changes enzyme kinetics by:",
"Increasing Km without changing Vmax",
"Decreasing Vmax without changing Km",
"Decreasing both Km and Vmax",
"Increasing Vmax",
"বেশি সাবস্ট্রেট দিলে অবরোধ কাটানো যায়।",
3
],
[
"A non-competitive inhibitor:",
"Lowers Vmax without changing Km",
"Raises Km without changing Vmax",
"Raises both Km and Vmax",
"Raises Vmax",
"এনজাইমের অন্য জায়গায় বাঁধে।",
3
],
[
"Which enzyme fixes CO₂ in the Calvin cycle?",
"RuBisCO",
"PEP carboxylase",
"Hexokinase",
"ATP synthase",
"RuBP + CO₂ → দুটি ৩-PGA।",
3
],
[
"A peptide bond forms between:",
"The carboxyl group of one amino acid and the amino group of the next",
"Two carboxyl groups",
"Two amino groups",
"Two R groups",
"জলের একটি অণু বেরিয়ে যায় (condensation)।",
3
],
[
"Which of these produces sticky ends compatible with XbaI?",
"SpeI",
"SmaI",
"EcoRV",
"NotI",
"দুটোই 5′-CTAG overhang দেয়।",
3
],
[
"In bacteria, the circular chromosome is located in a region called the:",
"Nucleoid",
"Nucleolus",
"Nucleosome",
"Chromatin fibre",
"ব্যাকটেরিয়ায় ঝিল্লিঘেরা নিউক্লিয়াস নেই, ক্রোমোজোম থাকে নিউক্লিয়েডে।",
3
]
];
  D.MUT = [
{
"id": "sickle",
"gene": "HBB",
"disease": "Sickle cell anemia",
"real": true,
"wt": "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTG",
"mut": "ATGGTGCATCTGACTCCTGTGGAGAAGTCTGCCGTTACTGCCCTG",
"bn": "HBB জিনের ৬ নম্বর কোডন GAG → GTG (গ্লুটামিক অ্যাসিড → ভ্যালিন)। হিমোগ্লোবিন লম্বা তন্তু বানায়, লোহিত কণিকা কাস্তের মতো বাঁকা হয়।",
"note": "প্রচলিত নামে ৬ নম্বর অ্যামিনো অ্যাসিড (Met গোনা হয় না); নিচের গ্রিডে ATG-কে ১ ধরে গোনা হয়েছে, তাই এটি ৭ নম্বর ঘর।",
"type": "missense",
"first": 6
},
{
"id": "hbc",
"gene": "HBB",
"disease": "Hemoglobin C disease",
"real": true,
"wt": "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTG",
"mut": "ATGGTGCATCTGACTCCTAAGGAGAAGTCTGCCGTTACTGCCCTG",
"bn": "একই ৬ নম্বর স্থানে GAG → AAG (গ্লুটামিক অ্যাসিড → লাইসিন)। এটি Hb C রোগ, সাধারণত মৃদু হিমোলাইটিক অ্যানিমিয়া।",
"note": "প্রচলিত নামে ৬ নম্বর অ্যামিনো অ্যাসিড (Met গোনা হয় না); গ্রিডে ৭ নম্বর ঘর।",
"type": "missense",
"first": 6
},
{
"id": "silent",
"gene": "HBB",
"disease": "No disease (silent mutation)",
"real": true,
"wt": "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTG",
"mut": "ATGGTGCATCTGACTCCTGAAGAGAAGTCTGCCGTTACTGCCCTG",
"bn": "GAG → GAA, দুটোই গ্লুটামিক অ্যাসিডের কোডন। জেনেটিক কোড degenerate, তাই প্রোটিন একই থাকে, সাধারণত কোনো রোগ হয় না।",
"note": "প্রচলিত নামে ৬ নম্বর অ্যামিনো অ্যাসিড; গ্রিডে ৭ নম্বর ঘর।",
"type": "silent",
"first": 6
},
{
"id": "bthal_fs",
"gene": "HBB",
"disease": "β-thalassemia",
"real": true,
"wt": "ATGGTGCATCTGACTCCTGAGGAGAAGTCTGCCGTTACTGCCCTG",
"mut": "ATGGTGCATCTGACTCCTGAGGAGAAGGTCTGCCGTTACTGCCCTG",
"bn": "কোডন ৮/৯-এর মাঝে একটি G ঢুকেছে (+G)। এক বেস বাড়ায় পড়ার ফ্রেম সরে গেছে, তাই এরপরের সব অ্যামিনো অ্যাসিড বদলে যায় ও শীঘ্রই stop আসে। ফল β⁰-থ্যালাসিমিয়া (β-গ্লোবিন প্রায় তৈরি হয় না)।",
"note": "ঢোকানো বেস ৩ দিয়ে ভাগ যায় না, তাই ফ্রেমশিফট।",
"type": "frameshift",
"first": 9
},
{
"id": "bthal_ns",
"gene": "HBB",
"disease": "β-thalassemia",
"real": true,
"wt": "GGCAGGCTGCTGGTGGTCTACCCTTGGACCCAGAGGTTCTTTGAGTCCTTT",
"mut": "GGCAGGCTGCTGGTGGTCTACCCTTGGACCTAGAGGTTCTTTGAGTCCTTT",
"bn": "৩৯ নম্বর কোডন CAG (Gln) → TAG (stop)। প্রোটিন মাঝপথে থেমে যায়, কার্যকর β-গ্লোবিন হয় না (β⁰-থ্যালাসিমিয়া)।",
"note": "এখানে দেখানো অংশ HBB-র ২৯–৪৫ নম্বর অ্যামিনো অ্যাসিড; গ্রিডে ৩৯ নম্বর অ্যামিনো অ্যাসিড ১১ নম্বর ঘর।",
"type": "nonsense",
"first": 10
},
{
"id": "cf",
"gene": "CFTR",
"disease": "Cystic fibrosis",
"real": true,
"wt": "GAAAATATCATCTTTGGTGTTTCCTATGATGAATAT",
"mut": "GAAAATATCATTGGTGTTTCCTATGATGAATAT",
"bn": "তিনটি বেস (CTT) মুছে গেছে, ফলে ফেনাইলঅ্যালানিন (F508) হারিয়ে যায়। ৩ বেস মোছায় ফ্রেম ঠিক থাকে (in-frame deletion), কিন্তু CFTR প্রোটিন ভাঁজ হতে পারে না। সবচেয়ে প্রচলিত cystic fibrosis মিউটেশন (ΔF508)।",
"note": "দেখানো অংশ CFTR-এর ৫০৪–৫১৫ নম্বর অ্যামিনো অ্যাসিড।",
"type": "inframe",
"first": 3
},
{
"id": "hd",
"gene": "HTT",
"disease": "Huntington's disease",
"real": true,
"wt": "ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAACCGCCACCG",
"mut": "ATGGCGACCCTGGAAAAGCTGATGAAGGCCTTCGAGTCCCTCAAGTCCTTCCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAGCAACAACCGCCACCG",
"bn": "HTT জিনে CAG পুনরাবৃত্তি ২০ থেকে ৪২-এ বেড়েছে (পলিগ্লুটামিন টান বড় হয়)। সাধারণত ৩৬-এর বেশি হলে ঝুঁকি, ৪০+ হলে প্রায় নিশ্চিত। এটি trinucleotide repeat expansion।",
"note": "পুনরাবৃত্ত অংশ গুনে বের করতে হবে। সাধারণ মান ২৬ বা তার কম।",
"type": "repeat",
"first": 37,
"repeat": {
"unit": "CAG",
"wt": 20,
"mut": 42
}
},
{
"id": "fvl",
"gene": "F5",
"disease": "Factor V Leiden thrombophilia",
"real": false,
"wt": "GATCTGATCCGAATGACCAAGGAG",
"mut": "GATCTGATCCAAATGACCAAGGAG",
"bn": "CGA (Arg) → CAA (Gln), অর্থাৎ R506Q। Factor V এখন Protein C দিয়ে কাটা পড়ে না, তাই রক্ত জমাট বাঁধার প্রবণতা (thrombophilia) বাড়ে।",
"note": "আসল জিনের ডিএনএ নয়, শুধু মিউটেশনের কোডন ঠিক রেখে বানানো শিক্ষামূলক টুকরো।",
"type": "missense",
"first": 3
},
{
"id": "pku",
"gene": "PAH",
"disease": "Phenylketonuria (PKU)",
"real": false,
"wt": "GACTTCCTGGGCCGGAGCACCCAG",
"mut": "GACTTCCTGGGCTGGAGCACCCAG",
"bn": "CGG (Arg) → TGG (Trp), অর্থাৎ R408W। ফেনাইলঅ্যালানিন হাইড্রক্সিলেজ কাজ করে না, ফেনাইলঅ্যালানিন জমে মস্তিষ্কের ক্ষতি করে।",
"note": "আসল জিনের ডিএনএ নয়, শুধু মিউটেশনের কোডন ঠিক রেখে বানানো শিক্ষামূলক টুকরো।",
"type": "missense",
"first": 4
},
{
"id": "achon",
"gene": "FGFR3",
"disease": "Achondroplasia",
"real": false,
"wt": "CTGGCCATCGGGGCCGTGCTG",
"mut": "CTGGCCATCAGGGCCGTGCTG",
"bn": "GGG (Gly) → AGG (Arg), অর্থাৎ G380R। FGFR3 অতি-সক্রিয় (gain-of-function) হয়ে হাড়ের বৃদ্ধি বেশি থামিয়ে দেয়, ফলে বামনত্ব।",
"note": "আসল জিনের ডিএনএ নয়, শুধু মিউটেশনের কোডন ঠিক রেখে বানানো শিক্ষামূলক টুকরো।",
"type": "missense",
"first": 3
},
{
"id": "tay",
"gene": "HEXA",
"disease": "Tay-Sachs disease",
"real": false,
"wt": "GCCTATCTATCCTATGGCAAC",
"mut": "GCCTATTATCCTATCCTATGGCAAC",
"bn": "চারটি বেস (TATC) ঢুকেছে। ৪ বেস ৩ দিয়ে ভাগ যায় না, তাই ফ্রেমশিফট; হেক্সোসামিনিডেজ A তৈরি হয় না এবং GM2 গ্যাংলিওসাইড জমে স্নায়ুকোষ নষ্ট করে।",
"note": "আসল জিনের ডিএনএ নয়; ৪ বেস ঢোকার ধরনটি আসল Tay-Sachs মিউটেশনের মতো।",
"type": "frameshift",
"first": 2
}
];
  D.DISEASES = ["Sickle cell anemia", "β-thalassemia", "Cystic fibrosis", "Huntington's disease", "Hemoglobin C disease", "Factor V Leiden thrombophilia", "Phenylketonuria (PKU)", "Achondroplasia", "Tay-Sachs disease", "No disease (silent mutation)", "Duchenne muscular dystrophy", "Haemophilia A", "Albinism", "Marfan syndrome", "Down syndrome", "Fragile X syndrome"];
  D.BADGES = [
[
"first",
"🧪",
"প্রথম পদক্ষেপ",
"যেকোনো একটি গেম শেষ করো",
"sessions",
1
],
[
"streak3",
"🔥",
"৩ দিনের ধারা",
"টানা ৩ দিন খেলো",
"bestStreak",
3
],
[
"streak10",
"🔥",
"১০ দিন স্ট্রিক",
"টানা ১০ দিন খেলো",
"bestStreak",
10
],
[
"streak30",
"🌋",
"৩০ দিনের যোদ্ধা",
"টানা ৩০ দিন খেলো",
"bestStreak",
30
],
[
"q25",
"📘",
"২৫ প্রশ্ন সমাধান",
"২৫টি সঠিক উত্তর দাও",
"correct",
25
],
[
"q100",
"📗",
"১০০ প্রশ্ন সমাধান",
"১০০টি সঠিক উত্তর দাও",
"correct",
100
],
[
"q500",
"📕",
"৫০০ প্রশ্ন সমাধান",
"৫০০টি সঠিক উত্তর দাও",
"correct",
500
],
[
"pairs50",
"🧩",
"জোড়া শিকারি",
"৫০টি জোড়া মেলাও",
"pairs",
50
],
[
"pairs200",
"🧬",
"জিন-ম্যাচ মাস্টার",
"২০০টি জোড়া মেলাও",
"pairs",
200
],
[
"perfect",
"💎",
"নিখুঁত ম্যাচ",
"কমপক্ষে ৬ জোড়ার রাউন্ডে একটিও ভুল ছাড়া শেষ করো",
"matchPerfect",
1
],
[
"quiz10",
"🎯",
"১০ ধাপ পার",
"কুইজ শো-তে একটানা ১০টি প্রশ্ন সঠিক করো",
"quizBest",
10
],
[
"quizwin",
"🏆",
"বায়োটেকনোলজিস্ট",
"কুইজ শো-র ১৫টি প্রশ্নই পার করো",
"quizWins",
1
],
[
"nolife",
"🧠",
"লাইফলাইন ছাড়াই",
"কোনো লাইফলাইন না নিয়ে ১০টি প্রশ্ন সঠিক করো",
"quizNoLife",
1
],
[
"mut1",
"🔬",
"মিউটেশন শিকারি",
"একটি মিউটেশন কেস পুরো সমাধান করো",
"mutSolved",
1
],
[
"mut5",
"🕵️",
"ডিএনএ গোয়েন্দা",
"৫টি আলাদা মিউটেশন কেস সমাধান করো",
"mutSolved",
5
],
[
"mutall",
"🧫",
"জিনোম ডিটেকটিভ",
"সবগুলো মিউটেশন কেস সমাধান করো",
"mutSolved",
99
],
[
"lab1",
"🥼",
"ল্যাব ইন্টার্ন",
"ল্যাব নোটবুকে ১টি এন্ট্রি লেখো",
"labEntries",
1
],
[
"lab10",
"⚗️",
"ল্যাব মাস্টার",
"ল্যাব নোটবুকে ১০টি এন্ট্রি লেখো",
"labEntries",
10
],
[
"exam3",
"📝",
"পরীক্ষার্থী",
"পরীক্ষা ট্যাবে ৩টি পরীক্ষা দাও",
"exams",
3
],
[
"war1",
"⚔️",
"ব্যাচ যোদ্ধা",
"ব্যাচ ওয়ারের দৈনিক কুইজ একবার দাও",
"warDays",
1
],
[
"war7",
"🛡️",
"৭ দিনের সৈনিক",
"ব্যাচ ওয়ারের দৈনিক কুইজ ৭ দিন দাও",
"warDays",
7
]
,
[
"dx_ts3",
"🔧",
"ট্রাবলশুটার",
"ডায়াগনস্টিক ল্যাবে ৩টি PCR/জেল সমস্যা সমাধান করো",
"dxTs",
3
],
[
"dx_fo2",
"🕵️",
"ল্যাব ডিটেকটিভ",
"ডায়াগনস্টিক ল্যাবে ২টি ফরেনসিক কেস শেষ করো",
"dxFo",
2
],
[
"dx_dx3",
"🩺",
"ডা. ডিএনএ",
"ডায়াগনস্টিক ল্যাবে ৩টি রোগীর নির্ণয় সম্পন্ন করো",
"dxDx",
3
],
[
"dx_all",
"🧬",
"গোয়েন্দা-চিকিৎসক",
"ডায়াগনস্টিক ল্যাবের ১০টি কেস সম্পন্ন করো",
"dxAll",
10
]
];
  D.LEVELS = [[0, "নিউক্লিওটাইড"], [100, "কোডন"], [250, "প্রাইমার"], [450, "প্লাজমিড"], [700, "জিন"], [1000, "অপেরন"], [1400, "ক্রোমোজোম"], [1900, "জিনোম"], [2500, "ক্রিসপার"], [3200, "নোবেলজয়ী"]];
})(window);
