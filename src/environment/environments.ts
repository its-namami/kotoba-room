export interface Environment {
  id: string;
  name: string;
  note: string;
  colors: string[];
  washColors: string[];
  ink: string;
  paper: string;
  accent: string;
}

export const environments: Environment[] = [
  { id: "ink", name: "Ink", note: "graphite · navy · dark teal", colors: ["#11171b", "#1b2c3b", "#21433f", "#263a45"], washColors: ["#29484b", "#356b70", "#37665c", "#244e72", "#343b76", "#4d3e62", "#53604d", "#273a46"], ink: "#edf2eb", paper: "#11191d", accent: "#a8c6b2" },
  { id: "lantern", name: "Lantern", note: "wine · rust · amber", colors: ["#3b1d2b", "#6b302a", "#7c3f36", "#9b683d"], washColors: ["#693d49", "#874b3e", "#8f5b3c", "#a77945", "#704455", "#63384c", "#9a5540", "#765034"], ink: "#fff0dc", paper: "#291c20", accent: "#e3a56c" },
  { id: "rain", name: "Rain Window", note: "slate · violet · cyan", colors: ["#1d2c3a", "#40516a", "#493c61", "#3e6b73"], washColors: ["#3d6978", "#567d8e", "#526d8a", "#4b5b91", "#665d8c", "#4c7480", "#5b8d91", "#415d76"], ink: "#e8f3f2", paper: "#192832", accent: "#a7d8d8" },
  { id: "moss", name: "Moss Paper", note: "forest · olive · beige", colors: ["#1a3025", "#44502c", "#665c36", "#87915a"], washColors: ["#46684d", "#66804a", "#7c8245", "#8d8b55", "#5a7047", "#788050", "#9a9564", "#4f7355"], ink: "#f1f0df", paper: "#223026", accent: "#c5ca8c" },
  { id: "night-train", name: "Night Train", note: "black-blue · purple · dim red", colors: ["#0b1421", "#251d40", "#4a2639", "#766045"], washColors: ["#233a61", "#382f67", "#4b3667", "#6a3f58", "#704846", "#685a4c", "#3b315e", "#1c3452"], ink: "#f0eaf0", paper: "#10131e", accent: "#c5a6a4" },
  { id: "dawn", name: "Dawn", note: "violet · rose · muted orange", colors: ["#241d38", "#593b54", "#92554b", "#b38862"], washColors: ["#52416c", "#74506b", "#956070", "#b16d62", "#c08062", "#b58a69", "#865b72", "#5e4b75"], ink: "#fff0e7", paper: "#28202d", accent: "#e0b08f" }
];
