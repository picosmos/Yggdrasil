using System.ComponentModel;

namespace Mimir.Models;

public class User
{
    [ReadOnly(true)]
    public long Id { get; set; }

    public required string Name { get; set; }

    public required string ProtegearApiSecret { get; set; }
}