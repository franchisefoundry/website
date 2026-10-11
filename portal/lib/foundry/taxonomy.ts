/**
 * The Foundry search vocabulary: what words mean which need, which places
 * sit in which region, which sectors we recognise, and what people usually
 * need next. Plain data, no imports, so the engine can run anywhere (route
 * handlers, the browser for the live readout, `node --test`).
 */

export type Need =
  | 'funding' | 'property' | 'legal' | 'accounting'
  | 'technology' | 'insurance' | 'marketing' | 'recruitment'

export type Region =
  | 'nw' | 'ne' | 'yh' | 'em' | 'wm' | 'ee' | 'lon' | 'se' | 'sw' | 'wal' | 'scot' | 'ni'

export type Stage = 'exploring' | 'opening' | 'expanding'

export const NEEDS: Need[] = [
  'funding', 'property', 'legal', 'accounting', 'technology', 'insurance', 'marketing', 'recruitment',
]

export const NEED_LABEL: Record<Need, string> = {
  funding: 'Funding',
  property: 'Property & fit-out',
  legal: 'Legal',
  accounting: 'Accounting',
  technology: 'Tech & EPOS',
  insurance: 'Insurance',
  marketing: 'Marketing',
  recruitment: 'Recruitment & HR',
}

/** How the need reads in a sentence: "You need funding and an accountant." */
export const NEED_PHRASE: Record<Need, string> = {
  funding: 'funding',
  property: 'a property or fit-out partner',
  legal: 'a solicitor',
  accounting: 'an accountant',
  technology: 'tech and EPOS',
  insurance: 'insurance',
  marketing: 'marketing help',
  recruitment: 'help hiring',
}

/**
 * Patterns per need, matched against the lower-cased query. Order inside a
 * list doesn't matter; the first hit is what we show on the query chip.
 */
export const NEED_PATTERNS: Record<Need, RegExp[]> = {
  funding: [
    /\bfund(?:ing|ed|s)?\b/, /\bloans?\b/, /\blend(?:er|ers|ing)?\b/, /\bfinanc\w*/,
    /\bborrow\w*/, /\bmortgage\b/, /\binvestment\b/, /\bcapital\b/, /\bbank\b/,
  ],
  property: [
    /\bfit[\s-]?outs?\b/, /\bshop\s?fit\w*/, /\bshopfit\w*/, /\bkiosk (?:build|fit)\w*/,
    /\bproperty\b/, /\bpremises\b/, /\bsite finder\b/, /\bfind (?:a |me a )?(?:site|unit|location)\b/,
    /\bcommercial agent\b/, /\bbuilders?\b/, /\bstore design\b/, /\brefurb\w*/,
  ],
  legal: [
    /\bsolicitors?\b/, /\blawyers?\b/, /\blegal\b/, /\bagreement\b/, /\bcontracts?\b/,
    /\blease\b/, /\bdisclosure\b/,
  ],
  accounting: [
    /\baccount(?:ant|ants|ancy|ing)\b/, /\bbook[\s-]?keep\w*/, /\bvat\b/, /\btax\b/,
    /\bforecasts?\b/, /\bpayroll\b/, /\bxero\b/, /\bbooks\b/, /\bcash ?flow\b/,
  ],
  technology: [
    /\bepos\b/, /\btill(?:s| system)?\b/, /\bpos\b/, /\bsoftware\b/, /\bapps?\b/,
    /\btech(?:nology)?\b/, /\bwebsite\b/, /\bordering system\b/,
  ],
  insurance: [/\binsur\w*/, /\bcover\b/, /\bliability\b/, /\bindemnity\b/],
  marketing: [
    /\bmarketing\b/, /\blaunch campaign\b/, /\bsocial media\b/, /\badvertis\w*/,
    /\bleaflets?\b/, /\bbranding\b/, /\bpr\b/, /\bseo\b/,
  ],
  recruitment: [
    /\brecruit\w*/, /\bhir(?:e|ing)\b/, /\bstaff(?:ing)?\b/, /\bhr\b/,
    /\bemployment\b/, /\bmanagers?\b/,
  ],
}

/** Which needs usually follow which. Drives "You'll also need". */
export const ALSO_NEED: Record<Need, Need[]> = {
  funding: ['legal', 'accounting', 'insurance'],
  legal: ['funding', 'insurance'],
  accounting: ['funding', 'legal'],
  insurance: ['legal', 'property'],
  property: ['insurance', 'technology'],
  technology: ['recruitment', 'marketing'],
  marketing: ['technology', 'recruitment'],
  recruitment: ['technology', 'accounting'],
}

/** With no stated need, what people at each stage line up first. */
export const STAGE_STARTERS: Record<Stage | 'unknown', Need[]> = {
  exploring: ['legal', 'funding', 'accounting'],
  opening: ['insurance', 'technology', 'recruitment', 'marketing'],
  expanding: ['funding', 'property', 'recruitment'],
  unknown: ['legal', 'funding', 'accounting'],
}

/** One line on why a follow-on need matters. Never claims anything about a partner. */
export const ALSO_WHY: Record<Need, string> = {
  funding: 'Most franchisees fund part of the opening cost',
  property: 'You’ll need a site and a fit-out to brand spec',
  legal: 'Lenders usually want the agreement reviewed first',
  accounting: 'Your lender will want a forecast',
  technology: 'EPOS and ops tech need to be live before you open',
  insurance: 'You’ll need cover before you trade',
  marketing: 'A launch plan fills the first few weeks',
  recruitment: 'You’ll need a team in place before opening day',
}

