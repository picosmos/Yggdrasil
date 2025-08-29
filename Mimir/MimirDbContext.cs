
using Microsoft.EntityFrameworkCore;
using Mimir.Models;

namespace Mimir;

public class MimirDbContext(DbContextOptions<MimirDbContext> options) : DbContext(options)
{

    public DbSet<User> Users { get; set; }

    public DbSet<Track> Tracks { get; set; }

    public DbSet<CachedRequest> CachedRequests { get; set; }
}
