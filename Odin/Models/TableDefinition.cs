
using System.ComponentModel;
using Microsoft.EntityFrameworkCore.Metadata;
using System.Linq;
using System.Reflection;
namespace Odin.Models;

public class TableDefinition
{
    public required string Name { get; set; }

    public required IReadOnlyList<ColumnDefinition> Columns { get; set; }

    public required IEntityType EntityType { get; set; }

    public static TableDefinition FromEntityType(Microsoft.EntityFrameworkCore.Metadata.IEntityType entityType)
    {
        return new TableDefinition
        {
            Name = entityType.Name,
            EntityType = entityType,
            Columns = entityType.GetProperties().Select(propertyInfo => new ColumnDefinition
            {
                Name = propertyInfo.Name,
                IsReadOnly = propertyInfo.PropertyInfo?.GetCustomAttribute<ReadOnlyAttribute>() != null,
                HtmlInputType = propertyInfo.ClrType switch
                {
                    Type t when t == typeof(string) => "text",
                    Type t when t == typeof(int) => "number",
                    Type t when t == typeof(long) => "number",
                    Type t when t == typeof(DateTime) => "datetime-local",
                    Type t when t == typeof(bool) => "checkbox",
                    _ => "text"
                },
            }).ToList()
        };
    }
}
