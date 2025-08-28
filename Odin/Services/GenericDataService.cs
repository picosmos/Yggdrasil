namespace Odin.Services;

using System;
using Microsoft.EntityFrameworkCore;
using Mimir;
using Mimir.Models;
using Odin.Models;

public class GenericDataService
{
    ILogger<GenericDataService> _logger;
    MimirDbContext _mimirDbContext;

    public GenericDataService(ILogger<GenericDataService> logger, MimirDbContext mimirDbContext)
    {
        _logger = logger;
        _mimirDbContext = mimirDbContext;
    }

    public void AddOrUpdate(string table, long? id, Dictionary<string, string> updatedValues)
    {
        var tableDefinition = this.GetTableDefinition(table);

        var entry = _mimirDbContext.Find(tableDefinition.EntityType.ClrType, id);
        if (entry == null)
        {
            entry = Activator.CreateInstance(tableDefinition.EntityType.ClrType);
            if (entry == null)
            {
                throw new InvalidOperationException("Could not create instance of entity type.");
            }

            _mimirDbContext.Add(entry);
        }


        foreach (var kvp in updatedValues)
        {
            var column = tableDefinition.Columns.FirstOrDefault(c => c.Name.Equals(kvp.Key, StringComparison.InvariantCultureIgnoreCase));
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
                targetValue = Convert.ChangeType(kvp.Value, property.PropertyType);
            }
            catch { }
            property?.SetValue(entry, targetValue);
        }

        _mimirDbContext.SaveChanges();
    }

    public void DeleteEntry(string table, long id)
    {
        var tableDefinition = this.GetTableDefinition(table);
        var entry = _mimirDbContext.Find(tableDefinition.EntityType.ClrType, id);
        if (entry == null)
        {
            throw new InvalidOperationException("Entry not found.");
        }

        _mimirDbContext.Remove(entry);
        _mimirDbContext.SaveChanges();
    }

    internal IReadOnlyList<TableDefinition> GetAllTableDefinitions()
    {
        return _mimirDbContext.Model.GetEntityTypes()
            .Select(TableDefinition.FromEntityType)
            .ToList();
    }

    internal TableDefinitionWithContent GetTableDefinitionWithContent(string? table)
    {
        var tableDefinition = this.GetTableDefinition(table);
        if (tableDefinition == null)
        {
            throw new ArgumentException("Table not found.", nameof(table));
        }

        var properties = tableDefinition.EntityType.ClrType.GetProperties()!;
        var entries = NonGenericSet(tableDefinition.EntityType.ClrType).AsQueryable().OfType<object>().ToList()
            .Select(entry =>
            {
                return new TableEntry
                {
                    OwningTable = tableDefinition,
                    Values = properties.ToDictionary(column => column.Name, column => column.GetValue(entry)?.ToString() ?? string.Empty)
                };
            })
            .ToList();

        return new TableDefinitionWithContent
        {
            Table = tableDefinition,
            Entries = entries
        };
    }

    public TableDefinition GetTableDefinition(string? table)
    {
        this._logger.LogInformation($"Getting table definition for {table}");
        return _mimirDbContext.Model.GetEntityTypes()
            .Where(entityType => entityType.Name.Equals(table, StringComparison.InvariantCultureIgnoreCase) || entityType.Name.Equals(table + "s", StringComparison.InvariantCultureIgnoreCase))
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
        this._logger.LogInformation($"Getting table entry for table {table} with ID={value}");
        var definition = this.GetTableDefinition(table);
        if (definition == null)
        {
            throw new ArgumentException("Table not found.", nameof(table));
        }

        var properties = definition.EntityType.ClrType.GetProperties()!;
        var entry = NonGenericSet(definition.EntityType.ClrType).AsQueryable().OfType<object>().ToList().FirstOrDefault(x => (long?)definition.EntityType.FindPrimaryKey()!.Properties.Select(p => p.PropertyInfo).First()?.GetValue(x) == value);
        if (entry == null)
        {
            throw new ArgumentException("Entry not found.", nameof(value));
        }

        return new TableEntry
        {
            OwningTable = definition,
            Values = properties.ToDictionary(column => column.Name, column => column.GetValue(entry)?.ToString() ?? string.Empty)
        };
    }
}
