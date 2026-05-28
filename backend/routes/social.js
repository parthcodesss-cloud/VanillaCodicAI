import express from "express";
import { requireAuth } from "../middleware/auth.js";
import { query } from "../db/index.js";
import { getProfile, saveProfile } from "../services/memoryStore.js";
import { getSkillRadarData, getLevelTitle, calculateLevel } from "../services/profileService.js";

const router = express.Router();

// 1. Search for users by username or name
router.get("/search", requireAuth, async (req, res) => {
  try {
    let queryStr = req.query.q || "";
    queryStr = queryStr.trim();
    if (queryStr.startsWith("@")) {
      queryStr = queryStr.slice(1);
    }
    
    if (!queryStr) {
      return res.json({ users: [] });
    }
    
    // We search name or username, excluding ourselves
    const result = await query(
      "SELECT id, name, username, avatar_url FROM users WHERE (name ILIKE $1 OR username ILIKE $1) AND id != $2 LIMIT 15",
      [`%${queryStr}%`, req.userId]
    );

    // Get the current user's following list to see who is already followed
    const followingResult = await query(
      "SELECT following_id FROM follows WHERE follower_id = $1",
      [req.userId]
    );
    const followingIds = new Set(followingResult.rows.map(f => f.following_id));

    const users = result.rows
      .filter(u => u.id !== req.userId)
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar_url: u.avatar_url,
        isFollowing: followingIds.has(u.id)
      }));

    res.json({ users });
  } catch (err) {
    console.error("Social search error:", err.message);
    res.status(500).json({ error: "Failed to search users." });
  }
});

// 2. Follow a user
router.post("/follow", requireAuth, async (req, res) => {
  try {
    const { followingId } = req.body;
    if (!followingId) {
      return res.status(400).json({ error: "followingId is required." });
    }
    if (Number(followingId) === req.userId) {
      return res.status(400).json({ error: "You cannot follow yourself." });
    }

    await query(
      "INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [req.userId, Number(followingId)]
    );

    res.json({ success: true, message: "Successfully followed user." });
  } catch (err) {
    console.error("Social follow error:", err.message);
    res.status(500).json({ error: "Failed to follow user." });
  }
});

// 3. Unfollow a user
router.post("/unfollow", requireAuth, async (req, res) => {
  try {
    const { followingId } = req.body;
    if (!followingId) {
      return res.status(400).json({ error: "followingId is required." });
    }

    await query(
      "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
      [req.userId, Number(followingId)]
    );

    res.json({ success: true, message: "Successfully unfollowed user." });
  } catch (err) {
    console.error("Social unfollow error:", err.message);
    res.status(500).json({ error: "Failed to unfollow user." });
  }
});

// 4. Get list of followed users
router.get("/following", requireAuth, async (req, res) => {
  try {
    const followsResult = await query(
      "SELECT following_id FROM follows WHERE follower_id = $1",
      [req.userId]
    );

    const following = [];
    for (const f of followsResult.rows) {
      const userResult = await query(
        "SELECT id, name, username, avatar_url FROM users WHERE id = $1",
        [f.following_id]
      );
      if (userResult.rows[0]) {
        const u = userResult.rows[0];
        const profile = getProfile(u.id);
        following.push({
          id: u.id,
          name: u.name,
          username: u.username,
          avatar_url: u.avatar_url,
          xp: profile.xp || 0,
          level: profile.level || 1,
          coins: profile.coins || 0
        });
      }
    }

    res.json({ following });
  } catch (err) {
    console.error("Social following error:", err.message);
    res.status(500).json({ error: "Failed to get followed users." });
  }
});

// 5. Get followed user stats
router.get("/user/:id/stats", requireAuth, async (req, res) => {
  try {
    const targetUserId = Number(req.params.id);
    const userResult = await query(
      "SELECT id, name, username, avatar_url FROM users WHERE id = $1",
      [targetUserId]
    );
    if (!userResult.rows[0]) {
      return res.status(404).json({ error: "User not found." });
    }

    const u = userResult.rows[0];
    const profile = getProfile(u.id);
    const radarData = getSkillRadarData(profile);

    res.json({
      user: {
        id: u.id,
        name: u.name,
        username: u.username,
        avatar_url: u.avatar_url
      },
      xp: profile.xp || 0,
      level: profile.level || 1,
      levelTitle: getLevelTitle(profile.level || 1),
      coins: profile.coins || 0,
      currentStreak: profile.currentStreak || 0,
      totalSessions: profile.totalSessions || 0,
      totalFixes: profile.totalFixes || 0,
      radarData
    });
  } catch (err) {
    console.error("Social user stats error:", err.message);
    res.status(500).json({ error: "Failed to load user stats." });
  }
});

// 6. Complete a coding duel and claim rewards
router.post("/duel/complete", requireAuth, async (req, res) => {
  try {
    const { opponentId, result } = req.body;
    if (!opponentId || !result) {
      return res.status(400).json({ error: "opponentId and result are required." });
    }

    const profile = getProfile(req.userId);
    
    let xpEarned = 20; // default participation reward
    let coinsEarned = 0;

    if (result === "win") {
      xpEarned = 100;
      coinsEarned = 25;
    } else if (result === "forfeit") {
      xpEarned = -30; // penalty for leaving
      coinsEarned = 0;
    }

    profile.xp = Math.max(0, (profile.xp || 0) + xpEarned);
    profile.coins = (profile.coins || 0) + coinsEarned;
    profile.level = calculateLevel(profile.xp);

    saveProfile(req.userId, profile);

    res.json({
      success: true,
      xpEarned,
      coinsEarned,
      profile: {
        xp: profile.xp,
        level: profile.level,
        coins: profile.coins,
        levelTitle: getLevelTitle(profile.level)
      }
    });
  } catch (err) {
    console.error("Duel completion error:", err.message);
    res.status(500).json({ error: "Failed to process duel completion rewards." });
  }
});

// 7. Get currently online users
router.get("/online", requireAuth, (req, res) => {
  try {
    const activeUsers = req.app.get("activeUsers");
    const onlineList = Array.from(activeUsers.values())
      .filter(u => u.id !== req.userId)
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        avatar_url: u.avatar_url,
        level: u.level,
      }));
    res.json({ users: onlineList });
  } catch (err) {
    console.error("Online users error:", err.message);
    res.status(500).json({ error: "Failed to fetch online users." });
  }
});

export default router;
