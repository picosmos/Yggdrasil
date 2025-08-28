namespace Odin.Controllers;

using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Odin.Models;
using Odin.Services;

public class HomeController : Controller
{
    private readonly ILogger<HomeController> _logger;
    private readonly GenericDataService _genericDataService;

    public HomeController(ILogger<HomeController> logger, GenericDataService genericDataService)
    {
        _logger = logger;
        _genericDataService = genericDataService;
    }

    [HttpGet]
    public IActionResult Index()
    {
        var definitions = _genericDataService.GetAllTableDefinitions();
        return View("ListOfTables", definitions);
    }

    [HttpGet]
    public IActionResult ShowTable(string table)
    {
        var definition = _genericDataService.GetTableDefinitionWithContent(table);
        return View("TableContent", definition);
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
            var tableDefinition = _genericDataService.GetTableDefinition(table);
            model = new TableEntry
            {
                OwningTable = tableDefinition,
                Values = tableDefinition.Columns.ToDictionary(c => c.Name, c => string.Empty)
            };
        }
        else
        {
            model = _genericDataService.GetTableEntry(table, id!.Value);
        }

        return View("EditEntry", model);
    }

    [HttpPost]
    public IActionResult AddOrEdit(string? table, long? id, [FromForm] Dictionary<string, string> updatedValues)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return this.BadRequest("Table name is required.");
        }

        _logger.LogInformation($"AddOrEdit for table {table} for id {id}. Received values: {string.Join(",", updatedValues.Select(x => x.Key + "=" + x.Value))}");

        try
        {
            _genericDataService.AddOrUpdate(table, id, updatedValues);
        }
        catch (Exception ex)
        {
            var tableDefinition = _genericDataService.GetTableDefinition(table);
            var model = new TableEntry
            {
                OwningTable = tableDefinition,
                Values = updatedValues,
            };
            model.ErrorMessage = "An exception occurred: " + ex.ToString();
            return View("EditEntry", model);
        }

        return RedirectToAction("ShowTable", new { table });
    }

    [HttpPost]
    public IActionResult Delete(string? table, long id)
    {
        if (string.IsNullOrWhiteSpace(table))
        {
            return this.BadRequest("Table name is required.");
        }

        _genericDataService.DeleteEntry(table, id);

        return RedirectToAction("ShowTable", new { table });
    }
}
