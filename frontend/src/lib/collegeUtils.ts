/**
 * Frontend College Utilities
 * Standardizes college names for table display, avoiding inconsistent casing or abbreviations.
 * Supports Government Degree College full name expansion with districts.
 */

export const AP_DISTRICTS_TOWNS: Record<string, string> = {
    'pulivendula': 'Pulivendula',
    'pulivendla': 'Pulivendula',
    'anantapur': 'Anantapur',
    'ananthapur': 'Anantapur',
    'ananthapuramu': 'Anantapur',
    'atp': 'Anantapur',
    'kadapa': 'Kadapa',
    'cuddapah': 'Kadapa',
    'kurnool': 'Kurnool',
    'knl': 'Kurnool',
    'rajampet': 'Rajampet',
    'madanapalle': 'Madanapalle',
    'tirupati': 'Tirupati',
    'tpt': 'Tirupati',
    'chittoor': 'Chittoor',
    'nandyal': 'Nandyal',
    'dharmavaram': 'Dharmavaram',
    'hindupur': 'Hindupur',
    'rayachoti': 'Rayachoti',
    'proddatur': 'Proddatur',
    'jammalamadugu': 'Jammalamadugu',
    'mydukur': 'Mydukur',
    'vempalli': 'Vempalli',
    'badvel': 'Badvel',
    'uravakonda': 'Uravakonda',
    'tadipatri': 'Tadipatri',
    'guntakal': 'Guntakal',
    'allagadda': 'Allagadda',
    'banaganapalle': 'Banaganapalle',
    'dhone': 'Dhone',
    'nagari': 'Nagari',
    'puttur': 'Puttur',
    'piler': 'Piler',
    'srikalahasti': 'Srikalahasti',
    'venkatagiri': 'Venkatagiri',
    'gudur': 'Gudur',
    'kavali': 'Kavali',
    'nellore': 'Nellore',
    'markapur': 'Markapur',
    'chirala': 'Chirala',
    'bapatla': 'Bapatla',
    'ongole': 'Ongole',
    'guntur': 'Guntur',
    'tenali': 'Tenali',
    'narasaraopet': 'Narasaraopet',
    'vijayawada': 'Vijayawada',
    'machilipatnam': 'Machilipatnam',
    'gudivada': 'Gudivada',
    'eluru': 'Eluru',
    'bhimavaram': 'Bhimavaram',
    'rajahmundry': 'Rajahmundry',
    'kakinada': 'Kakinada',
    'amalapuram': 'Amalapuram',
    'visakhapatnam': 'Visakhapatnam',
    'vizag': 'Visakhapatnam',
    'vizianagaram': 'Vizianagaram',
    'srikakulam': 'Srikakulam',
    'kuppam': 'Kuppam',
    'paderu': 'Paderu',
    'tekkali': 'Tekkali',
    'palasa': 'Palasa',
    'nuzvid': 'Nuzvid',
    'nandigama': 'Nandigama',
    'avanigadda': 'Avanigadda',
    'repalle': 'Repalle',
    'sattenapalle': 'Sattenapalle',
    'vinukonda': 'Vinukonda',
    'macherla': 'Macherla',
    'giddalur': 'Giddalur',
    'kandukur': 'Kandukur',
    'jangareddygudem': 'Jangareddygudem',
    'tadepalligudem': 'Tadepalligudem',
    'narasapuram': 'Narasapuram',
    'tuni': 'Tuni',
    'bobbili': 'Bobbili',
    'parvathipuram': 'Parvathipuram'
};

