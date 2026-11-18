/* GEB Hub: বায়োটেক টুলবক্সের ডেটা (v3.3)
   ENZYMES: n নাম, s সাইট (IUPAC), t/b উপরের/নিচের স্ট্র্যান্ডে সাইটের শুরু থেকে কাটার জায়গা, c=1 হলে "সাধারণ" তালিকায়।
   PROTOCOLS/RECIPES/REAGENTS: যোগ বা বদলাতে এই ফাইলই এডিট করুন (JSON-এর মতো)। প্রোটোকলের ধাপগুলো সাধারণ পাঠ্যবই মানের নমুনা;
   আপনার ল্যাবের ম্যানুয়াল বা শিক্ষকের নির্দেশ সব সময় আগে। */
(function (w) {
  var D = w.GEBData = w.GEBData || {};
  var X = {
 "ENZYMES": [
  {
   "n": "EcoRI",
   "s": "GAATTC",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "BamHI",
   "s": "GGATCC",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "HindIII",
   "s": "AAGCTT",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "XhoI",
   "s": "CTCGAG",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "XbaI",
   "s": "TCTAGA",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "SalI",
   "s": "GTCGAC",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "PstI",
   "s": "CTGCAG",
   "t": 5,
   "b": 1,
   "c": 1
  },
  {
   "n": "SacI",
   "s": "GAGCTC",
   "t": 5,
   "b": 1,
   "c": 1
  },
  {
   "n": "KpnI",
   "s": "GGTACC",
   "t": 5,
   "b": 1,
   "c": 1
  },
  {
   "n": "NcoI",
   "s": "CCATGG",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "NdeI",
   "s": "CATATG",
   "t": 2,
   "b": 4,
   "c": 1
  },
  {
   "n": "NotI",
   "s": "GCGGCCGC",
   "t": 2,
   "b": 6,
   "c": 1
  },
  {
   "n": "SmaI",
   "s": "CCCGGG",
   "t": 3,
   "b": 3,
   "c": 1
  },
  {
   "n": "EcoRV",
   "s": "GATATC",
   "t": 3,
   "b": 3,
   "c": 1
  },
  {
   "n": "SphI",
   "s": "GCATGC",
   "t": 5,
   "b": 1,
   "c": 1
  },
  {
   "n": "ClaI",
   "s": "ATCGAT",
   "t": 2,
   "b": 4,
   "c": 1
  },
  {
   "n": "NheI",
   "s": "GCTAGC",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "SpeI",
   "s": "ACTAGT",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "BglII",
   "s": "AGATCT",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "MluI",
   "s": "ACGCGT",
   "t": 1,
   "b": 5,
   "c": 1
  },
  {
   "n": "XmaI",
   "s": "CCCGGG",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "ApaI",
   "s": "GGGCCC",
   "t": 5,
   "b": 1,
   "c": 0
  },
  {
   "n": "AvrII",
   "s": "CCTAGG",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "HpaI",
   "s": "GTTAAC",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "PvuII",
   "s": "CAGCTG",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "PvuI",
   "s": "CGATCG",
   "t": 4,
   "b": 2,
   "c": 0
  },
  {
   "n": "ScaI",
   "s": "AGTACT",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "BspEI",
   "s": "TCCGGA",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "AgeI",
   "s": "ACCGGT",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "NsiI",
   "s": "ATGCAT",
   "t": 5,
   "b": 1,
   "c": 0
  },
  {
   "n": "SacII",
   "s": "CCGCGG",
   "t": 4,
   "b": 2,
   "c": 0
  },
  {
   "n": "StuI",
   "s": "AGGCCT",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "SnaBI",
   "s": "TACGTA",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "BsrGI",
   "s": "TGTACA",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "AatII",
   "s": "GACGTC",
   "t": 5,
   "b": 1,
   "c": 0
  },
  {
   "n": "BclI",
   "s": "TGATCA",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "BsiWI",
   "s": "CGTACG",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "ApaLI",
   "s": "GTGCAC",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "AflII",
   "s": "CTTAAG",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "BstBI",
   "s": "TTCGAA",
   "t": 2,
   "b": 4,
   "c": 0
  },
  {
   "n": "BspHI",
   "s": "TCATGA",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "PciI",
   "s": "ACATGT",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "EagI",
   "s": "CGGCCG",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "NruI",
   "s": "TCGCGA",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "KasI",
   "s": "GGCGCC",
   "t": 1,
   "b": 5,
   "c": 0
  },
  {
   "n": "NaeI",
   "s": "GCCGGC",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "DraI",
   "s": "TTTAAA",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "SspI",
   "s": "AATATT",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "HaeIII",
   "s": "GGCC",
   "t": 2,
   "b": 2,
   "c": 0
  },
  {
   "n": "AluI",
   "s": "AGCT",
   "t": 2,
   "b": 2,
   "c": 0
  },
  {
   "n": "TaqI",
   "s": "TCGA",
   "t": 1,
   "b": 3,
   "c": 0
  },
  {
   "n": "MspI",
   "s": "CCGG",
   "t": 1,
   "b": 3,
   "c": 0
  },
  {
   "n": "HhaI",
   "s": "GCGC",
   "t": 3,
   "b": 1,
   "c": 0
  },
  {
   "n": "Sau3AI",
   "s": "GATC",
   "t": 0,
   "b": 4,
   "c": 0
  },
  {
   "n": "HincII",
   "s": "GTYRAC",
   "t": 3,
   "b": 3,
   "c": 0
  },
  {
   "n": "AccI",
   "s": "GTMKAC",
   "t": 2,
   "b": 4,
   "c": 0
  },
  {
   "n": "BstEII",
   "s": "GGTNACC",
   "t": 1,
   "b": 6,
   "c": 0
  },
  {
   "n": "XmnI",
   "s": "GAANNNNTTC",
   "t": 5,
   "b": 5,
   "c": 0
  },
  {
   "n": "SfiI",
   "s": "GGCCNNNNNGGCC",
   "t": 8,
   "b": 5,
   "c": 0
  },
  {
   "n": "BsaI",
   "s": "GGTCTC",
   "t": 7,
   "b": 11,
   "c": 0
  },
  {
   "n": "BsmBI",
   "s": "CGTCTC",
   "t": 7,
   "b": 11,
   "c": 0
  },
  {
   "n": "BbsI",
   "s": "GAAGAC",
   "t": 8,
   "b": 12,
   "c": 0
  },
  {
   "n": "FokI",
   "s": "GGATG",
   "t": 14,
   "b": 18,
   "c": 0
  }
 ],
 "SAMPLE_SEQ": "TTTGGTATTAAGAATTTGCAGTACGAATTCCATATGACACGGGGCATCTCGTTCCTGAGTGTTGTAGGCGTGTCGCTGGTGGTCGCCCAAATTGGCCCGTCTAAATGCTCAGCGACGAGGTCCACTGTATTGTACCACCTAGAGCGTTCACAAGAATGTGAGTGGGAGTTGGCAGGTCTGATAATGGCTAAACCGCGACTAGACGAGATTTCAGTTGCCCACGGTACTAGAGCCGCACCTCCAAGTTATGAAGGCGAACGCATGAGCACCTCCACCAATGTTGTGCCCGACACTTTGGACGGAACCCCAAGTCGTGATCTAGTAGTAAAACTTGCGCGGCGCTTCCCAAAATCCAAGTGCATTATAGCATCCGATTACCGATTTTTCAGCGCAAACTATTCAAGTGGGATCGATGGGATAACTTCCCAAATCCACAACTTCCATTACTCGCATTGTCCAGGAACACGACGTAATTCACCAGAGGCTATAAGGTGCTCTCATTCCGGGGACCCGTACGATACACCCTACCTTCTGTTACTGAGAGTGCACGCTAGGGAAAGACGTCGTACACGCGCTAGTTATATCATACGGTTGCCTTGGTGTTATACTGAAATGCGAATATGCAGGTCCCGTAACCCAATGGGGGGCAACAGCTGTGGACGTGAACGTGGGGCAACTCAACATCTCCCTCAACAAGTTGATTGCTCGCGACTCATTTCCATCACTACGAGCGCAACGGTGCCGTATGAGTAAGGATCCAAGCTTCTCGAGTTTAGCCACAGCAGTTCA",
 "REAGENTS": [
  [
   "NaCl (সোডিয়াম ক্লোরাইড)",
   58.44
  ],
  [
   "KCl (পটাসিয়াম ক্লোরাইড)",
   74.55
  ],
  [
   "Tris base",
   121.14
  ],
  [
   "Tris-HCl",
   157.6
  ],
  [
   "EDTA, disodium dihydrate (Na₂EDTA·2H₂O)",
   372.24
  ],
  [
   "EDTA, free acid",
   292.24
  ],
  [
   "MgCl₂ (anhydrous)",
   95.21
  ],
  [
   "MgCl₂·6H₂O",
   203.3
  ],
  [
   "CaCl₂ (anhydrous)",
   110.98
  ],
  [
   "CaCl₂·2H₂O",
   147.01
  ],
  [
   "Glucose",
   180.16
  ],
  [
   "Sucrose",
   342.3
  ],
  [
   "SDS",
   288.38
  ],
  [
   "NaOH",
   40.0
  ],
  [
   "Glycine",
   75.07
  ],
  [
   "Boric acid",
   61.83
  ],
  [
   "Na₂HPO₄ (anhydrous)",
   141.96
  ],
  [
   "NaH₂PO₄ (anhydrous)",
   119.98
  ],
  [
   "KH₂PO₄",
   136.09
  ],
  [
   "Sodium acetate (anhydrous)",
   82.03
  ],
  [
   "Sodium acetate trihydrate",
   136.08
  ],
  [
   "Ammonium persulfate (APS)",
   228.2
  ],
  [
   "Acrylamide",
   71.08
  ],
  [
   "IPTG",
   238.3
  ],
  [
   "Ammonium sulfate",
   132.14
  ]
 ],
 "ACIDS": [
  [
   "HCl, ঘন (37%)",
   37,
   1.19,
   36.46
  ],
  [
   "Acetic acid, glacial (~99.7%)",
   99.7,
   1.049,
   60.05
  ],
  [
   "H₂SO₄, ঘন (98%)",
   98,
   1.84,
   98.08
  ],
  [
   "HNO₃, ঘন (~70%)",
   70,
   1.41,
   63.01
  ],
  [
   "Ethanol, absolute (~99.8%)",
   99.8,
   0.789,
   46.07
  ]
 ],
 "RECIPES": [
  {
   "id": "tae50",
   "t": "TAE buffer, 50× stock",
   "base": 1000,
   "items": [
    [
     "Tris base",
     242,
     "g"
    ],
    [
     "Glacial acetic acid",
     57.1,
     "ml"
    ],
    [
     "0.5 M EDTA (pH 8.0)",
     100,
     "ml"
    ]
   ],
   "note": "পানি দিয়ে মোট আয়তন করুন। ব্যবহারের সময় ১:৫০ পাতলা করুন (1× = 40 mM Tris, 20 mM acetate, 1 mM EDTA)।"
  },
  {
   "id": "tbe10",
   "t": "TBE buffer, 10× stock",
   "base": 1000,
   "items": [
    [
     "Tris base",
     108,
     "g"
    ],
    [
     "Boric acid",
     55,
     "g"
    ],
    [
     "0.5 M EDTA (pH 8.0)",
     40,
     "ml"
    ]
   ],
   "note": "ব্যবহারের সময় ১:১০ পাতলা করুন (1× = 89 mM Tris, 89 mM borate, 2 mM EDTA)।"
  },
  {
   "id": "edta",
   "t": "0.5 M EDTA, pH 8.0",
   "base": 1000,
   "items": [
    [
     "Na₂EDTA·2H₂O",
     186.1,
     "g"
    ],
    [
     "NaOH pellets (pH ঠিক করতে, প্রায়)",
     20,
     "g"
    ]
   ],
   "note": "EDTA শুধু pH ৮.০-এর কাছে গলে। আগে অর্ধেক পানিতে মেশান, NaOH দিয়ে pH ৮.০ করুন, তারপর আয়তন পূরণ করে অটোক্লেভ করুন।"
  },
  {
   "id": "tris8",
   "t": "1 M Tris-HCl, pH 8.0",
   "base": 1000,
   "items": [
    [
     "Tris base",
     121.1,
     "g"
    ],
    [
     "ঘন HCl (pH ৮.০-এর জন্য প্রায়)",
     42,
     "ml"
    ]
   ],
   "note": "অর্ধেক পানিতে Tris গুলে ধীরে ধীরে HCl দিয়ে pH ৮.০ করুন। Tris-এর pH তাপমাত্রায় বদলায়, তাই ব্যবহারের তাপমাত্রায় pH মাপুন।"
  },
  {
   "id": "te",
   "t": "TE buffer, pH 8.0 (10 mM Tris, 1 mM EDTA)",
   "base": 1000,
   "items": [
    [
     "1 M Tris-HCl, pH 8.0",
     10,
     "ml"
    ],
    [
     "0.5 M EDTA, pH 8.0",
     2,
     "ml"
    ]
   ],
   "note": "পানি দিয়ে আয়তন পূরণ করে অটোক্লেভ করুন।"
  },
  {
   "id": "lb",
   "t": "LB broth (Luria–Bertani)",
   "base": 1000,
   "items": [
    [
     "Tryptone",
     10,
     "g"
    ],
    [
     "Yeast extract",
     5,
     "g"
    ],
    [
     "NaCl",
     10,
     "g"
    ]
   ],
   "note": "pH ৭.০ করে অটোক্লেভ (১২১°C, ১৫ মিনিট)। LB agar-এর জন্য প্রতি লিটারে ১৫ g agar যোগ করুন। অ্যান্টিবায়োটিক ঠান্ডা হয়ে ~৫০°C হলে দিন।"
  },
  {
   "id": "pbs",
   "t": "PBS, 10× stock",
   "base": 1000,
   "items": [
    [
     "NaCl",
     80,
     "g"
    ],
    [
     "KCl",
     2,
     "g"
    ],
    [
     "Na₂HPO₄ (anhydrous)",
     14.4,
     "g"
    ],
    [
     "KH₂PO₄",
     2.4,
     "g"
    ]
   ],
   "note": "১০× থেকে ১:১০ পাতলা করে 1× PBS (pH ~৭.৪) হয়। অটোক্লেভ করুন।"
  },
  {
   "id": "saline",
   "t": "Physiological saline (0.85% NaCl)",
   "base": 1000,
   "items": [
    [
     "NaCl",
     8.5,
     "g"
    ]
   ],
   "note": "সিরিয়াল ডাইলুশনের ডাইলুয়েন্ট হিসেবে ব্যবহার হয়। অটোক্লেভ করুন।"
  },
  {
   "id": "run10",
   "t": "SDS-PAGE running buffer, 10×",
   "base": 1000,
   "items": [
    [
     "Tris base",
     30.3,
     "g"
    ],
    [
     "Glycine",
     144,
     "g"
    ],
    [
     "SDS",
     10,
     "g"
    ]
   ],
   "note": "১:১০ পাতলা করে ব্যবহার করুন (25 mM Tris, 192 mM glycine, 0.1% SDS)। pH ঠিক করার দরকার নেই (~৮.৩)।"
  },
  {
   "id": "transfer",
   "t": "Western transfer buffer, 1×",
   "base": 1000,
   "items": [
    [
     "Tris base",
     3.03,
     "g"
    ],
    [
     "Glycine",
     14.4,
     "g"
    ],
    [
     "Methanol",
     200,
     "ml"
    ]
   ],
   "note": "ঠান্ডা অবস্থায় ব্যবহার করুন। মেথানল বিষাক্ত, ফিউম হুডে মাপুন।"
  },
  {
   "id": "sol1",
   "t": "Alkaline lysis Solution I",
   "base": 100,
   "items": [
    [
     "Glucose",
     0.9,
     "g"
    ],
    [
     "1 M Tris-HCl, pH 8.0",
     2.5,
     "ml"
    ],
    [
     "0.5 M EDTA, pH 8.0",
     2,
     "ml"
    ]
   ],
   "note": "50 mM glucose, 25 mM Tris-HCl, 10 mM EDTA। অটোক্লেভ করে ৪°C-এ রাখুন।"
  },
  {
   "id": "sol2",
   "t": "Alkaline lysis Solution II",
   "base": 100,
   "items": [
    [
     "10 N NaOH",
     2,
     "ml"
    ],
    [
     "10% SDS",
     10,
     "ml"
    ]
   ],
   "note": "0.2 N NaOH, 1% SDS। প্রতিবার টাটকা বানান।"
  },
  {
   "id": "sol3",
   "t": "Alkaline lysis Solution III",
   "base": 100,
   "items": [
    [
     "5 M potassium acetate",
     60,
     "ml"
    ],
    [
     "Glacial acetic acid",
     11.5,
     "ml"
    ],
    [
     "পানি",
     28.5,
     "ml"
    ]
   ],
   "note": "ফলাফল: 3 M potassium, 5 M acetate (pH ~৫.৫)। ৪°C-এ রাখুন।"
  },
  {
   "id": "ctab",
   "t": "CTAB extraction buffer",
   "base": 100,
   "items": [
    [
     "CTAB",
     2,
     "g"
    ],
    [
     "1 M Tris-HCl, pH 8.0",
     10,
     "ml"
    ],
    [
     "0.5 M EDTA, pH 8.0",
     4,
     "ml"
    ],
    [
     "NaCl",
     8.18,
     "g"
    ],
    [
     "PVP-40 (ঐচ্ছিক)",
     1,
     "g"
    ]
   ],
   "note": "2% CTAB, 100 mM Tris, 20 mM EDTA, 1.4 M NaCl। β-mercaptoethanol (০.২%) ব্যবহারের ঠিক আগে দিন। ৬৫°C-এ গরম করে ব্যবহার করুন।"
  },
  {
   "id": "dye6",
   "t": "6× DNA loading dye",
   "base": 10,
   "items": [
    [
     "Bromophenol blue",
     25,
     "mg"
    ],
    [
     "Xylene cyanol FF",
     25,
     "mg"
    ],
    [
     "Glycerol",
     3,
     "ml"
    ]
   ],
   "note": "পানি দিয়ে ১০ ml করুন (০.২৫% রঞ্জক, ৩০% গ্লিসারল)। ৪°C-এ রাখুন।"
  },
  {
   "id": "etoh70",
   "t": "70% ethanol (v/v)",
   "base": 100,
   "items": [
    [
     "Absolute ethanol",
     70,
     "ml"
    ],
    [
     "পানি",
     30,
     "ml"
    ]
   ],
   "note": "হাত ও বেঞ্চ জীবাণুমুক্ত করতে এবং DNA পেলেট ধুতে।"
  },
  {
   "id": "cacl2",
   "t": "0.1 M CaCl₂",
   "base": 100,
   "items": [
    [
     "CaCl₂ (anhydrous)",
     1.11,
     "g"
    ]
   ],
   "note": "পানিতে গুলে ফিল্টার বা অটোক্লেভ করুন, ঠান্ডা রাখুন। কম্পিটেন্ট সেল বানাতে।"
  },
  {
   "id": "sds10",
   "t": "10% SDS",
   "base": 100,
   "items": [
    [
     "SDS",
     10,
     "g"
    ]
   ],
   "note": "৬৮°C-এ গরম করে গুলুন, অটোক্লেভ করবেন না। গুঁড়া মাপার সময় মাস্ক পরুন।"
  },
  {
   "id": "aps10",
   "t": "10% APS (ammonium persulfate)",
   "base": 10,
   "items": [
    [
     "APS",
     1,
     "g"
    ]
   ],
   "note": "টাটকা বানানো সবচেয়ে ভালো (৪°C-এ কয়েক দিন চলে)। SDS-PAGE জেল জমাতে।"
  },
  {
   "id": "nacl5",
   "t": "5 M NaCl",
   "base": 1000,
   "items": [
    [
     "NaCl",
     292.2,
     "g"
    ]
   ],
   "note": "গুলে আয়তন পূরণ করুন, অটোক্লেভ করুন।"
  },
  {
   "id": "naac",
   "t": "3 M sodium acetate, pH 5.2",
   "base": 100,
   "items": [
    [
     "Sodium acetate trihydrate",
     40.8,
     "g"
    ]
   ],
   "note": "গ্লেসিয়াল অ্যাসেটিক অ্যাসিড দিয়ে pH ৫.২ করুন, অটোক্লেভ করুন। DNA ইথানল প্রেসিপিটেশনে।"
  },
  {
   "id": "amp",
   "t": "Ampicillin stock, 100 mg/ml",
   "base": 10,
   "items": [
    [
     "Ampicillin sodium",
     1,
     "g"
    ]
   ],
   "note": "পানিতে গুলে ০.২২ µm ফিল্টার করুন, ভাগ করে −২০°C-এ রাখুন। ১:১০০০ দিলে ১০০ µg/ml।"
  },
  {
   "id": "kan",
   "t": "Kanamycin stock, 50 mg/ml",
   "base": 10,
   "items": [
    [
     "Kanamycin sulfate",
     0.5,
     "g"
    ]
   ],
   "note": "ফিল্টার করে −২০°C-এ রাখুন। ১:১০০০ দিলে ৫০ µg/ml।"
  },
  {
   "id": "iptg",
   "t": "IPTG, 0.1 M",
   "base": 10,
   "items": [
    [
     "IPTG",
     0.238,
     "g"
    ]
   ],
   "note": "পানিতে গুলে ফিল্টার করুন, −২০°C-এ রাখুন। ব্যবহার ০.১–১ mM।"
  },
  {
   "id": "xgal",
   "t": "X-gal, 20 mg/ml",
   "base": 10,
   "items": [
    [
     "X-gal",
     0.2,
     "g"
    ]
   ],
   "note": "Dimethylformamide (DMF)-এ গুলুন (পানিতে নয়), আলো থেকে বাঁচিয়ে −২০°C-এ রাখুন। প্লেটে সাধারণত ৪০ µl ছড়ানো হয়।"
  },
  {
   "id": "coom",
   "t": "Coomassie staining solution",
   "base": 1000,
   "items": [
    [
     "Coomassie Brilliant Blue R-250",
     1,
     "g"
    ],
    [
     "Methanol",
     400,
     "ml"
    ],
    [
     "Glacial acetic acid",
     100,
     "ml"
    ],
    [
     "পানি",
     500,
     "ml"
    ]
   ],
   "note": "০.১% R-250, ৪০% মেথানল, ১০% অ্যাসেটিক অ্যাসিড। ডিস্টেইন: ৪০% মেথানল + ১০% অ্যাসেটিক অ্যাসিড (রঞ্জক ছাড়া)।"
  },
  {
   "id": "ms",
   "t": "MS medium (Murashige & Skoog) with sucrose and agar",
   "base": 1000,
   "items": [
    [
     "MS basal salts with vitamins (প্যাকেটের নির্দেশ দেখুন)",
     4.4,
     "g"
    ],
    [
     "Sucrose",
     30,
     "g"
    ],
    [
     "Agar",
     8,
     "g"
    ]
   ],
   "note": "pH ৫.৮ করুন (অটোক্লেভের আগে)। প্রতিটি প্যাকেটের পরিমাণ আলাদা হতে পারে, প্যাকেটের লেবেল মানুন। বৃদ্ধি নিয়ামক (যেমন 2,4-D) অটোক্লেভের আগে বা পরে স্টক থেকে দিন।"
  }
 ],
 "PROTOCOLS": [
  {
   "id": "pcr",
   "t": "PCR (Polymerase Chain Reaction)",
   "cat": "DNA",
   "aim": "To amplify a specific DNA fragment from a template using a pair of primers and Taq DNA polymerase.",
   "mat": [
    "Template DNA (10–100 ng genomic or 1–10 ng plasmid)",
    "Forward and reverse primers (10 µM stocks)",
    "10× Taq buffer (with MgCl₂)",
    "dNTP mix (10 mM each)",
    "Taq DNA polymerase (5 U/µl)",
    "Nuclease-free water",
    "Thin-walled PCR tubes and a thermal cycler"
   ],
   "steps": [
    "Thaw the reagents on ice, mix gently and spin down. Keep the polymerase in a freezer block until the last moment.",
    "Prepare a master mix for N reactions plus about 10% extra (use the PCR mix calculator). A typical 25 µl reaction contains 2.5 µl 10× buffer, 0.5 µl dNTP mix (200 µM each), 1 µl of each primer (0.4 µM), 0.125 µl Taq (0.625 U), 1–2 µl template and water to 25 µl.",
    "Dispense the master mix into the tubes, then add the template to each tube separately. Always include a no-template control (NTC).",
    "Initial denaturation: 95 °C for 3 min.",
    "30–35 cycles of: denaturation 95 °C for 30 s; annealing at about Tm − 5 °C for 30 s; extension 72 °C for 1 min per kb.",
    "Final extension: 72 °C for 5–10 min, then hold at 4 °C.",
    "Check 5 µl of the product on a 1–1.5% agarose gel next to a DNA ladder."
   ],
   "tips": [
    "অ্যানিলিং তাপমাত্রা খুব কম হলে একাধিক ব্যান্ড আসে, খুব বেশি হলে ব্যান্ডই আসে না। ৩–৫°C করে বাড়িয়ে-কমিয়ে দেখুন (gradient PCR থাকলে সহজ)।",
    "ব্যান্ড না এলে: টেমপ্লেট বাড়ান বা পাতলা করুন, MgCl₂ ০.৫ mM করে বাড়ান, চক্র বাড়ান, প্রাইমারের সিকোয়েন্স আবার দেখুন।",
    "নেগেটিভ কন্ট্রোলে (NTC) ব্যান্ড মানে কন্টামিনেশন। নতুন রিএজেন্ট নিন এবং PCR মিক্স আলাদা জায়গায় বানান।",
    "Taq-এর proofreading নেই। ক্লোনিংয়ে ভুল কমাতে Pfu/Q5/Phusion-জাতীয় high-fidelity এনজাইম নিন।"
   ],
   "safe": "",
   "go": "pcr"
  },
  {
   "id": "gel",
   "t": "Agarose Gel Electrophoresis",
   "cat": "DNA",
   "aim": "To separate and visualise DNA fragments according to their size.",
   "mat": [
    "Agarose",
    "1× TAE or TBE buffer",
    "DNA stain (ethidium bromide, or a safer dye such as SYBR Safe or GelRed)",
    "6× loading dye",
    "DNA ladder",
    "Casting tray and comb, electrophoresis tank, power supply",
    "UV or blue-light transilluminator"
   ],
   "steps": [
    "Weigh the agarose for the required percentage (1% = 1 g per 100 ml of buffer; see the gel calculator).",
    "Add the agarose to 1× TAE in a flask (not more than one third full) and heat in a microwave, swirling, until the solution is completely clear.",
    "Cool to about 50–60 °C and add the stain (for example ethidium bromide to 0.5 µg/ml). Swirl gently without making bubbles.",
    "Pour into the sealed tray with the comb in place and let it set for 20–30 minutes.",
    "Remove the comb, place the gel in the tank and cover it with 1× running buffer to about 3–5 mm above the gel.",
    "Mix 5 µl of sample with 1 µl of 6× loading dye and load it into a well. Load a DNA ladder in one well.",
    "Run at about 5–8 V per cm of electrode distance (commonly 80–100 V) for 30–45 min, until the dye has moved about two thirds of the gel. DNA runs towards the positive electrode.",
    "Visualise on a transilluminator and photograph the gel."
   ],
   "tips": [
    "জেলের শতকরা হার: ০.৭% প্রায় ০.৮–১০ kb, ১% প্রায় ০.৫–৭ kb, ১.৫% প্রায় ০.২–৩ kb, ২% প্রায় ০.১–২ kb আলাদা করে। ছোট DNA-র জন্য বেশি %, বড় DNA-র জন্য কম % নিন।",
    "জেল বানানো ও চালানোর জন্য একই বাফার (TAE বা TBE) ব্যবহার করুন।",
    "ব্যান্ড ঝাপসা বা ছড়ানো হলে ভোল্টেজ কমান; কূপ ভরে গেলে নমুনা কম দিন।"
   ],
   "safe": "Ethidium bromide mutagen হতে পারে: গ্লাভস পরুন এবং বর্জ্য আলাদা পাত্রে ফেলুন। UV আলো থেকে চোখ ও ত্বক বাঁচান (ফেস শিল্ড বা গগলস)।",
   "go": "gel"
  },
  {
   "id": "miniprep",
   "t": "Plasmid DNA Isolation (Alkaline Lysis Miniprep)",
   "cat": "DNA",
   "aim": "To isolate plasmid DNA from an overnight E. coli culture.",
   "mat": [
    "Overnight E. coli culture in LB with the proper antibiotic",
    "Solution I (50 mM glucose, 25 mM Tris-HCl pH 8.0, 10 mM EDTA)",
    "Solution II (0.2 N NaOH, 1% SDS; prepared fresh)",
    "Solution III (3 M potassium, 5 M acetate)",
    "Isopropanol, 70% ethanol, TE buffer or nuclease-free water",
    "RNase A (optional), microcentrifuge"
   ],
   "steps": [
    "Transfer 1.5 ml of the overnight culture to a microcentrifuge tube, centrifuge at 12,000 g for 1 min and discard the supernatant. Repeat once to collect more cells.",
    "Resuspend the pellet completely in 100 µl ice-cold Solution I by vortexing (RNase A may be added to 100 µg/ml).",
    "Add 200 µl freshly prepared Solution II. Invert the tube gently 5–6 times (do not vortex) and keep at room temperature for not more than 5 min. The solution becomes clear and viscous.",
    "Add 150 µl ice-cold Solution III, invert to mix and incubate on ice for 5 min. A white precipitate of SDS, protein and chromosomal DNA forms.",
    "Centrifuge at 12,000 g for 10 min at 4 °C and transfer the supernatant to a fresh tube.",
    "Add 0.6–0.7 volume of isopropanol (or 2 volumes of ethanol), mix and incubate at room temperature for 2 min. Centrifuge at 12,000 g for 10 min.",
    "Wash the pellet with 500 µl of 70% ethanol, centrifuge for 2 min and remove the ethanol carefully.",
    "Air-dry the pellet for 5–10 min (do not over-dry) and dissolve it in 30–50 µl TE or water. Check on an agarose gel and measure the concentration."
   ],
   "tips": [
    "Solution II সবসময় টাটকা বানান, আর ৫ মিনিটের বেশি রাখবেন না; নইলে ক্রোমোজোমাল DNA ভেঙে প্লাজমিডের সাথে মিশে যায়।",
    "ভোর্টেক্স নয়, আস্তে উল্টান; তাহলে জিনোমিক DNA ছিঁড়ে যায় না।",
    "জেলে একই প্লাজমিডের তিনটি ব্যান্ড দেখা যেতে পারে (supercoiled, linear, nicked/open circular); supercoiled সবচেয়ে দ্রুত যায়।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "ctab",
   "t": "Genomic DNA Extraction from Plant Leaves (CTAB method)",
   "cat": "DNA",
   "aim": "To extract high-quality genomic DNA from plant tissue.",
   "mat": [
    "Young leaf tissue (about 100 mg)",
    "Liquid nitrogen, mortar and pestle",
    "CTAB buffer (2% CTAB, 100 mM Tris-HCl pH 8.0, 20 mM EDTA, 1.4 M NaCl, 1% PVP)",
    "β-mercaptoethanol",
    "Chloroform:isoamyl alcohol (24:1)",
    "Ice-cold isopropanol, 70% ethanol, TE buffer, RNase A",
    "Water bath at 65 °C, microcentrifuge"
   ],
   "steps": [
    "Grind about 100 mg of young leaf to a fine powder in liquid nitrogen using a pre-chilled mortar and pestle.",
    "Transfer the powder to a tube containing 700 µl of pre-warmed (65 °C) CTAB buffer to which 0.2% β-mercaptoethanol has been added just before use. Mix well.",
    "Incubate at 65 °C for 30–60 min, mixing by inversion every 10 min.",
    "Cool to room temperature, add an equal volume of chloroform:isoamyl alcohol (24:1) and mix by inversion for 5 min.",
    "Centrifuge at 12,000 g for 10 min. Transfer the upper aqueous phase to a fresh tube (repeat the extraction if it is cloudy).",
    "Add 0.7 volume of ice-cold isopropanol, mix gently and keep at −20 °C for 30 min or overnight. DNA appears as white threads.",
    "Centrifuge at 12,000 g for 10 min, discard the supernatant and wash the pellet twice with 70% ethanol.",
    "Air-dry the pellet and dissolve it in 50–100 µl TE. Add RNase A (10 µg/ml final) and incubate at 37 °C for 30 min.",
    "Assess the quality by A260/A280 (about 1.8) and on a 0.8% agarose gel."
   ],
   "tips": [
    "পেলেট বাদামি বা আঠালো হলে পলিফেনল/পলিস্যাকারাইড মিশে আছে। PVP ও NaCl-এর পরিমাণ বাড়ান।",
    "A260/A230 কম (২.০ থেকে অনেক নিচে) মানে ফেনল, লবণ বা কার্বোহাইড্রেট থেকে গেছে।"
   ],
   "safe": "ক্লোরোফর্ম ও β-mercaptoethanol ফিউম হুডে ব্যবহার করুন। তরল নাইট্রোজেন ধরার সময় গ্লাভস ও গগলস পরুন।",
   "go": "quant"
  },
  {
   "id": "digest",
   "t": "Restriction Digestion",
   "cat": "DNA",
   "aim": "To cut DNA with one or more restriction enzymes for mapping or cloning.",
   "mat": [
    "DNA (0.5–1 µg)",
    "Restriction enzyme(s)",
    "10× reaction buffer compatible with the enzyme(s)",
    "Nuclease-free water",
    "37 °C incubator or water bath"
   ],
   "steps": [
    "On ice, add in this order for a 20 µl reaction: water, 2 µl of 10× buffer, DNA (about 1 µg) and, last, 1 µl of enzyme (about 10 U).",
    "Mix by gentle pipetting and spin briefly.",
    "Incubate at the optimum temperature of the enzyme (usually 37 °C) for 1 hour. Many modern enzymes finish in 15–60 min.",
    "If required, heat-inactivate as given in the enzyme datasheet (often 65 °C or 80 °C for 20 min), or stop the reaction by adding loading dye containing EDTA/SDS.",
    "Analyse 5–10 µl on an agarose gel along with undigested DNA and a ladder."
   ],
   "tips": [
    "এনজাইমের আয়তন মোট রিঅ্যাকশনের ১০%-এর বেশি রাখবেন না। গ্লিসারল ৫%-এর বেশি হলে star activity (অনির্দিষ্ট জায়গায় কাটা) হতে পারে।",
    "দুটি এনজাইম একসাথে দিলে (double digest) একই বাফারে দুটোই কাজ করে কি না নির্মাতার চার্টে দেখুন।",
    "পুরো না কাটলে সময় বা এনজাইম বাড়ান; DNA-তে ইথানল/লবণ থাকলে আগে পরিষ্কার করুন।",
    "কোন এনজাইম কোথায় কাটবে আগে এই পেজের “রিস্ট্রিকশন ম্যাপ” দিয়ে দেখে নিন।"
   ],
   "safe": "",
   "go": "restr"
  },
  {
   "id": "ligation",
   "t": "DNA Ligation (Vector + Insert)",
   "cat": "Cloning",
   "aim": "To join a digested insert into a digested vector using T4 DNA ligase.",
   "mat": [
    "Digested vector (dephosphorylated if cut with a single enzyme)",
    "Digested insert",
    "T4 DNA ligase",
    "10× T4 ligase buffer (contains ATP)",
    "Nuclease-free water"
   ],
   "steps": [
    "Estimate the concentration of the vector and the insert (gel or spectrophotometer).",
    "Calculate the insert amount for a vector:insert molar ratio of 1:3 (see the ligation calculator). Typically 50 ng of vector is used in 10–20 µl.",
    "Mix 1 µl of 10× ligase buffer, vector, insert, 1 µl of T4 DNA ligase and water to 10 µl.",
    "Incubate at 16 °C overnight, or at room temperature for 1–2 hours for sticky ends (follow the kit manual if a quick ligase is used).",
    "Transform 2–5 µl of the mixture into competent cells.",
    "Include controls: vector with ligase but without insert (background from self-ligation), and uncut vector."
   ],
   "tips": [
    "Blunt-end লাইগেশনে ইনসার্ট বেশি লাগে (প্রায় ১:৫ থেকে ১:১০ অনুপাত)।",
    "ATP ছাড়া লাইগেশন হয় না। লাইগেজ বাফার বারবার গলালে ATP নষ্ট হয়, তাই ছোট ছোট ভাগ করে রাখুন।",
    "একই এনজাইমে কাটা ভেক্টর নিজে নিজে জোড়া লাগতে পারে; ফসফেট সরিয়ে (CIP/SAP) এটা কমানো যায়।"
   ],
   "safe": "",
   "go": "ligation"
  },
  {
   "id": "quant",
   "t": "DNA / RNA Quantification (A260 / A280)",
   "cat": "DNA",
   "aim": "To measure the concentration and purity of nucleic acid by UV absorbance.",
   "mat": [
    "Spectrophotometer or microvolume spectrophotometer",
    "Quartz cuvette (for a conventional instrument)",
    "Buffer or water in which the sample is dissolved (blank)"
   ],
   "steps": [
    "Blank the instrument with the same buffer or water in which the nucleic acid is dissolved.",
    "Dilute the sample (for example 1:50 or 1:100) so that A260 falls between about 0.1 and 1.0.",
    "Read the absorbance at 230, 260 and 280 nm.",
    "Concentration (µg/ml) = A260 × dilution factor × 50 for double-stranded DNA (×40 for RNA, ×33 for single-stranded DNA).",
    "Purity: A260/A280 is about 1.8 for pure DNA and about 2.0 for pure RNA; A260/A230 should be about 2.0–2.2."
   ],
   "tips": [
    "প্রোটিন বা ফেনল থেকে গেলে A260/A280 কমে যায়; ফেনল, লবণ ও কার্বোহাইড্রেট থাকলে A260/A230 কমে।",
    "A260/A280 শুধু বিশুদ্ধতার ধারণা দেয়, DNA অক্ষত কি না জানতে জেলে দেখুন।",
    "ক্যালকুলেটর অংশের “DNA ঘনত্ব (A260)” দিয়ে হিসাব করা যায়।"
   ],
   "safe": "",
   "go": "calc:a260"
  },
  {
   "id": "sdspage",
   "t": "SDS-PAGE (Laemmli, 12% resolving gel)",
   "cat": "Protein",
   "aim": "To separate proteins according to their molecular mass.",
   "mat": [
    "30% acrylamide/bis solution",
    "1.5 M Tris-HCl pH 8.8 and 1.0 M Tris-HCl pH 6.8",
    "10% SDS, 10% APS (fresh), TEMED",
    "1× running buffer (25 mM Tris, 192 mM glycine, 0.1% SDS)",
    "Sample buffer (Laemmli) with β-mercaptoethanol or DTT",
    "Protein marker, Coomassie Brilliant Blue R-250",
    "Mini-gel apparatus and power supply"
   ],
   "steps": [
    "Assemble clean glass plates with spacers and check for leaks with water.",
    "For 10 ml of 12% resolving gel mix 3.3 ml water, 4.0 ml 30% acrylamide/bis, 2.5 ml 1.5 M Tris pH 8.8, 0.1 ml 10% SDS, 0.1 ml 10% APS and 4 µl TEMED. Add APS and TEMED last, pour immediately, overlay with water or isopropanol and let it polymerise for 30–45 min.",
    "Pour off the overlay. For 4 ml of 5% stacking gel mix 2.7 ml water, 0.67 ml 30% acrylamide/bis, 0.5 ml 1.0 M Tris pH 6.8, 0.04 ml 10% SDS, 0.04 ml 10% APS and 4 µl TEMED. Pour, insert the comb and let it polymerise for 20–30 min.",
    "Mix the samples with sample buffer, heat at 95 °C for 5 min and spin briefly.",
    "Place the gel in the tank, fill with running buffer, remove the comb and load 10–20 µl of sample and 5 µl of protein marker.",
    "Run at about 80 V until the dye enters the resolving gel, then at 120–150 V until the dye front reaches the bottom (about 60–90 min).",
    "Stain with Coomassie Brilliant Blue R-250 (0.1% in 40% methanol, 10% acetic acid) for 30–60 min and destain until the bands are clear."
   ],
   "tips": [
    "প্রায় ধারণা: ৮% জেল বড় প্রোটিনের (৫০–২০০ kDa), ১২% মাঝারির (২০–১০০ kDa), ১৫% ছোট প্রোটিনের (১০–৫০ kDa) জন্য ভালো।",
    "APS টাটকা না হলে জেল জমবে না। TEMED সবার শেষে দিন।",
    "ব্যান্ড হাসির মতো বাঁকা (smiling) হলে ভোল্টেজ কমান বা বাফার ঠান্ডা রাখুন।"
   ],
   "safe": "অ্যাক্রিলামাইড জমাট বাঁধার আগে স্নায়ুর জন্য বিষাক্ত: গ্লাভস পরুন, ত্বকে লাগতে দেবেন না।",
   "go": ""
  },
  {
   "id": "bradford",
   "t": "Protein Estimation (Bradford assay)",
   "cat": "Protein",
   "aim": "To determine protein concentration using Coomassie Brilliant Blue G-250 dye binding.",
   "mat": [
    "Bradford reagent",
    "BSA standard (for example 1 mg/ml stock)",
    "The buffer in which the samples are dissolved",
    "96-well plate or cuvettes",
    "Plate reader or spectrophotometer (595 nm)"
   ],
   "steps": [
    "Prepare BSA standards (for example 0, 0.1, 0.2, 0.4, 0.6, 0.8 and 1.0 mg/ml) by diluting the stock in the same buffer as the samples.",
    "In a 96-well plate mix 5 µl of each standard or diluted sample with 250 µl of Bradford reagent (microplate format).",
    "Mix and incubate for 5–10 min at room temperature; read within 60 min.",
    "Measure the absorbance at 595 nm, using the 0 mg/ml tube as the blank.",
    "Plot absorbance (y) against concentration (x) for the standards, fit a straight line and calculate the sample concentration from the equation. Multiply by the dilution factor."
   ],
   "tips": [
    "সব রিডিং ডুপ্লিকেটে নিন। নমুনার রিডিং স্ট্যান্ডার্ড কার্ভের পরিসরের ভেতরে থাকতে হবে, নইলে নমুনা আরও পাতলা করুন।",
    "বেশি ডিটারজেন্ট (যেমন SDS) থাকলে রিডিং বিগড়ে যায়।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "western",
   "t": "Western Blotting (overview)",
   "cat": "Protein",
   "aim": "To detect a specific protein in a mixture using antibodies after SDS-PAGE.",
   "mat": [
    "SDS-PAGE gel with separated proteins",
    "PVDF or nitrocellulose membrane, filter paper, sponges",
    "Transfer buffer (25 mM Tris, 192 mM glycine, 20% methanol), cold",
    "Blocking buffer (5% skim milk or BSA in TBST)",
    "Primary antibody, HRP-conjugated secondary antibody",
    "TBST wash buffer, ECL substrate and an imager or film"
   ],
   "steps": [
    "Separate the proteins by SDS-PAGE.",
    "Equilibrate the gel and membrane in cold transfer buffer (activate PVDF in methanol for 15–30 s first).",
    "Assemble the transfer sandwich (sponge, filter paper, gel, membrane, filter paper, sponge) without bubbles, with the membrane on the positive (anode) side of the gel. Transfer at 100 V for 1 h in a cold tank (or 30 V overnight at 4 °C).",
    "Optionally stain with Ponceau S to confirm the transfer, then destain with water or TBST.",
    "Block in 5% skim milk or BSA in TBST for 1 h at room temperature.",
    "Incubate with the primary antibody (diluted in blocking buffer) overnight at 4 °C.",
    "Wash 3 × 5–10 min with TBST.",
    "Incubate with HRP-conjugated secondary antibody for 1 h at room temperature, then wash 3 × 5–10 min.",
    "Add ECL substrate and image with a chemiluminescence imager or X-ray film."
   ],
   "tips": [
    "ব্যাকগ্রাউন্ড বেশি হলে ব্লকিং বা ধোয়ার সময় বাড়ান, অ্যান্টিবডি আরও পাতলা করুন।",
    "ব্যান্ড না এলে আগে Ponceau S দিয়ে দেখুন ট্রান্সফার ঠিকমতো হয়েছে কি না।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "elisa",
   "t": "Indirect ELISA",
   "cat": "Protein",
   "aim": "To detect or quantify an antibody or antigen using an enzyme-linked secondary antibody.",
   "mat": [
    "96-well ELISA plate",
    "Antigen in coating buffer (carbonate-bicarbonate, pH 9.6)",
    "PBST (PBS + 0.05% Tween-20)",
    "Blocking buffer (1–5% BSA or skim milk in PBS)",
    "Samples or serum (primary antibody)",
    "HRP-conjugated secondary antibody, TMB substrate, 1 M H₂SO₄ (stop solution)",
    "Plate reader (450 nm)"
   ],
   "steps": [
    "Coat the wells with 100 µl of antigen (1–10 µg/ml in coating buffer). Incubate overnight at 4 °C.",
    "Wash 3 times with PBST.",
    "Block with 200 µl of blocking buffer for 1–2 h; wash 3 times.",
    "Add 100 µl of diluted sample or serum (primary antibody) and incubate for 1–2 h; wash 3–5 times.",
    "Add 100 µl of HRP-conjugated secondary antibody, incubate for 1 h and wash 3–5 times.",
    "Add 100 µl of TMB substrate and develop in the dark for 10–20 min (blue colour).",
    "Stop the reaction with 50–100 µl of 1 M H₂SO₄ (colour turns yellow).",
    "Read the absorbance at 450 nm within 30 min."
   ],
   "tips": [
    "ব্ল্যাংক, নেগেটিভ ও পজিটিভ কন্ট্রোল রাখুন; সব ডুপ্লিকেটে করুন।",
    "সাধারণ নিয়মে কাট-অফ ধরা হয় নেগেটিভ কন্ট্রোলের গড় + ৩ × SD।",
    "ধোয়ার ধাপ ভালো করে না করলে ব্যাকগ্রাউন্ড বেড়ে যায়।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "transform",
   "t": "Competent Cells (CaCl₂) and Heat-shock Transformation",
   "cat": "Cloning",
   "aim": "To prepare competent E. coli cells and introduce plasmid DNA into them.",
   "mat": [
    "E. coli strain (for example DH5α)",
    "LB broth and LB agar with the proper antibiotic",
    "Ice-cold sterile 0.1 M CaCl₂, with 15% glycerol for storage",
    "Plasmid DNA or ligation mixture",
    "42 °C water bath, shaking incubator, ice"
   ],
   "steps": [
    "Competent cells: inoculate 1 ml of overnight culture into 100 ml LB and grow at 37 °C with shaking until the OD600 is 0.3–0.4.",
    "Chill the culture on ice for 20 min. From now on keep the cells, tubes and solutions cold.",
    "Pellet the cells at 4,000 g for 10 min at 4 °C and discard the supernatant.",
    "Gently resuspend in 20 ml ice-cold 0.1 M CaCl₂ and keep on ice for 30 min.",
    "Pellet again and gently resuspend in 2 ml ice-cold 0.1 M CaCl₂ (with 15% glycerol if freezing). Aliquot 100 µl; use at once or freeze at −80 °C.",
    "Transformation: add 1–10 ng of plasmid (or 2–5 µl of ligation mixture) to 100 µl of competent cells, mix gently and incubate on ice for 30 min.",
    "Heat-shock at 42 °C for 45–90 s and return to ice for 2 min.",
    "Add 900 µl of LB without antibiotic and incubate at 37 °C for 45–60 min with shaking.",
    "Spread 50–200 µl on selective LB agar and incubate inverted at 37 °C overnight.",
    "Controls: cells without DNA (no colonies expected on the antibiotic plate) and cells with intact plasmid (positive control)."
   ],
   "tips": [
    "সবকিছু বরফে ঠান্ডা রাখা জরুরি। হিট শকের সময় ঘড়ি ধরে মাপুন।",
    "নীল-সাদা স্ক্রিনিংয়ের জন্য প্লেটে X-gal ও IPTG দিন।",
    "ট্রান্সফর্মেশন এফিশিয়েন্সি (cfu/µg) = কলোনি সংখ্যা ÷ প্লেটে দেওয়া DNA (µg)।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "gram",
   "t": "Gram Staining",
   "cat": "Micro",
   "aim": "To differentiate bacteria into Gram-positive and Gram-negative groups on the basis of cell-wall structure.",
   "mat": [
    "Young (18–24 h) bacterial culture",
    "Clean glass slide, inoculating loop, Bunsen burner or spirit lamp",
    "Crystal violet, Gram’s iodine, decolouriser (95% ethanol or acetone–alcohol), safranin",
    "Distilled water, blotting paper",
    "Microscope with 100× oil-immersion objective and immersion oil"
   ],
   "steps": [
    "Prepare a thin smear with a loopful of culture in a drop of water. Air-dry, then heat-fix by passing the slide through the flame 2–3 times.",
    "Flood with crystal violet for 1 min and rinse gently with water.",
    "Flood with Gram’s iodine for 1 min and rinse.",
    "Decolourise with 95% ethanol drop by drop for 10–20 s, until the run-off is clear. Rinse immediately.",
    "Counterstain with safranin for 30–60 s, rinse and blot dry.",
    "Observe under the 100× oil-immersion lens. Gram-positive cells appear purple and Gram-negative cells appear pink/red."
   ],
   "tips": [
    "ডিকালারাইজার বেশিক্ষণ দিলে গ্রাম-পজিটিভ কোষও গোলাপি দেখায়, এটাই সবচেয়ে সাধারণ ভুল।",
    "পুরনো কালচারের গ্রাম-পজিটিভ কোষ নেগেটিভ দেখাতে পারে, তাই ১৮–২৪ ঘণ্টার কালচার নিন।",
    "স্মিয়ার পাতলা না হলে কোষ জমাট বেঁধে দাগ ঠিকমতো ফোটে না।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "streak",
   "t": "Aseptic Technique and Streak Plate",
   "cat": "Micro",
   "aim": "To obtain isolated colonies (a pure culture) from a mixed culture.",
   "mat": [
    "Nutrient agar plates",
    "Inoculating loop, Bunsen burner or spirit lamp",
    "Mixed culture",
    "Marker, incubator"
   ],
   "steps": [
    "Wipe the bench with 70% ethanol, light the burner and work near the flame (or inside the laminar air flow).",
    "Flame the loop until it is red-hot and let it cool for a few seconds. Do not put a hot loop on the culture.",
    "Pick up a small amount of culture; if using a tube, flame its mouth briefly.",
    "Lift the plate lid just enough to work. Make the first streak (zone 1) over about one quarter of the plate in close parallel lines.",
    "Flame and cool the loop. Turn the plate about 90°, drag the loop once through zone 1 into zone 2 and streak. Repeat for zones 3 and 4, flaming the loop between zones.",
    "Close the lid, label the bottom of the plate (name, date, sample), invert it and incubate at 37 °C for 18–24 h.",
    "Observe isolated colonies in zones 3–4. Record shape, margin, elevation, colour and texture."
   ],
   "tips": [
    "প্লেট উল্টো করে রাখুন, যাতে ঘনীভূত পানি অ্যাগারে পড়ে কলোনি মিশে না যায়।",
    "জমে থাকা কলোনি পেলে লুপ ঠান্ডা না করেই ছুঁয়েছেন কি না ভাবুন; গরম লুপ কোষ মেরে ফেলে।"
   ],
   "safe": "",
   "go": ""
  },
  {
   "id": "serial",
   "t": "Serial Dilution and Viable Count (CFU/ml)",
   "cat": "Micro",
   "aim": "To estimate the number of viable bacteria in a sample.",
   "mat": [
    "Bacterial sample",
    "Sterile 0.85% saline (9 ml in each of 6 tubes) or sterile buffer",
    "Sterile pipettes or micropipettes with tips",
    "Agar plates, spreader, incubator"
   ],
   "steps": [
    "Label six tubes 10⁻¹ to 10⁻⁶ and put 9 ml of sterile saline in each.",
    "Mix the sample well. Transfer 1 ml into the first tube (10⁻¹) and mix.",
    "Using a fresh tip each time, transfer 1 ml from tube to tube down the series.",
    "Spread 100 µl from each of the last three dilutions on agar plates (in duplicate).",
    "Incubate the plates inverted at 37 °C for 24 h.",
    "Count the plates having 30–300 colonies.",
    "CFU/ml = (number of colonies × dilution factor) ÷ volume plated (ml). For example, 150 colonies from 0.1 ml of the 10⁻⁵ dilution gives 150 × 10⁵ ÷ 0.1 = 1.5 × 10⁸ CFU/ml."
   ],
   "tips": [
    "প্রতি ধাপে নতুন টিপ নিন, নইলে আগের ঘনত্ব বয়ে যায়।",
    "৩০-এর কম বা ৩০০-এর বেশি কলোনির প্লেট গণনায় ধরা হয় না (পরিসংখ্যানগতভাবে অনির্ভরযোগ্য)।"
   ],
   "safe": "",
   "go": "calc:dilution"
  },
  {
   "id": "tc",
   "t": "Plant Tissue Culture: MS Medium and Callus Induction",
   "cat": "Plant",
   "aim": "To prepare MS medium and induce callus from a surface-sterilised explant.",
   "mat": [
    "MS basal medium powder (with vitamins), sucrose, agar",
    "Growth regulators (for example 2,4-D stock)",
    "1 N NaOH and 1 N HCl for pH adjustment",
    "Culture vessels or Petri plates, autoclave",
    "Laminar air flow cabinet, 70% ethanol",
    "Sodium hypochlorite (bleach diluted to about 1% active chlorine) with a drop of Tween-20",
    "Sterile distilled water, scalpel, forceps, growth room (25 ± 2 °C)"
   ],
   "steps": [
    "Dissolve the MS powder (follow the pack; commonly about 4.4 g/L for MS with vitamins) in about 80% of the final volume of distilled water and add 30 g/L sucrose.",
    "Add the growth regulators from stock (for callus from many dicot explants 2,4-D at 1–2 mg/L is common; optimise for your species).",
    "Adjust the pH to 5.8 and make up to the final volume.",
    "Add agar (7–8 g/L) and melt it by heating with stirring.",
    "Dispense into culture vessels and autoclave at 121 °C, 15 psi for 15–20 min. Let the medium set in a clean place.",
    "Surface-sterilise the explant: wash under running tap water, 70% ethanol for 30–60 s, then hypochlorite with Tween-20 for 10–15 min, then rinse 3–5 times with sterile distilled water (inside the laminar air flow).",
    "Cut explants (for example 0.5–1 cm pieces of leaf or stem) and place them on the medium. Seal the vessels with parafilm and label them.",
    "Incubate at 25 ± 2 °C (dark or 16 h light / 8 h dark as appropriate). Subculture every 3–4 weeks. Record contamination and the percentage of explants forming callus."
   ],
   "tips": [
    "সংক্রমিত পাত্র সঙ্গে সঙ্গে সরিয়ে ফেলুন। প্রতিটি পাত্রে তারিখ, মিডিয়ার নাম ও নমুনা লিখুন।",
    "অক্সিন বেশি হলে ক্যালাস/মূল, সাইটোকাইনিন বেশি হলে কুঁড়ি গঠনের দিকে যায় (Skoog–Miller অনুপাত)।"
   ],
   "safe": "HgCl₂ অত্যন্ত বিষাক্ত, তাই যতটা পারেন হাইপোক্লোরাইট ব্যবহার করুন। বর্জ্য নির্দেশ মতো ফেলুন।",
   "go": "recipe:ms"
  }
 ],
 "LADDER": [
  10000,
  8000,
  6000,
  5000,
  4000,
  3000,
  2000,
  1500,
  1000,
  500
 ],
 "PROTO_CATS": [
  [
   "all",
   "সব"
  ],
  [
   "DNA",
   "DNA / RNA"
  ],
  [
   "Cloning",
   "ক্লোনিং"
  ],
  [
   "Protein",
   "প্রোটিন"
  ],
  [
   "Micro",
   "মাইক্রোবায়োলজি"
  ],
  [
   "Plant",
   "উদ্ভিদ টিস্যু কালচার"
  ]
 ]
};
  for (var k in X) D[k] = X[k];
})(typeof window !== 'undefined' ? window : globalThis);