export const STAGE_PATTERNS: [Stage, RegExp][] = [
  ['expanding', /\b(second|third|another|next) (site|unit|store)\b|\bmulti[\s-]?site\b|\bexpan\w*/],
  ['opening', /\b(just )?signed\b|\bopening\b|\bhandover\b|\bget(?:ting)? the keys\b|\bbefore (?:i|we) open\b|\blaunch(?:ing)?\b/],
  ['exploring', /\bbefore (?:i|we) sign\b|\bthinking about\b|\bconsidering\b|\bwhich franchise\b|\bwhat do i need\b|\bstarting out\b/],
]

export const SECTORS: { key: string; label: string; pattern: RegExp }[] = [
  { key: 'coffee',        label: 'coffee',        pattern: /\b(coffee|caf[eé]s?|espresso)\b/ },
  { key: 'qsr',           label: 'QSR',           pattern: /\b(qsr|quick service|fast food|burgers?|chicken|pizza|kebabs?|doner|wings?)\b/ },
  { key: 'casual-dining', label: 'casual dining', pattern: /\b(casual dining|restaurants?|sushi|dining)\b/ },
  { key: 'pub-bar',       label: 'pubs and bars', pattern: /\b(pubs?|bars?|taverns?)\b/ },
  { key: 'dessert',       label: 'desserts',      pattern: /\b(desserts?|ice cream|gelato|bakery|bakeries|acai|açaí|smoothies?|juice)\b/ },
  { key: 'fitness',       label: 'fitness',       pattern: /\b(gyms?|fitness|pilates|yoga|boxing)\b/ },
  { key: 'retail',        label: 'retail',        pattern: /\b(retail|shops?|convenience store)\b/ },
  { key: 'care',          label: 'care',          pattern: /\b(home care|care homes?|care services?)\b/ },
  { key: 'services',      label: 'services',      pattern: /\b(cleaning|tutoring|education|automotive|pet)\b/ },
]

export const REGION_LABEL: Record<Region, string> = {
  nw: 'North West', ne: 'North East', yh: 'Yorkshire', em: 'East Midlands', wm: 'West Midlands',
  ee: 'East of England', lon: 'London', se: 'South East', sw: 'South West', wal: 'Wales',
  scot: 'Scotland', ni: 'Northern Ireland',
}

export const ENGLAND: Region[] = ['nw', 'ne', 'yh', 'em', 'wm', 'ee', 'lon', 'se', 'sw']

/**
 * Places → region. Longer names first so "milton keynes" wins over anything
 * shorter. Region names themselves are included so "north west" works.
 */
export const PLACES: [string, Region][] = ([
  ['greater manchester', 'nw'], ['north west', 'nw'], ['manchester', 'nw'], ['liverpool', 'nw'],
  ['preston', 'nw'], ['bolton', 'nw'], ['stockport', 'nw'], ['warrington', 'nw'], ['blackpool', 'nw'],
  ['chester', 'nw'], ['wigan', 'nw'], ['salford', 'nw'], ['lancaster', 'nw'], ['oldham', 'nw'],
  ['north east', 'ne'], ['newcastle', 'ne'], ['sunderland', 'ne'], ['durham', 'ne'], ['middlesbrough', 'ne'], ['gateshead', 'ne'],
  ['yorkshire', 'yh'], ['leeds', 'yh'], ['sheffield', 'yh'], ['bradford', 'yh'], ['york', 'yh'], ['hull', 'yh'],
  ['huddersfield', 'yh'], ['wakefield', 'yh'], ['doncaster', 'yh'], ['harrogate', 'yh'],
  ['east midlands', 'em'], ['nottingham', 'em'], ['leicester', 'em'], ['derby', 'em'], ['lincoln', 'em'], ['northampton', 'em'],
  ['west midlands', 'wm'], ['birmingham', 'wm'], ['coventry', 'wm'], ['wolverhampton', 'wm'], ['stoke', 'wm'],
  ['worcester', 'wm'], ['solihull', 'wm'], ['walsall', 'wm'],
  ['east of england', 'ee'], ['east anglia', 'ee'], ['cambridge', 'ee'], ['norwich', 'ee'], ['ipswich', 'ee'],
  ['peterborough', 'ee'], ['luton', 'ee'], ['chelmsford', 'ee'], ['colchester', 'ee'],
  ['london', 'lon'], ['croydon', 'lon'], ['camden', 'lon'], ['hackney', 'lon'], ['islington', 'lon'], ['shoreditch', 'lon'],
  ['south east', 'se'], ['brighton', 'se'], ['reading', 'se'], ['oxford', 'se'], ['southampton', 'se'],
  ['portsmouth', 'se'], ['milton keynes', 'se'], ['guildford', 'se'], ['canterbury', 'se'], ['kent', 'se'], ['surrey', 'se'],
  ['south west', 'sw'], ['bristol', 'sw'], ['bath', 'sw'], ['exeter', 'sw'], ['plymouth', 'sw'],
  ['bournemouth', 'sw'], ['swindon', 'sw'], ['gloucester', 'sw'], ['cheltenham', 'sw'], ['cornwall', 'sw'],
  ['wales', 'wal'], ['cardiff', 'wal'], ['swansea', 'wal'], ['newport', 'wal'],
  ['scotland', 'scot'], ['glasgow', 'scot'], ['edinburgh', 'scot'], ['aberdeen', 'scot'], ['dundee', 'scot'], ['inverness', 'scot'],
  ['northern ireland', 'ni'], ['belfast', 'ni'], ['derry', 'ni'],
] as [string, Region][]).sort((a, b) => b[0].length - a[0].length)

/**
 * Place names that are also everyday words. These only count when written
 * with a capital ("Reading") or after "in/near/around/from".
 */
export const AMBIGUOUS_PLACES = new Set(['reading', 'bath', 'derby', 'newport', 'kent', 'surrey', 'lincoln'])
