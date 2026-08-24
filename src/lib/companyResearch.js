const englishSignals = new Set(
  "a an and are as at be because by company customers delivers for from has have in into is its of on or our provides services that the their these this through to with work business customer people products solutions technology community financial banking healthcare energy retail growth quality innovation support operates leading focus purpose mission values".split(
    " ",
  ),
);

const foreignSignals = new Set(
  "le la les des du une un et pour avec est sont dans notre votre vous nous qui que sur aux leurs entreprise société el los las una uno y para con del esta este son en nuestro nuestra empresa o os uma um e com da de do dos das não em sua seu società il lo gli della delle und der die das ein eine mit für ist sind auf unser unsere unternehmen".split(
    " ",
  ),
);

export function isReliableEnglishResearch(value = "") {
  const words = String(value).toLowerCase().match(/[a-zà-ÿ']+/g) || [];
  if (words.length < 8) return false;
  const english = words.filter((word) => englishSignals.has(word)).length;
  const foreign = words.filter((word) => foreignSignals.has(word)).length;
  if (foreign >= 2 && foreign >= english) return false;
  return english >= 3;
}

export function researchMotivation({ company, role, skills = [] }) {
  const safeCompany = company?.trim() || "The company";
  const safeRole = role?.trim();
  const highlighted = skills.filter(Boolean).slice(0, 2);
  const contribution = highlighted.length
    ? ` My experience in ${highlighted.join(" and ")} would help me contribute to those priorities from the outset.`
    : "";
  const roleConnection = safeRole
    ? ` The opportunity to support that work as a ${safeRole} gives me even more motivation to apply.`
    : " This gives me even more motivation to apply and contribute to the organisation's work.";
  return `${safeCompany}'s direction is the kind of purposeful work I want to contribute to.${roleConnection}${contribution}`;
}
