// Interview questions and practice problems written for this project (not copied from any book or
// handbook), for the roadmaps not covered in interview-questions.mjs. Each entry is
// "L|question" or "L|question||answer"; L is B (Beginner), I (Intermediate) or A (Advanced).
// Answers are shown behind a "Show answer" toggle. Used by scripts/import-interview-questions.mjs.
export default {
  'Quantitative Aptitude Roadmap': {
    '01. Speed, Time and Distance': [
      'B|A car covers 180 km in 3 hours. What is its speed in m/s?||16.67 m/s (60 km/h × 5/18)',
      'I|You travel to a place at 40 km/h and return at 60 km/h. What is your average speed for the round trip?||48 km/h (2 × 40 × 60 / 100)',
    ],
    '02. Number System': [
      'B|What is the remainder when 2^10 is divided by 7?||2 (2^3 = 8 leaves 1, so 2^9 leaves 1 and 2^10 leaves 2)',
      'I|How many trailing zeros does 100! have?||24 (100/5 + 100/25 = 20 + 4)',
    ],
    '03. HCF and LCM': [
      'B|Find the HCF and LCM of 36 and 48.||HCF 12, LCM 144',
      'I|The HCF of two numbers is 12 and their LCM is 360. One number is 60. Find the other.||72 (12 × 360 / 60)',
    ],
    '04. Time and Work': [
      'B|A finishes a job in 10 days and B in 15 days. How long do they take together?||6 days (1/10 + 1/15 = 1/6)',
      'I|A and B together finish a job in 12 days; A alone takes 20 days. How long does B take alone?||30 days (1/12 − 1/20 = 1/30)',
    ],
    '05. Pipes and Cisterns': [
      'B|Pipe A fills a tank in 6 hours; pipe B empties it in 9 hours. With both open, how long does the tank take to fill?||18 hours (1/6 − 1/9 = 1/18)',
      'I|Two pipes fill a tank in 10 and 15 minutes. Both are opened and the first is closed after 3 minutes. How much longer does the second pipe take?||7.5 minutes (both fill half in 3 minutes; the other half at 1/15 per minute)',
    ],
    '06. Trains, Boats and Streams': [
      'B|A 150 m train passes a pole in 10 seconds. What is its speed in km/h?||54 km/h (15 m/s)',
      'I|A boat goes 24 km downstream in 2 hours and back upstream in 4 hours. Find the boat speed in still water and the stream speed.||Boat 9 km/h, stream 3 km/h (downstream 12, upstream 6)',
    ],
    '07. Permutation and Combinations': [
      'B|In how many ways can the letters of LEVEL be arranged?||30 (5! / (2! × 2!))',
      'I|From 6 men and 4 women, how many 5-person committees have exactly 2 women?||120 (C(4,2) × C(6,3) = 6 × 20)',
    ],
    '08. Probability': [
      'B|Two dice are thrown. What is the probability that the sum is 7?||1/6 (6 of 36 outcomes)',
      'I|A bag has 4 red and 6 blue balls. Two are drawn without replacement. What is the probability both are red?||2/15 (4/10 × 3/9)',
    ],
    '09. Geometry': [
      'B|The angles of a triangle are in the ratio 2:3:4. Find the largest angle.||80°',
      'I|A 16 cm chord is 6 cm from the centre of a circle. Find the radius.||10 cm (√(8² + 6²))',
    ],
    '10. Mixtures and Alligations': [
      'B|In what ratio should rice at ₹20/kg be mixed with rice at ₹30/kg to get a mix worth ₹24/kg?||3:2 (30 − 24 : 24 − 20)',
      'I|A 40 L mix has milk and water in the ratio 3:1. How much water must be added to make it 3:2?||10 L (milk 30 L, so water must become 20 L)',
    ],
    '11. Algebra': [
      'B|If x + 1/x = 3, find x² + 1/x².||7 (3² − 2)',
      'I|Solve 2x + 3y = 12 and 3x − y = 7.||x = 3, y = 2',
    ],
    '12. Trigonometry, Height and Distance': [
      'B|If sin θ = 3/5 for an acute θ, find cos θ and tan θ.||cos θ = 4/5, tan θ = 3/4',
      'I|From a point 30 m from the foot of a tower, the angle of elevation of the top is 60°. Find the height.||30√3 ≈ 51.96 m',
    ],
    '13. Progressions': [
      'B|Find the sum of the first 20 natural numbers.||210',
      'I|The 3rd term of an AP is 7 and the 7th is 15. Find the 20th term.||41 (d = 2, a = 3)',
    ],
    '14. Ages': [
      'B|A father is 3 times as old as his son. In 10 years he will be twice as old. Find their ages now.||Son 10, father 30',
      'I|The ratio of A\'s and B\'s ages is 4:5. Eight years ago it was 3:4. Find their ages now.||A 32, B 40',
    ],
    '15. Profit and Loss': [
      'B|An item bought for ₹800 is sold for ₹920. Find the profit percent.||15%',
      'I|A shopkeeper marks goods 40% above cost and gives a 20% discount. Find the profit percent.||12% (1.4 × 0.8 = 1.12)',
    ],
    '16. Simplification': [
      'B|Simplify: 25% of 480 + 12.5% of 640.||200 (120 + 80)',
      'I|Find √0.0121 + √1.44.||1.31 (0.11 + 1.2)',
    ],
    '17. Simple Interest': [
      'B|Find the simple interest on ₹5,000 at 8% a year for 3 years.||₹1,200',
      'I|A sum doubles in 8 years at simple interest. What is the rate?||12.5% a year',
    ],
    '18. Compound Interest': [
      'B|Find the compound interest on ₹10,000 at 10% a year for 2 years.||₹2,100',
      'I|The difference between compound and simple interest on a sum at 10% for 2 years is ₹50. Find the sum.||₹5,000 (difference = P × r² = P × 0.01)',
    ],
    '19. Averages': [
      'B|The average of 5 numbers is 20. Removing one number makes the average 18. Which number was removed?||28 (100 − 72)',
      'I|The average age of 30 students is 15. Including the teacher raises it by 1. How old is the teacher?||46 (31 × 16 − 30 × 15)',
    ],
    '20. Ratio and Proportion': [
      'B|Divide ₹1,200 in the ratio 3:5.||₹450 and ₹750',
      'I|If a:b = 2:3 and b:c = 4:5, find a:b:c.||8:12:15',
    ],
    '21. Mensuration': [
      'B|Find the area of a circle with diameter 14 cm (π = 22/7).||154 cm²',
      'I|A cylinder has radius 7 cm and height 10 cm. Find its volume and curved surface area (π = 22/7).||Volume 1,540 cm³, curved surface 440 cm²',
    ],
    '22. Partnership': [
      'B|A invests ₹20,000 and B ₹30,000 for the same time. How is a profit of ₹10,000 shared?||A ₹4,000, B ₹6,000',
      'I|A invests ₹12,000 for 12 months and B ₹18,000 for 6 months. Share a profit of ₹7,000.||A ₹4,000, B ₹3,000 (144 : 108 = 4 : 3)',
    ],
    '23. Logarithms': [
      'B|Find log₂ 64 + log₁₀ 1000.||9 (6 + 3)',
      'I|If log 2 = 0.3010, find log 8 and log 5.||log 8 = 0.9030, log 5 = 0.6990',
    ],
    '24. Percentage': [
      'B|A number is increased by 20% and then decreased by 20%. What is the net change?||A 4% decrease',
      'I|A earns 25% more than B. By what percent does B earn less than A?||20%',
    ],
    '25. Statistics': [
      'B|Find the mean, median and mode of 3, 5, 7, 7, 8.||Mean 6, median 7, mode 7',
      'I|Find the variance and standard deviation of 2, 4, 4, 4, 5, 5, 7, 9.||Variance 4, standard deviation 2 (mean 5)',
    ],
  },

  'Logical Aptitude Roadmap': {
    '01. Clocks': [
      'B|What is the angle between the hands of a clock at 3:30?||75°',
      'I|At what time between 4 and 5 o\'clock are the hands together?||21 9/11 minutes past 4',
    ],
    '02. Calendar': [
      'B|1 January 2026 is a Thursday. What day is 1 January 2027?||Friday (2026 is not a leap year, so one odd day)',
      'I|How many odd days are there in 400 years?||0',
    ],
    '03. Blood Relation': [
      'B|Pointing to a man, Riya says: "His mother is my mother\'s only daughter." How is the man related to Riya?||Her son',
      'I|A is B\'s brother. C is A\'s mother. D is C\'s father. How is B related to D?||Grandchild',
    ],
    '04. Analogy': [
      'B|Book : Author :: Painting : ?||Painter',
      'I|4 : 64 :: 6 : ?||216 (cubes)',
    ],
    '05. Coding Decoding': [
      'B|If CAT is written as DBU, how is DOG written?||EPH (each letter +1)',
      'I|If APPLE is coded as 50 (sum of letter positions), what is the code for MANGO?||50 (13 + 1 + 14 + 7 + 15)',
    ],
    '06. Puzzles': [
      'B|Five people A–E sit in a row. D is at the left end, E is in the middle, and A sits left of B who sits left of C. Who is at the right end?||C',
      'I|A farmer must cross a river with a wolf, a goat and a cabbage; the boat carries him and one item. How does he get all three across safely?||Take the goat; return; take the wolf; bring the goat back; take the cabbage; return; take the goat',
    ],
    '07. Dices': [
      'B|On a standard die opposite faces add up to 7. Which face is opposite 4?||3',
      'I|A standard die is rolled so that 2 is on top. Which number is at the bottom?||5',
    ],
    '08. Series Completion (Mix with Alphanumeric)': [
      'B|Find the next term: 2, 6, 12, 20, 30, ?||42 (n × (n + 1))',
      'I|Find the next letter: A, C, F, J, O, ?||U (gaps +2, +3, +4, +5, +6)',
    ],
    '09. Syllogism': [
      'B|All dogs are animals. Some animals are pets. Does "Some dogs are pets" follow?||No',
      'I|All roses are flowers. No flower is a tree. Which follow: (I) No rose is a tree. (II) Some trees are roses.||Only I',
    ],
    '10. Data Sufficiency': [
      'B|Is the integer x even? (1) x² is even. (2) x is a multiple of 3.||Statement 1 alone is enough',
      'I|What is the area of a rectangle? (1) Its perimeter is 20. (2) Its diagonal is √52.||Both together are needed: area 24',
    ],
    '11. Assumptions and Conclusions, Courses of Action': [
      'B|Statement: "Use our toothpaste for whiter teeth." Is "People want whiter teeth" an implicit assumption?||Yes',
      'I|"The city will add 50 buses to reduce traffic." Which assumptions are implicit: (I) more buses will draw people away from cars, (II) roads have room for more buses?||Both I and II',
    ],
    '12. Cube and Cuboid': [
      'B|A 4 cm cube painted on all faces is cut into 1 cm cubes. How many small cubes have exactly two painted faces?||24 (12 edges × 2)',
      'I|In the same cube, how many small cubes have no painted face?||8 ((4 − 2)³)',
    ],
    '13. Direction Sense': [
      'B|Walk 5 km north, turn right and walk 3 km, turn right and walk 5 km. Where are you from the start?||3 km east',
      'I|Walk 6 km south, then 8 km east. How far are you from the start and in which direction?||10 km south-east',
    ],
    '14. Seating Arrangement': [
      'B|In how many ways can 6 people sit around a round table?||120 ((6 − 1)!)',
      'I|8 people sit around a round table. In how many arrangements do two particular people sit together?||1,440 (2 × 6!)',
    ],
  },

  'Verbal Aptitude Roadmap': {
    '01. Ordering of Words': [
      'B|Put in a logical order: Fruit, Seed, Flower, Plant.||Seed, Plant, Flower, Fruit',
      'I|Arrange in dictionary order: Neglect, Nectar, Negative, Necessary.||Necessary, Nectar, Negative, Neglect',
    ],
    '02. Ordering of Sentences': [
      'B|How do you spot the opening sentence of a jumbled paragraph?||It introduces the topic and has no pronoun or connector (he, this, however) pointing back to something earlier',
      'I|How do linking words like "however", "then" and "as a result" help in para-jumbles?||They fix the order of two sentences relative to each other',
    ],
    '03. Spotting Errors': [
      'B|Find the error: "Each of the students have submitted their assignment."||"have" should be "has"',
      'I|Find the error: "He is senior than me by two years."||"than" should be "to" (senior to)',
    ],
    '04. One Word Substitutes': [
      'B|One word for "a person who cannot be corrected".||Incorrigible',
      'I|One word for "government by the wealthy".||Plutocracy',
    ],
    '05. Sentence Correction': [
      'B|Correct the sentence: "She don\'t like coffee."||She doesn\'t like coffee.',
      'I|Correct the sentence: "Neither the manager nor the employees was present."||"was" should be "were": the verb agrees with the nearer subject',
    ],
    '06. Synonyms and Antonyms': [
      'B|Synonym of "candid".||Frank',
      'I|Antonym of "ephemeral".||Permanent',
    ],
    '07. Fill in the Blanks': [
      'B|He has been working here ___ 2020. (since / for)||since',
      'I|The committee ___ divided in their opinions. (is / are)||are (the members act individually)',
    ],
    '08. Idioms and Phrases': [
      'B|What does "beat around the bush" mean?||Avoid talking about the main point',
      'I|What does "a blessing in disguise" mean?||Something that seems bad at first but turns out to be good',
    ],
  },

  'Aptitude Roadmap (October version)': {
    Beginner: [
      'B|Find 15% of 640.||96',
      'B|Divide ₹900 in the ratio 4:5.||₹400 and ₹500',
      'B|A shirt marked ₹1,200 is sold at a 15% discount. What is the selling price?||₹1,020',
      'B|A train runs at 72 km/h. How far does it go in 15 seconds?||300 m',
    ],
    Intermediate: [
      'I|12 men finish a job in 18 days. How many days will 27 men take?||8 days',
      'I|How many 3-letter arrangements can be made from A, B, C, D, E without repetition?||60',
      'I|A card is drawn from a pack of 52. What is the probability it is a king or a heart?||4/13 (16/52)',
      'I|Find the area of a triangle with sides 13, 14 and 15.||84 (Heron\'s formula)',
    ],
    Advanced: [
      'A|Pointing to a woman, Aman says: "She is the daughter of my grandfather\'s only son." How is she related to Aman?||His sister',
      'A|Some pens are books. All books are bags. Does "Some pens are bags" follow?||Yes',
      'A|Find the next term: 3, 7, 15, 31, 63, ?||127 (× 2 + 1)',
      'A|Walk 10 m west, turn left and walk 10 m, turn left again and walk 10 m. Where are you from the start?||10 m south',
    ],
  },

  'GATE CS 2027 Roadmap': {
    'General Aptitude (15 marks)': [
      'B|6 workers finish a task in 10 days. How many days will 15 workers take?||4 days',
      'B|Find the next term: 1, 4, 9, 16, 25, ?||36',
      'I|A coin is tossed 3 times. What is the probability of at least one head?||7/8',
    ],
    'Engineering Mathematics (13 marks)': [
      'I|How many edges does a complete graph on 6 vertices have?||15',
      'I|What are the eigenvalues of the diagonal matrix [[2, 0], [0, 3]]?||2 and 3',
      'I|P(A) = 0.5, P(B) = 0.4 and A, B are independent. Find P(A ∪ B).||0.7',
      'I|How many binary relations are there on a set of 3 elements?||512 (2⁹)',
    ],
    'Core CS subjects': [
      'I|What is the worst-case time of quicksort and when does it happen?||O(n²), when the pivot is always the smallest or largest element',
      'I|How many page faults does FIFO give for 1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5 with 3 frames?||9',
      'I|R(A, B, C) has FDs A → B and B → C. Decompose it into 3NF.||Two tables: (A, B) and (B, C)',
      'I|In a 3-stage pipeline with no stalls, how many cycles do 100 instructions take?||102 (3 + 99)',
    ],
  },

  'DSA Roadmap (Striver A2Z)': {
    Beginner: [
      'B|What is time complexity? Compare O(n log n) and O(n²) for n = 10⁶.',
      'B|How does binary search work, and what must be true of the input?',
      'B|Stable vs unstable sorting: give an example of each.',
      'I|How does hashing give O(1) average lookups, and what is the worst case?',
      'I|Two pointers vs sliding window: which problems fit each?',
    ],
    Intermediate: [
      'I|How do you detect a cycle in a linked list using O(1) extra space?',
      'I|How do you check whether a number is a power of two with bit operations?',
      'I|When does a greedy algorithm give the optimal answer?',
      'I|Recursion vs iteration: what does recursion cost in memory?',
      'I|Explain backtracking using N-Queens.',
    ],
    Advanced: [
      'I|BFS vs DFS: when would you choose each?',
      'A|How does Dijkstra\'s algorithm work, and why does it fail with negative edges?',
      'A|Memoization vs tabulation in dynamic programming.',
      'A|How do you recognise that a problem needs dynamic programming?',
      'A|What is a trie, and when is it better than a hash map?',
      'A|Kruskal vs Prim for a minimum spanning tree.',
    ],
  },

  'Backend Roadmap – From First Principles': {
    Foundations: [
      'B|What does a backend do that a frontend cannot?',
      'B|What happens between a client sending a request and the server sending the response?',
    ],
    'HTTP & APIs': [
      'B|HTTP is stateless. How do apps keep state anyway?',
      'I|Which HTTP methods are idempotent, and why does it matter?',
      'I|How do you version a REST API?',
      'I|What are serialization and deserialization, and what can go wrong?',
    ],
    'Auth & Security': [
      'I|Authentication vs authorization.',
      'I|Session cookies vs JWTs: trade-offs.',
      'I|How do you store secrets like API keys safely?',
    ],
    'Architecture & Code': [
      'I|Why split code into controllers, services and repositories?',
      'I|Where should input validation happen, and why?',
      'I|Unit vs integration vs end-to-end tests.',
    ],
    'Databases & Storage': [
      'I|How does an index speed up reads and slow down writes?',
      'I|When would you add Elasticsearch next to Postgres?',
      'I|Why store files in object storage instead of the database?',
    ],
    'Performance & Scaling': [
      'I|What should and should not be cached?',
      'I|When do you move work into a background queue?',
      'A|How do you find the bottleneck of a slow endpoint?',
    ],
    'Reliability & Ops': [
      'I|What is graceful shutdown and why does it matter during deploys?',
      'I|Logs vs metrics vs traces.',
      'I|How do you manage configuration across dev, staging and production?',
    ],
  },

  'Backend Projects (5-project roadmap)': {
    'Project 1: URL shortener': [
      'I|How do you generate short codes that never collide?',
      'I|Which index does the redirect lookup need, and why?',
      'A|How would you count clicks without slowing down redirects?',
    ],
    'Project 2: Notes app with login': [
      'I|Why hash passwords with bcrypt instead of SHA-256?',
      'I|Access token vs refresh token: why use both?',
      'I|How do CSRF and XSS attacks differ, and how do you defend against each?',
    ],
    'Project 3: Video processing service': [
      'I|Why process videos in a background job instead of inside the request?',
      'I|What is a dead-letter queue, and when does a job end up there?',
      'A|How do you make a job safe to retry?',
    ],
    'Project 4: Same app with Redis caching': [
      'I|What is cache-aside, and when do you invalidate the cache?',
      'I|How do you choose a TTL for cached data?',
      'A|How do you stop a cache stampede when a popular key expires?',
    ],
    'Project 5: Real-time chat app': [
      'I|WebSocket vs long polling vs server-sent events.',
      'A|How do you broadcast messages when users are connected to different servers?',
      'A|How do you show delivered and read receipts reliably?',
    ],
  },

  'Node.js Backend Roadmap (Chai aur Code)': {
    Orientation: [
      'B|How do the frontend and backend talk during development, and what is a proxy for?',
      'I|How does Node.js handle many requests with one thread?',
    ],
    'Project and Database': [
      'I|Why use Mongoose schemas with MongoDB?',
      'I|When do you embed documents, and when do you reference them?',
      'I|How do you structure a professional Express project?',
    ],
    'APIs and Auth': [
      'I|How does Express middleware work? Describe a request\'s path through it.',
      'I|How do you handle errors in async route handlers?',
      'I|How do access and refresh tokens work together?',
      'I|How does Multer handle file uploads?',
    ],
    'MongoDB Advanced': [
      'A|What is an aggregation pipeline? Explain $match, $lookup, $group and $project.',
      'A|How would you model likes, comments and subscriptions in MongoDB?',
      'A|Which indexes would a video platform need?',
    ],
  },

  'React Frontend Roadmap': {
    'Phase 1: React foundations (Beginner)': [
      'B|What is JSX and what does it compile to?',
      'B|Props vs state.',
      'I|What is the virtual DOM and how does reconciliation work?',
      'I|Why do list items need a key?',
    ],
    'Phase 2: Hooks, routing and state (Intermediate)': [
      'I|When does useEffect run, and what is its cleanup for?',
      'I|useMemo vs useCallback.',
      'I|Context API vs Redux: when do you need Redux?',
      'I|How does client-side routing work?',
    ],
    'Phase 3: Mega project with Appwrite (Intermediate)': [
      'I|How do you protect routes that need login?',
      'I|Which environment variables are safe in a frontend app, and what must never go there?',
    ],
    'Phase 4: Interview and production extras (Advanced)': [
      'A|Why does a component re-render, and how do you avoid unnecessary renders?',
      'A|Controlled vs uncontrolled components.',
      'A|How do you split a large bundle with lazy loading?',
    ],
  },

  'Kafka Roadmap': {
    'Phase 1: Foundations': [
      'B|What is event-driven architecture, and why use Kafka for it?',
      'I|Topics, partitions, offsets and consumer groups: how do they fit together?',
      'I|How does Kafka keep messages in order, and in what scope?',
    ],
    'Phase 2: Producers': [
      'I|What do acks=0, acks=1 and acks=all mean?',
      'I|How does an idempotent producer avoid duplicates?',
      'I|How does a producer choose the partition for a key?',
    ],
    'Phase 3: Consumers': [
      'I|What happens during a consumer group rebalance?',
      'I|Auto vs manual offset commit: what can go wrong with each?',
      'I|What is a dead-letter topic, and when do you use one?',
    ],
    'Phase 4: Reliability and exactly-once': [
      'A|At-most-once vs at-least-once vs exactly-once delivery.',
      'A|How do Kafka transactions give exactly-once processing?',
      'A|What are the ISR and min.insync.replicas?',
    ],
    'Phase 5: Kafka Streams': [
      'I|KStream vs KTable.',
      'I|What is windowing, and when do you need it?',
      'A|How do Kafka Streams state stores recover after a crash?',
    ],
  },

  'Microservices Roadmap': {
    'Phase 1: Service-to-service calls': [
      'I|Synchronous REST vs asynchronous messaging between services.',
      'I|What does a declarative HTTP client like Feign save you from writing?',
    ],
    'Phase 2: Discovery and load balancing': [
      'I|Why do microservices need service discovery?',
      'I|Client-side vs server-side load balancing.',
    ],
    'Phase 3: Fault tolerance': [
      'I|How does a circuit breaker work? Describe its three states.',
      'I|What is the bulkhead pattern?',
      'I|When are retries harmful, and how do you make them safe?',
    ],
    'Phase 4: Gateway and configuration': [
      'I|What does an API gateway do?',
      'I|Why centralize configuration, and how do services pick up changes?',
    ],
    'Phase 5: Observability': [
      'I|What is distributed tracing, and how is a trace ID passed between services?',
      'I|How do you find all the logs for one request across many services?',
    ],
    'Phase 6: Distributed scheduling': [
      'A|How do you make sure a scheduled job runs only once across many instances?',
      'I|Fixed rate vs fixed delay scheduling.',
    ],
  },

  'Cloud (AWS) Roadmap': {
    'Phase 1: Cloud basics and account': [
      'B|IaaS vs PaaS vs SaaS vs FaaS, with an AWS example of each.',
      'B|What are regions and availability zones, and why deploy across several zones?',
    ],
    'Phase 2: Identity and networking': [
      'I|IAM user vs role vs policy.',
      'I|Public vs private subnet: what makes a subnet public?',
      'I|Security group vs network ACL.',
      'I|What does a NAT gateway do?',
    ],
    'Phase 3: Infrastructure as code': [
      'I|Why manage infrastructure as code?',
      'I|What is Terraform state, and why keep it remote?',
    ],
    'Phase 4: Compute and scaling': [
      'I|How does an Auto Scaling Group decide to add or remove instances?',
      'I|Application Load Balancer vs Network Load Balancer.',
      'I|On-demand vs reserved vs spot instances.',
    ],
    'Phase 5: Storage and delivery': [
      'I|S3 storage classes and when to use each.',
      'I|What is a pre-signed URL?',
      'I|How does CloudFront speed up content delivery?',
    ],
    'Phase 6: Messaging and serverless': [
      'I|SQS vs SNS: when do you use each, or both together?',
      'I|What is a Lambda cold start, and how do you reduce it?',
      'A|Standard vs FIFO SQS queues.',
    ],
    'Not covered in the playlist yet': [
      'I|RDS vs DynamoDB: how do you choose?',
      'I|ECS vs EKS.',
      'I|What would you monitor in CloudWatch for a web app?',
    ],
  },

  'ML Roadmap': {
    Beginner: [
      'B|Supervised vs unsupervised learning.',
      'B|Why split data into train, validation and test sets?',
      'B|How do you handle missing values in a dataset?',
      'I|Why scale features, and when does it matter?',
    ],
    Intermediate: [
      'I|Explain the bias-variance trade-off.',
      'I|How does logistic regression turn a linear score into a probability?',
      'I|What is overfitting, and how do L1 and L2 regularization help?',
      'I|Precision vs recall vs F1: when would you favour each?',
      'I|How does a decision tree choose where to split?',
    ],
    Advanced: [
      'A|Bagging vs boosting.',
      'A|How does K-means work, and how do you choose K?',
      'A|What does PCA do, and when would you use it?',
      'A|How does cross-validation help with hyperparameter tuning?',
      'A|How do you deploy a model and notice data drift?',
    ],
  },

  'Power BI Roadmap': {
    '1. Getting Started': [
      'B|What is business intelligence?',
      'B|Import vs DirectQuery vs live connection.',
    ],
    '2. Data Modeling': [
      'I|Fact table vs dimension table.',
      'I|Star schema vs snowflake schema.',
      'I|What do relationship cardinality and cross-filter direction control?',
    ],
    '3. Transforming Data › Power Query': [
      'I|Merge vs append in Power Query.',
      'I|When would you unpivot data?',
    ],
    '3. Transforming Data › DAX': [
      'I|Calculated column vs measure.',
      'I|What does CALCULATE do?',
      'A|Row context vs filter context.',
      'I|Why use variables in DAX?',
    ],
    '4. Visualization': [
      'I|Drill-down vs drill-through.',
      'I|How do slicers differ from filters?',
    ],
    '5. Deployment › Security & Governance': [
      'I|How does row-level security work in Power BI?',
      'I|What are sensitivity labels for?',
    ],
    '5. Deployment › Power BI Premium': [
      'I|Report vs dashboard vs app.',
      'I|What does Premium capacity give you over Pro?',
    ],
  },

  'Redis Internals Roadmap': {
    'Networking and Event Loop': [
      'I|How does an event loop with epoll or kqueue serve many connections on one thread?',
      'I|How is RESP parsed, and why is it easy to parse?',
    ],
    Commands: [
      'I|How does Redis expire keys: lazy vs active expiry?',
      'I|What is pipelining, and why does it improve throughput?',
      'I|How does an AOF rewrite keep the file small?',
    ],
    'Internals and Memory': [
      'A|Why is Redis\'s LRU approximate instead of exact?',
      'A|What happens when maxmemory is reached?',
      'A|What are the int, embstr and raw string encodings?',
    ],
    'Data Structures and Algorithms': [
      'A|How does a quicklist store lists efficiently?',
      'A|How does HyperLogLog estimate unique counts in about 12 KB?',
      'A|How does a Morris counter make LFU cheap?',
    ],
  },

  'HLD Build Projects Roadmap': {
    'Full-stack Warm-ups (Beginner)': [
      'B|How does a frontend talk to a backend, and what is CORS?',
      'I|How would you keep a live quiz in sync for many players?',
    ],
    'Real-time and WebSocket Systems (Intermediate)': [
      'I|How do you validate chess moves so a client cannot cheat?',
      'I|How do you scale WebSocket servers behind a load balancer?',
      'A|How would you build a live fantasy-sports scoreboard for millions of users?',
    ],
    'SaaS and AI Products (Intermediate)': [
      'I|How do you design multi-tenant data so one customer never sees another\'s?',
      'I|How do you run long AI generation jobs without blocking the request?',
      'I|How would you bill users by usage?',
    ],
    'Backend-heavy and Infrastructure Systems (Advanced)': [
      'A|Design a Vercel-like deploy system: build, store artifacts, serve by subdomain.',
      'A|How would you isolate untrusted user code in an online IDE?',
      'A|How do Kubernetes pods, deployments and services fit together?',
    ],
  },

  'Arpit System Design Map': {
    'Networking and Web Fundamentals': [
      'I|Forward proxy vs reverse proxy: where does each sit?',
      'I|How does DNS resolution scale to billions of lookups (caching, TTLs, anycast)?',
      'I|Why do browsers keep HTTP connections alive, and what is head-of-line blocking?',
    ],
    'Database Internals': [
      'I|CHAR vs VARCHAR vs TEXT in PostgreSQL: does the choice change performance?',
      'A|Why does PostgreSQL use a process per connection, and why add a pooler like PgBouncer?',
      'A|How does MVCC keep old row versions, and why does PostgreSQL need VACUUM?',
    ],
    Caching: [
      'I|What is the thundering herd problem, and how do you avoid it when a hot key expires?',
      'I|Why should retries use exponential backoff with jitter?',
      'A|How would you invalidate caches across many services when data changes?',
    ],
    'Distributed Systems Papers and Databases': [
      'A|How does consistent hashing reduce data movement when nodes are added?',
      'A|What are the key design choices in GFS (a single master, large chunks, append-heavy workloads)?',
      'A|How do quorums (N, R, W) in Dynamo-style systems trade consistency for availability?',
    ],
    'Scaling Case Studies': [
      'A|How can you shard a live database without downtime?',
      'A|What is a hot shard, and how do you prevent one?',
      'A|How do you give users read-your-writes consistency with read replicas?',
    ],
    'Search and Design Exercises': [
      'A|Design a real-time gaming leaderboard for millions of players.',
      'A|Design an emergency SOS service that must never drop a request.',
      'A|How does an inverted index make full-text search fast?',
    ],
  },

  'System Design Roadmap (October version)': {
    Beginner: [
      'B|What happens when a client calls an API over HTTP?',
      'B|Vertical vs horizontal scaling.',
      'B|SQL vs NoSQL.',
      'I|What does a load balancer do when a server dies?',
    ],
    Intermediate: [
      'I|Sharding vs partitioning vs replication.',
      'I|Explain the CAP theorem.',
      'I|Why put a message queue between services?',
      'I|Token bucket vs sliding window rate limiting.',
    ],
    Advanced: [
      'A|How does leader election work, for example in Raft?',
      'A|Logs vs metrics vs traces.',
      'A|How do OAuth 2.0 and JWT fit together?',
      'A|When should you move from a monolith to microservices?',
    ],
  },

  'System Design Roadmap 2 (video list)': {
    'System Design Fundamentals': [
      'B|What do scalability, availability and reliability mean?',
      'I|Latency vs throughput: how do they trade off?',
    ],
    'Networking & Protocols': [
      'B|TCP vs UDP for a video call.',
      'I|Roughly how long do a memory read, an SSD read and a cross-continent round trip take?',
    ],
    'APIs & Communication': [
      'I|REST vs GraphQL vs gRPC vs WebSocket.',
      'I|How do you design pagination for an API?',
    ],
    'Caching & CDNs': [
      'I|What can go wrong with caching (stale data, stampede, penetration)?',
      'I|What does a CDN cache, and how is it invalidated?',
    ],
    'Load Balancing & Proxies': [
      'I|Round robin vs least connections vs consistent hashing for load balancing.',
      'I|API gateway vs reverse proxy.',
    ],
    'Databases & Storage': [
      'I|How do you scale a database: replicas, caching, sharding, partitioning?',
      'I|In what order does SQL logically execute a query?',
    ],
    'Messaging & Streaming': [
      'I|Kafka vs RabbitMQ.',
      'I|Why is Kafka fast (sequential I/O, zero copy, batching)?',
    ],
    'Microservices & Distributed Systems': [
      'I|What are saga, CQRS, event sourcing and sidecar?',
      'I|BASE vs ACID.',
    ],
    'Containers & Cloud': [
      'I|Bare metal vs virtual machines vs containers.',
      'I|What does Kubernetes do for you?',
    ],
    'DevOps & Deployment': [
      'I|CI vs CD.',
      'I|Blue-green vs canary vs rolling deployment.',
    ],
    'Security & Auth': [
      'I|Session vs JWT.',
      'I|Explain the OAuth 2.0 authorization code flow.',
    ],
    'Real-World Architecture Case Studies': [
      'A|Why might a team move from microservices back to a monolith?',
      'A|How would you store trillions of chat messages?',
    ],
  },

  'System Design Roadmap 3 (Microsoft SDE course)': {
    'Foundations & crash courses': [
      'B|What questions do you ask first in a system design interview?',
      'I|How do you estimate QPS and storage for a new system?',
    ],
    'Core concepts': [
      'I|Synchronous vs asynchronous replication, and what is replication lag?',
      'I|Token bucket vs sliding window rate limiting.',
      'I|What is event-driven architecture?',
    ],
    'Case studies': [
      'A|Design Google Docs: how do you handle concurrent edits?',
      'A|Design Uber: how do you match riders with nearby drivers?',
      'A|Design Instagram Reels: storage, feed and video delivery.',
    ],
  },

  'System Design: Missing Topics and Video Map': {
    'Missing topics to add': [
      'A|2PC vs 3PC vs saga for distributed transactions.',
      'A|Optimistic vs pessimistic locking.',
    ],
    'LLD › SOLID Principles and UML': [
      'I|Explain the Liskov substitution principle with an example that breaks it.',
      'I|What does a class diagram show, and how do you draw composition vs aggregation?',
    ],
    'LLD › LLD Intro and Interview Approach': [
      'I|What steps do you follow in a low-level design interview?',
    ],
    'LLD › Creational Design Patterns': [
      'I|Factory vs abstract factory vs builder.',
      'A|Why is double-checked locking in a singleton broken without volatile?',
    ],
    'LLD › Structural Design Patterns': [
      'I|Adapter vs facade vs decorator vs proxy.',
      'I|When would you use the composite pattern?',
    ],
    'LLD › Behavioural Design Patterns': [
      'I|Strategy vs state pattern.',
      'I|How does the observer pattern work?',
      'I|How would you build undo and redo with the command pattern?',
    ],
    'LLD › Multithreading and Concurrency': [
      'A|How do you make a class thread-safe?',
    ],
    'LLD › LLD Interview Problems': [
      'A|Design Tic-Tac-Toe so checking for a winner is O(1) per move.',
      'A|Design BookMyShow seat booking so two users can never book the same seat.',
    ],
    'LLD › Best Practices in LLD': [
      'I|What is MVC, and why separate the three parts?',
    ],
    'HLD › Interview Strategy, Scalability and Capacity': [
      'I|How does a system grow from one server to a million users?',
      'I|Estimate the storage for 100 million users posting one photo a day.',
    ],
    'HLD › Networking, Load Balancing and Proxies': [
      'I|Layer 4 vs layer 7 load balancing.',
    ],
    'HLD › Caching and Databases': [
      'I|Cache-aside vs write-through vs write-back.',
    ],
    'HLD › CAP, Consistency, Hashing and Replication': [
      'A|Strong vs eventual consistency, with examples.',
    ],
    'HLD › Availability and Fault Tolerance': [
      'I|Circuit breaker vs retry vs bulkhead.',
    ],
    'HLD › Microservices': [
      'I|What problem does CQRS solve?',
      'I|What does a service mesh add?',
    ],
    'HLD › API Design and Security': [
      'I|How do you design an idempotent POST API?',
      'I|How do CSRF, XSS and SQL injection attacks work?',
    ],
    'HLD › Case Studies': [
      'A|Design WhatsApp: message delivery, online status and group chats.',
    ],
  },
};
