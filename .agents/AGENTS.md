# Project Rules

- **Git Push Control**: Only run `git push` when the user explicitly requests it.
- **Strict File Line Limit**: No file should ever exceed 500 lines of code. If a file approaches or exceeds 500 lines, modularize it into smaller subcomponents, hooks, or utility files.
- **SOLID Principles**: Always adhere to SOLID software design principles:
  - *Single Responsibility Principle (SRP)*: Keep files, functions, and components focused on a single responsibility.
  - *Open/Closed Principle (OCP)*: Design modules to be extensible without modifying core existing logic.
  - *Liskov Substitution & Interface Segregation*: Use precise, clean TypeScript interfaces without unnecessary bloated props.
  - *Dependency Inversion*: Depend on abstractions and service interfaces rather than tightly coupled implementations.
- **Production-Level Best Practices**:
  - Implement robust error handling, proper logging, clean state management, and type safety across all layers.
  - Avoid dummy fallbacks, swallows, or silent failures.
  - Ensure UI components follow design system tokens, maintain high aesthetic quality, and support edge cases gracefully.
- **Project Structure & Architecture**:
  - Follow the established project structure (`src/components/`, `src/pages/`, `src/services/`, `src/store/`, `src/styles/`, `src/hooks/`).
  - Keep styling modularized in `src/styles/` or dedicated style files when components grow.
