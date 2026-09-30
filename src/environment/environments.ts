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
  { id: "ink", name: "Ink", note: "charcoal / deep blue / muted green", colors: ["#10171b", "#26343d", "#203b35", "#1e2630"], ink: "#edf1ec", paper: "#171d20", accent: "#9eb8a4" },
  { id: "lantern", name: "Lantern", note: "rust / plum / amber", colors: ["#4c2525", "#642f3c", "#38243c", "#7b4d2e"], ink: "#fff4e4", paper: "#2b2021", accent: "#e4a26d" },
  { id: "rain", name: "Rain Window", note: "slate / violet / pale cyan", colors: ["#1d3040", "#3b4c65", "#38324f", "#315c68"], ink: "#edf6f5", paper: "#202b35", accent: "#9bd4d6" },
  { id: "moss", name: "Moss Paper", note: "deep green / olive / beige", colors: ["#1c3026", "#40502a", "#615b32", "#3f4530"], ink: "#f2f1df", paper: "#263126", accent: "#c2c984" }
];
