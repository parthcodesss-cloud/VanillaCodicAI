import { getEmbeddings, addEmbedding, getSessions } from "./memoryStore.js";

// ── Cosine Similarity ────────────────────────────────────────────────

function cosineSimilarity(a, b) {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dotProduct / denom;
}

// ── Generate Embedding via HuggingFace ───────────────────────────────

let _hfInstance = null;

export function initSimilarityService(hf) {
  _hfInstance = hf;
}

async function getEmbeddingVector(text) {
  if (!_hfInstance) throw new Error("Similarity service not initialized");

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await _hfInstance.featureExtraction({
        model: "sentence-transformers/all-MiniLM-L6-v2",
        inputs: text,
      });

      // The API returns a nested array; flatten to 1D
      if (Array.isArray(result) && Array.isArray(result[0])) {
        return result[0];
      }
      return result;
    } catch (err) {
      console.error(`Embedding attempt ${attempt}/3 failed:`, err.message);
      if (attempt < 3) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }
  console.warn("Embedding generation failed after 3 attempts, using keyword fallback");
  return null;
}

// ── Build Searchable Text from a Debug Session ───────────────────────

function sessionToSearchText(session) {
  const parts = [
    session.language || "",
    session.codeSnippet || "",
    ...(session.errorTitles || []),
    ...(session.errorTypes || []),
    session.summary || "",
  ];
  return parts.filter(Boolean).join(" ").slice(0, 512);
}

// ── Store Session with Embedding ─────────────────────────────────────

export async function storeSessionEmbedding(userId, session) {
  const text = sessionToSearchText(session);
  const vector = await getEmbeddingVector(text);

  if (vector) {
    addEmbedding(userId, {
      sessionId: session.id,
      timestamp: session.timestamp,
      language: session.language,
      mainFile: session.mainFile || null,
      errorTitles: session.errorTitles || [],
      summary: session.summary || "",
      vector,
    });
  }
}

// ── Find Similar Past Sessions ───────────────────────────────────────

export async function findSimilarSessions(userId, code, language, topK = 5, mainFile = null) {
  const queryText = `${language} ${code}`.slice(0, 512);
  const queryVector = await getEmbeddingVector(queryText);

  if (!queryVector) {
    // Fallback: keyword-based matching
    return findSimilarByKeywords(userId, code, language, topK, mainFile);
  }

  const stored = getEmbeddings(userId);
  if (stored.length === 0) return [];

  const scored = stored
    .filter((entry) => !mainFile || entry.mainFile === mainFile)
    .map((entry) => ({
      ...entry,
      similarity: cosineSimilarity(queryVector, entry.vector),
    }))
    .filter((e) => e.similarity > 0.3)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  // Enrich with full session data
  const sessions = getSessions(userId);
  const sessionMap = new Map(sessions.map((s) => [s.id, s]));

  return scored.map((s) => ({
    similarity: Math.round(s.similarity * 100),
    sessionId: s.sessionId,
    timestamp: s.timestamp,
    language: s.language,
    errorTitles: s.errorTitles,
    summary: s.summary,
    fullSession: sessionMap.get(s.sessionId) || null,
  }));
}

// ── Fallback: Keyword Matching ───────────────────────────────────────

function findSimilarByKeywords(userId, code, language, topK, mainFile = null) {
  const sessions = getSessions(userId);
  const codeWords = new Set(
    code.toLowerCase().split(/\W+/).filter((w) => w.length > 2)
  );

  return sessions
    .filter((s) => s.language === language && (!mainFile || s.mainFile === mainFile))
    .map((s) => {
      const sessionWords = new Set(
        (s.codeSnippet || "")
          .toLowerCase()
          .split(/\W+/)
          .filter((w) => w.length > 2)
      );
      const intersection = [...codeWords].filter((w) => sessionWords.has(w));
      const union = new Set([...codeWords, ...sessionWords]);
      const jaccard = union.size > 0 ? intersection.length / union.size : 0;
      return { ...s, similarity: Math.round(jaccard * 100) };
    })
    .filter((s) => s.similarity > 10)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}
