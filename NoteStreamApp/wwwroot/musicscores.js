function getIntroMusicScore() {
  return {
    Title: "Intro",
    Bpm: 75,
    Repeats: 1,
    Notes: [
      { Id: "1", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "0"     },
      { Id: "2", NoteName: "B2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "3", NoteName: "D2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "4", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "1/2."  },
      { Id: "5", NoteName: "D2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "6", NoteName: "G2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "7", NoteName: "F#2", Type: playbackType, NoteLength: "1/2",  Interval: "1/2."  },
      { Id: "8", NoteName: "B2",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"   },
      { Id: "9", NoteName: "D2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"   },
      { Id: "10", NoteName: "F#2", Type: playbackType, NoteLength: "1/2", Interval: "1/2."  },
      { Id: "11", NoteName: "D2",  Type: playbackType, NoteLength: "1/2", Interval: "1/2"   },
      { Id: "12", NoteName: "G2",  Type: playbackType, NoteLength: "1/2.", Interval: "1/2"  },

      ...buildAlternatingPattern(13, ["F#2","F#3"], 8, "1/2."),
      ...buildAlternatingPattern(21, ["B2","B3"], 8),
      ...buildAlternatingPattern(29, ["D2","D3"], 12),

      ...buildAlternatingPattern(41, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(49, ["D2","D3"], 8),
      ...buildAlternatingPattern(57, ["G2","G3"], 12),

      ...buildAlternatingPattern(69, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(77, ["B2","B3"], 8),
      ...buildAlternatingPattern(85, ["D2","D3"], 12),

      ...buildAlternatingPattern(97, ["F#2","F#3"], 8),
      ...buildAlternatingPattern(105, ["D2","D3"], 8),
      ...buildAlternatingPattern(113, ["G2","G3"], 12),
    ]
  };
}

// Helper: builds an alternating two-note 1/16 pattern of `count` notes,
// starting at id `startId`. First note gets `firstInterval` (defaults to "1/16").
function buildAlternatingPattern(startId, [low, high], count, firstInterval = "1/16") {
  const out = [];
  for (let i = 0; i < count; i++) {
    out.push({
      Id: String(startId + i),
      NoteName: i % 2 === 0 ? low : high,
      Type: playbackType,
      NoteLength: "1/16",
      Interval: i === 0 ? firstInterval : "1/16",
    });
  }
  return out;
}

function getHappyMusicScore() {
  return {
    Title: "Happy",
    Bpm: 120,
    Repeats: 1,
    Notes: [
      { Id: "1",  NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "0"    },
      { Id: "2",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."  },
      { Id: "3",  NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."  },
      { Id: "4",  NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "5",  NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "6",  NoteName: "B3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "7",  NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "8",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."  },
      { Id: "9",  NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."  },
      { Id: "10", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "11", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "12", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "13", NoteName: "G3", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "14", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."  },
      { Id: "15", NoteName: "G4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."  },
      { Id: "16", NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "17", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "18", NoteName: "B3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "19", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "20", NoteName: "F4", Type: playbackType, NoteLength: "1/16", Interval: "1/2"  },
      { Id: "21", NoteName: "F4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."  },
      { Id: "22", NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."  },
      { Id: "23", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "24", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  },
      { Id: "25", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/4"  }
    ]
  };
}

function getRhythmMusicScore() {
  return {
    Title: "Rhythm",
    Bpm: 126,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "2",  NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "3",  NoteName: "G4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "4",  NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "5",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "6",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "7",  NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "8",  NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "9",  NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "10", NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "11", NoteName: "E4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "12", NoteName: "C4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "13", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "14", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "15", NoteName: "F4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "16", NoteName: "D4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" }
    ]
  };
}

function getBluesBrotherMusicScore() {
  return {
    Title: "BB",
    Bpm: 120,
    Repeats: 16,
    Notes: [
      { Id: "1", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "2", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "3", NoteName: "G3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "4", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "5", NoteName: "G#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "6", NoteName: "F3",  Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "7", NoteName: "A#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" },
      { Id: "8", NoteName: "G#3", Type: playbackType, NoteLength: "1/16", Interval: "1/8" }
    ]
  };
}

function getXFilesMusicScore() {
  return {
    Title: "XFiles",
    Bpm: 88,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "F4",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "2",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "3",  NoteName: "A#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "4",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "5",  NoteName: "D#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "6",  NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "7",  NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "8",  NoteName: "F4",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "9",  NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "10", NoteName: "A#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "11", NoteName: "C5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "12", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "13", NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "14", NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "15", NoteName: "G#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2." },
      { Id: "16", NoteName: "G5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "17", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "18", NoteName: "D#5", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "19", NoteName: "F5",  Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "20", NoteName: "C5",  Type: playbackType, NoteLength: "1/4.", Interval: "1/2"  },
      { Id: "21", NoteName: "C5",  Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  }
    ]
  };
}

function getRickMusicScore() {
  return {
    Title: "Rick",
    Bpm: 113,
    Repeats: 2,
    Notes: [
      { Id: "1",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."  },
      { Id: "2",  NoteName: "A3", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "3",  NoteName: "C4", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "4",  NoteName: "A3", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "5",  NoteName: "E4", Type: playbackType, NoteLength: "1/8.",  Interval: "1/16."   },
      { Id: "6",  NoteName: "E4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "7",  NoteName: "D4", Type: playbackType, NoteLength: "1/4.", Interval: "1/8."   },

      { Id: "8",  NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "9",  NoteName: "A3", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "10", NoteName: "C4", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "11", NoteName: "A3", Type: playbackType, NoteLength: "1/16",  Interval: "1/16."   },
      { Id: "12", NoteName: "D4", Type: playbackType, NoteLength: "1/8.",  Interval: "1/16."   },
      { Id: "13", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "14", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "15", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "16", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },

      { Id: "17", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."   },
      { Id: "18", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "19", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "20", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "21", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "22", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "23", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "24", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "25", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "26", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "27", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8."   },
      { Id: "28", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8."   },

      { Id: "29", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "30", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "31", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "32", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "33", NoteName: "E4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "34", NoteName: "E4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "35", NoteName: "D4", Type: playbackType, NoteLength: "1/4.", Interval: "1/8."   },

      { Id: "36", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."  },
      { Id: "37", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "38", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "39", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "40", NoteName: "G4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "41", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "42", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "43", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "44", NoteName: "A3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },

      { Id: "45", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/4."   },
      { Id: "46", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "47", NoteName: "C4", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "48", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/16."   },
      { Id: "49", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "50", NoteName: "D4", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "51", NoteName: "B3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "52", NoteName: "A3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "53", NoteName: "G3", Type: playbackType, NoteLength: "1/4",  Interval: "1/16."   },
      { Id: "54", NoteName: "G3", Type: playbackType, NoteLength: "1/8",  Interval: "1/8."   },
      { Id: "55", NoteName: "D4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8."   },
      { Id: "56", NoteName: "C4", Type: playbackType, NoteLength: "1/4",  Interval: "1/8."   }
    ]
  };
}

function getFinalScore() {
  return {
    Title: "Final",
    Bpm: 75,
    Repeats: 4,
    Notes: [
      { Id: "1",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/1"  },
      { Id: "2",  NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "3",  NoteName: "C#5", Type: playbackType, NoteLength: "1/4",  Interval: "1/16" },
      { Id: "4",  NoteName: "F#4", Type: playbackType, NoteLength: "1/1",  Interval: "1/2"  },

      { Id: "5",  NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/1." },
      { Id: "6",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "7",  NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "8",  NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "9",  NoteName: "B4",  Type: playbackType, NoteLength: "1/1",  Interval: "1/4"  },

      { Id: "10", NoteName: "D5",  Type: playbackType, NoteLength: "1/16", Interval: "1/1." },
      { Id: "11", NoteName: "C#5", Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "12", NoteName: "D5",  Type: playbackType, NoteLength: "1/4",  Interval: "1/16" },
      { Id: "13", NoteName: "F#4", Type: playbackType, NoteLength: "1/2",  Interval: "1/2"  },
      { Id: "14", NoteName: "G#4", Type: playbackType, NoteLength: "1/1",  Interval: "1/2." },

      { Id: "15", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/1"  },
      { Id: "16", NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "17", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/16" },
      { Id: "18", NoteName: "A4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "19", NoteName: "G#4", Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "20", NoteName: "B4",  Type: playbackType, NoteLength: "1/16", Interval: "1/8"  },
      { Id: "21", NoteName: "A4",  Type: playbackType, NoteLength: "1/1",  Interval: "1/8"  }
    ]
  };
}

function getStrangerMusicScore() {
  return {
    Title: "Stranger",
    Bpm: 150,
    Repeats: 16,
    Notes: [
      { Id: "1", NoteName: "C3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "2", NoteName: "E3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "3", NoteName: "G3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "4", NoteName: "B3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "5", NoteName: "C4", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "6", NoteName: "B3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "7", NoteName: "G3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" },
      { Id: "8", NoteName: "E3", Type: playbackType, NoteLength: "1/8", Interval: "1/8" }
    ]
  };
}

const MUSIC_SCORES = {
  "Intro":  getIntroMusicScore,
  "Happy":  getHappyMusicScore,
  "Rhythm": getRhythmMusicScore,
  "Strange": getStrangerMusicScore,
  "X":      getXFilesMusicScore,
  "BB":     getBluesBrotherMusicScore,
  "Never":  getRickMusicScore,
  "Final":  getFinalScore
};

function getMusicScoreByTitle(title) {
  return MUSIC_SCORES[title]();
}
