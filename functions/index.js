import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import { onRequest } from "firebase-functions/v2/https";
import {
  calculateRatingSettlement,
  isValidSettlement,
  readModeStats,
  resolveRatingOutcome,
  updateRatingStats
} from "./ratingEngine.js";

initializeApp();

const allowedModes = new Set(["normal", "augmented"]);

export const getMatchmakingProfile = onRequest(
  { cors: false },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "METHOD_NOT_ALLOWED" });
      return;
    }
    const idToken = request.get("authorization")?.replace(/^Bearer\s+/i, "");
    const mode = request.body?.mode;
    if (!idToken || !allowedModes.has(mode)) {
      response.status(400).json({ error: "INVALID_PAYLOAD" });
      return;
    }

    try {
      const decoded = await getAuth().verifyIdToken(idToken);
      const snapshot = await getFirestore().collection("users").doc(decoded.uid).get();
      if (!snapshot.exists) throw new Error("USER_NOT_FOUND");
      const userData = snapshot.data();
      const stats = readModeStats(userData, mode);
      response.status(200).json({
        uid: decoded.uid,
        nickname: String(userData.nickname || decoded.name || "Player").slice(0, 24),
        avatarUrl: userData.avatarUrl || decoded.picture || null,
        rating: stats.rating,
        ratingGames: stats.games
      });
    } catch (error) {
      console.error("Matchmaking profile lookup failed", error);
      response.status(401).json({ error: error.message || "UNAUTHORIZED" });
    }
  }
);

export const settleOnlineMatch = onRequest(
  { cors: false },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).json({ error: "METHOD_NOT_ALLOWED" });
      return;
    }
    const { matchId, mode, outcome, forfeitedUid = null } = request.body || {};
    const players = Array.isArray(request.body?.players) ? request.body.players : [];
    if (!isValidSettlement(matchId, mode, outcome, forfeitedUid, players)) {
      response.status(400).json({ error: "INVALID_PAYLOAD" });
      return;
    }

    try {
      const callerToken = request.get("authorization")?.replace(/^Bearer\s+/i, "");
      const caller = await getAuth().verifyIdToken(String(callerToken || ""));
      if (!players.some((player) => player.uid === caller.uid)) throw new Error("CALLER_NOT_IN_MATCH");
      await Promise.all(players.map(async (player) => {
        const decoded = await getAuth().verifyIdToken(String(player.idToken || ""));
        if (decoded.uid !== player.uid) throw new Error("UID_MISMATCH");
      }));

      const db = getFirestore();
      const matchRef = db.collection("matches").doc(matchId);
      const userRefs = players.map((player) => db.collection("users").doc(player.uid));
      const result = await db.runTransaction(async (transaction) => {
        const matchSnapshot = await transaction.get(matchRef);
        if (matchSnapshot.exists) {
          const existing = matchSnapshot.data();
          if (existing.ratingVersion === 1 && existing.settlement) return existing.settlement;
          throw new Error("MATCH_ID_CONFLICT");
        }

        const userSnapshots = [];
        for (const userRef of userRefs) userSnapshots.push(await transaction.get(userRef));
        if (userSnapshots.some((snapshot) => !snapshot.exists)) throw new Error("USER_NOT_FOUND");

        const userData = userSnapshots.map((snapshot) => snapshot.data());
        const modeStats = userData.map((data) => readModeStats(data, mode));
        const ratingOutcome = resolveRatingOutcome(players, outcome, forfeitedUid);
        const settlement = calculateRatingSettlement(modeStats[0], modeStats[1], ratingOutcome);
        const now = Timestamp.now();
        const results = {
          [players[0].uid]: settlement.a,
          [players[1].uid]: settlement.b
        };

        transaction.update(userRefs[0], { stats: updateRatingStats(userData[0], mode, settlement.a, now, matchId) });
        transaction.update(userRefs[1], { stats: updateRatingStats(userData[1], mode, settlement.b, now, matchId) });
        transaction.create(matchRef, {
          mode,
          sessionType: "matchmaking",
          outcome: ratingOutcome,
          reason: outcome,
          forfeitedUid,
          playerUids: players.map((player) => player.uid),
          players: players.map(({ idToken, ...player }) => player),
          results: players.map((player, index) => ({
            uid: player.uid,
            score: Number(player.score),
            ...(index === 0 ? settlement.a : settlement.b)
          })),
          settlement: results,
          ratingVersion: 1,
          ratingSettledAt: now,
          finalizedAt: now,
          finalizedBy: "matchmaking_server",
          timestamp: FieldValue.serverTimestamp()
        });
        return results;
      });

      response.status(200).json({ matchId, results: result });
    } catch (error) {
      console.error("Online match settlement failed", error);
      response.status(400).json({ error: error.message || "SETTLEMENT_FAILED" });
    }
  }
);
