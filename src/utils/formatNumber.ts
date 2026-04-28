/**
 * Formats a number to a maximum of 2 decimal places.
 * If the number is smaller than 0.01, it uses 2 significant figures 
 * to prevent the data from being displayed as '0' or '0.00'.
 */
export const formatDisplayNumber = (num: number | string | undefined | null): string => {
    if (num === undefined || num === null) return '';
    
    let val = typeof num === 'string' ? parseFloat(num.replace(/,/g, '')) : num;
    if (isNaN(val)) return String(num);
    if (val === 0) return '0';
    
    const absVal = Math.abs(val);
    
    if (absVal < 0.01) {
        // Use 2 significant digits for very small numbers
        // e.g., 0.00456 -> 0.0046, 0.0000123 -> 0.000012
        const formatted = val.toPrecision(2);
        // Strip exponential and excess zeroes if any
        const decimalStr = parseFloat(formatted).toString(); 
        // Replace dot with comma for Indonesian locale
        return decimalStr.replace('.', ',');
    }
    
    // For numbers >= 0.01, use max 2 decimal places with comma separators (Indonesian locale)
    return val.toLocaleString('id-ID', { maximumFractionDigits: 2 });
};
