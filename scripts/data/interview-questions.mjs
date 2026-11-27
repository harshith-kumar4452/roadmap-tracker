// Interview questions written for this project (not copied from any book or handbook), mapped to
// roadmap sections. Each entry is "L|question" where L is B (Beginner), I (Intermediate) or
// A (Advanced). Used by scripts/import-interview-questions.mjs.
export default {
  'DBMS Roadmap (takeUforward)': {
    '02. DBMS Foundations and Architecture': [
      'B|Why use a DBMS instead of storing data in plain files? Name three problems it solves.',
      'B|Explain the three levels of data abstraction and what physical vs logical data independence mean.',
      'I|Walk through what happens inside a DBMS from receiving a SQL query to returning rows.',
      'I|Compare relational, document, key-value and graph databases. When would you pick each?',
    ],
    '03. Core Foundations': [
      'B|What is the difference between a primary key, a unique key and a foreign key?',
      'B|DDL vs DML vs DCL vs TCL: give two commands of each.',
      'I|How do NULL, 0 and an empty string differ, and how does NULL behave in comparisons and aggregates?',
      'I|What is an index, and why can adding too many indexes slow a table down?',
    ],
    '04. Conceptual Data Modeling': [
      'B|What are entities, attributes and relationships in an ER diagram? Give an example of each.',
      'I|Explain cardinality (1:1, 1:N, M:N) and participation constraints with a real example.',
      'I|What is a weak entity and why does it need an identifying relationship?',
      'A|How do you map an M:N relationship and a multivalued attribute to relational tables?',
    ],
    '05. Database Design': [
      'B|What are super, candidate, primary and alternate keys?',
      'I|Design the tables for a library that tracks books, members and loans. Which keys and constraints do you add?',
      'I|What is normalization and what problems does it prevent?',
      'A|When would you deliberately denormalize a schema, and what do you give up?',
    ],
    '06. Relational Model and Formal Query Languages': [
      'B|What do selection, projection, union and set difference do in relational algebra?',
      'I|Express "students enrolled in every course" using relational algebra (division).',
      'I|What is the difference between a view and a materialized view? When would you use each?',
      'A|What are triggers and stored procedures good for, and what are the risks of putting business logic in the database?',
    ],
    '07. Functional Dependencies and Database Design': [
      'I|What is a functional dependency? How do you find the candidate keys of a relation from its FDs?',
      'I|Explain 1NF, 2NF, 3NF and BCNF, each with a table that violates it.',
      'A|What are attribute closure and minimal cover, and why do we compute them?',
      'A|What do lossless-join and dependency-preserving decomposition mean? Can BCNF always give both?',
    ],
    '08. Querying Essentials': [
      'B|In what order does a database logically evaluate FROM, WHERE, GROUP BY, HAVING, SELECT and ORDER BY?',
      'B|What is the difference between WHERE x IN (...) and WHERE x = ANY (...)?',
      'I|Why does WHERE col <> 5 not return rows where col is NULL? How do you include them?',
      'I|How does LIKE with a leading wildcard affect index use?',
    ],
    '09. Aggregation and Analysis': [
      'B|What is the difference between WHERE and HAVING?',
      'B|COUNT(*) vs COUNT(col) vs COUNT(DISTINCT col): what does each count?',
      'I|Find the department with the highest average salary. Write the query.',
      'I|Can you SELECT a column that is not in GROUP BY? What do different databases do?',
    ],
    '10. Set Operations': [
      'B|UNION vs UNION ALL: which is faster and why?',
      'I|How would you write INTERSECT or EXCEPT in a database that does not support them?',
      'I|What rules must two queries follow to be combined with UNION?',
    ],
    '11. SQL Joins': [
      'B|Explain INNER, LEFT, RIGHT, FULL OUTER and CROSS joins with a small example.',
      'I|Why can moving a condition from ON to WHERE turn a LEFT JOIN into an inner join?',
      'I|Find employees who earn more than their manager using a self join.',
      'A|What join algorithms (nested loop, hash, merge) does a database use and when?',
    ],
    '12. Subqueries': [
      'B|What is a correlated subquery and how is it different from a regular subquery?',
      'I|EXISTS vs IN: when does one beat the other, and how do NULLs affect NOT IN?',
      'I|Find the second highest salary in three different ways.',
      'A|When should you rewrite a subquery as a join or a CTE?',
    ],
    '13. Data Modification and Schema Evolution': [
      'B|DELETE vs TRUNCATE vs DROP: what does each remove and can it be rolled back?',
      'I|How do you write an upsert, and what race condition does it avoid?',
      'A|How would you add a NOT NULL column to a large live table without downtime?',
    ],
    '14. Physical Storage, Indexing & Hashing': [
      'I|What is the difference between a clustered and a non-clustered index?',
      'I|Why do databases use B+ trees instead of binary search trees or hash tables for most indexes?',
      'A|Explain static vs extendible hashing. What problem does extendible hashing solve?',
      'A|What is a covering index and how does it avoid table lookups?',
    ],
    '15. Data Storage, Keys & Query Optimization': [
      'I|Why can a random UUID primary key hurt insert performance in a clustered table?',
      'A|How do composite indexes work, and why does column order matter?',
      'A|What is index selectivity and when will the optimizer ignore an index?',
    ],
    '16. Query Processing and Optimization': [
      'I|What are the steps from parsing a query to executing a plan?',
      'A|How does a cost-based optimizer choose a join order?',
      'A|Why do stale table statistics lead to bad query plans?',
    ],
    '17. Query Performance': [
      'I|How do you read an EXPLAIN plan? What signs point to a slow query?',
      'I|What is the N+1 query problem and how do you fix it?',
      'A|A query was fast yesterday and slow today. How do you investigate?',
    ],
    '18. Transactions and Access Control': [
      'B|What do COMMIT, ROLLBACK and SAVEPOINT do?',
      'I|How do GRANT and REVOKE work, and what does WITH GRANT OPTION allow?',
      'I|Why do applications use a connection pool, and what goes wrong when it is too small?',
    ],
    '19. Transactions and Concurrency Control': [
      'B|Explain ACID with an example of a bank transfer.',
      'I|What are dirty reads, non-repeatable reads and phantom reads? Which isolation level prevents each?',
      'I|What is conflict serializability and how do you test a schedule for it?',
      'A|Compare two-phase locking with MVCC. Which do PostgreSQL and MySQL InnoDB use?',
      'A|How does a database detect and resolve deadlocks?',
    ],
    '20. Database Recovery and Durability': [
      'I|What is write-ahead logging and why must the log be written before the data page?',
      'A|What are the undo and redo phases of recovery, and what do checkpoints change?',
      'A|How does point-in-time recovery work using backups and logs?',
    ],
    '21. Integrity, Security & Database Operations': [
      'B|What is SQL injection and how do prepared statements prevent it?',
      'I|How can views and roles be used to limit what a user can see?',
      'I|Which database metrics would you monitor in production and why?',
    ],
    '22. Distributed Databases, NoSQL & Analytical Systems': [
      'I|What is the difference between sharding and replication?',
      'I|Explain the CAP theorem with an example of a CP and an AP system.',
      'A|How does two-phase commit work, and what happens if the coordinator fails?',
      'A|OLTP vs OLAP: why do analytical databases store data by column?',
      'I|When would you choose a NoSQL database over a relational one?',
    ],
  },

  'Operating Systems Roadmap (takeUforward)': {
    '01. Operating System Basics and OS Introduction': [
      'B|What does an operating system do? Name its main responsibilities.',
      'B|What is the difference between user mode and kernel mode?',
      'I|What happens, step by step, when you double-click an app to open it?',
    ],
    '02. Process Management': [
      'B|What is the difference between a program, a process and a thread?',
      'B|Draw the process state diagram and explain each transition.',
      'I|What is stored in a Process Control Block?',
      'I|How do fork() and exec() work together to start a new program?',
    ],
    '03. CPU Scheduling Algorithms': [
      'B|Define arrival, burst, waiting, turnaround and response time.',
      'I|Compare FCFS, SJF, SRTF and Round Robin. Which can starve a process?',
      'I|How does the time quantum in Round Robin affect performance?',
      'A|How does a multilevel feedback queue decide a process priority?',
    ],
    '04. Kernel, OS Structures & Advanced Scheduling': [
      'I|Monolithic kernel vs microkernel: trade-offs and examples.',
      'A|Why do real OS schedulers (like Linux CFS) not use textbook SJF?',
      'A|What are CPU affinity and NUMA, and why do they matter on multicore machines?',
    ],
    '05. Threads and Multithreading': [
      'B|What do threads of the same process share, and what does each thread have of its own?',
      'I|User-level vs kernel-level threads: pros and cons.',
      'I|Concurrency vs parallelism: explain with an example.',
      'I|What is a thread pool and why is it used?',
    ],
    '06. Process Synchronization and Concurrency Control': [
      'B|What is a race condition? Give a code example.',
      'I|What three conditions must a critical-section solution satisfy?',
      'I|Mutex vs semaphore: when would you use each?',
      'I|Solve the producer-consumer problem with semaphores.',
      'A|What is compare-and-swap and how are lock-free structures built on it?',
    ],
    '07. Deadlock, Starvation & Concurrency Bugs': [
      'B|What are the four necessary conditions for deadlock?',
      'I|Deadlock prevention vs avoidance vs detection: how does each work?',
      'I|Run the Banker\'s algorithm on a small example and decide if the state is safe.',
      'A|What is priority inversion and how does priority inheritance fix it?',
    ],
    '08. System Calls and Inter-Process Communication': [
      'B|What is a system call? Give five examples.',
      'I|What are zombie and orphan processes?',
      'I|Compare pipes, message queues and shared memory for IPC.',
      'A|How does mmap work and when is it faster than read()?',
    ],
    '09. Memory Management': [
      'B|What is the difference between a logical and a physical address?',
      'I|Internal vs external fragmentation: what causes each?',
      'I|Compare first fit, best fit and worst fit.',
      'I|What lives in the stack, heap, code and data segments of a process?',
    ],
    '10. Paging and Virtual Memory': [
      'B|What is paging and how does it remove external fragmentation?',
      'I|How is a virtual address translated with a page table and a TLB?',
      'I|Calculate the effective memory access time given a TLB hit ratio.',
      'A|What happens on a page fault, from the trap to resuming the instruction?',
      'A|What is copy-on-write and how does fork() use it?',
    ],
    '11. Page Replacement Algorithms and Thrashing': [
      'I|Compare FIFO, Optimal and LRU page replacement on a reference string.',
      'I|What is Belady\'s anomaly and which algorithms suffer from it?',
      'A|What is thrashing and how does the working-set model prevent it?',
    ],
    '12. File System': [
      'B|What is an inode and what does it store?',
      'I|Hard link vs soft link: what happens to each when the original file is deleted?',
      'I|Compare contiguous, linked and indexed file allocation.',
      'I|What is a file descriptor?',
    ],
    '13. Storage Management, Disk Scheduling & I/O Systems': [
      'I|Compare FCFS, SSTF, SCAN and C-SCAN disk scheduling.',
      'I|What makes SSDs different from HDDs for an OS?',
      'I|Explain RAID 0, 1, 5 and 10.',
      'A|What is DMA and why is it better than programmed I/O?',
    ],
    '14. OS Security, Virtualization, Containers & Interview Revision': [
      'I|Virtual machine vs container: how is each isolated?',
      'A|What are namespaces and cgroups in Linux?',
      'I|What is the difference between an access control list and a capability?',
    ],
  },

  'Computer Networks Roadmap (takeUforward)': {
    '01. CN Foundations': [
      'B|LAN vs MAN vs WAN: give an example of each.',
      'B|What is the difference between client-server and peer-to-peer?',
    ],
    '02. Network Models': [
      'B|Name the seven OSI layers and one protocol at each.',
      'I|How does the TCP/IP model map onto the OSI model?',
      'I|What is encapsulation? Describe what headers a web request gets as it goes down the stack.',
    ],
    '03. Physical and Data Link Layer': [
      'B|What is a MAC address and how is it different from an IP address?',
      'I|How does ARP find a MAC address for an IP?',
      'I|How do CRC and parity detect errors?',
      'I|What is CSMA/CD and why is it not used in Wi-Fi?',
    ],
    '04. Network Topologies and VLANs': [
      'B|Compare star, bus, ring and mesh topologies.',
      'I|What does a switch do that a hub does not?',
      'I|What is a VLAN and why would you use one?',
    ],
    '05. Network Layer: IP Addressing': [
      'B|Public vs private IP addresses: what are the private ranges?',
      'I|Subnet 192.168.1.0/24 into four equal subnets. Give their ranges.',
      'I|What is CIDR and why did it replace classful addressing?',
      'I|What are the main differences between IPv4 and IPv6?',
    ],
    '06. Network Layer: Routing': [
      'I|Distance-vector vs link-state routing: how does each learn routes?',
      'I|What is the count-to-infinity problem and how is it handled?',
      'A|How does BGP choose a path between autonomous systems?',
    ],
    '07. Transport Layer': [
      'B|TCP vs UDP: when would you use each?',
      'I|Explain the TCP three-way handshake and the four-way close.',
      'I|How do flow control and congestion control differ?',
      'A|Explain slow start, congestion avoidance and fast retransmit.',
    ],
    '08. Application Layer': [
      'B|What happens when you type a URL into a browser and press Enter?',
      'B|What are the common HTTP methods and status code classes?',
      'I|How do HTTP/1.1, HTTP/2 and HTTP/3 differ?',
      'I|How does HTTPS use TLS to secure a connection?',
      'I|Cookies vs sessions vs tokens: how do they keep a user logged in?',
    ],
    '09. NAT and Internet Edge Networking': [
      'B|What is DNS and how is a domain name resolved?',
      'I|What is NAT and why is it needed?',
      'I|Name the common DNS record types (A, AAAA, CNAME, MX, TXT) and their uses.',
      'I|How does DHCP assign an IP address?',
    ],
    '10. Switching Techniques': [
      'B|Circuit switching vs packet switching.',
      'I|Datagram vs virtual-circuit packet switching.',
    ],
    '11. Network Security': [
      'B|What is the CIA triad?',
      'I|What does a firewall do, and how is a layer-7 firewall different from a layer-3 one?',
      'I|What is a VPN and how does it protect traffic?',
      'I|What are DoS, MITM and phishing attacks?',
    ],
    '12. Cryptography and Secure Protocols': [
      'B|Symmetric vs asymmetric encryption: pros and cons.',
      'I|How does Diffie-Hellman let two parties agree on a key over an open channel?',
      'I|What is a hash function and how is HMAC different from a plain hash?',
      'I|How do digital signatures and certificates prove identity?',
    ],
    '13. Wireless Networking': [
      'I|How does a device join a Wi-Fi network?',
      'I|Why does Wi-Fi use CSMA/CA instead of CSMA/CD?',
    ],
    '14. Network Performance': [
      'B|Latency vs bandwidth vs throughput.',
      'I|What is the bandwidth-delay product?',
      'I|How do fixed-window and token-bucket rate limiters work?',
    ],
  },

  'OOPS Roadmap (takeUforward)': {
    'Module 1: Introduction to OOPS': [
      'B|What is object-oriented programming and how is it different from procedural programming?',
      'B|What is the difference between a class and an object?',
      'B|What is a constructor? Can a constructor be private, and why would it be?',
    ],
    'Module 2: Core Principles of OOPS': [
      'B|Explain the four pillars of OOP with one example each.',
      'I|Method overloading vs overriding: compile time or run time?',
      'I|Why does Java not support multiple inheritance of classes? How do interfaces help?',
      'I|What do public, protected, default and private allow?',
    ],
    'Module 3: Advanced OOPS features': [
      'I|Abstract class vs interface: when would you use each?',
      'I|What does the static keyword mean for a field, a method and a block?',
      'I|What are inner, static nested and anonymous classes used for?',
    ],
    'Module 4: Relationships and Object Behaviour': [
      'I|Association vs aggregation vs composition: give a real example of each.',
      'I|Shallow copy vs deep copy: when does each cause bugs?',
      'A|Why is composition often preferred over inheritance?',
    ],
    'Module 5: Advanced Programming in OOPS': [
      'I|Checked vs unchecked exceptions in Java.',
      'I|What does finally guarantee, and when does it not run?',
      'A|What is type erasure in Java generics?',
    ],
    'Module 6: OOP Design and Lifecycle Management': [
      'I|Explain the SOLID principles with an example of breaking each one.',
      'A|How does garbage collection decide an object can be freed?',
      'A|What is dependency injection and how does it improve testability?',
    ],
  },

  'SQL Roadmap': {
    Beginner: [
      'B|What is the difference between CHAR and VARCHAR?',
      'B|DISTINCT vs GROUP BY: can both remove duplicates?',
      'B|How do you find duplicate emails in a table?',
      'B|WHERE vs HAVING with an example.',
      'I|How do COALESCE and NULLIF help with NULL values?',
    ],
    Intermediate: [
      'I|LEFT JOIN vs NOT EXISTS for "customers with no orders": which is clearer and faster?',
      'I|What is a view and can you update data through one?',
      'I|What do ON DELETE CASCADE and ON DELETE SET NULL do?',
      'I|Write a query to get the top 3 products by revenue in each category.',
    ],
    Advanced: [
      'A|ROW_NUMBER vs RANK vs DENSE_RANK: when do their results differ?',
      'A|What is a recursive CTE? Use one to list an employee\'s full management chain.',
      'A|How would you find gaps and islands (consecutive runs) in a sequence of dates?',
      'A|What does an index on (a, b) speed up, and which queries can it not help?',
      'A|What is the difference between a stored procedure and a function?',
    ],
  },

  'System Design Roadmap – HLD & LLD': {
    'Beginner Level': [
      'B|Vertical vs horizontal scaling: trade-offs.',
      'B|What does a load balancer do, and what algorithms can it use?',
      'I|Explain cache-aside, write-through and write-back caching.',
      'I|SQL vs NoSQL: how do you choose for a new service?',
      'I|REST vs GraphQL vs gRPC: when would you use each?',
    ],
    'Intermediate Level': [
      'I|What is consistent hashing and why is it used for sharding and caches?',
      'I|Leader-follower vs leader-less replication.',
      'I|Explain the CAP theorem and give examples of CP and AP systems.',
      'I|Which design patterns would you use for a notification system that sends email, SMS and push?',
      'A|How do you make an API idempotent?',
    ],
    'Advanced Level': [
      'A|Design a URL shortener: API, storage, ID generation and scaling.',
      'A|Design a rate limiter for an API gateway.',
      'A|Monolith vs microservices: when should you split, and what new problems appear?',
      'A|How do you do a back-of-the-envelope estimate for storage and QPS?',
      'A|Design a parking lot system: classes, relationships and key methods.',
      'A|How does the saga pattern handle a transaction that spans several services?',
    ],
  },

  'Git Roadmap': {
    'Phase 1: Fundamentals': [
      'B|What are the working directory, staging area and repository?',
      'B|git fetch vs git pull.',
      'I|What does Git store in a commit object?',
    ],
    'Phase 2: Branching and merging': [
      'B|What is a branch in Git, internally?',
      'I|Merge vs rebase: what does each do to history, and when should you avoid rebasing?',
      'I|How do you resolve a merge conflict?',
      'I|Compare Git flow, GitHub flow and trunk-based development.',
    ],
    'Phase 3: Remote repositories and collaboration': [
      'B|What is the difference between origin and upstream?',
      'I|Fork-and-pull-request vs shared-repository workflow.',
      'I|Why is git push --force dangerous, and what does --force-with-lease add?',
    ],
    'Not covered in the playlist': [
      'I|git reset vs git revert: which is safe on a shared branch?',
      'I|How do you recover a commit you lost after a reset?',
      'I|What does git stash do and when would you use it?',
      'A|How does git bisect help find the commit that introduced a bug?',
    ],
  },

  'Redis Roadmap': {
    'Phase 1: Why and how Redis works': [
      'B|What is Redis and why is it so fast?',
      'I|How can single-threaded Redis handle thousands of clients at once?',
      'I|What is RESP?',
    ],
    'Phase 3: Data types': [
      'B|Name the core Redis data types and one use case for each.',
      'I|How would you build a leaderboard with sorted sets?',
      'I|How do EXPIRE and TTL work, and how does Redis remove expired keys?',
      'I|When would you store an object as a hash instead of a JSON string?',
    ],
    'Not covered in the playlist yet': [
      'I|RDB vs AOF persistence: trade-offs.',
      'I|What eviction policies does Redis offer when memory is full?',
      'I|How do MULTI/EXEC transactions differ from database transactions?',
      'A|Redis Sentinel vs Redis Cluster: what problem does each solve?',
      'A|What are cache stampede and cache penetration, and how do you prevent them?',
    ],
  },

  'JavaScript Roadmap (Chai aur Code)': {
    'Variables and Data Types': [
      'B|var vs let vs const: scope, hoisting and reassignment.',
      'B|What are JavaScript\'s primitive types?',
      'I|== vs ===: what does type coercion do in each?',
    ],
    'Arrays and Objects': [
      'B|How do you copy an object, and when do you need a deep copy?',
      'I|What does destructuring do? Show it for arrays and objects.',
    ],
    'Functions and Scope': [
      'I|What is hoisting? How are function declarations and expressions hoisted differently?',
      'I|How does this behave in a normal function vs an arrow function?',
      'I|Explain the call stack and the execution context.',
    ],
    'DOM and Events': [
      'I|What are event bubbling, capturing and delegation?',
      'I|How do you add many elements to the DOM efficiently?',
    ],
    'Async JavaScript': [
      'I|Explain the event loop, the callback queue and the microtask queue.',
      'I|Promises vs async/await: how is error handling different?',
      'A|What does Promise.all do when one promise rejects? How do allSettled and race differ?',
    ],
    'OOP and Prototypes': [
      'I|What is the prototype chain?',
      'I|call vs apply vs bind.',
      'A|What does a class compile down to in terms of prototypes?',
    ],
    'Closures and Engine Internals': [
      'I|What is a closure? Give a practical use.',
      'A|Why does a loop with var and setTimeout print the same number, and how do you fix it?',
      'A|How do debounce and throttle work, and when would you use each?',
    ],
  },

  'Python Roadmap': {
    'Basics › Data Types': [
      'B|Mutable vs immutable types in Python, with examples.',
      'B|What is the difference between is and ==?',
    ],
    'Basics › Data Structures': [
      'B|List vs tuple vs set vs dict: when would you use each?',
      'I|How are dicts and sets implemented, and why are lookups O(1) on average?',
      'I|What is a list comprehension and when is a generator expression better?',
    ],
    'Basics › Functions': [
      'I|What are *args and **kwargs?',
      'I|Why is a mutable default argument a bug?',
      'I|What is a lambda and where is it useful?',
    ],
    Intermediate: [
      'I|What are dunder methods like __init__, __str__ and __repr__?',
      'I|How does try / except / else / finally work?',
      'I|What is the difference between a module and a package?',
      'A|What are context managers and how does with work?',
    ],
    Advanced: [
      'A|How does a decorator work? Write one that times a function.',
      'A|What is the GIL and how does it affect threads vs processes?',
      'A|Generators vs iterators: how does yield work?',
    ],
  },
};
