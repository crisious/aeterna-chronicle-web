/**
 * scripts/data-validator/index.ts — 배럴 export (계섬월 stub)
 */
export * from './types.ts';
export * from './errors.ts';
export { VALIDATOR_COMMANDS, main as runValidatorCli } from './cli.ts';
export { validateAgainstSchema, validateAllSchemas } from './validators/schema-validator.ts';
export { auditReferences, buildReferenceGraph } from './validators/reference-auditor.ts';
export { auditBalance, computeDistribution } from './validators/balance-outlier.ts';
export { emitReport, formatFindingLine } from './reporters/error-reporter.ts';
