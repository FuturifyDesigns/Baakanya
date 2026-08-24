const finishSentence = (value) =>
  /[.!?]$/.test(value) ? value : `${value}.`;

const lowerFirst = (value) =>
  value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;

const possessive = (company) =>
  /s$/i.test(company) ? `${company}'` : `${company}'s`;

export function formatCompanyContext({
  company,
  description,
  role,
  skills = [],
}) {
  const safeCompany = company?.trim() || "The company";
  const cleaned = String(description || "")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/[•▪◦]+/g, ". ")
    .replace(/\s+/g, " ")
    .trim();

  if (cleaned.length < 30) {
    return { text: "", motivation: "", error: "Add at least 30 characters about the company." };
  }

  const sentences = cleaned
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((sentence, index) => {
      let polished = sentence.trim();
      polished = polished
        .replace(/^we are\b/i, `${safeCompany} is`)
        .replace(/^we\b/i, safeCompany)
        .replace(/^our\b/i, possessive(safeCompany))
        .replace(/^the company\b/i, safeCompany);

      if (
        index === 0 &&
        !polished.toLowerCase().startsWith(safeCompany.toLowerCase()) &&
        !/^(it|its|this organisation|this organization)\b/i.test(polished)
      ) {
        polished = `${safeCompany} ${lowerFirst(polished)}`;
      }

      return finishSentence(
        `${polished.charAt(0).toUpperCase()}${polished.slice(1)}`,
      );
    });

  const highlighted = skills.filter(Boolean).slice(0, 2);
  const position = role?.trim() ? ` as a ${role.trim()}` : "";
  const contribution = highlighted.length
    ? ` My experience in ${highlighted.join(" and ")} would help me make a practical contribution to these priorities from the outset.`
    : " I would value the opportunity to make a practical contribution to these priorities.";

  return {
    text: sentences.join(" "),
    motivation: `This direction strengthens my motivation to join ${safeCompany}${position}.${contribution}`,
    error: "",
  };
}
