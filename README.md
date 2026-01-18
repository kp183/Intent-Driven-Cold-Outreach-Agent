# Intent-Driven Cold Outreach Agent

A production-ready AI system that generates personalized, human-sounding outreach messages through a structured 7-step reasoning workflow. The system prioritizes quality and relevance over persuasion or scale, ensuring predictable, explainable, and business-safe behavior for professional AI marketplaces.

## Features

- **Structured 7-Step Workflow**: Deterministic processing pipeline with audit logging
- **Property-Based Testing**: Comprehensive validation using fast-check library
- **Conservative Behavior**: Safety-first approach with uncertainty acknowledgment
- **Authenticity Filtering**: Prevents templated and spammy message generation
- **TypeScript**: Full type safety and modern development experience

## Project Structure

```
src/
├── types/           # Core data model interfaces and enums
├── interfaces/      # Component interface definitions
├── constants/       # System constants and configuration
├── utils/          # Utility functions
├── __tests__/      # Test files
└── index.ts        # Main entry point
```

## Installation

```bash
npm install
```

## Development

```bash
# Build the project
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Development mode
npm run dev

# Lint code
npm run lint

# Format code
npm run format
```

## Testing

The project uses a dual testing approach:

- **Unit Tests**: Specific examples and edge cases using Jest
- **Property-Based Tests**: Universal properties using fast-check (minimum 100 iterations)

## Workflow Steps

1. **Input Validation**: Verify prospect data completeness and quality
2. **Signal Interpretation**: Process intent signals independently with weighting
3. **Hypothesis Formation**: Create evidence-grounded intent hypothesis
4. **Confidence Scoring**: Assign High/Medium/Low confidence levels
5. **Strategy Selection**: Map confidence to message strategy
6. **Message Generation**: Create human-sounding outreach messages
7. **Authenticity Evaluation**: Filter out templated or spammy content

## Requirements

- Node.js 18+
- TypeScript 5+
- Jest for testing
- fast-check for property-based testing

## License

MIT