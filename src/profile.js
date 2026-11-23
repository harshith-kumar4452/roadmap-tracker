// Live numbers for the profile page, fetched from each platform's public API.
// Every source is optional and fails soft: a platform that's down or renamed just
// shows its card without numbers. Results are cached for an hour per instance.

const UA = 'learning-hub-profile/1.0';
const HOUR = 60 * 60 * 1000;
let cache = { key: '', at: 0, data: null };

const withTimeout = (ms) => AbortSignal.timeout(ms);

async function leetcode(username) {
  const query = `query($u: String!) {
    matchedUser(username: $u) { username profile { ranking } submitStatsGlobal { acSubmissionNum { difficulty count } } }
    userContestRanking(username: $u) { rating attendedContestsCount topPercentage }
    allQuestionsCount { difficulty count }
  }`;
  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Referer: 'https://leetcode.com', 'User-Agent': UA },
    body: JSON.stringify({ query, variables: { u: username } }),
    signal: withTimeout(8000),
  });
  const { data } = await res.json();
  if (!data?.matchedUser) return null;
  const solved = Object.fromEntries(data.matchedUser.submitStatsGlobal.acSubmissionNum.map((x) => [x.difficulty.toLowerCase(), x.count]));
  const total = Object.fromEntries((data.allQuestionsCount || []).map((x) => [x.difficulty.toLowerCase(), x.count]));
  const contest = data.userContestRanking;
  return {
    solved,
    total,
    ranking: data.matchedUser.profile?.ranking ?? null,
    contest: contest ? { rating: Math.round(contest.rating), attended: contest.attendedContestsCount, topPercent: contest.topPercentage } : null,
  };
}

async function github(username) {
  const res = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: { 'User-Agent': UA, Accept: 'application/vnd.github+json' },
    signal: withTimeout(8000),
  });
  if (!res.ok) return null;
  const u = await res.json();
  return { repos: u.public_repos, followers: u.followers, name: u.name, avatar: u.avatar_url, since: u.created_at };
}

async function codeforces(handle) {
  const res = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`, { signal: withTimeout(8000) });
  const j = await res.json();
  const u = j.status === 'OK' ? j.result[0] : null;
  return u ? { rating: u.rating ?? null, maxRating: u.maxRating ?? null, rank: u.rank ?? null } : null;
}

const SOURCES = { leetcode, github, codeforces };

// Picks the username for each supported platform from the profile's coding list.
export async function codingStats(profile) {
  const wanted = (profile?.coding || [])
    .map((c) => ({ key: String(c.platform || '').toLowerCase().replace(/[^a-z]/g, ''), username: c.username }))
    .filter((c) => SOURCES[c.key] && c.username);
  const key = JSON.stringify(wanted);
  if (cache.key === key && Date.now() - cache.at < HOUR) return cache.data;
  const entries = await Promise.all(wanted.map(async (c) => {
    try { return [c.key, await SOURCES[c.key](c.username)]; } catch { return [c.key, null]; }
  }));
  const data = { fetchedAt: new Date().toISOString(), ...Object.fromEntries(entries) };
  cache = { key, at: Date.now(), data };
  return data;
}
