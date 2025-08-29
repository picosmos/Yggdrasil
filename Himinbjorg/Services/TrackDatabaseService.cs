
using Microsoft.EntityFrameworkCore;
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services;

public class TrackDatabaseService(MimirDbContext dbContext)
{
    private readonly MimirDbContext _dbContext = dbContext;

    internal Track? GetTrackById(string id)
    {
        var track = this._dbContext.Tracks
            .Include(x => x.User)
            .Where(t => EF.Functions.Like(t.Secret, id))
            .FirstOrDefault();

        return track;
    }
}