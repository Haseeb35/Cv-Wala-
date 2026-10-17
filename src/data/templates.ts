import type { TemplateId } from "../state/types";

export type TemplateMeta = { id: TemplateId; name: string; blurb: string; photo: boolean };

export const TEMPLATES: TemplateMeta[] = [
  { id: "aurora", name: "Aurora", blurb: "Colour header, modern and confident", photo: true },
  { id: "sidebar", name: "Sidebar", blurb: "Two columns with a photo panel", photo: true },
  { id: "executive", name: "Executive", blurb: "Serif type for senior roles", photo: false },
  { id: "minimal", name: "Minimal", blurb: "Swiss grid with lots of air", photo: false },
  { id: "classic", name: "Classic", blurb: "Safe for any employer", photo: false },
  { id: "bold", name: "Bold", blurb: "Large name, strong presence", photo: true },
  { id: "elegant", name: "Elegant", blurb: "Centred serif, quietly refined", photo: true },
  { id: "compact", name: "Compact", blurb: "Fits the most on one page", photo: false },
];

export const templateMeta = (id: TemplateId) => TEMPLATES.find((t) => t.id === id) ?? TEMPLATES[0];
