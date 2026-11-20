/**
 * Normalizes inconsistent, misspelled, abbreviated, or variant university names
 * to standard canonical names so that colleges under the same university
 * are properly grouped, filtered, and sorted together.
 */
export function normalizeUniversity(raw: string | null | undefined): string {
    if (!raw) return 'Unknown University';
    const str = String(raw).trim();
    if (!str || str.toLowerCase() === 'all' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') {
        return 'Unknown University';
    }

    // Clean punctuation and multiple spaces for matching
    const clean = str.toUpperCase().replace(/[^A-Z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
    // Compact representation without any punctuation or spaces
    const compact = str.toUpperCase().replace(/[^A-Z0-9]/g, '');

    // 1. ADHIKAVI NANNAYA UNIVERSITY (AKNU)
    // Matches: ADHI KAVI NANNAYA, ADHIKAVI NANNAYA, ADI KAVI NANNAYA, ADI KAVI NANNAYYA, AKNU, NANNAYA, RAJAMUNDRY etc.
    if (
        clean.includes('NANNAYA') || 
        clean.includes('NANNAYYA') || 
        compact.includes('AKNU') ||
        (clean.includes('ADHI') && clean.includes('KAVI')) ||
        (clean.includes('ADI') && clean.includes('KAVI')) ||
        clean.includes('ADHIKAVI') ||
        clean.includes('ADIKAVI')
    ) {
        return 'ADHIKAVI NANNAYA UNIVERSITY';
    }

    // 2. SRI VENKATESWARA UNIVERSITY (SVU)
    // Matches: SVU, S.V.U, SV, S.V, S V, S.V. UNIVERSITY, SV UNIVERSITY, SRI VENKATESWARA, SRI VENKATESHWARA, etc.
    if (
        !clean.includes('PADMAVATI') && !clean.includes('PADMAVATHI') && !clean.includes('MAHILA') && (
            clean === 'SVU' ||
            clean === 'S V U' ||
            clean.startsWith('SVU ') ||
            clean.startsWith('S V U ') ||
            clean === 'SV' ||
            clean === 'S V' ||
            clean.startsWith('SV ') ||
            clean.startsWith('S V ') ||
            compact === 'SVU' ||
            compact === 'SV' ||
            compact.startsWith('SVU') ||
            compact.startsWith('SVUNIV') ||
            compact.startsWith('SVUNIVERSITY') ||
            clean.includes('VENKATESWARA') ||
            clean.includes('VENKATESHWARA')
        )
    ) {
        return 'SRI VENKATESWARA UNIVERSITY (SVU)';
    }

    // 3. SRI KRISHNADEVARAYA UNIVERSITY (SKU)
    // Matches: SK, S.K, SKU, S.K.U, SK UNIVERSITY, S.K. UNIVERSITY, SRI KRISHNADEVARAYA, etc.
    if (
        clean === 'SK' ||
        clean === 'S K' ||
        clean.startsWith('SK ') ||
        clean.startsWith('S K ') ||
        clean === 'SKU' ||
        clean === 'S K U' ||
        clean.startsWith('SKU ') ||
        clean.startsWith('S K U ') ||
        compact === 'SK' ||
        compact === 'SKU' ||
        compact.startsWith('SKU') ||
        compact.startsWith('SKUNIV') ||
        compact.startsWith('SKUNIVERSITY') ||
        clean.includes('KRISHNADEVARAYA') ||
        clean.includes('KRISHNA DEVARAYA') ||
        (clean.includes('SRI KRISHNA') && !clean.includes('MACHILIPATNAM'))
    ) {
        return 'SRI KRISHNADEVARAYA UNIVERSITY (SKU)';
    }

    // 4. YOGI VEMANA UNIVERSITY (YVU)
    // Matches: YU, Y.U, YVU, Y.V.U, YV, Y.V, YV UNIVERSITY, YU UNIVERSITY, YOGI VEMANA, VEMANA, etc.
    if (
        clean === 'YU' ||
        clean === 'Y U' ||
        clean.startsWith('YU ') ||
        clean.startsWith('Y U ') ||
        clean === 'YVU' ||
        clean === 'Y V U' ||
        clean.startsWith('YVU ') ||
        clean.startsWith('Y V U ') ||
        clean === 'YV' ||
        clean === 'Y V' ||
        clean.startsWith('YV ') ||
        clean.startsWith('Y V ') ||
        compact === 'YU' ||
        compact === 'YVU' ||
        compact === 'YV' ||
        compact.startsWith('YVU') ||
        compact.startsWith('YVUNIV') ||
        compact.startsWith('YUUNIV') ||
        compact.startsWith('YVUNIVERSITY') ||
        compact.startsWith('YUUNIVERSITY') ||
        clean.includes('YOGI VEMANA') ||
        clean.includes('YOGIVEMANA') ||
        clean.includes('VEMANA')
    ) {
        return 'YOGI VEMANA UNIVERSITY (YVU)';
    }

    // 5. JNTU KAKINADA (JNTUK)
    if (
        clean === 'JNTUK' ||
        clean.includes('JNTUK') ||
        clean.includes('JNTU K') ||
        clean.includes('J N T U K') ||
        compact === 'JNTUK' ||
        compact.startsWith('JNTUK') ||
        (clean.includes('JNTU') && clean.includes('KAKINADA')) ||
        (clean.includes('TECHNOLOGICAL') && clean.includes('KAKINADA'))
    ) {
        return 'JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY, KAKINADA';
    }

    // JNTU HYDERABAD (JNTUH)
    if (
        clean === 'JNTUH' ||
        clean.includes('JNTUH') ||
        clean.includes('JNTU H') ||
        compact === 'JNTUH' ||
        (clean.includes('JNTU') && clean.includes('HYDERABAD')) ||
        (clean.includes('TECHNOLOGICAL') && clean.includes('HYDERABAD'))
    ) {
        return 'JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY, HYDERABAD';
    }

    // 6. JNTU ANANTAPUR (JNTUA) / PULIVENDULA (JNTUP) / JNTU (Host University)
    if (
        clean === 'JNTUA' ||
        clean.includes('JNTUA') ||
        clean.includes('JNTU A') ||
        clean.includes('J N T U A') ||
        compact === 'JNTUA' ||
        compact.startsWith('JNTUA') ||
        clean === 'JNTUP' ||
        clean.includes('JNTUP') ||
        clean.includes('JNTU P') ||
        clean.includes('J N T U P') ||
        compact === 'JNTUP' ||
        compact.startsWith('JNTUP') ||
        clean.includes('PULIVENDULA') ||
        clean === 'JNTU' ||
        clean.startsWith('JNTU ') ||
        compact === 'JNTU' ||
        clean.includes('JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY') ||
        (clean.includes('JNTU') && (clean.includes('ANANTAPUR') || clean.includes('ANANTHAPUR') || clean.includes('ANANTAPURAMU'))) ||
        (clean.includes('TECHNOLOGICAL') && (clean.includes('ANANTAPUR') || clean.includes('ANANTHAPUR') || clean.includes('ANANTAPURAMU'))) ||
        (clean.includes('JAWAHARLAL') && clean.includes('NEHRU'))
    ) {
        return 'JAWAHARLAL NEHRU TECHNOLOGICAL UNIVERSITY, ANANTAPUR';
    }

    // 8. ANDHRA UNIVERSITY (AU)
    if (
        clean === 'AU' ||
        clean === 'A U' ||
        clean.startsWith('AU ') ||
        clean.startsWith('A U ') ||
        compact === 'AU' ||
        compact.startsWith('AUUNIV') ||
        clean.includes('ANDHRA UNIVERSITY') ||
        clean.includes('ANDHRA UNISERY') ||
        clean.includes('ANDHRA UNIV') ||
        clean.includes('ANDHRA VISAKHAPATNAM') ||
        (clean.includes('ANDHRA') && !clean.includes('PRADESH') && (clean.includes('UNIV') || clean.includes('UNISERY')))
    ) {
        return 'ANDHRA UNIVERSITY (AU)';
    }

    // 9. ACHARYA NAGARJUNA UNIVERSITY (ANU)
    if (
        clean === 'ANU' ||
        clean === 'A N U' ||
        clean.startsWith('ANU ') ||
        clean.startsWith('A N U ') ||
        compact === 'ANU' ||
        compact.startsWith('ANUUNIV') ||
        clean.includes('NAGARJUNA') ||
        clean.includes('ACHARYA NAGARJUNA')
    ) {
        return 'ACHARYA NAGARJUNA UNIVERSITY (ANU)';
    }

    // 10. KRISHNA UNIVERSITY (KRU) (Machilipatnam)
    if (
        !clean.includes('DEVARAYA') && (
            clean === 'KRU' ||
            clean === 'K R U' ||
            clean.startsWith('KRU ') ||
            clean.startsWith('K R U ') ||
            compact === 'KRU' ||
            compact.startsWith('KRUUNIV') ||
            clean.includes('KRISHNA UNIVERSITY') ||
            clean.includes('KRISHNA UNIV') ||
            (clean.includes('KRISHNA') && clean.includes('MACHILIPATNAM'))
        )
    ) {
        return 'KRISHNA UNIVERSITY (KRU)';
    }

    // 11. RAYALASEEMA UNIVERSITY (RU)
    if (
        clean === 'RU' ||
        clean === 'R U' ||
        clean.startsWith('RU ') ||
        clean.startsWith('R U ') ||
        compact === 'RU' ||
        compact.startsWith('RUUNIV') ||
        clean.includes('RAYALASEEMA')
    ) {
        return 'RAYALASEEMA UNIVERSITY (RU)';
    }

    // 12. DR. B.R. AMBEDKAR UNIVERSITY, SRIKAKULAM (BRAU)
    if (
        clean === 'BRAU' ||
        clean === 'B R A U' ||
        clean.startsWith('BRAU ') ||
        clean.startsWith('B R A U ') ||
        compact === 'BRAU' ||
        compact.startsWith('BRAUUNIV') ||
        clean.includes('AMBEDKAR') ||
        clean.includes('ETCHERLA')
    ) {
        return 'DR. B.R. AMBEDKAR UNIVERSITY, SRIKAKULAM (BRAU)';
    }

    // 13. SRI PADMAVATI MAHILA VISVAVIDYALAYAM (SPMVV)
    if (
        clean === 'SPMVV' ||
        clean === 'S P M V V' ||
        compact === 'SPMVV' ||
        clean.includes('SPMVV') ||
        clean.includes('PADMAVATI') ||
        clean.includes('PADMAVATHI') ||
        (clean.includes('MAHILA') && clean.includes('TIRUPATI'))
    ) {
        return 'SRI PADMAVATI MAHILA VISVAVIDYALAYAM (SPMVV)';
    }

    // 14. RAJIV GANDHI UNIVERSITY OF KNOWLEDGE TECHNOLOGIES (RGUKT)
    if (clean.includes('RGUKT') || compact.includes('RGUKT') || clean.includes('RAJIV GANDHI UNIVERSITY')) {
        return 'RAJIV GANDHI UNIVERSITY OF KNOWLEDGE TECHNOLOGIES (RGUKT)';
    }

    // 15. DRAVIDIAN UNIVERSITY
    if (clean.includes('DRAVIDIAN')) {
        return 'DRAVIDIAN UNIVERSITY, KUPPAM';
    }

    // 16. CLUSTER UNIVERSITY
    if (clean.includes('CLUSTER')) {
        return 'CLUSTER UNIVERSITY, KURNOOL';
    }

    // 17. ADITYA UNIVERSITY
    if (clean === 'ADITYA' || clean.includes('ADITYA UNIVERSITY') || clean.includes('ADITYA UNIV') || compact === 'ADITYA') {
        return 'ADITYA UNIVERSITY';
    }

    // 18. KL UNIVERSITY / KLEF
    if (clean.includes('KLEF') || clean.includes('KONERU LAKSHMAIAH') || clean.includes('KL UNIVERSITY') || compact === 'KLEF') {
        return 'KL UNIVERSITY (KLEF)';
    }

    // 19. GITAM UNIVERSITY
    if (clean.includes('GITAM') || compact.includes('GITAM')) {
        return 'GITAM UNIVERSITY';
    }

    // 20. VIGNAN'S UNIVERSITY
    if (clean.includes('VIGNAN') || compact.includes('VIGNAN')) {
        return 'VIGNAN\'S UNIVERSITY';
    }

    // 21. CENTURION UNIVERSITY
    if (clean.includes('CENTURION')) {
        return 'CENTURION UNIVERSITY';
    }

    // 22. SRM UNIVERSITY
    if (clean.includes('SRM')) {
        return 'SRM UNIVERSITY, AP';
    }

    // 23. VIT-AP UNIVERSITY
    if (clean.includes('VIT') && clean.includes('AP')) {
        return 'VIT-AP UNIVERSITY';
    }

    return str.toUpperCase();
}
