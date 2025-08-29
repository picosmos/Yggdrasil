using System.ComponentModel;
using Microsoft.EntityFrameworkCore;

namespace Mimir.Models;

[Index(nameof(RequestUrl), IsUnique = true)]
public class CachedRequest
{
    [ReadOnly(true)]
    public long Id { get; set; }

    public required string RequestUrl { get; set; }

    public required string ResponseText { get; set; }

    public required DateTime LastRequestTimestamp { get; set; }
}