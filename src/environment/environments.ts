export interface Environment {
  id: string;
  name: string;
  note: string;
  colors: string[];
  ink: string;
  paper: string;
  accent: string;
}

export const environments: Environment[] = [
  { id: "ink", name: "Ink", note: "graphite · navy · dark teal", colors: ["#11171b", "#1b2c3b", "#21433f", "#263a45"], ink: "#edf2eb", paper: "#11191d", accent: "#a8c6b2" },
  { id: "lantern", name: "Lantern", note: "wine · rust · amber", colors: ["#3b1d2b", "#6b302a", "#7c3f36", "#9b683d"], ink: "#fff0dc", paper: "#291c20", accent: "#e3a56c" },
  { id: "rain", name: "Rain Window", note: "slate · violet · cyan", colors: ["#1d2c3a", "#40516a", "#493c61", "#3e6b73"], ink: "#e8f3f2", paper: "#192832", accent: "#a7d8d8" },
  { id: "moss", name: "Moss Paper", note: "forest · olive · beige", colors: ["#1a3025", "#44502c", "#665c36", "#87915a"], ink: "#f1f0df", paper: "#223026", accent: "#c5ca8c" },
  { id: "night-train", name: "Night Train", note: "black-blue · purple · dim red", colors: ["#0b1421", "#251d40", "#4a2639", "#766045"], ink: "#f0eaf0", paper: "#10131e", accent: "#c5a6a4" },
  { id: "dawn", name: "Dawn", note: "violet · rose · muted orange", colors: ["#241d38", "#593b54", "#92554b", "#b38862"], ink: "#fff0e7", paper: "#28202d", accent: "#e0b08f" }
];
