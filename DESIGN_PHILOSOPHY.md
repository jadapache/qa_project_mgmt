# Design Philosophy: PMQA Copilot

---

## 1. The Core Problem

Traditional software engineering tooling for Product Managers and QA Engineers has become fragmented, heavy, and disconnected:
- **PMs** spend hours synchronizing Jira tickets, rewriting daily updates, drafting PRDs in isolation, and manually reviewing edge cases.
- **QA Engineers** struggle to maintain traceability between evolving requirements, API contracts, test matrices, and bug triage queues.
- **Enterprise Solutions** often demand bloated monolithic databases (PostgreSQL/MySQL + ORMs + migrations), dedicated servers, complex user provisioning, and cloud dependencies that send proprietary company data to third parties without local control.

---

## 2. Our Guiding Principles

### Principle 1: Local-First & Privacy by Default
- **Your Data Remains Yours**: Engineering documents, PRDs, and Jira tickets often contain confidential intellectual property. PMQA Copilot prioritizes **local AI models (via Ollama)** and **on-device BM25 search**.
- **No Remote Database**: Instead of forcing a relational database setup (which introduces schema drift, migration headaches, and connection pooling issues), PMQA Copilot uses a clean, file-based local storage system under `local/`.
- **Hardware-Backed Encryption**: Credentials, OAuth refresh tokens, and Personal Access Tokens are encrypted with Fernet symmetric cryptography, anchored in the operating system's native keychain (`keyring`).

### Principle 2: Pragmatic Grounding Over Hallucination (Zero-Bullshit AI)
- Generic LLM chatbots provide surface-level advice that ignores specific team architecture and product constraints.
- PMQA Copilot grounds every response in your team's real documentation using local RAG (Retrieval-Augmented Generation).
- If the knowledge base does not contain the answer, the system is designed to state what is missing rather than inventing facts.

### Principle 3: Pluggable Adapters, Zero Lock-In
- Features (Standup, PRD Review, QA Test Matrix) never communicate directly with Jira, GitHub, or GitLab.
- All external platforms implement a unified `IntegrationAdapter` contract.
- Switching from Jira Cloud to Jira Server or from GitHub to GitLab requires zero changes to the core PM and QA workflows.
- Disconnecting an integration instantly purges the encrypted credentials from disk.

### Principle 4: High-Velocity Modern UX
- Command centers should feel immediate, responsive, and visually focused.
- A dark, distraction-free interface (Tailwind CSS v4 + React 19) provides clear status signals, instant copy actions, and intuitive sidebars without nested popup mazes.
- Deployment can be completely local with a two-command setup, or packaged into a single container image for self-hosted team use.

---

## 3. The Shift from Legacy Architecture

The previous iteration attempted to build a centralized, multi-tenant relational system with heavy ORM tables, complex database migrations, and rigid schema restrictions. This approach failed because:
1. It created massive friction for individual developers and teams wanting immediate local utility.
2. It spent excessive effort maintaining database state rather than delivering high-leverage AI workflows.
3. Database locking and external broker requirements (like Celery/Redis) broke the local developer experience.

**PMQA Copilot replaces this with an agile, local-first Command Center that works out of the box in under 5 minutes.**
