using System;

public static class FractionParser
{
    /// <summary>
    /// Parses musical fraction strings into a value where 1.0 = whole note.
    /// Supported forms: "0", "N/D", "N/D." (trailing dot multiplies by 1.5).
    /// </summary>
    public static double ParseToValue(string fraction)
    {
        if (string.IsNullOrWhiteSpace(fraction))
        {
            throw new FormatException("Fraction is null or empty.");
        }

        if (fraction == "0")
        {
            return 0d;
        }

        var dotted = fraction.EndsWith(".", StringComparison.Ordinal);
        var core = dotted ? fraction[..^1] : fraction;

        var slash = core.IndexOf('/');
        if (slash <= 0 || slash == core.Length - 1)
        {
            throw new FormatException($"Invalid fraction: '{fraction}'.");
        }

        if (!int.TryParse(core[..slash], out var num) ||
            !int.TryParse(core[(slash + 1)..], out var den) ||
            den == 0)
        {
            throw new FormatException($"Invalid fraction: '{fraction}'.");
        }

        var value = (double)num / den;
        return dotted ? value * 1.5 : value;
    }
}
