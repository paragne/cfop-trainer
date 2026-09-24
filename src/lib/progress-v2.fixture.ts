// A version 2 blob exactly as serialize() wrote it at commit 9936ad6, with
// every pref off its default. Frozen: it proves an additive change needs no
// version bump only if this text never changes, so never regenerate it.
export const V2_BLOB = String.raw`{
  "version": 2,
  "updatedAt": 1789000000000,
  "prefs": {
    "showNames": false,
    "showSolutions": true,
    "randomRotation": true,
    "mode": "drill",
    "sets": {
      "learn": [
        "Full OLL",
        "F2L"
      ],
      "drill": [
        "2-Look PLL",
        "Full PLL"
      ],
      "verify": [
        "Full OLL",
        "2-Look OLL"
      ]
    },
    "verifyLength": 20,
    "threeD": true,
    "speed": 1.5,
    "zoom": 2
  },
  "cards": {
    "f2l-slot-4": {
      "ease": 2.2,
      "interval": 6,
      "reps": 2,
      "due": 1789518400000,
      "seen": 4,
      "known": 3,
      "lastGrade": 1
    },
    "oll-42": {
      "ease": 1.3,
      "interval": 1,
      "reps": 0,
      "due": 1788913600000,
      "seen": 9,
      "known": 2,
      "lastGrade": 0
    },
    "pll-gd": {
      "ease": 2.85,
      "interval": 15,
      "reps": 3,
      "due": 1790296000000,
      "seen": 3,
      "known": 3,
      "lastGrade": 1
    }
  },
  "notes": {
    "f2l-slot-4": "rotate early\nthen the y' is free",
    "oll-42": "not a Sune — “back” first, é"
  }
}`;
