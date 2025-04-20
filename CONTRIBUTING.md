# Contributing to Verb Club

Thanks for contributing to Verb Club! This project uses a structured Git workflow to keep development clean and maintainable.

---

## 🔀 Workflow Overview

Each issue should be addressed in its own Git branch and submitted via a pull request (PR) to the `main` branch.

### 🧱 Step-by-Step Workflow

1. **Start from `main`**
   ```bash
   git checkout main
   git pull origin main
   ```

2. **Create a feature branch**
   Use a clear, descriptive name that includes the issue number:
   ```bash
   git checkout -b feature/12-create-users-table
   ```

3. **Make your changes locally**
   Commit early and often:
   ```bash
   git add .
   git commit -m "Create users table with UUID, phone number, and timestamps"
   ```

4. **Push your branch to GitHub**
   ```bash
   git push origin feature/12-create-users-table
   ```

5. **Open a pull request**
   - Go to GitHub and click "Compare & pull request"
   - Include `Closes #12` in the PR description to auto-close the issue
   - Use draft PRs if the work is still in progress

6. **Merge and clean up**
   After review or testing:
   ```bash
   git checkout main
   git pull origin main
   git branch -d feature/12-create-users-table
   ```

---

## 🧪 Commit Message Guidelines

- Use clear, present-tense descriptions:  
  ✅ `Add invites table`  
  ❌ `Added invites table`

- For longer tasks, include multiple commits rather than one large commit.

---

## 📦 Branch Naming Conventions

| Type     | Prefix           | Example                              |
|----------|------------------|--------------------------------------|
| Feature  | `feature/`       | `feature/42-add-verb-model`          |
| Bugfix   | `fix/`           | `fix/14-missing-invitee-validation` |
| Refactor | `refactor/`      | `refactor/db-connection-logic`      |

---

## 🧼 Other Notes

- Keep pull requests focused. One PR = one issue or logical unit of work.
- If your PR affects the schema, update `schema.sql` and add sample rows if helpful.
- If you need to test spatial queries, seed with PostGIS-compatible data.

---

Happy coding! 🎉
