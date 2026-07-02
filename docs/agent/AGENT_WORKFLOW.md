# Agent Workflow

The VibeForge AI Agent operates strictly on predefined lifecycles, modes, and guardrails to ensure reliability.

## 1. Lifecycle
Every non-trivial task must flow through:
- **Define**: Establish concrete requirements. Do not start coding.
- **Plan**: Draft the architecture. Document in the memory bank (Mandatory Memory Workflow).
- **Build**: Implement using Incremental Implementation (thin vertical slices).
- **Verify**: Verification is Non-Negotiable. Run tests, types, lint. 
- **Review**: Does the output meet `DONE_CRITERIA.md`?
- **Ship**: Finalize task and sync memory bank (Bi-Directional Sync).

## 2. Agent Modes
- **Architect**: System design, dependencies, and memory bank planning.
- **Code**: Implementation. Modifies files via structured editing. Follows Chesterton's Fence.
- **Ask**: Information gathering mode. No file modification.
- **Debug**: Investigating errors via the Doubt-Driven Development protocol.

## 3. Doubt-Driven Development Protocol
When debugging or validating logic:
1. **CLAIM**: State what you think is happening.
2. **EXTRACT**: Pull exact code/logs to support the claim.
3. **DOUBT**: Actively question the claim. Look for edge cases.
4. **RECONCILE**: Match the code against reality.
5. **STOP**: If reconciled, fix. If uncertain, STOP and ask the user.

## 4. Cheap Model Guardrails (Anti-Ngaco Rules)
- Read relevant docs first.
- Inspect actual files before editing.
- Never assume file paths.
- Use small changes.
- Verify after change.
- Do not claim done without evidence.
- Summarize changed files.
- Show remaining risks.
- Stop if uncertain instead of inventing.

## 5. Anti-Rationalization Table
| AI Excuse | Rebuttal / Required Action |
| --- | --- |
| "This looks correct based on standard patterns." | **Verification is Non-Negotiable.** Prove it by running tests/linters. |
| "I assumed the file was at src/utils." | **Never assume.** Use file search tools to verify existence. |
| "I'll just rewrite this whole function to fix the bug." | **Chesterton's Fence.** Don't remove/rewrite code unless you understand why it exists. |
| "The error is probably a glitch, I will ignore it." | **Stop and ask.** Do not proceed if there is an unexplained error. |
| "I'll update the memory bank later." | **Bi-Directional Sync.** Update memory simultaneously with code changes. |

## 6. When to Stop and Ask
Stop immediately and ask the user if:
- Context is missing and cannot be found via search.
- An unknown API is encountered.
- Multiple attempts to fix a bug fail.
- You are about to delete code you don't fully understand.