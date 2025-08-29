using Microsoft.AspNetCore.Mvc;
using Odin.Models;
using Odin.Services;

namespace Odin.Controllers;

public class HomeController(ILogger<HomeController> logger, GenericDataService genericDataService) : Controller
{
    private readonly ILogger<HomeController> _logger = logger;
    private readonly GenericDataService _genericDataService = genericDataService;

    [HttpGet]
    public IActionResult Index()
    {
        var definitions = this._genericDataService.GetAllTableDefinitions();
        return this.View("ListOfTables", definitions);
    }

    [HttpGet]
    public IActionResult ShowTable(string table)
    {
        var definition = this._genericDataService.GetTableDefinitionWithContent(table);
        return this.View("TableContent", definition);
    }

    [HttpGet]
    public IActionResult AddOrEdit(string? table, long? id)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return this.BadRequest("Table name is required.");
        }

        TableEntry model;
        if ((id ?? 0) == 0)
        {
            var tableDefinition = this._genericDataService.GetTableDefinition(table);
            model = new TableEntry
            {
                OwningTable = tableDefinition,
                Values = tableDefinition.Columns.ToDictionary(c => c.Name, c => string.Empty)
            };
        }
        else
        {
            model = this._genericDataService.GetTableEntry(table, id!.Value);
        }

        return this.View("EditEntry", model);
    }

    [HttpPost]
    public IActionResult AddOrEdit(string? table, long? id, [FromForm] Dictionary<string, string> updatedValues)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return this.BadRequest("Table name is required.");
        }

        this._logger.LogInformation("AddOrEdit for table {Table} for id {Id}. Received values: {Values}", table, id, updatedValues);

        try
        {
            this._genericDataService.AddOrUpdate(table, id, updatedValues);
        }
        catch (Exception ex)
        {
            var tableDefinition = this._genericDataService.GetTableDefinition(table);
            var model = new TableEntry
            {
                OwningTable = tableDefinition,
                Values = updatedValues,
                ErrorMessage = "An exception occurred: " + ex.ToString()
            };
            return this.View("EditEntry", model);
        }

        return this.RedirectToAction("ShowTable", new { table });
    }

    [HttpPost]
    public IActionResult Delete(string? table, long id)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return this.BadRequest("Table name is required.");
        }

        this._genericDataService.DeleteEntry(table, id);

        return this.RedirectToAction("ShowTable", new { table });
    }
}
