// A version 1 blob exactly as v1 serialize() wrote it (commit 7ce2f81). Frozen:
// the migration is only proven if this text never changes, so never regenerate it.
export const V1_BLOB = String.raw`{
  "version": 1,
  "updatedAt": 1789000000000,
  "prefs": {
    "showNames": false,
    "showSolutions": true,
    "groups": [
      "F2L",
      "PLL"
    ]
  },
  "cards": {
    "f2l-easy-1": {
      "ease": 2.6,
      "interval": 6,
      "reps": 2,
      "due": 1789518400000,
      "seen": 3,
      "known": 3,
      "lastGrade": 1
    },
    "f2l-connected-5": {
      "ease": 1.9,
      "interval": 1,
      "reps": 0,
      "due": 1788913600000,
      "seen": 5,
      "known": 2,
      "lastGrade": 0
    },
    "oll-27": {
      "ease": 2.5,
      "interval": 1,
      "reps": 1,
      "due": 1789086400000,
      "seen": 1,
      "known": 1,
      "lastGrade": 1
    },
    "oll-cross-dot": {
      "ease": 1.3,
      "interval": 1,
      "reps": 0,
      "due": 1789000000000,
      "seen": 8,
      "known": 1,
      "lastGrade": 0
    },
    "pll-ua": {
      "ease": 2.75,
      "interval": 16,
      "reps": 3,
      "due": 1790382400000,
      "seen": 4,
      "known": 4,
      "lastGrade": 1
    },
    "pll-corners-adjacent": {
      "ease": 2.3,
      "interval": 6,
      "reps": 2,
      "due": 1789259200000,
      "seen": 6,
      "known": 4,
      "lastGrade": 1
    }
  },
  "notes": {
    "f2l-easy-1": "insert from the back, don't rotate",
    "pll-ua": "headlights on the left → M-slice first\nthen the “other” U, é",
    "oll-27": "sune"
  }
}`;
