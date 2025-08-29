namespace Mimir.Models;

public class CachedRequest
{
    public long Id { get; set; }

    public required string RequestUrl { get; set; }

    public required string ResponseText { get; set; }

    public required DateTime LastRequestTimestamp { get; set; }
}