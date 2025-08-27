namespace Mimir.Models;

public class Track
{
    public long Id { get; set; }

    public long UserId { get; set; }

    public DateTime From { get; set; }

    public DateTime To { get; set; }

    public required string Secret { get; set; }
}