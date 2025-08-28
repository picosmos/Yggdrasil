using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mimir;

public class MimirDbContextFactory : IDesignTimeDbContextFactory<MimirDbContext>
{
    public MimirDbContext CreateDbContext(string[] args)
    {
        var optionsBuilder = new DbContextOptionsBuilder<MimirDbContext>();
        optionsBuilder.UseSqlite("Data Source=mimir.db");
        return new MimirDbContext(optionsBuilder.Options);
    }
}
