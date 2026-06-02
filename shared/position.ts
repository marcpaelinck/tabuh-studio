/**
 * Position type — the set of valid instrument positions in a Tabuh Studio score.
 *
 * Duplicated here from frontend/src/typing/basetypes.ts so that the shared
 * module stays self-contained. Keep in sync with that file.
 */
export type Position =
  | "CALUNG"
  | "CENGCENG"
  | "GENDER_RAMBAT"
  | "GONGS"
  | "JEGOGAN"
  | "KANTILAN_POLOS"
  | "KANTILAN_SANGSIH"
  | "KEMPLI"
  | "KENDANG"
  | "KENDANG_LANANG"
  | "KENDANG_WADON"
  | "PEMADE_POLOS"
  | "PEMADE_SANGSIH"
  | "PENYACAH"
  | "REYONG_1"
  | "REYONG_2"
  | "REYONG_3"
  | "REYONG_4"
  | "TROMPONG"
  | "UGAL";
