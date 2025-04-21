/**
 * Calculates the perceived brightness of a hex color and returns black or white for contrast.
 * Uses the YIQ formula.
 * @param hexColor - The hex color string (e.g., "#RRGGBB").
 * @returns "#000000" (black) or "#FFFFFF" (white).
 */
export function getContrastColor(hexColor: string): '#000000' | '#FFFFFF' {
    if (!hexColor) {
        return '#FFFFFF'; // Default to white if no color provided
    }

    try {
        // Remove # if present
        let hex = hexColor.replace('#', '');

        // Handle shorthand hex (e.g., "#03F") -> "0033FF"
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }

        if (hex.length !== 6) {
            console.warn('Invalid hex color format for contrast calculation:', hexColor);
            return '#FFFFFF'; // Default to white for invalid format
        }

        // Parse r, g, b
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);

        // Calculate YIQ value
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        // Return black for light colors (YIQ >= 128), white for dark colors
        return (yiq >= 128) ? '#000000' : '#FFFFFF';
    } catch (error) {
        console.error('Error calculating contrast color for:', hexColor, error);
        return '#FFFFFF'; // Default to white on error
    }
} 