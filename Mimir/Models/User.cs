namespace Mimir.Models;

public class User
{
    public long Id { get; set; }

    public required string Name { get; set; }

    public required string ProtegearApiSecret { get; set; }
}