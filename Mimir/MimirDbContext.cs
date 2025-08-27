namespace Mimir;

using Microsoft.EntityFrameworkCore;
using Models;

public class MimirDbContext : DbContext
{
    public MimirDbContext(DbContextOptions<MimirDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }

    public DbSet<Track> Tracks { get; set; }
}
