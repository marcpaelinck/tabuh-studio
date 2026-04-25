// Used by method tabuhUtils.createTagLookup to generate all possible position tags which can occur at the beginning
// of a notation line (staff).
// The creates a lookup table mapping all possible combinations of instr_tag + separator + pos_tag
// to the corresponging positions list.
//    instr_tag: alternatives for the instrument name
//    pos_tag: alternatives for the positions of the instrument
//    positions: corresponding list of Position values
// prettier-ignore
export const instrumentTags: Record<string, string | string[]>[] = [
    { instr_tag: ['calung', 'cal', 'ca'], pos_tag: [''], positions: ['CALUNG'] },
    { instr_tag: ['cengceng', 'ceng', 'ce'], pos_tag: [''], positions: ['CENGCENG'] },
    { instr_tag: ['gangsa', 'ga'], pos_tag: [''], positions: ['PEMADE_POLOS', 'KANTILAN_POLOS', 'PEMADE_SANGSIH', 'KANTILAN_SANGSIH'] },
    { instr_tag: ['gangsa', 'ga'], pos_tag: ['polos', 'po', 'p'], positions: ['PEMADE_POLOS', 'KANTILAN_POLOS'] },
    { instr_tag: ['gangsa', 'ga'], pos_tag: ['sangsih', 'sang', 'sa', 's'], positions: ['PEMADE_SANGSIH', 'KANTILAN_SANGSIH'] },
    { instr_tag: ['genderrambat', 'gender', 'gen', 'ge'], pos_tag: [], positions: ['GENDERRAMBAT'] },
    { instr_tag: ['gongs', 'gong', 'go'], pos_tag: [''], positions: ['GONGS'] },
    { instr_tag: ['gying', 'gy'], pos_tag: [''], positions: ['UGAL'] },
    { instr_tag: ['jegogan', 'jegog', 'jeg', 'je'], pos_tag: [''], positions: ['JEGOGAN'] },
    { instr_tag: ['jublag', 'jub', 'ju', 'calung', 'cal', 'ca'], pos_tag: [''], positions: ['CALUNG'] },
    { instr_tag: ['kantilan', 'kan', 'ka'], pos_tag: [''], positions: ['KANTILAN_POLOS', 'KANTILAN_SANGSIH'] },
    { instr_tag: ['kantilan', 'kan', 'ka'], pos_tag: ['polos', 'pol', 'po', 'p'], positions: ['KANTILAN_POLOS'] },
    { instr_tag: ['kantilan', 'kan', 'ka'], pos_tag: ['sangsih', 'sang', 'sa', 's'], positions: ['KANTILAN_SANGSIH'] },
    { instr_tag: ['kempli', 'kem', 'ke'], pos_tag: [''], positions: ['KEMPLI'] },
    { instr_tag: ['kendang', 'kend', 'kd'], pos_tag: [''], positions: ['KENDANG'] },
    { instr_tag: ['pemade', 'pem', 'pe'], pos_tag: [''], positions: ['PEMADE_POLOS', 'PEMADE_SANGSIH'] },
    { instr_tag: ['pemade', 'pem', 'pe'], pos_tag: ['polos', 'pol', 'po', 'p'], positions: ['PEMADE_POLOS'] },
    { instr_tag: ['pemade', 'pem', 'pe'], pos_tag: ['sangsih', 'sang', 'sa', 's'], positions: ['PEMADE_SANGSIH'] },
    { instr_tag: ['penyacah', 'peny', 'pen'], pos_tag: [''], positions: ['PENYACAH'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: [''], positions: ['REYONG_1', 'REYONG_2', 'REYONG_3', 'REYONG_4'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['1'], positions: ['REYONG_1'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['2'], positions: ['REYONG_2'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['3'], positions: ['REYONG_3'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['4'], positions: ['REYONG_4'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['12', '1+2'], positions: ['REYONG_1', 'REYONG_2'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['13', '1+3'], positions: ['REYONG_1', 'REYONG_3'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['24', '2+4'], positions: ['REYONG_2', 'REYONG_4'] },
    { instr_tag: ['reyong', 'rey', 're'], pos_tag: ['34', '3+4'], positions: ['REYONG_3', 'REYONG_4'] },
    { instr_tag: ['suling', 'sul', 'su'], pos_tag: [''], positions: ['SULING'] },
    { instr_tag: ['trompong', 'tromp', 'tromp', 'tro', 'tr'], pos_tag: [''], positions: ['TROMPONG'] },
    { instr_tag: ['ugal', 'ug'], pos_tag: [''], positions: ['UGAL'] }
]

// possible separators between the instrument tag and position tag. E.g. reyong1 / reyong 1 / reyong_1 / reyong-1.
export const separators = ['', ' ', '_', '-'] // Separators
