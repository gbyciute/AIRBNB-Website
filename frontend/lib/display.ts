export function formatUsername(username: string, language: "pt" | "en"): string {
  const [firstCharacter, ...remainingCharacters] = [...username]
  if (!firstCharacter) return username

  return `${firstCharacter.toLocaleUpperCase(language === "pt" ? "pt-PT" : "en-GB")}${remainingCharacters.join("")}`
}
