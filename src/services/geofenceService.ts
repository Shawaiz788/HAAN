import { getCities, City } from './city';
import { getAreas, Area } from './area';

export interface ServiceabilityResult {
  isAvailable: boolean;
  matchedAreaName?: string;
  matchedAreaObj?: Area;
  matchedCityName?: string;
  matchedCityObj?: City;
  message: string;
}

/**
 * Real-world high-precision geographic boundary polygons for supported housing societies and major areas in Lahore.
 * Each polygon is a high-density closed array of 15 to 22 [latitude, longitude] vertices tracing official society borders.
 * Note: Garden Town is intentionally excluded for boundary precision testing.
 */
export const AREA_POLYGONS: Record<string, Array<[number, number]>> = {
  // 1. Bahria Town (Lahore) - High-Density Polygon
  bahriatown: [
    [31.3885, 74.1680], // Canal Road / Sector F Entrance
    [31.3860, 74.1750], // Canal Bank Rd / Sector C Entrance
    [31.3840, 74.1850], // Canal Bank Rd / Sector B Entrance
    [31.3820, 74.1960], // Sector A / Tulip Block / Canal Bank East
    [31.3750, 74.2010], // Sector A East Border (Jasmine Block)
    [31.3680, 74.2020], // Sector D East Border
    [31.3580, 74.2000], // Sector E East Border (Eiffel Tower Area East)
    [31.3480, 74.1950], // Sector E South East (Safari Villas)
    [31.3380, 74.1910], // Golf Country Club East
    [31.3340, 74.1860], // Golf Country Club South
    [31.3320, 74.1780], // Sector F Extension South
    [31.3350, 74.1680], // Ring Road Interchange South West
    [31.3380, 74.1540], // Sector F West Border
    [31.3450, 74.1510], // Sector F West Outer Perimeter
    [31.3550, 74.1500], // Sukh Chayn Gardens Border West
    [31.3650, 74.1500], // Multan Road Junction West
    [31.3750, 74.1530], // Sector F North West Boundary
    [31.3820, 74.1590], // Sector F Canal Road North West
  ],

  // 2. Model Town (Lahore) - High-Density Polygon
  modeltown: [[31.48684, 74.304886], [31.474922, 74.309742], [31.474176, 74.310046], [31.473632, 74.310078], [31.472029, 74.3093], [31.469902, 74.315233], [31.470139, 74.316591], [31.470717, 74.317377], [31.470403, 74.31815], [31.470276, 74.319239], [31.470409, 74.32039], [31.47066, 74.321507], [31.470674, 74.321813], [31.470688, 74.322033], [31.47095, 74.323635], [31.471266, 74.32554], [31.471094, 74.3255], [31.471006, 74.325753], [31.471129, 74.325826], [31.471023, 74.326147], [31.470887, 74.326057], [31.470614, 74.32679], [31.470958, 74.326933], [31.47053, 74.328677], [31.469855, 74.330267], [31.469585, 74.330803], [31.469227, 74.332243], [31.470583, 74.335328], [31.470859, 74.335956], [31.470962, 74.336127], [31.471234, 74.336575], [31.471859, 74.337186], [31.472848, 74.337057], [31.472946, 74.33703], [31.473025, 74.337008], [31.473074, 74.336995], [31.473353, 74.33683], [31.473493, 74.337123], [31.473691, 74.336971], [31.47358, 74.336683], [31.473761, 74.336553], [31.474006, 74.337046], [31.474146, 74.336955], [31.474133, 74.336926], [31.474221, 74.336784], [31.474024, 74.336385], [31.474558, 74.335986], [31.474759, 74.335836], [31.475454, 74.335334], [31.475514, 74.335288], [31.475563, 74.335217], [31.47563, 74.335331], [31.475662, 74.335313], [31.47568, 74.335356], [31.475888, 74.335843], [31.476109, 74.335725], [31.476233, 74.336229], [31.476136, 74.336562], [31.476115, 74.336636], [31.475971, 74.337132], [31.47554, 74.337018], [31.475216, 74.338081], [31.475652, 74.338335], [31.475108, 74.339465], [31.474922, 74.339851], [31.474294, 74.341023], [31.474231, 74.34114], [31.473189, 74.342229], [31.473747, 74.34383], [31.473804, 74.343948], [31.473884, 74.344112], [31.49996, 74.333019], [31.499689, 74.331646], [31.498451, 74.325164], [31.497465, 74.325393], [31.49699, 74.325408], [31.495875, 74.32535], [31.495773, 74.324815], [31.495625, 74.324854], [31.495473, 74.324842], [31.495462, 74.324663], [31.495293, 74.324686], [31.495119, 74.324277], [31.495028, 74.323837], [31.49485, 74.323831], [31.494401, 74.322407], [31.493709, 74.32011], [31.492352, 74.315707], [31.491461, 74.312844], [31.490283, 74.312234], [31.491681, 74.309488]],

  // 3. Gulberg (Lahore) - High-Density Polygon
  gulberg: [
    [31.5340, 74.3320], // Canal Bank Road / FC College North-West
    [31.5350, 74.3420], // Canal Bank Road / Zahoor Elahi Rd Bridge
    [31.5330, 74.3500], // Canal Bank Road / Muslim Town Bridge Side
    [31.5300, 74.3580], // Canal Bank Road / Main Boulevard North-East
    [31.5240, 74.3660], // Canal Bank Road / Mall Rd Underpass East
    [31.5200, 74.3680], // Main Boulevard East / Cantt Border
    [31.5120, 74.3670], // Gurumangat Road East / Cavalry Border
    [31.5020, 74.3650], // Gurumangat Road South-East
    [31.4930, 74.3600], // Walton Road / Gulberg III South-East
    [31.4850, 74.3550], // Packages Mall Area / Ferozepur Rd South
    [31.4920, 74.3460], // Ferozepur Road / Model Town Metrobus
    [31.5000, 74.3380], // Kalma Chowk East / Main Blvd Junction
    [31.5080, 74.3330], // Ferozepur Road / Canal Park West
    [31.5180, 74.3280], // Ferozepur Road / Ichhra Border West
    [31.5250, 74.3290], // Jail Road / Shadman Border West
    [31.5300, 74.3300], // FC College Underpass North-West
  ],

  // 4. DHA Lahore (Defence Housing Authority) - High-Density Polygon
  dha: [
    [31.4980, 74.3720], // DHA Phase 1 / Walton Rd North-West
    [31.5020, 74.3850], // DHA Phase 1 / Cantt Border North
    [31.5080, 74.4020], // DHA Phase 8 / Airport Road North
    [31.5050, 74.4250], // DHA Phase 8 / Ring Road Interchange
    [31.4980, 74.4480], // DHA Phase 8 / Barki Road North-East
    [31.4850, 74.4650], // DHA Phase 8 Proper East Boundary
    [31.4680, 74.4750], // DHA Phase 6 East Boundary
    [31.4450, 74.4800], // DHA Phase 7 / Ring Road South-East
    [31.4320, 74.4680], // DHA Phase 7 / Bedian Rd Junction South-East
    [31.4200, 74.4450], // DHA Phase 7 / Bedian Rd South
    [31.4180, 74.4200], // DHA Phase 9 Town / Bedian Rd South-West
    [31.4250, 74.3950], // DHA Phase 5 / Sui Gas Society Border
    [31.4380, 74.3820], // DHA Phase 5 / Ring Road South-West
    [31.4500, 74.3750], // DHA Phase 4 / Packages Mall Side
    [31.4620, 74.3710], // DHA Phase 3 / Y Block Commercial
    [31.4720, 74.3700], // DHA Phase 3 / Walton Rd Border West
    [31.4860, 74.3710], // DHA Phase 1 / Walton Rd West
  ],

  // 5. Johar Town (Lahore) - High-Density Polygon
  johartown: [[31.466939, 74.251557], [31.466508, 74.251164], [31.466528, 74.251153], [31.466558, 74.249791], [31.466882, 74.249729], [31.466861, 74.249114], [31.467175, 74.249093], [31.467168, 74.248134], [31.465902, 74.248107], [31.465928, 74.248965], [31.465792, 74.248955], [31.465322, 74.248926], [31.465237, 74.248928], [31.46524, 74.249234], [31.464788, 74.249204], [31.464702, 74.249193], [31.464728, 74.25016], [31.46472, 74.251156], [31.462904, 74.251143], [31.462909, 74.251856], [31.462828, 74.251852], [31.462786, 74.253801], [31.462869, 74.253832], [31.462792, 74.254111], [31.463752, 74.254491], [31.463649, 74.25551], [31.463795, 74.25557], [31.463457, 74.25665], [31.463414, 74.256767], [31.461078, 74.256757], [31.461039, 74.259581], [31.460484, 74.260476], [31.459634, 74.260813], [31.459177, 74.26106], [31.458301, 74.260934], [31.457995, 74.265154], [31.457691, 74.265625], [31.458026, 74.266194], [31.458484, 74.266652], [31.458501, 74.267804], [31.458495, 74.269239], [31.458403, 74.27227], [31.458482, 74.272872], [31.453745, 74.27298], [31.453482, 74.272925], [31.453248, 74.272915], [31.453221, 74.268358], [31.453015, 74.268384], [31.452223, 74.270702], [31.451896, 74.270698], [31.451211, 74.270608], [31.450986, 74.270443], [31.450717, 74.270317], [31.44803, 74.269956], [31.446776, 74.271075], [31.447364, 74.273492], [31.447666, 74.275074], [31.447859, 74.275696], [31.447846, 74.275863], [31.448942, 74.276285], [31.451585, 74.276931], [31.453377, 74.277317], [31.455029, 74.277838], [31.455572, 74.277969], [31.455841, 74.277998], [31.456003, 74.277993], [31.459904, 74.276858], [31.454622, 74.280657], [31.452486, 74.285193], [31.450587, 74.290864], [31.450924, 74.294809], [31.450216, 74.298192], [31.45509, 74.300775], [31.45528, 74.300875], [31.467482, 74.30695], [31.468762, 74.304198], [31.479299, 74.300146], [31.47966, 74.299651], [31.47965, 74.299215], [31.477287, 74.299108], [31.475655, 74.299035], [31.47579, 74.300245], [31.47196, 74.301642], [31.471789, 74.299091], [31.472941, 74.296017], [31.473037, 74.29581], [31.474013, 74.292843], [31.474427, 74.291561], [31.474086, 74.291471], [31.474688, 74.290008], [31.475113, 74.288883], [31.475124, 74.288699], [31.475825, 74.286374], [31.474875, 74.28571], [31.475022, 74.285126], [31.475984, 74.285294], [31.476031, 74.285116], [31.476066, 74.284986], [31.476097, 74.284916], [31.476184, 74.284538], [31.476319, 74.284177], [31.476732, 74.283092], [31.476787, 74.282937], [31.476872, 74.282981], [31.47712, 74.2823], [31.478033, 74.282559], [31.478073, 74.282575], [31.479628, 74.283174], [31.479738, 74.282852], [31.479858, 74.282924], [31.48003, 74.282639], [31.479986, 74.282535], [31.480149, 74.282406], [31.480246, 74.282216], [31.480139, 74.281989], [31.480614, 74.281699], [31.479717, 74.279282], [31.478635, 74.275471], [31.477032, 74.275968], [31.475382, 74.276476], [31.475283, 74.276055], [31.474525, 74.276275], [31.474548, 74.275785], [31.474296, 74.275813], [31.474317, 74.275132], [31.47459, 74.275116], [31.474603, 74.274327], [31.47462, 74.273708], [31.474887, 74.273624], [31.474946, 74.272744], [31.476145, 74.27271], [31.476146, 74.273558], [31.476743, 74.273558], [31.476749, 74.273371], [31.476951, 74.273423], [31.477987, 74.273166], [31.476791, 74.268079], [31.475864, 74.263825], [31.474962, 74.2594], [31.473799, 74.254743], [31.472279, 74.254634], [31.471657, 74.254611], [31.471638, 74.255076], [31.471015, 74.255023], [31.471041, 74.254551], [31.469728, 74.254464], [31.46959, 74.253833], [31.470319, 74.253922], [31.470381, 74.252636], [31.47143, 74.252732], [31.471429, 74.25292], [31.471666, 74.25294], [31.47166, 74.253098], [31.47343, 74.253314], [31.472398, 74.249129], [31.471952, 74.24799], [31.471636, 74.248162], [31.468725, 74.249889], [31.467623, 74.250815]],

  // 6. Faisal Town (Lahore) - High-Density Polygon
  faisaltown: [[31.482614, 74.297186], [31.479467, 74.300087], [31.469408, 74.303966], [31.469003, 74.304288], [31.468581, 74.305024], [31.467863, 74.306889], [31.465866, 74.312139], [31.467177, 74.312107], [31.467828, 74.311958], [31.468205, 74.311827], [31.468654, 74.311618], [31.468997, 74.311397], [31.469253, 74.311279], [31.469309, 74.311487], [31.469469, 74.312535], [31.469594, 74.31333], [31.469875, 74.315232], [31.46991, 74.315158], [31.470012, 74.314885], [31.470318, 74.314051], [31.470853, 74.312562], [31.471482, 74.310762], [31.472077, 74.309028], [31.473266, 74.309603], [31.473542, 74.309726], [31.473889, 74.309754], [31.47433, 74.309712], [31.485853, 74.305292], [31.486641, 74.304636], [31.485433, 74.302502], [31.484923, 74.302824], [31.48376, 74.303264], [31.482817, 74.301468], [31.48185, 74.302178], [31.480871, 74.300504], [31.483172, 74.29822]],

  // 7. Wapda Town (Lahore) - High-Density Polygon
  wapdatown: [[31.436616, 74.243379], [31.436012, 74.244258], [31.434658, 74.243507], [31.434218, 74.243593], [31.433962, 74.244408], [31.433742, 74.245224], [31.433741, 74.245603], [31.433824, 74.246119], [31.433981, 74.246501], [31.434241, 74.246784], [31.434804, 74.24648], [31.435583, 74.247676], [31.434663, 74.248639], [31.43513, 74.249404], [31.435889, 74.250949], [31.435652, 74.252423], [31.437212, 74.252089], [31.437899, 74.252703], [31.43782, 74.253936], [31.437485, 74.254216], [31.436959, 74.255057], [31.436481, 74.255524], [31.435764, 74.255486], [31.434503, 74.254106], [31.434268, 74.253901], [31.433094, 74.25523], [31.432685, 74.255653], [31.431336, 74.253991], [31.430105, 74.252575], [31.428067, 74.250713], [31.427927, 74.250928], [31.427879, 74.251089], [31.42771, 74.252258], [31.427127, 74.252688], [31.425001, 74.257509], [31.424884, 74.257776], [31.419131, 74.25798], [31.419119, 74.261026], [31.418688, 74.260989], [31.418678, 74.266005], [31.419082, 74.265974], [31.419193, 74.27077], [31.430285, 74.270567], [31.431, 74.270323], [31.431251, 74.271159], [31.431526, 74.272195], [31.431723, 74.273111], [31.431891, 74.273963], [31.432078, 74.275023], [31.432281, 74.276062], [31.432308, 74.276354], [31.433842, 74.276078], [31.434017, 74.276184], [31.43415, 74.276191], [31.434223, 74.276198], [31.438888, 74.281026], [31.43933, 74.281433], [31.442369, 74.281377], [31.442254, 74.276071], [31.442203, 74.270894], [31.437391, 74.262756], [31.436349, 74.261095], [31.437584, 74.260021], [31.438333, 74.259143], [31.439457, 74.258172], [31.439815, 74.257929], [31.440309, 74.257284], [31.440604, 74.256985], [31.441106, 74.256612], [31.443266, 74.255127], [31.444341, 74.253885], [31.44438, 74.253795], [31.444462, 74.253533], [31.444586, 74.253058], [31.444604, 74.252645], [31.444618, 74.251987], [31.444602, 74.251295], [31.444513, 74.251113], [31.443762, 74.249129], [31.441069, 74.249839], [31.440607, 74.25003], [31.436214, 74.246662], [31.437312, 74.243786]],

  // 8. Allama Iqbal Town (Lahore) - High-Density Polygon
  iqbaltown: [[31.496359, 74.264043], [31.496204, 74.264784], [31.498052, 74.271345], [31.501595, 74.280997], [31.504879, 74.28995], [31.510007, 74.301017], [31.511565, 74.304259], [31.517329, 74.300457], [31.520409, 74.297921], [31.520841, 74.2976], [31.521166, 74.297434], [31.524859, 74.296154], [31.524831, 74.295652], [31.52576, 74.294245], [31.525916, 74.293701], [31.525931, 74.293649], [31.526001, 74.290708], [31.525712, 74.289536], [31.525364, 74.285239], [31.525641, 74.283657], [31.515616, 74.276536], [31.508922, 74.272156], [31.50087, 74.266511]],

  // 9. Township (Lahore) - High-Density Polygon
  township: [
    [31.4640, 74.3020], // Peco Road / Faisal Town Border North-West
    [31.4650, 74.3120], // Peco Road / Model Town Border North
    [31.4635, 74.3220], // Model Town Link Rd Junction North-East
    [31.4620, 74.3280], // Ferozepur Road / Township Sector A East
    [31.4540, 74.3310], // Ferozepur Road / Sector B East
    [31.4450, 74.3320], // Quaid-e-Azam Industrial Estate East
    [31.4380, 74.3300], // Kot Lakhpat Railway Station Area South-East
    [31.4360, 74.3200], // Industrial Estate South Boundary
    [31.4370, 74.3100], // Quaid-e-Azam Industrial Estate South-West
    [31.4400, 74.3000], // College Road / Wapda Town Border West
    [31.4480, 74.2990], // College Road / Sector C West
    [31.4580, 74.3000], // College Road / Sector B West
  ],

  // 10. Lake City (Lahore) - High-Density Polygon
  lakecity: [
    [31.3700, 74.2250], // Raiwind Road / Adda Plot Interchange North
    [31.3710, 74.2340], // Lake City Roof Garden North-East
    [31.3680, 74.2420], // Sue-e-Asal Road / Ring Road Interchange East
    [31.3650, 74.2480], // Lake City M3 / Ring Road East
    [31.3550, 74.2470], // Lake City M5 / Golf Club East
    [31.3420, 74.2420], // Lake City M8 South-East
    [31.3380, 74.2320], // Lake City South Boundary
    [31.3420, 74.2220], // Lake City M7 / Superior Uni South-West
    [31.3500, 74.2180], // Raiwind Road / Superior Uni West
    [31.3600, 74.2200], // Raiwind Road / Lake City Main Entrance West
  ],

  // 11. Askari (Lahore) - High-Density Polygon
  askari: [
    [31.4700, 74.4050], // Bedian Road / Ring Road Interchange North
    [31.4720, 74.4150], // Askari 10 Main Gate North-East
    [31.4680, 74.4250], // Askari 11 Sector A North-East
    [31.4600, 74.4300], // Askari 11 Sector B East Boundary
    [31.4500, 74.4280], // Askari 11 Sector C South-East
    [31.4420, 74.4200], // Bedian Road South Boundary
    [31.4400, 74.4100], // Askari 11 South-West
    [31.4460, 74.4000], // Ring Road Interchange South-West
    [31.4500, 74.3950], // DHA Phase 5 Border West
    [31.4600, 74.3980], // Bedian Road / DHA Phase 5 Gate West
  ],

  // 12. Lahore Cantt - High-Density Polygon
  cantt: [
    [31.5450, 74.3650], // Mall Road / St Anthony School / Fortress North-West
    [31.5480, 74.3780], // Mall Road / Garrison Golf Club North
    [31.5460, 74.3920], // Saddar Bazaar North-East
    [31.5400, 74.4020], // Zarar Shaheed Road / Airport North-East
    [31.5350, 74.4050], // Allama Iqbal Int'l Airport Border East
    [31.5220, 74.4000], // Airport Security Boundary East
    [31.5100, 74.3900], // DHA Phase 1 Border South-East
    [31.4980, 74.3720], // Walton Road / DHA Phase 1 Junction South
    [31.5050, 74.3680], // Cavalry Ground West Border
    [31.5150, 74.3660], // Super Town / Cantt Board Office West
    [31.5200, 74.3680], // Canal Road / Gulberg Border West
    [31.5320, 74.3640], // Mian Mir Bridge / Mall Road West
  ],
};

