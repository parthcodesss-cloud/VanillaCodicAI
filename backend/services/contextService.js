import {
  getDifficultyLevel,
  getWeakestSkills,
  getMostRepeatedMistakes,
} from "./profileService.js";
import { getProfile } from "./memoryStore.js";
import { findSimilarSessions } from "./similarityService.js";

// ── Build Personalized Context for AI Prompts ────────────────────────

export async function buildPersonalizedContext(userId, code, language, mainFile = null) {
  const profile = getProfile(userId);
  const difficulty = getDifficultyLevel(profile);
  const weakSkills = getWeakestSkills(profile, 3);
  const repeatedMistakes = getMostRepeatedMistakes(profile, 3);
  const similarSessions = await findSimilarSessions(userId, code, language, 3, mainFile);

  const contextParts = [];

  // Difficulty instruction
  if (difficulty === "beginner") {
    contextParts.push(
      "TEACHING LEVEL: Explain like the user is a complete beginner. Use analogies and avoid jargon."
    );
  } else if (difficulty === "intermediate") {
    contextParts.push(
      "TEACHING LEVEL: The user has some experience. Be clear but you can use standard programming terms."
    );
  } else {
    contextParts.push(
      "TEACHING LEVEL: The user is advanced. Be concise and technical. Mention edge cases and performance."
    );
  }

  // Weak skills awareness
  if (weakSkills.length > 0) {
    const weakNames = weakSkills.map((s) => s.name).join(", ");
    contextParts.push(
      `USER WEAKNESS AREAS: The user tends to struggle with: ${weakNames}. Pay extra attention to these.`
    );
  }

  // Repeated mistakes
  if (repeatedMistakes.length > 0) {
    const mistakeStr = repeatedMistakes
      .map((m) => `"${m.mistake}" (${m.count}x)`)
      .join(", ");
    contextParts.push(
      `REPEATED MISTAKES: The user has previously made these mistakes multiple times: ${mistakeStr}. If you detect these again, gently remind them.`
    );
  }

  // Similar past sessions
  if (similarSessions.length > 0) {
    const pastErrors = similarSessions
      .filter((s) => s.errorTitles && s.errorTitles.length > 0)
      .map(
        (s) =>
          `[${s.language}, ${s.similarity}% similar] Errors: ${s.errorTitles.join(", ")}`
      )
      .slice(0, 3);

    if (pastErrors.length > 0) {
      contextParts.push(
        `SIMILAR PAST SESSIONS:\n${pastErrors.join("\n")}\nIf you see the same patterns, mention that the user has encountered these before.`
      );
    }
  }

  return {
    contextString: contextParts.join("\n\n"),
    metadata: {
      difficulty,
      weakSkills,
      repeatedMistakes,
      similarSessionCount: similarSessions.length,
      similarSessions: similarSessions.map((s) => ({
        similarity: s.similarity,
        language: s.language,
        errorTitles: s.errorTitles,
        summary: s.summary,
        timestamp: s.timestamp,
      })),
    },
  };
}
