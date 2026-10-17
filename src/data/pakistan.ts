// Local data shared by the editor, the CV importer and the job-ad reader.

export const CITIES = ["Karachi", "Lahore", "Islamabad", "Rawalpindi", "Faisalabad", "Multan", "Peshawar", "Quetta", "Hyderabad", "Gujranwala", "Sialkot", "Sargodha", "Bahawalpur", "Abbottabad", "Mardan", "Sukkur", "Gujrat", "Sahiwal", "Rahim Yar Khan", "Mirpur", "Dubai", "Riyadh", "Doha"];

export const DEGREES = ["Matric (SSC)", "O Levels", "Intermediate (FSc Pre-Engineering)", "Intermediate (FSc Pre-Medical)", "Intermediate (ICS)", "Intermediate (ICom)", "Intermediate (FA)", "A Levels", "DAE", "BA", "BSc", "BCom", "BBA", "BS Computer Science", "BS Software Engineering", "BS Accounting & Finance", "BE / BSc Engineering", "MBBS", "BSN (Nursing)", "MA", "MSc", "MCom", "MBA", "MS / MPhil", "PhD"];

/**
 * Degree level, used to compare what a job ad asks for with what the CV has.
 * 1 Matric · 2 Intermediate / diploma · 3 Bachelor's · 4 Master's · 5 PhD
 */
export const DEGREE_LEVELS: [RegExp, number][] = [
  [/\b(ph\.?\s?d|doctorate)\b/i, 5],
  // Not a bare "MS"/"MA": they collide with "Ms. Sara" and "MS Office".
  [/\b(?:master'?s?\b|m\.?\s?phil\b|mba\b|m\.?\s?com\b|m\.?\s?sc\b|m\.a\.|m\.s\.|ms\s?(?:cs|it|computer|software|engineering|finance|economics)\b)/i, 4],
  [/\b(bachelor'?s?|graduat(e|ion)|b\.?\s?com|b\.?\s?sc|b\.?\s?a|bba|b\.?\s?s|b\.?\s?e|mbbs|bsn|pharm-?d|llb|b\.?\s?ed)\b/i, 3],
  [/\b(intermediate|f\.?\s?sc|f\.?\s?a|i\.?\s?cs|i\.?\s?com|hssc|a[\s-]?levels?|dae|diploma)\b/i, 2],
  [/\b(matric(ulation)?|ssc|o[\s-]?levels?)\b/i, 1],
];

export const LEVEL_NAMES = ["", "Matric", "Intermediate", "Bachelor's", "Master's", "PhD"];

export function degreeLevel(text: string): number {
  for (const [re, level] of DEGREE_LEVELS) if (re.test(text)) return level;
  return 0;
}