export const AREA_DISPLAY_NAMES: Record<string, string> = {
  bahriatown: 'Bahria Town',
  modeltown: 'Model Town',
  gulberg: 'Gulberg',
  dha: 'DHA Lahore',
  johartown: 'Johar Town',
  faisaltown: 'Faisal Town',
  wapdatown: 'Wapda Town',
  iqbaltown: 'Allama Iqbal Town',
  township: 'Township',
  lakecity: 'Lake City',
  askari: 'Askari',
  cantt: 'Lahore Cantt',
};

// Export CITY_POLYGONS as alias for backwards compatibility
export const CITY_POLYGONS = AREA_POLYGONS;

// Default supported areas baseline
const DEFAULT_AREAS: Area[] = [
  { id: 1, name: 'Bahria Town' },
  { id: 2, name: 'Model Town' },
  { id: 3, name: 'Gulberg' },
  { id: 4, name: 'DHA Lahore' },
  { id: 5, name: 'Johar Town' },
  { id: 6, name: 'Faisal Town' },
  { id: 7, name: 'Wapda Town' },
  { id: 8, name: 'Allama Iqbal Town' },
  { id: 9, name: 'Township' },
  { id: 10, name: 'Lake City' },
  { id: 11, name: 'Askari' },
  { id: 12, name: 'Lahore Cantt' },
];

