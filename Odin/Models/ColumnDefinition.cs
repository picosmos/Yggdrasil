namespace Odin.Models;

public class ColumnDefinition
{
    public required string Name { get; set; }

    public required string HtmlInputType { get; set; }

    public bool IsReadOnly { get; set; }
}
