// Adds practice questions under each lesson of the "SQL Roadmap", taken from the "SQL Practice –
// 310 Questions" list (copied from Notion, every link already real). Each question is placed after
// the lessons of its section, grouped by the lesson it practises ("Practice › GROUP BY & HAVING").
// DataLemur questions are left out: they only link to DataLemur's question list, not the question.
// The same question in both roadmaps stays in sync, since both link to the same page.
// Added by URL: running it again adds only what is missing and never resets progress.
// Usage: node --env-file=.env scripts/import-sql-roadmap-practice.mjs [--dry]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { MongoClient } from 'mongodb';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DRY = process.argv.includes('--dry');
const id = () => randomBytes(6).toString('base64url');
const TITLE = 'SQL Roadmap';
const SOURCE = 'SQL Practice – 310 Questions';

// Lesson (as titled in the SQL Roadmap) -> question titles from the SQL practice list.
// Lessons with no matching practice (Views, Constraints, Indexes, Transactions, Stored
// Procedures, Triggers, Query Optimization) are left out.
const PRACTICE = {
  'Introduction to Databases & SQL': ['Select All', 'Select By ID', 'Revising the Select Query I', 'Revising the Select Query II'],
  'SELECT, WHERE & Basic Filtering': ['Recyclable and Low Fat Products', 'Big Countries', 'Article Views I', 'Find Salaries Outside the Expected Range', 'Find Records Excluding a Given Set of Values', "Japanese Cities' Names", 'High Price of Products'],
  'ORDER BY & LIMIT': ['Not Boring Movies', 'Employee Names', 'Higher Than 75 Marks', 'Weather Observation Station 5', 'List of Movies with Ratings'],
  'Aggregate Functions (COUNT/SUM/AVG)': ['Revising Aggregations - The Count Function', 'Revising Aggregations - The Sum Function', 'Revising Aggregations - Averages', 'Average Population', 'Japan Population', 'Population Density Difference', 'The Blunder', 'Average Salary', 'Weather Observation Station 2'],
  'GROUP BY & HAVING': ['Classes With at Least 5 Students', 'Number of Unique Subjects Taught by Each Teacher', 'Find Followers Count', 'Biggest Single Number', 'Email Duplicates', 'Large Classes', 'Top Earners', 'Group Sold Products By The Date', 'Monthly Transactions I'],
  'String & Date Functions': ['Invalid Tweets', 'Fix Names in a Table', 'Patients With a Condition', 'Find Users With Valid E-Mails', 'Weather Observation Station 6', 'The PADS', 'User Activity for the Past 30 Days I', 'Latest 2020 Login', 'Kid-Friendly Movies in Last Month'],
  'NULL Handling & DISTINCT': ['Find Customer Referee', 'Non-Referred Customers', 'Handling NULL Values', 'Distinct Companies', 'Weather Observation Station 3', 'Type of Triangle', 'Special Bonus Calculation'],
  'Inner & Outer Joins': ['Replace Employee ID With The Unique Identifier', 'Product Sales Analysis I', 'Employee Bonus', 'Students and Examinations', 'Average Selling Price', 'Visitors Without Transactions', 'Population Census', 'Confirmation Rate', 'The Report', 'Top Competitors'],
  'Self Joins & Cross Joins': ['Rising Temperature', 'Employees Earning More Than Their Manager', 'The Number of Employees Which Report to Each Employee', 'Average Time of Process per Machine', 'Managers with at Least 5 Direct Reports', 'Symmetric Pairs', 'Generate All Possible User-Category Pairs'],
  Subqueries: ['Customer Who Visited but Did Not Make Any Transactions', 'Employees Whose Manager Left the Company', 'Salespersons Without RED Orders', 'Inactive Customers', 'Investments in 2016', 'All-Product Buyers', 'Customers Who Bought All Products'],
  'Set Operations (UNION/INTERSECT/EXCEPT)': ['Combine Active and Archived Users', 'Combine Sales Records Without Deduplication', 'Merge Recent Orders from Multiple Sources', 'Incomplete Employee Records', 'Count Salary Categories', 'Movie Rating', 'Friend Requests II: Who Has the Most Friends'],
  'INSERT, UPDATE & DELETE': ['Delete Duplicate Emails', 'Employee Salary', 'System Settings'],
  'Window Functions': ['Second Highest Salary', 'Product Sales Analysis III', 'Last Person to Fit in the Bus', 'Restaurant Growth', 'Top Grade per Student', 'Most Recent Three Orders for Each Customer', 'Find the Largest Window Between User Visits', 'Game Play Analysis IV', 'Consecutive Numbers', 'Department Top Three Salaries', 'Top 3 Salaries per Department'],
  'Common Table Expressions (CTEs)': ['Immediate Food Delivery II', 'Find Continuous Ranges in Logs', 'SQL Project Planning', 'Reshape Products Data', 'Occupations', 'Track Continuous Periods of Task Failures and Successes', '15 Days of Learning SQL'],
  'Recursive CTEs': ['Draw The Triangle 1', 'Draw The Triangle 2', 'Print Prime Numbers', 'Binary Tree Nodes', 'Find All Employees Reporting to the Head of the Company', 'Find Missing Subtasks for Each Task'],
};

