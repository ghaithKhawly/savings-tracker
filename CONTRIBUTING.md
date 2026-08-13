# Contributing to Savings Tracker

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/savings-tracker.git
   cd savings-tracker
   ```
3. **Install dependencies**:
   ```bash
   npm install
   ```
4. **Create a branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Running the App

```bash
npm start       # Expo dev server
npm run web     # Web browser
npm run android # Android emulator
npm run ios     # iOS simulator (macOS only)
```

### Code Quality

Before submitting a PR, ensure your code passes all checks:

```bash
npm run lint        # Check for linting errors
npm run lint:fix    # Auto-fix linting issues
npm run format      # Format code with Prettier
npm run typecheck   # TypeScript type checking
npm run test        # Run unit tests
```

### Pre-commit Checklist

- [ ] Code compiles without errors (`npm run typecheck`)
- [ ] All tests pass (`npm run test`)
- [ ] Code is properly formatted (`npm run format`)
- [ ] No linting errors (`npm run lint`)
- [ ] New features have tests
- [ ] Accessibility labels added for interactive elements

## Code Style

### TypeScript

- Use explicit types for function parameters and return values
- Prefer interfaces over type aliases for object shapes
- Use `const` assertions where appropriate

### React Components

- Use functional components with hooks
- Extract reusable logic into custom hooks
- Keep components focused and single-purpose
- Add accessibility props (`accessibilityLabel`, `accessibilityRole`)

### Styling

- Use theme tokens from `src/theme.ts` (COLORS, SPACING, BORDER_RADIUS)
- Avoid inline styles
- Keep StyleSheet definitions at the bottom of the file

### File Organization

```
src/
├── components/     # Reusable UI components
├── screens/        # Screen-level components
├── services/       # API and external service integrations
├── store/          # Zustand state management
├── utils/          # Helper functions and calculations
└── theme.ts        # Design tokens
```

## Testing

### Writing Tests

- Place tests in `__tests__` folders adjacent to the code
- Name test files with `.test.ts` or `.test.tsx` suffix
- Use descriptive test names that explain the expected behavior

### Test Structure

```typescript
describe('ComponentOrFunction', () => {
  it('should do something specific', () => {
    // Arrange
    // Act
    // Assert
  });
});
```

### Running Tests

```bash
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

## Pull Request Process

1. **Update documentation** if needed
2. **Add tests** for new functionality
3. **Ensure CI passes** all checks
4. **Write a clear PR description** explaining:
   - What changes were made
   - Why the changes were needed
   - Any breaking changes
5. **Request review** from maintainers

### PR Title Format

Use conventional commit format:
- `feat: add new feature`
- `fix: resolve bug`
- `docs: update documentation`
- `refactor: code improvement`
- `test: add or update tests`
- `chore: maintenance tasks`

## Reporting Issues

### Bug Reports

Include:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Device/OS/browser version
- Screenshots if applicable

### Feature Requests

Include:
- Clear description of the feature
- Use case / problem it solves
- Potential implementation approach (optional)

## Questions?

Open a GitHub issue with the `question` label.

---

Thank you for contributing! 🎉
