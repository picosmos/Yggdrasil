namespace Edda;

using Microsoft.EntityFrameworkCore;
using Models;

public class EddaDbContext : DbContext
{
    public EddaDbContext(DbContextOptions<EddaDbContext> options) : base(options) { }

    public DbSet<User> Users { get; set; }

    public DbSet<Track> Tracks { get; set; }
}