const SITES = [[/leetcode\.com/, 'LeetCode'], [/takeuforward\.org/, 'takeUforward'], [/hackerrank\.com/, 'HackerRank'], [/codechef\.com/, 'CodeChef']];
const ORDER = ['Beginner', 'Intermediate', 'Advanced'];

// Practice items for every lesson of `sections`, built from the practice list's questions.
function buildPractice(sections, source) {
  const byTitle = new Map(source.sections.flatMap((s) => s.items).map((i) => [i.title.trim().toLowerCase(), i]));
  const out = new Map(); // section title -> items to add after its lessons
  let total = 0;
  for (const [lesson, titles] of Object.entries(PRACTICE)) {
    const section = sections.find((s) => s.items.some((i) => i.title === lesson));
    if (!section) { console.warn(`  lesson "${lesson}" not found in ${TITLE}, skipped`); continue; }
    const items = [];
    for (const t of titles) {
      const q = byTitle.get(t.toLowerCase());
      const site = q && SITES.find(([re]) => re.test(q.url))?.[1];
      if (!q || !site) { console.warn(`  ${lesson}: "${t}" not found (or not linkable) in ${SOURCE}, skipped`); continue; }
      const hint = /Hint: ([^·]+)/.exec(q.note ?? '')?.[1]?.trim();
      items.push({ title: q.title, url: q.url, level: q.level || 'Beginner', note: [`Practice › ${lesson} · ${site}`, hint && `Hint: ${hint}`].filter(Boolean).join(' · ') });
    }
    items.sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
    if (!out.has(section.title)) out.set(section.title, []);
    out.get(section.title).push(...items);
    total += items.length;
  }
  return { out, total };
}

function addPractice(sections, out) {
  let added = 0;
  for (const s of sections) {
    const have = new Set(s.items.map((i) => i.url));
    const fresh = (out.get(s.title) ?? []).filter((i) => !have.has(i.url)).map((i) => ({ id: id(), status: 'not_started', doneAt: null, ...i }));
    s.items.push(...fresh);
    added += fresh.length;
  }
  return added;
}

const seedFile = path.join(root, 'seed', 'roadmaps.json');
const seed = JSON.parse(fs.readFileSync(seedFile, 'utf8'));
const seedRoadmap = seed.find((r) => r.title === TITLE);
const seedSource = seed.find((r) => r.title === SOURCE);
const plan = buildPractice(seedRoadmap.sections, seedSource);
console.log(`Practice: ${plan.total} questions across ${Object.keys(PRACTICE).length} lessons`);
if (DRY) process.exit(0);

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const col = client.db(process.env.MONGODB_DB || 'roadmap_tracker').collection('roadmaps');
const doc = await col.findOne({ title: TITLE });
const source = await col.findOne({ title: SOURCE });
if (!doc || !source) throw new Error(`${!doc ? TITLE : SOURCE} not found in the database`);
const addedDb = addPractice(doc.sections, buildPractice(doc.sections, source).out);
if (addedDb) await col.updateOne({ _id: doc._id }, { $set: { sections: doc.sections } });
console.log(`Database: added ${addedDb} practice questions`);
await client.close();

const addedSeed = addPractice(seedRoadmap.sections, plan.out);
fs.writeFileSync(seedFile, JSON.stringify(seed, null, 2) + '\n');
console.log(`seed/roadmaps.json: added ${addedSeed} practice questions`);
