import { query } from "./db/index.js";

async function test() {
  console.log("Testing search for 'ankit_singh_8' with current user id 9...");
  const result = await query(
    "SELECT id, name, username, avatar_url FROM users WHERE (name ILIKE $1 OR username ILIKE $1) AND id != $2 LIMIT 15",
    ["%ankit_singh_8%", 9]
  );
  console.log("Result rows:", result.rows);
}

test().catch(console.error);
