import type { CV } from "../state/types";
import { emptyCV } from "../state/defaults";

/** A realistic example used to show templates before the user has filled anything in. */
export const SAMPLE_CV: CV = {
  ...emptyCV(),
  roleId: "marketing",
  name: "Your Name",
  headline: "Digital Marketing Executive",
  phone: "+92 300 1234567",
  email: "yourname@gmail.com",
  city: "Lahore",
  linkedin: "",
  summary:
    "Digital marketer who grows audiences and turns clicks into customers. Brings 4+ years of experience, most recently at Daraz, with strong skills in social media marketing, paid ads and SEO.",
  summaryTouched: true,
  experience: [
    {
      id: "s1", title: "Digital Marketing Executive", company: "Daraz", city: "Lahore", start: "2023-02", end: "", current: true,
      bullets: [
        "Grew Instagram following from 18K to 64K in 10 months with a weekly content calendar",
        "Ran Facebook and Google campaigns with a 3.4x return on ad spend across 12 product lines",
        "Cut cost per lead by 28% by testing 40+ ad creatives each quarter",
      ],
    },
    {
      id: "s2", title: "Social Media Coordinator", company: "Khaadi", city: "Karachi", start: "2021-01", end: "2023-01", current: false,
      bullets: [
        "Planned and published 300+ posts for seasonal launches",
        "Wrote SEO blog content that doubled monthly website visitors",
      ],
    },
  ],
  education: [{ id: "e1", degree: "BBA (Marketing)", institute: "Lahore School of Economics", year: "2020", grade: "CGPA 3.6" }],
  skills: ["Social Media Marketing", "Facebook & Instagram Ads", "SEO", "Google Analytics", "Content Writing", "Canva", "Email Marketing"],
  languages: [{ name: "English", level: "Fluent" }, { name: "Arabic", level: "Basic" }],
  certifications: ["Google Ads Search Certification"],
  accent: "#0071E3",
};

/** Shows the user's CV once there's something in it; otherwise the sample. */
export const showcase = (cv: CV): CV => (cv.name.trim() || cv.experience.length ? cv : { ...SAMPLE_CV, template: cv.template, accent: cv.accent, showPhoto: cv.showPhoto });
