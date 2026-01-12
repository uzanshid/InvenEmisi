import { create, all } from 'mathjs';

// Create math.js instance with all functions
export const math = create(all);

// Math.js automatically handles:
// - Unit parsing (e.g., "100 kg", "50 m")
// - Prevents addition of incompatible units (kg + m throws error)
// - Allows implicit conversion for same dimensions (kg + g works)
// - Returns unitless result when units cancel (kg / kg = number)
