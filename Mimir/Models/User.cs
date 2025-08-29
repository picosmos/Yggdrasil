using System.ComponentModel;
using Microsoft.EntityFrameworkCore;

namespace Mimir.Models;

[Index(nameof(Name), IsUnique = true)]
public class User
{
    [ReadOnly(true)]
    public long Id { get; set; }

    public required string Name { get; set; }

    public required string ProtegearApiSecret { get; set; }

    [DefaultValue("")]
    public required string InternationalMobileEquipmentIdentity { get; set; }
}