const KNOWN_COLLEGES = [
    {
        canonical: 'JNTUA College of Engineering, Pulivendula',
        aliases: [
            /^j*j+n+u*t+p$/i,
            /^jntup$/i,
            /^jntu[\s\-_]*p$/i,
            /jntua[\s\-_]*cep/i,
            /jntuacep/i,
            /jntua[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*pul/i,
            /jntu[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*pul/i,
            /jntu[\s\-_]*pul/i,
            /jntua[\s\-_]*pul/i
        ]
    },
    {
        canonical: 'JNTUA College of Engineering, Anantapur',
        aliases: [
            /^jntua[\s\-_]*cea$/i,
            /^jntuacea$/i,
            /^jntu[\s\-_]*atp$/i,
            /^jntuatp$/i,
            /jntua[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*anantapur/i,
            /jntu[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*anantapur/i
        ]
    },
    {
        canonical: 'JNTUA College of Engineering, Kalikiri',
        aliases: [
            /^jntua[\s\-_]*cek$/i,
            /^jntuacek$/i,
            /jntua[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*kalikiri/i,
            /jntu[\s\-_]*college[\s\-_]*of[\s\-_]*engineering[\s\-_]*,?[\s\-_]*kalikiri/i
        ]
    },
    {
        canonical: 'Tirumala Engineering College',
        aliases: [
            /^th?ir[um]+[al]+[\s\-_]*(eng|engineering|engeenering)?[\s\-_]*(college|colleges)?/i,
            /th?ir[um]+[al]+[\s\-_]*(eng|engineering|engeenering)?[\s\-_]*(college|colleges)?/i,
            /th?irumala/i,
            /th?irumula/i,
            /th?irmula/i,
            /th?irmala/i,
            /^tiru$/i,
            /^thiru$/i,
            /^tiru[\s\-_]+/i,
            /^thiru[\s\-_]+/i,
            /^tecn$/i,
            /tirumala/i
        ]
    },
    {
        canonical: 'Geethanjali Institution of Science and Technology',
        aliases: [
            /^gist$/i,
            /geeth?an?jali[\s\-_]*(institu(te|tion))?[\s\-_]*(of)?[\s\-_]*(science)?[\s\-_]*(&|and)?[\s\-_]*(tech|technology)?/i,
            /geeth?an?jali/i,
            /gist[\s\-_]*nellore/i
        ]
    },
    {
        canonical: 'Madanapalle Institute of Technology & Science (MITS)',
        aliases: [
            /^mits$/i,
            /madanapalle[\s\-_]*institute/i
        ]
    },
    {
        canonical: 'Kakinada Institute of Engineering & Technology for Women',
        aliases: [
            /kiet[\s\-_]*w/i,
            /kakinada[\s\-_]*institute[\s\-_]*of[\s\-_]*engineering[\s\-_]*(&|and)?[\s\-_]*technology[\s\-_]*for[\s\-_]*women/i,
            /kakinada[\s\-_]*institute[\s\-_]*of[\s\-_]*engineering.*women/i,
            /kakinada[\s\-_]*institute.*women/i,
            /kiet.*women/i,
            /kakinada[\s\-_]*women/i
        ]
    },
    {
        canonical: 'Kakinada Institute of Engineering & Technology',
        aliases: [
            /kiet/i,
            /kakinada[\s\-_]*institute[\s\-_]*of[\s\-_]*engineering/i,
            /kakinada[\s\-_]*institute/i
        ]
    },
    {
        canonical: 'Annamacharya Institute of Technology & Sciences (AITS)',
        aliases: [
            /^aits/i,
            /annamacharya/i
        ]
    },
    {
        canonical: 'G. Pulla Reddy Engineering College (GPREC)',
        aliases: [
            /^gprec$/i,
            /pulla[\s\-_]*reddy/i
        ]
    },
    {
        canonical: 'KSRM College of Engineering',
        aliases: [
            /^ksrm/i,
            /k\.?s\.?r\.?m/i
        ]
    },
    {
        canonical: 'Sri Venkateswara College of Engineering (SVCE)',
        aliases: [
            /^svce/i,
            /sri[\s\-_]*venkateswara[\s\-_]*college/i
        ]
    },
    {
        canonical: 'Sri Venkateswara University College of Engineering (SVUCE)',
        aliases: [
            /^svuce$/i,
            /sri[\s\-_]*venkateswara[\s\-_]*university/i
        ]
    },
    {
        canonical: 'Srinivasa Ramanujan Institute of Technology (SRIT)',
        aliases: [
            /^srit/i,
            /srinivasa[\s\-_]*ramanujan/i
        ]
    },
    {
        canonical: 'Rajeev Gandhi Memorial College of Engineering & Technology (RGMCET)',
        aliases: [
            /^rgmcet$/i,
            /^rgm$/i,
            /rajeev[\s\-_]*gandhi[\s\-_]*memorial/i
        ]
    },
    {
        canonical: 'NBKR Institute of Science & Technology (NBKRIST)',
        aliases: [
            /^nbkrist/i,
            /n\.?b\.?k\.?r/i
        ]
    },
    {
        canonical: 'Vasireddy Venkatadri Institute of Technology (VVIT)',
        aliases: [
            /^vvit/i,
            /vasireddy/i
        ]
    },
    {
        canonical: 'VR Siddhartha Engineering College (VRSEC)',
        aliases: [
            /^vrsec/i,
            /siddhartha/i
        ]
    },
    {
        canonical: 'RVR & JC College of Engineering',
        aliases: [
            /^rvr/i,
            /r\.?v\.?r/i
        ]
    },
    {
        canonical: 'Chaitanya Bharathi Institute of Technology (CBIT)',
        aliases: [
            /^cbit/i,
            /chaitanya[\s\-_]*bharathi/i
        ]
    },
    {
        canonical: 'VNR Vignana Jyothi Institute of Engineering & Technology',
        aliases: [
            /^vnr/i,
            /vignana[\s\-_]*jyothi/i
        ]
    },
    {
        canonical: 'GMR Institute of Technology (GMRIT)',
        aliases: [
            /^gmrit/i,
            /gmr[\s\-_]*institute/i
        ]
    },
    {
        canonical: 'Presidency University',
        aliases: [
            /presidency/i
        ]
    },
    {
        canonical: 'VIT-AP University',
        aliases: [
            /^vit[\s\-_]*ap/i,
            /vellore[\s\-_]*institute.*ap/i
        ]
    },
    {
        canonical: 'SRM University, AP',
        aliases: [
            /^srm[\s\-_]*ap/i,
            /srm[\s\-_]*university.*ap/i
        ]
    },
    {
        canonical: 'K L University',
        aliases: [
            /^klu$/i,
            /k[\s\-_]*l[\s\-_]*university/i,
            /koneru[\s\-_]*lakshmaiah/i
        ]
    },
    {
        canonical: 'GITAM University',
        aliases: [
            /^gitam/i
        ]
    },
    {
        canonical: 'JNTUK University College of Engineering, Kakinada',
        aliases: [
            /jntuk/i,
            /jntu[\s\-_]*kakinada/i
        ]
    },
    {
        canonical: 'JNTUH University College of Engineering, Hyderabad',
        aliases: [
            /jntuh/i,
            /jntu[\s\-_]*hyderabad/i
        ]
    },
    {
        canonical: 'NRI Institute of Technology, Guntur',
        aliases: [
            /nri.*guntur/i,
            /nriit.*guntur/i,
            /visadala/i
        ]
    },
    {
        canonical: 'NRI College of Pharmacy',
        aliases: [
            /nri.*pharmacy/i
        ]
    },
    {
        canonical: 'NRI Institute of Technology',
        aliases: [
            /^nri$/i,
            /^nriit$/i,
            /^nri[\s\-_]*it$/i,
            /^nri[\s\-_]*college$/i,
            /nri[\s\-_]*college[\s\-_]*of[\s\-_]*engineering/i,
            /nri[\s\-_]*institute[\s\-_]*of[\s\-_]*technology/i,
            /nri[\s\-_]*institute/i,
            /^nri[\s\-_]+/i,
            /^nri/i
        ]
    },
    {
        canonical: 'Chandrasekhar Degree College',
        aliases: [
            /chandrasekhar/i,
            /chandra[\s\-_]*sekhar/i,
            /drgeer/i,
            /drgeee/i
        ]
    },
    {
        canonical: 'Potti Sreeramulu Chalavadhi Mallikarjuna Rao College of Engineering and Technology',
        aliases: [
            /potti/i,
            /chalavadhi/i,
            /chalavadi/i,
            /chaluvadi/i,
            /mallikarjuna[\s\-_]*rao/i,
            /mallikaarjuna[\s\-_]*rao/i,
            /mallikarjuna/i,
            /mallikaarjuna/i,
            /pscmrcet/i,
            /pscmr/i,
            /^pscm/i,
            /sreeramulu.*chalav/i,
            /sriramulu.*chalav/i,
            /sreeramulu.*college/i,
            /sriramulu.*college/i,
            /sreeramulu/i,
            /sriramulu/i
        ]
    },
    {
        canonical: 'VRS & YRN College of Engineering and Technology',
        aliases: [
            /v\.?r\.?s\.?[\s&and]*y\.?r\.?n\.?/i,
            /vrs.*yrn/i,
            /^vrs$/i,
            /^vrsy$/i
        ]
    },
    {
        canonical: 'A.M. Reddy Memorial College of Engineering and Technology',
        aliases: [
            /a\.?m\.?[\s\-_]*reddy[\s\-_]*memorial/i,
            /am[\s\-_]*reddy/i,
            /a\.?m\.?[\s\-_]*reddy/i,
            /amrn/i
        ]
    }
];

const KNOWN_ACRONYMS = new Set([
    'GDC', 'NRI', 'NRIIT', 'NRIET', 'VRS', 'YRN', 'AMRN',
    'JNTU', 'JNTUA', 'JNTUK', 'JNTUH', 'IIT', 'NIT', 'IIIT', 'BITS', 'MITS', 'AITS',
    'GPREC', 'KSRM', 'SVCE', 'SVUCE', 'SVU', 'SRIT', 'RGMCET', 'RGM', 'NBKRIST',
    'VVIT', 'VRSEC', 'RVRJC', 'CBIT', 'VIT', 'SRM', 'KLU', 'KL', 'GMRIT', 'NEC',
    'VNR', 'VJIET', 'GITAM', 'SIST', 'GIST', 'ALTS', 'SREC', 'BVRIT', 'CMR', 'MLR',
    'MRCET', 'VITS', 'SVCET', 'SSITS', 'CRIT', 'SVNE', 'SVCN', 'MBU', 'JBIET', 'MGIT',
    'SNIST', 'VBIT', 'GRIET', 'CVR', 'BTI', 'KSRMCE', 'ACEP', 'CEA', 'CEK', 'UCEK', 'UCEH'
]);

const LOWERCASE_WORDS = new Set(['of', 'and', 'in', 'for', 'at', 'the', 'to', 'on', 'a', 'an']);

export function toTitleCase(raw: string): string {
    if (!raw) return '';
    const cleaned = raw.trim().replace(/\s+/g, ' ');
    const tokens = cleaned.split(' ');

    const formattedTokens = tokens.map((token, index) => {
        const isParenthesized = token.startsWith('(') && token.endsWith(')');
        const cleanToken = isParenthesized ? token.slice(1, -1) : token;

        const upperToken = cleanToken.toUpperCase();
        if (KNOWN_ACRONYMS.has(upperToken)) {
            return isParenthesized ? `(${upperToken})` : upperToken;
        }

        if (/^(I|II|III|IV|V|VI)$/i.test(cleanToken)) {
            return isParenthesized ? `(${upperToken})` : upperToken;
        }

        if (/^[a-zA-Z](\.[a-zA-Z])+\.?$/.test(cleanToken)) {
            const dotted = cleanToken.toUpperCase();
            return isParenthesized ? `(${dotted})` : dotted;
        }

        const lowerToken = cleanToken.toLowerCase();
        if (index > 0 && LOWERCASE_WORDS.has(lowerToken)) {
            return isParenthesized ? `(${lowerToken})` : lowerToken;
        }

        const capitalized = cleanToken.charAt(0).toUpperCase() + cleanToken.slice(1).toLowerCase();
        return isParenthesized ? `(${capitalized})` : capitalized;
    });

    return formattedTokens.join(' ');
}

export function formatGovernmentDegreeCollege(trimmed: string, fallbackCity?: string | null): string | null {
    const isGDC = /\b(gdc|govt[\s\-_.]*degree|government[\s\-_.]*degree)\b/i.test(trimmed) ||
                  /^gdc[\s\-_(,/]/i.test(trimmed) ||
                  /^gdc$/i.test(trimmed);

    if (!isGDC) return null;

    let qualifier = '';
    if (/\b(women|female|\(w\)|for\s+women)\b/i.test(trimmed)) {
        qualifier = 'for Women';
    } else if (/\b(men|male|\(m\)|for\s+men)\b/i.test(trimmed)) {
        qualifier = 'for Men';
    } else if (/\b(autonomous|\(a\))\b/i.test(trimmed)) {
        qualifier = '(Autonomous)';
    }

    let matchedLocation: string | null = null;
    const lower = trimmed.toLowerCase();

    // 1. Search for known town / district in input
    for (const [key, canonicalLoc] of Object.entries(AP_DISTRICTS_TOWNS)) {
        const wordRegex = new RegExp(`\\b${key}\\b`, 'i');
        if (wordRegex.test(lower)) {
            matchedLocation = canonicalLoc;
            break;
        }
    }

    // 2. If not matched, try stripping GDC keywords and inspect remainder
    if (!matchedLocation) {
        const stripped = trimmed
            .replace(/\b(gdc|govt[\s\-_.]*degree[\s\-_.]*college|government[\s\-_.]*degree[\s\-_.]*college|govt[\s\-_.]*degree|government[\s\-_.]*degree|college|for\s+women|for\s+men|women|men|autonomous|\(w\)|\(m\)|\(a\))\b/gi, ' ')
            .replace(/[,()_\-]/g, ' ')
            .trim()
            .replace(/\s+/g, ' ');

        if (stripped.length > 2 && !/^(college|degree|govt|government)$/i.test(stripped)) {
            const potentialLocKey = stripped.toLowerCase();
            if (AP_DISTRICTS_TOWNS[potentialLocKey]) {
                matchedLocation = AP_DISTRICTS_TOWNS[potentialLocKey];
            } else {
                matchedLocation = toTitleCase(stripped);
            }
        }
    }

    // 3. Fallback to student's city if provided
    if (!matchedLocation && fallbackCity && typeof fallbackCity === 'string') {
        const cityClean = fallbackCity.trim().toLowerCase();
        if (cityClean && !/^(n\/?a|na|none|null|undefined|-|—)$/i.test(cityClean)) {
            matchedLocation = AP_DISTRICTS_TOWNS[cityClean] || toTitleCase(cityClean);
        }
    }

    let base = 'Government Degree College';
    if (qualifier) {
        if (qualifier === '(Autonomous)') {
            base = 'Government Degree College (Autonomous)';
        } else {
            base = `Government Degree College ${qualifier}`;
        }
    }

    if (matchedLocation) {
        return `${base}, ${matchedLocation}`;
    }
    return base;
}

export function normalizeCollegeName(
    rawName?: string | null,
    fallbackCity?: string | null,
    studentContext?: { email?: string; rollNumber?: string; phone?: string; name?: string; _id?: string } | null
): string {
    const email = (studentContext?.email || '').toLowerCase().trim();
    const roll = (studentContext?.rollNumber || '').toUpperCase().trim();
    const phone = (studentContext?.phone || '').trim();
    const name = (studentContext?.name || '').toLowerCase().trim();
    const id = (studentContext?._id || '').toString();

    if (
        id === '6a9fa6c35a32cf0131c0684f' ||
        email === 'naniinampudi3@gmail.com' ||
        email === 'subashsarnala24@gmail.com' ||
        phone === '7337551285' ||
        phone === '9030523082' ||
        name === 'srikar inampudi' ||
        name === 'subash' ||
        /^[0-9]{2}KN/i.test(roll) ||
        /KN1A/i.test(roll) ||
        /KN/i.test(roll)
    ) {
        return 'NRI Institute of Technology';
    }

    if (
        email === 'spheronixhackathon@gmail.com' ||
        phone === '9949408547' ||
        name === 'spheronix hackathon' ||
        /chandrasekhar/i.test(rawName || '') ||
        /drgeer/i.test(rawName || '') ||
        /drgeee/i.test(rawName || '')
    ) {
        return 'Chandrasekhar Degree College';
    }

    if (
        /^[0-9]{2}JN/i.test(roll) ||
        /JN1A/i.test(roll) ||
        /kakinada.*women/i.test(rawName || '') ||
        /kiet.*women/i.test(rawName || '') ||
        /^kietw$/i.test((rawName || '').trim())
    ) {
        return 'Kakinada Institute of Engineering & Technology for Women';
    }

    if (
        /^[0-9]{2}NE/i.test(roll) ||
        /NE1A/i.test(roll) ||
        (/th?ir[um]+[al]+/i.test(rawName || '') && !/tirupati/i.test(rawName || '')) ||
        (/^th?iru$/i.test((rawName || '').trim())) ||
        (/^th?iru[\s\-_]/i.test((rawName || '').trim()) && !/tirupati/i.test(rawName || '')) ||
        (/^tecn$/i.test((rawName || '').trim()))
    ) {
        return 'Tirumala Engineering College';
    }

    const isPSCMR = (s?: string | null) => {
        if (!s || typeof s !== 'string') return false;
        const str = s.trim();
        return (
            /potti/i.test(str) ||
            /chalavadhi/i.test(str) ||
            /chalavadi/i.test(str) ||
            /chaluvadi/i.test(str) ||
            /pscm/i.test(str) ||
            /mallikarjuna/i.test(str) ||
            /mallikaarjuna/i.test(str) ||
            /sreeramulu/i.test(str) ||
            /sriramulu/i.test(str)
        );
    };

    if (
        /^[0-9]{2}KT/i.test(roll) ||
        /KT1A/i.test(roll) ||
        isPSCMR(rawName)
    ) {
        return 'Potti Sreeramulu Chalavadhi Mallikarjuna Rao College of Engineering and Technology';
    }

    const isPulivendula = (s?: string | null) => {
        if (!s || typeof s !== 'string') return false;
        const str = s.trim();
        return (
            /pul.*vend/i.test(str) ||
            /^j*j+n+u*t+p$/i.test(str) ||
            /^jntup$/i.test(str) ||
            /jntua?[\s\-_]*cep/i.test(str) ||
            /jntuacep/i.test(str) ||
            /jntua?[\s\-_]*pul/i.test(str)
        );
    };

    if (
        /^[0-9]{2}19[0-9]/i.test(roll) ||
        /191A/i.test(roll) ||
        isPulivendula(rawName)
    ) {
        return 'JNTUA College of Engineering, Pulivendula';
    }

    const isGIST = (s?: string | null) => {
        if (!s || typeof s !== 'string') return false;
        const str = s.trim();
        return (
            /^gist$/i.test(str) ||
            /geeth?an?jali/i.test(str)
        );
    };

    if (
        /^[0-9]{2}2U/i.test(roll) ||
        /2U1A/i.test(roll) ||
        isGIST(rawName)
    ) {
        return 'Geethanjali Institution of Science and Technology';
    }

    if (!rawName || typeof rawName !== 'string') return 'N/A';
    const trimmed = rawName.trim();
    if (!trimmed || /^(n\/?a|na|none|null|undefined|-|—)$/i.test(trimmed)) {
        return 'N/A';
    }

    if (/^(other|others)$/i.test(trimmed)) {
        if (
            id === '6a9fa6c35a32cf0131c0684f' ||
            email === 'naniinampudi3@gmail.com' ||
            email === 'subashsarnala24@gmail.com' ||
            phone === '7337551285' ||
            phone === '9030523082' ||
            name === 'srikar inampudi' ||
            name === 'subash' ||
            /^[0-9]{2}KN/i.test(roll) ||
            /KN/i.test(roll)
        ) {
            return 'NRI Institute of Technology';
        }
    }

    // Direct check on trimmed for PSCMR and Pulivendula
    if (isPSCMR(trimmed)) {
        return 'Potti Sreeramulu Chalavadhi Mallikarjuna Rao College of Engineering and Technology';
    }
    if (isPulivendula(trimmed)) {
        return 'JNTUA College of Engineering, Pulivendula';
    }
    if (isGIST(trimmed)) {
        return 'Geethanjali Institution of Science and Technology';
    }

    // Check Government Degree College first
    const gdcCanonical = formatGovernmentDegreeCollege(trimmed, fallbackCity);
    if (gdcCanonical) {
        return gdcCanonical;
    }

    for (const college of KNOWN_COLLEGES) {
        for (const alias of college.aliases) {
            if (alias.test(trimmed)) {
                return college.canonical;
            }
        }
    }

    return toTitleCase(trimmed);
}

export function getStudentCollegeName(student: any, fallbackCity?: string | null): string {
    if (!student) return 'N/A';
    const id = (student._id || student.id || '').toString();
    const email = (student.email || student.leader?.email || '').toLowerCase().trim();
    const roll = (student.rollNumber || student.leader?.rollNumber || student.roll_no || '').toUpperCase().trim();
    const phone = (student.phone || student.mobile || student.leader?.phone || student.leader?.mobile || '').trim();
    const name = (student.name || student.fullName || student.leader?.name || '').toLowerCase().trim();

    if (
        id === '6a9fa6c35a32cf0131c0684f' ||
        email === 'naniinampudi3@gmail.com' ||
        email === 'subashsarnala24@gmail.com' ||
        phone === '7337551285' ||
        phone === '9030523082' ||
        name === 'srikar inampudi' ||
        name === 'subash' ||
        /^[0-9]{2}KN/i.test(roll) ||
        /KN1A/i.test(roll) ||
        /KN/i.test(roll)
    ) {
        return 'NRI Institute of Technology';
    }

    if (
        email === 'spheronixhackathon@gmail.com' ||
        phone === '9949408547' ||
        name === 'spheronix hackathon' ||
        /chandrasekhar/i.test(student.college || '') ||
        /chandrasekhar/i.test(student.collegeName || '') ||
        /chandrasekhar/i.test(student.otherCollegeName || '') ||
        /chandrasekhar/i.test(student.otherCollege || '') ||
        /chandrasekhar/i.test(student.customCollege || '') ||
        /chandrasekhar/i.test(student.leader?.college || '') ||
        /chandrasekhar/i.test(student.leader?.otherCollege || '')
    ) {
        return 'Chandrasekhar Degree College';
    }

    const isKIETWCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return /kakinada.*women/i.test(s) || /kiet.*women/i.test(s) || /^kietw$/i.test(s);
    };

    if (
        isKIETWCheck(student.college) ||
        isKIETWCheck(student.collegeName) ||
        isKIETWCheck(student.otherCollegeName) ||
        isKIETWCheck(student.otherCollege) ||
        isKIETWCheck(student.customCollege) ||
        isKIETWCheck(student.leader?.college) ||
        isKIETWCheck(student.leader?.otherCollege) ||
        /^[0-9]{2}JN/i.test(roll) ||
        /JN1A/i.test(roll)
    ) {
        return 'Kakinada Institute of Engineering & Technology for Women';
    }

    const checkTirumala = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const v = val.trim();
        if (/tirupati/i.test(v)) return false;
        return (
            /th?ir[um]+[al]+/i.test(v) ||
            /^th?iru$/i.test(v) ||
            /^th?iru[\s\-_]/i.test(v) ||
            /^tecn$/i.test(v)
        );
    };

    if (
        /^[0-9]{2}NE/i.test(roll) ||
        /NE1A/i.test(roll) ||
        checkTirumala(student.college) ||
        checkTirumala(student.collegeName) ||
        checkTirumala(student.otherCollegeName) ||
        checkTirumala(student.otherCollege) ||
        checkTirumala(student.customCollege) ||
        checkTirumala(student.leader?.college) ||
        checkTirumala(student.leader?.otherCollege)
    ) {
        return 'Tirumala Engineering College';
    }

    const isGISTCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return /^gist$/i.test(s) || /geeth?an?jali/i.test(s);
    };

    if (
        /^[0-9]{2}2U/i.test(roll) ||
        /2U1A/i.test(roll) ||
        isGISTCheck(student.college) ||
        isGISTCheck(student.collegeName) ||
        isGISTCheck(student.otherCollegeName) ||
        isGISTCheck(student.otherCollege) ||
        isGISTCheck(student.customCollege) ||
        isGISTCheck(student.leader?.college) ||
        isGISTCheck(student.leader?.otherCollege)
    ) {
        return 'Geethanjali Institution of Science and Technology';
    }

    const isPSCMRCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return (
            /potti/i.test(s) ||
            /chalavadhi/i.test(s) ||
            /chalavadi/i.test(s) ||
            /chaluvadi/i.test(s) ||
            /pscm/i.test(s) ||
            /mallikarjuna/i.test(s) ||
            /mallikaarjuna/i.test(s) ||
            /sreeramulu/i.test(s) ||
            /sriramulu/i.test(s)
        );
    };

    if (
        /^[0-9]{2}KT/i.test(roll) ||
        /KT1A/i.test(roll) ||
        isPSCMRCheck(student.college) ||
        isPSCMRCheck(student.collegeName) ||
        isPSCMRCheck(student.otherCollegeName) ||
        isPSCMRCheck(student.otherCollege) ||
        isPSCMRCheck(student.customCollege) ||
        isPSCMRCheck(student.leader?.college) ||
        isPSCMRCheck(student.leader?.otherCollege)
    ) {
        return 'Potti Sreeramulu Chalavadhi Mallikarjuna Rao College of Engineering and Technology';
    }

    const isPulivendulaCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return (
            /pul.*vend/i.test(s) ||
            /^j*j+n+u*t+p$/i.test(s) ||
            /^jntup$/i.test(s) ||
            /jntua?[\s\-_]*cep/i.test(s) ||
            /jntuacep/i.test(s) ||
            /jntua?[\s\-_]*pul/i.test(s)
        );
    };

    if (
        /^[0-9]{2}19[0-9]/i.test(roll) ||
        /191A/i.test(roll) ||
        isPulivendulaCheck(student.college) ||
        isPulivendulaCheck(student.collegeName) ||
        isPulivendulaCheck(student.otherCollegeName) ||
        isPulivendulaCheck(student.otherCollege) ||
        isPulivendulaCheck(student.customCollege) ||
        isPulivendulaCheck(student.leader?.college) ||
        isPulivendulaCheck(student.leader?.otherCollege)
    ) {
        return 'JNTUA College of Engineering, Pulivendula';
    }

    const isVRSYRNCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return (
            /v\.?r\.?s\.?[\s&and]*y\.?r\.?n\.?/i.test(s) ||
            /vrs.*yrn/i.test(s) ||
            /^vrs$/i.test(s)
        );
    };

    if (
        /^[0-9]{2}L1/i.test(roll) ||
        /L11A/i.test(roll) ||
        isVRSYRNCheck(student.college) ||
        isVRSYRNCheck(student.collegeName) ||
        isVRSYRNCheck(student.otherCollegeName) ||
        isVRSYRNCheck(student.otherCollege) ||
        isVRSYRNCheck(student.customCollege) ||
        isVRSYRNCheck(student.leader?.college) ||
        isVRSYRNCheck(student.leader?.otherCollege)
    ) {
        return 'VRS & YRN College of Engineering and Technology';
    }

    const isAMReddyCheck = (val?: string | null) => {
        if (!val || typeof val !== 'string') return false;
        const s = val.trim();
        return (
            /a\.?m\.?[\s\-_]*reddy/i.test(s) ||
            /am[\s\-_]*reddy/i.test(s) ||
            /amrn/i.test(s)
        );
    };

    if (
        isAMReddyCheck(student.college) ||
        isAMReddyCheck(student.collegeName) ||
        isAMReddyCheck(student.otherCollegeName) ||
        isAMReddyCheck(student.otherCollege) ||
        isAMReddyCheck(student.customCollege) ||
        isAMReddyCheck(student.leader?.college) ||
        isAMReddyCheck(student.leader?.otherCollege)
    ) {
        return 'A.M. Reddy Memorial College of Engineering and Technology';
    }

    const rawCol = student.college || student.collegeName || student.leader?.college;
    const isInvalid = !rawCol || /^(other|others|n\/?a|na|none|null|undefined|-|—)$/i.test(String(rawCol).trim());

    if (isInvalid) {
        const altCol = student.leader?.college || student.otherCollege || student.other_college || student.customCollege;
        if (altCol && !/^(other|others|n\/?a|na|none|null|undefined|-|—)$/i.test(String(altCol).trim())) {
            return normalizeCollegeName(altCol, fallbackCity, student);
        }
        if (/KN/i.test(roll)) {
            return 'NRI Institute of Technology';
        }
    }

    return normalizeCollegeName(rawCol, fallbackCity, student);
}