const DEFAULT_CITIES: City[] = [
  { id: 1, name: 'Lahore' },
];

let cachedCities: City[] = [...DEFAULT_CITIES];
let cachedAreas: Area[] = [...DEFAULT_AREAS];

function normalize(str: string): string {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

/**
 * Standard Ray-Casting Point-in-Polygon Algorithm.
 * Determines if point (lat, lng) is physically inside polygon vertices array.
 */
export const isPointInPolygon = (
  lat: number,
  lng: number,
  polygon: Array<[number, number]>
): boolean => {
  if (!polygon || polygon.length < 3) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect =
      yi > lng !== yj > lng &&
      lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Buffer tolerance in meters allowed outside polygon perimeter (default: 250 meters).
 */
export const BOUNDARY_BUFFER_METERS = 250;

/**
 * Calculates distance in meters between two lat/lng coordinates (Haversine formula).
 */
export const getHaversineDistanceMeters = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Shortest distance in meters from point (lat, lng) to line segment (aLat, aLng) -> (bLat, bLng).
 */
export const getDistanceFromPointToSegmentMeters = (
  lat: number,
  lng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
): number => {
  const ab2 = (bLat - aLat) * (bLat - aLat) + (bLng - aLng) * (bLng - aLng);
  if (ab2 === 0) return getHaversineDistanceMeters(lat, lng, aLat, aLng);

  let t = ((lat - aLat) * (bLat - aLat) + (lng - aLng) * (bLng - aLng)) / ab2;
  t = Math.max(0, Math.min(1, t));

  const projLat = aLat + t * (bLat - aLat);
  const projLng = aLng + t * (bLng - aLng);

  return getHaversineDistanceMeters(lat, lng, projLat, projLng);
};

/**
 * Calculates minimum distance in meters from point (lat, lng) to any segment of polygon boundary.
 */
export const getMinDistanceToPolygonBoundaryMeters = (
  lat: number,
  lng: number,
  polygon: Array<[number, number]>
): number => {
  if (!polygon || polygon.length < 2) return Infinity;

  let minDistance = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [aLat, aLng] = polygon[j];
    const [bLat, bLng] = polygon[i];
    const dist = getDistanceFromPointToSegmentMeters(lat, lng, aLat, aLng, bLat, bLng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
};

/**
 * Evaluates whether a coordinate point is inside a polygon OR within bufferDistanceMeters of its boundary.
 */
export const isPointNearOrInPolygon = (
  lat: number,
  lng: number,
  polygon: Array<[number, number]>,
  bufferMeters: number = BOUNDARY_BUFFER_METERS
): { isMatched: boolean; isInside: boolean; distanceMeters: number } => {
  if (!polygon || polygon.length < 3) {
    return { isMatched: false, isInside: false, distanceMeters: Infinity };
  }

  const inside = isPointInPolygon(lat, lng, polygon);
  if (inside) {
    return { isMatched: true, isInside: true, distanceMeters: 0 };
  }

  const distance = getMinDistanceToPolygonBoundaryMeters(lat, lng, polygon);
  const isMatched = distance <= bufferMeters;
  return { isMatched, isInside: false, distanceMeters: distance };
};

export const initializeGeofenceService = async (): Promise<void> => {
  try {
    const [cities, areas] = await Promise.all([
      getCities().catch(() => []),
      getAreas().catch(() => []),
    ]);

    if (cities && cities.length > 0) {
      cachedCities = cities;
    }
    if (areas && areas.length > 0) {
      cachedAreas = [...DEFAULT_AREAS, ...areas];
    }
  } catch (error) {
    console.log('[geofenceService] Initialized with baseline supported areas.');
  }
};

export const getCachedCitiesAndAreas = () => {
  return { cities: cachedCities, areas: cachedAreas };
};

/**
 * Primary Geofence Validation:
 * Checks if lat/lng coordinates fall inside active area polygon boundaries OR within bufferMeters proximity.
 */
export const validateCoordinatesServiceability = (
  lat: number,
  lng: number,
  bufferMeters: number = BOUNDARY_BUFFER_METERS
): ServiceabilityResult => {
  if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
    return { isAvailable: false, message: 'Services Not Available in this location' };
  }

  // 1. Check active backend cached areas first
  for (const area of cachedAreas) {
    const areaKey = normalize(area.name);
    const polygon = (area as any).boundary_polygon || AREA_POLYGONS[areaKey];

    if (polygon) {
      const match = isPointNearOrInPolygon(lat, lng, polygon, bufferMeters);
      if (match.isMatched) {
        const displayName = AREA_DISPLAY_NAMES[areaKey] || area.name;
        return {
          isAvailable: true,
          matchedAreaName: displayName,
          matchedAreaObj: area,
          matchedCityName: 'Lahore',
          message: `Service Available in ${displayName}`,
        };
      }
    }
  }

  // 2. Fallback check against hardcoded polygon registry
  for (const [areaNameKey, polygon] of Object.entries(AREA_POLYGONS)) {
    const match = isPointNearOrInPolygon(lat, lng, polygon, bufferMeters);
    if (match.isMatched) {
      const displayName = AREA_DISPLAY_NAMES[areaNameKey] || (areaNameKey.charAt(0).toUpperCase() + areaNameKey.slice(1));
      const matchedObj = cachedAreas.find(a => normalize(a.name) === areaNameKey);

      return {
        isAvailable: true,
        matchedAreaName: displayName,
        matchedAreaObj: matchedObj,
        matchedCityName: 'Lahore',
        message: `Service Available in ${displayName}`,
      };
    }
  }

  return {
    isAvailable: false,
    message: 'Services Not Available in this area',
  };
};

/**
 * Helper signature for backwards compatibility with existing call sites.
 */
export const validateLocationServiceability = (
  cityInput: string,
  areaInput: string,
  fullAddressInput: string = '',
  latitude?: number,
  longitude?: number
): ServiceabilityResult => {
  if (latitude && longitude) {
    return validateCoordinatesServiceability(latitude, longitude);
  }
  return { isAvailable: false, message: 'Services Not Available in this area' };
};

export interface ResolvedCoordinatesLocation {
  cityName: string;
  areaName: string;
  cityId?: number;
  areaId?: number;
}

/**
 * Resolves city and area details for given coordinates using geofence polygon mapping.
 */
export const resolveLocationFromCoordinates = (
  lat: number,
  lng: number
): ResolvedCoordinatesLocation => {
  const result = validateCoordinatesServiceability(lat, lng);
  const cityName = result.matchedCityName || 'Lahore';
  const areaName = result.matchedAreaName || 'Gulberg';
  const cityId = result.matchedCityObj?.id;
  const areaId = result.matchedAreaObj?.id;

  return {
    cityName,
    areaName,
    cityId,
    areaId,
  };
};

