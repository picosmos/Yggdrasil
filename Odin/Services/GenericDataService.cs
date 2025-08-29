using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Mimir;
using Odin.Models;

namespace Odin.Services;

public class GenericDataService(ILogger<GenericDataService> logger, MimirDbContext mimirDbContext)
{
    private readonly ILogger<GenericDataService> _logger = logger;
    private readonly MimirDbContext _mimirDbContext = mimirDbContext;

    public void AddOrUpdate(string table, long? id, Dictionary<string, string> updatedValues)
    {
        var tableDefinition = this.GetTableDefinition(table);

        var entry = this._mimirDbContext.Find(tableDefinition.EntityType.ClrType, id);
        if (entry == null)
        {
            entry = Activator.CreateInstance(tableDefinition.EntityType.ClrType);
            if (entry == null)
            {
                throw new InvalidOperationException("Could not create instance of entity type.");
            }

            this._mimirDbContext.Add(entry);
        }


        foreach (var kvp in updatedValues)
        {
            var column = tableDefinition.Columns.FirstOrDefault(c => c.Name.Equals(kvp.Key, StringComparison.OrdinalIgnoreCase));
            if (column == null || column.IsReadOnly)
            {
                continue;
            }

            var property = tableDefinition.EntityType.ClrType.GetProperty(kvp.Key);
            if (property == null)
            {
                continue;
            }

            object? targetValue = null;
            try
            {
                targetValue = Convert.ChangeType(kvp.Value, property.PropertyType, CultureInfo.InvariantCulture);
            }
            catch { }
            property?.SetValue(entry, targetValue);
        }

        this._mimirDbContext.SaveChanges();
    }

    public void DeleteEntry(string table, long id)
    {
        var tableDefinition = this.GetTableDefinition(table);
        var entry = this._mimirDbContext.Find(tableDefinition.EntityType.ClrType, id) ?? throw new InvalidOperationException("Entry not found.");

        this._mimirDbContext.Remove(entry);
        this._mimirDbContext.SaveChanges();
    }

    internal IReadOnlyList<TableDefinition> GetAllTableDefinitions()
    {
        return [.. this._mimirDbContext.Model.GetEntityTypes().Select(TableDefinition.FromEntityType)];
    }

    internal TableDefinitionWithContent GetTableDefinitionWithContent(string? table)
    {
        var tableDefinition = this.GetTableDefinition(table) ?? throw new ArgumentException("Table not found.", nameof(table));

        var properties = tableDefinition.EntityType.ClrType.GetProperties()!;
        var entries = this.NonGenericSet(tableDefinition.EntityType.ClrType).AsQueryable().OfType<object>().ToList()
            .Select(entry => TableEntryFromObject(entry, tableDefinition, properties))
            .ToList();

        return new TableDefinitionWithContent
        {
            Table = tableDefinition,
            Entries = entries
        };
    }

    private static TableEntry TableEntryFromObject(object entry, TableDefinition tableDefinition, System.Reflection.PropertyInfo[] properties)
    {
        return new TableEntry
        {
            OwningTable = tableDefinition,
            Values = properties.ToDictionary(
                                column => column.Name,
                                column => column.PropertyType switch
                                {
                                    Type t when t == typeof(DateTime) => (column.GetValue(entry) as DateTime?)?.ToString("yyyy-MM-ddTHH:mm:ss", CultureInfo.InvariantCulture) ?? string.Empty,
                                    _ => column.GetValue(entry)?.ToString()
                                } ?? string.Empty
                            ),
        };
    }

    public TableDefinition GetTableDefinition(string? table)
    {
        this._logger.LogInformation("Getting table definition for {Table}", table);
        return this._mimirDbContext.Model.GetEntityTypes()
            .Where(entityType => entityType.Name.Equals(table, StringComparison.OrdinalIgnoreCase) || entityType.Name.Equals(table + "s", StringComparison.OrdinalIgnoreCase))
            .Select(TableDefinition.FromEntityType)
            .First();
    }

    private IQueryable NonGenericSet(Type clrType)
    {
        var setMethod = this._mimirDbContext.GetType().GetMethod(nameof(DbContext.Set), Type.EmptyTypes);
        var genericSetMethod = setMethod?.MakeGenericMethod(clrType);
        var dbSet = genericSetMethod?.Invoke(this._mimirDbContext, null)!;
        return (IQueryable)dbSet;
    }

    internal TableEntry GetTableEntry(string table, long? value)
    {
        this._logger.LogInformation("Getting table entry for table {Table} with ID={Id}", table, value);
        var definition = this.GetTableDefinition(table) ?? throw new ArgumentException("Table not found.", nameof(table));

        var properties = definition.EntityType.ClrType.GetProperties()!;
        var entry = this.NonGenericSet(definition.EntityType.ClrType).AsQueryable().OfType<object>().ToList().FirstOrDefault(x => (long?)definition.EntityType.FindPrimaryKey()!.Properties.Select(p => p.PropertyInfo).First()?.GetValue(x) == value) ?? throw new ArgumentException("Entry not found.", nameof(value));

        return TableEntryFromObject(entry, definition, properties);
    }
}
