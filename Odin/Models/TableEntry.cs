namespace Odin.Models;

public class TableEntry
{
    public long? Id => long.TryParse(Values["Id"], out var id) ? id : null;
    public required Dictionary<string, string> Values { get; set; }
    public required TableDefinition OwningTable { get; set; }

    public string ErrorMessage { get; set; } = string.Empty;
}
