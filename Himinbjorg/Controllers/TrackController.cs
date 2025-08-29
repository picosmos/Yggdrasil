
using Himinbjorg.Services;
using Microsoft.AspNetCore.Mvc;

namespace Himinbjorg.Controllers;

public class TrackController(
    TrackDatabaseService trackService,
    ProtegearService protegearService) : Controller
{
    private readonly TrackDatabaseService _trackService = trackService;
    private readonly ProtegearService _protegearService = protegearService;

    [HttpGet]
    public IActionResult Index(string id)
    {
        var track = this._trackService.GetTrackById(id);
        if (track == null)
        {
            return this.NotFound();
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
