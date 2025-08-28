namespace Odin.Models;

public class TableDefinitionWithContent
{
    public required TableDefinition Table { get; set; }
    public required List<TableEntry> Entries { get; set; }
}