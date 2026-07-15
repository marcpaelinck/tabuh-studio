const alphabet = {
    '0': {
        type: 'tone',
        name: 'Ka',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '8': {
        type: 'tone',
        name: 'Det',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '9': {
        type: 'tone',
        name: 'Tong',
        description: 'Lanang stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    G: { type: 'tone', name: 'Gir', description: 'Gong stroke', positions: ['GONGS'] },
    P: { type: 'tone', name: 'Pur', description: 'Kempur stroke', positions: ['GONGS'] },
    T: { type: 'tone', name: 'Tong', description: 'Kemong stroke', positions: ['GONGS'] },
    x: {
        type: 'tone',
        name: 'Stroke',
        description: 'Toneless stroke. Reyong: on chime rim. Kempli: muted stroke. Ceng-ceng: open stroke.',
        positions: ['REYONG_4', 'REYONG_3', 'REYONG_2', 'REYONG_1', 'CENGCENG', 'KEMPLI']
    },
    '(': {
        type: 'tone',
        name: 'Tut',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    ')': {
        type: 'tone',
        name: 'Teng',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    '*': {
        type: 'tone',
        name: 'Pak',
        description: 'Wadon stroke',
        positions: ['KENDANG_LANANG', 'KENDANG_WADON', 'KENDANG']
    },
    i: {
        type: 'tone',
        name: 'DING',
        description: 'Generic tone (without octave)',
        positions: [
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'TROMPONG',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ]
    },
    o: {
        type: 'tone',
        name: 'DONG',
        description: 'Generic tone (without octave)',
        positions: [
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'TROMPONG',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ]
    },
    e: {
        type: 'tone',
        name: 'DENG',
        description: 'Generic tone (without octave)',
        positions: [
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'TROMPONG',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ]
    },
    u: {
        type: 'tone',
        name: 'DUNG',
        description: 'Generic tone (without octave)',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'GENDER_RAMBAT',
            'TROMPONG',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ]
    },
    a: {
        type: 'tone',
        name: 'DANG',
        description: 'Generic tone (without octave)',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'GENDER_RAMBAT',
            'TROMPONG',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'PENYACAH',
            'CALUNG',
            'JEGOGAN'
        ]
    },
    t: {
        type: 'tone',
        name: 'DENG-DING',
        description: 'Combined stroke on DENG and DING (only used in DONG norot pattern)',
        positions: ['REYONG_1']
    },
    b: {
        type: 'tone',
        name: 'Byong',
        description: "Combined stroke on first and third chime of a reyong position's 3-note range",
        positions: ['REYONG_4', 'REYONG_3', 'REYONG_2', 'REYONG_1']
    },
    I: {
        type: 'prefix',
        name: 'DING grace note',
        description: 'Briefly struck note preceding another note',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    O: {
        type: 'prefix',
        name: 'DONG grace note',
        description: 'Briefly struck note preceding another note',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    E: {
        type: 'prefix',
        name: 'DENG grace note',
        description: 'Briefly struck note preceding another note',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    U: {
        type: 'prefix',
        name: 'DUNG grace note',
        description: 'Briefly struck note preceding another note',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    A: {
        type: 'prefix',
        name: 'DANG grace note',
        description: 'Briefly struck note preceding another note',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    X: {
        type: 'prefix',
        name: 'Stroke',
        description: 'Stroke on chime rim.',
        positions: ['REYONG_4', 'REYONG_3', 'REYONG_2', 'REYONG_1']
    },
    B: {
        type: 'prefix',
        name: 'Byong',
        description: "Combined stroke on first and third chime of a reyong position's 3-note range",
        positions: ['REYONG_4', 'REYONG_3', 'REYONG_2', 'REYONG_1']
    },
    ';': {
        type: 'modifier',
        name: 'Tremolo',
        description: 'Repeated, rapid succession of the same note.',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'KENDANG_LANANG',
            'KENDANG_WADON',
            'KENDANG',
            'CENGCENG',
            'KEMPLI'
        ]
    },
    ':': {
        type: 'modifier',
        name: 'Accelerating tremolo',
        description: 'Repeated succession of the same note, starting slowly and gradually increasing the tempo.',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS',
            'KENDANG_LANANG',
            'KENDANG_WADON',
            'KENDANG',
            'CENGCENG',
            'KEMPLI'
        ]
    },
    _: {
        type: 'modifier',
        name: 'Half duration',
        description: 'Halves the duration of the note.',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    '[': {
        type: 'modifier',
        name: 'Rake left',
        description:
            'Slide the panggul along the notes from left to right, starting on the note to which the modifier belongs.',
        positions: ['GENDER_RAMBAT', 'UGAL', 'PEMADE_SANGSIH', 'PEMADE_POLOS', 'KANTILAN_SANGSIH', 'KANTILAN_POLOS']
    },
    ']': {
        type: 'modifier',
        name: 'Rake left',
        description:
            'Slide the panggul along the notes from right to left, starting on the note to which the modifier belongs.',
        positions: ['GENDER_RAMBAT', 'UGAL', 'PEMADE_SANGSIH', 'PEMADE_POLOS', 'KANTILAN_SANGSIH', 'KANTILAN_POLOS']
    },
    n: {
        type: 'modifier',
        name: 'Norot',
        description: '4-note partial norot pattern. Combines with three trailing spaces.',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    },
    N: {
        type: 'modifier',
        name: 'Norot',
        description: '4-note partial norot pattern. Combines with three trailing spaces.',
        positions: [
            'REYONG_4',
            'REYONG_3',
            'REYONG_2',
            'REYONG_1',
            'GENDER_RAMBAT',
            'UGAL',
            'PEMADE_SANGSIH',
            'PEMADE_POLOS',
            'KANTILAN_SANGSIH',
            'KANTILAN_POLOS'
        ]
    }
}
