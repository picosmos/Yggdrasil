using System.ComponentModel;
using Microsoft.EntityFrameworkCore;

namespace Mimir.Models;

[Index(nameof(Secret), IsUnique = true)]
public class Track
{
    [ReadOnly(true)]
    public long Id { get; set; }

    public long UserId { get; set; }

    public DateTime From { get; set; }

    public DateTime To { get; set; }

    public required string Secret { get; set; }
}