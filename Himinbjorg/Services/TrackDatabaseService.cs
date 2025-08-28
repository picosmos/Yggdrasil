
using Microsoft.EntityFrameworkCore;
using Mimir;
using Mimir.Models;

namespace Himinbjorg.Services
{
    public class TrackDatabaseService
    {
        private readonly ILogger<TrackDatabaseService> _logger;
        private readonly MimirDbContext _dbContext;

        public TrackDatabaseService(ILogger<TrackDatabaseService> logger, MimirDbContext dbContext)
        {
            _logger = logger;
            _dbContext = dbContext;
        }

        internal Track? GetTrackById(string id)
        {
            var track = _dbContext.Tracks.Include(x => x.User).Where(t => t.Secret == id).FirstOrDefault();
            return track;
        }
    }
}