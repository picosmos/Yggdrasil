namespace Odin.Controllers;

using Himinbjorg.Services;
using Microsoft.AspNetCore.Mvc;

public class TrackController : Controller
{
    private readonly ILogger<TrackController> _logger;
    private readonly TrackDatabaseService _trackService;
    private readonly ProtegearService _protegearService;

    public TrackController(ILogger<TrackController> logger, TrackDatabaseService trackService, ProtegearService protegearService)
    {
        _logger = logger;
        _trackService = trackService;
        _protegearService = protegearService;
    }

    [HttpGet]
    public IActionResult Index(string id)
    {
        var track = _trackService.GetTrackById(id);
        if (track == null)
        {
            return NotFound();
        }

        var json = this._protegearService.Request(track.User.InternationalMobileEquipmentIdentity, track.User.ProtegearApiSecret, track.From, track.To);

        return new ContentResult
        {
            Content = json,
            ContentType = "application/json",
            StatusCode = 200
        };
    }

}
