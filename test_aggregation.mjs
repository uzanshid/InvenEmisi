import { create, all } from 'mathjs';

const math = create(all);

// Simulating the row-by-row execution context
const rowContext = { value: 10 };
const formulaSum = "sum(value)";
const formulaMean = "mean(value)";
const formulaIf = "value > 5 ? 'High' : 'Low'";
const formulaNestedIf = "value > 15 ? 'Very High' : (value > 5 ? 'High' : 'Low')";

console.log("Context: { value: 10 }");
try { console.log(`sum(value) = ${math.evaluate(formulaSum, rowContext)}`); } catch (e) { console.log(`sum error: ${e.message}`); }
try { console.log(`mean(value) = ${math.evaluate(formulaMean, rowContext)}`); } catch (e) { console.log(`mean error: ${e.message}`); }
try { console.log(`Ternary IF = ${math.evaluate(formulaIf, rowContext)}`); } catch (e) { console.log(`if error: ${e.message}`); }
try { console.log(`Nested IF = ${math.evaluate(formulaNestedIf, rowContext)}`); } catch (e) { console.log(`nested if error: ${e.message}`); }
