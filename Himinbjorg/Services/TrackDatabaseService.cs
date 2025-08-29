
using Microsoft.EntityFrameworkCore;
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services;

public class TrackDatabaseService(ILogger<TrackDatabaseService> logger, MimirDbContext dbContext)
{
    private readonly ILogger<TrackDatabaseService> _logger = logger;
    private readonly MimirDbContext _dbContext = dbContext;

    internal Track? GetTrackById(string id)
    {
        var track = this._dbContext.Tracks.Include(x => x.User).Where(t => t.Secret.ToLower() == id.ToLower()).FirstOrDefault();
        return track;
    }
}